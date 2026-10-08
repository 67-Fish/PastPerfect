import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { queryOne } from '../../shared/database/pool.js';
import { logger } from '../../shared/utils/logger.js';
import { ROLES } from '../../config/constants.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.pp_access_token) {
      token = req.cookies.pp_access_token;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT.ACCESS_SECRET);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        return;
      }
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    if (payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    const user = await queryOne(
      `SELECT u.id, u.school_id, u.email, u.is_active, u.deleted_at,
              GROUP_CONCAT(r.name) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = ? AND u.deleted_at IS NULL
       GROUP BY u.id`,
      [payload.sub]
    );

    if (!user || !user.is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    const roleNames = user.roles ? user.roles.split(',') : [];
    const permissions = getPermissionsForRoles(roleNames);

    req.user = {
      id: user.id,
      schoolId: user.school_id,
      email: user.email,
      roles: roleNames,
      permissions,
    };
    req.tokenPayload = payload;

    next();
  } catch (error) {
    logger.error({ err: error }, 'Authentication error');
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasPermission = requiredPermissions.every(p => req.user.permissions.includes(p));
    
    if (!hasPermission) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasRole = allowedRoles.some(role => req.user.roles.includes(role));
    
    if (!hasRole) {
      res.status(403).json({ error: 'Insufficient role' });
      return;
    }

    next();
  };
}

export function requireSchoolAccess() {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Admin can access any school
    if (req.user.roles.includes(ROLES.ADMIN)) {
      return next();
    }

    // For school-scoped routes, check if user belongs to the school
    const requestedSchoolId = parseInt(req.params.schoolId || req.query.schoolId || '0', 10);
    
    if (requestedSchoolId && requestedSchoolId !== req.user.schoolId) {
      res.status(403).json({ error: 'Access denied to this school' });
      return;
    }

    next();
  };
}

function getPermissionsForRoles(roles) {
  const { ROLE_PERMISSIONS } = require('../../config/constants.js');
  const permissions = new Set();
  
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    for (const perm of rolePerms) {
      permissions.add(perm);
    }
  }
  
  return Array.from(permissions);
}

export function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      schoolId: user.schoolId,
      email: user.email,
      roles: user.roles,
      type: 'access',
    },
    env.JWT.ACCESS_SECRET,
    { expiresIn: env.JWT.ACCESS_EXPIRY }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      schoolId: user.schoolId,
      email: user.email,
      type: 'refresh',
    },
    env.JWT.REFRESH_SECRET,
    { expiresIn: env.JWT.REFRESH_EXPIRY }
  );
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT.REFRESH_SECRET);
}

export function setRefreshTokenCookie(res, token) {
  res.cookie(env.COOKIE.NAME, token, {
    httpOnly: env.COOKIE.HTTP_ONLY,
    secure: env.COOKIE.SECURE,
    sameSite: env.COOKIE.SAME_SITE,
    maxAge: env.COOKIE.MAX_AGE,
    path: '/',
  });
}

export function clearRefreshTokenCookie(res) {
  res.clearCookie(env.COOKIE.NAME, {
    httpOnly: env.COOKIE.HTTP_ONLY,
    secure: env.COOKIE.SECURE,
    sameSite: env.COOKIE.SAME_SITE,
    path: '/',
  });
}
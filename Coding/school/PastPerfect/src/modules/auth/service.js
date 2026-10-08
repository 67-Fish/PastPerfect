import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { userRepository, refreshTokenRepository } from './repository.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, setRefreshTokenCookie, clearRefreshTokenCookie } from '../../shared/middleware/auth.js';
import { logger } from '../../shared/utils/logger.js';
import { env } from '../../config/env.js';
import { AppError, ValidationError } from '../../shared/middleware/errorHandler.js';

const BCRYPT_COST = 12;
const REFRESH_TOKEN_BYTES = 32;

export class AuthService {
  async register(data) {
    const { email, password, firstName, lastName, schoolName, schoolSlug, phone } = data;

    // Check if school exists or create new
    const { queryOne, execute, transaction } = await import('../../shared/database/pool.js');
    
    let school = await queryOne(
      `SELECT id FROM schools WHERE slug = ?`,
      [schoolSlug]
    );

    let schoolId;
    if (school) {
      // Check if email already exists in this school
      const existingUser = await userRepository.findByEmail(email, school.id);
      if (existingUser) {
        throw new ValidationError('Email already registered for this school', [
          { field: 'email', message: 'Email already registered' }
        ]);
      }
      schoolId = school.id;
    } else {
      // Create new school with admin user
      return transaction(async (conn) => {
        const [schoolResult] = await conn.execute(
          `INSERT INTO schools (name, slug, is_active) VALUES (?, ?, ?)`,
          [schoolName, schoolSlug, true]
        );
        schoolId = schoolResult.insertId;

        const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
        const [userResult] = await conn.execute(
          `INSERT INTO users (school_id, email, password_hash, first_name, last_name, phone, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [schoolId, email, passwordHash, firstName, lastName, phone || null, true]
        );
        const userId = userResult.insertId;

        const [roleResult] = await conn.execute(
          `SELECT id FROM roles WHERE name = 'schoolAdmin'`
        );
        await conn.execute(
          `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
          [userId, roleResult[0].id]
        );

        return { userId, schoolId, isNewSchool: true };
      });
    }

    // Add user to existing school
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const userId = await userRepository.createWithRole(
      { email, passwordHash, firstName, lastName, phone },
      'student', // Default role for new users in existing school
      schoolId
    );

    return { userId, schoolId, isNewSchool: false };
  }

  async login(email, password, schoolId, userAgent, ipAddress) {
    const user = await userRepository.findByEmail(email, schoolId);
    
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.is_active) {
      throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const roles = user.roles ? user.roles.split(',') : [];
    const permissions = this.getPermissionsForRoles(roles);

    const tokenPayload = {
      sub: user.id,
      schoolId: user.school_id,
      email: user.email,
      roles,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await refreshTokenRepository.create(user.id, refreshTokenHash, expiresAt, userAgent, ipAddress);
    await userRepository.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        schoolId: user.school_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
        permissions,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken, userAgent, ipAddress) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const storedToken = await refreshTokenRepository.findByTokenHash(this.hashToken(refreshToken));
    if (!storedToken) {
      throw new AppError('Refresh token revoked or expired', 401, 'TOKEN_REVOKED');
    }

    // Check if user still exists and is active
    const user = await userRepository.findByIdWithRoles(payload.sub, payload.schoolId);
    if (!user || !user.is_active) {
      throw new AppError('User not found or inactive', 401, 'USER_INACTIVE');
    }

    // Rotate refresh token
    await refreshTokenRepository.revoke(this.hashToken(refreshToken), this.hashToken(refreshToken));

    const roles = user.roles ? user.roles.split(',') : [];
    const permissions = this.getPermissionsForRoles(roles);

    const newTokenPayload = {
      sub: user.id,
      schoolId: user.school_id,
      email: user.email,
      roles,
    };

    const newAccessToken = generateAccessToken(newTokenPayload);
    const newRefreshToken = generateRefreshToken(newTokenPayload);
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await refreshTokenRepository.create(user.id, newRefreshTokenHash, expiresAt, userAgent, ipAddress);

    return {
      user: {
        id: user.id,
        schoolId: user.school_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
        permissions,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken) {
    if (refreshToken) {
      await refreshTokenRepository.revoke(this.hashToken(refreshToken));
    }
  }

  async logoutAll(userId) {
    await refreshTokenRepository.revokeAllForUser(userId);
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await userRepository.updatePassword(userId, newPasswordHash);
    
    // Revoke all refresh tokens to force re-login
    await refreshTokenRepository.revokeAllForUser(userId);
  }

  async requestPasswordReset(email, schoolId) {
    const user = await userRepository.findByEmail(email, schoolId);
    if (!user) {
      // Don't reveal if email exists
      return { success: true };
    }

    // Generate reset token (in production, send via email)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await execute(
      `UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?`,
      [resetTokenHash, expiresAt, user.id]
    );

    logger.info({ userId: user.id }, 'Password reset requested');
    return { success: true, resetToken }; // In production, don't return token
  }

  async resetPassword(resetToken, newPassword) {
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    const { queryOne, execute } = await import('../../shared/database/pool.js');
    const user = await queryOne(
      `SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()`,
      [resetTokenHash]
    );

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await execute(
      `UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?`,
      [passwordHash, user.id]
    );

    await refreshTokenRepository.revokeAllForUser(user.id);
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getPermissionsForRoles(roles) {
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
}

export const authService = new AuthService();
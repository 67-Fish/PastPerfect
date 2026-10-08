import { BaseRepository } from '../../shared/database/baseRepository.js';
import { query, queryOne, execute, transaction } from '../../shared/database/pool.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email, schoolId = null) {
    const { sql, params } = this.buildWhereClause({ email }, schoolId);
    return queryOne(
      `SELECT u.*, GROUP_CONCAT(r.name) as roles 
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       ${sql}
       GROUP BY u.id
       LIMIT 1`,
      params
    );
  }

  async findByIdWithRoles(id, schoolId = null) {
    const { sql, params } = this.buildWhereClause({ id }, schoolId);
    return queryOne(
      `SELECT u.*, GROUP_CONCAT(r.name) as roles 
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       ${sql}
       GROUP BY u.id
       LIMIT 1`,
      params
    );
  }

  async createWithRole(userData, roleName, schoolId, assignedBy = null) {
    return transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO users (school_id, email, password_hash, first_name, last_name, phone, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [schoolId, userData.email, userData.passwordHash, userData.firstName, userData.lastName, userData.phone || null, true]
      );
      const userId = result.insertId;

      const [roleResult] = await conn.execute(
        `SELECT id FROM roles WHERE name = ?`,
        [roleName]
      );
      if (roleResult.length === 0) {
        throw new Error(`Role ${roleName} not found`);
      }
      const roleId = roleResult[0].id;

      await conn.execute(
        `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
        [userId, roleId, assignedBy]
      );

      return userId;
    });
  }

  async addRole(userId, roleName, assignedBy) {
    const [roleResult] = await query(
      `SELECT id FROM roles WHERE name = ?`,
      [roleName]
    );
    if (roleResult.length === 0) {
      throw new Error(`Role ${roleName} not found`);
    }
    const roleId = roleResult[0].id;

    return execute(
      `INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
      [userId, roleId, assignedBy]
    );
  }

  async removeRole(userId, roleName) {
    const [roleResult] = await query(
      `SELECT id FROM roles WHERE name = ?`,
      [roleName]
    );
    if (roleResult.length === 0) return false;
    const roleId = roleResult[0].id;

    return execute(
      `DELETE FROM user_roles WHERE user_id = ? AND role_id = ?`,
      [userId, roleId]
    );
  }

  async getUserRoles(userId) {
    return query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = ?`,
      [userId]
    );
  }

  async updateLastLogin(userId) {
    return execute(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId]
    );
  }

  async verifyEmail(userId) {
    return execute(
      `UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId]
    );
  }

  async updatePassword(userId, passwordHash) {
    return execute(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [passwordHash, userId]
    );
  }
}

export class RefreshTokenRepository extends BaseRepository {
  constructor() {
    super('refresh_tokens', false); // Not school-scoped
  }

  async create(userId, tokenHash, expiresAt, userAgent, ipAddress) {
    return execute(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, tokenHash, expiresAt, userAgent, ipAddress]
    );
  }

  async findByTokenHash(tokenHash) {
    return queryOne(
      `SELECT rt.*, u.school_id, u.email, u.is_active, u.deleted_at,
              GROUP_CONCAT(r.name) as roles
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE rt.token_hash = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
       GROUP BY rt.id
       LIMIT 1`,
      [tokenHash]
    );
  }

  async revoke(tokenHash, replacedByTokenHash = null) {
    return execute(
      `UPDATE refresh_tokens 
       SET revoked_at = CURRENT_TIMESTAMP, replaced_by_token_hash = ? 
       WHERE token_hash = ?`,
      [replacedByTokenHash, tokenHash]
    );
  }

  async revokeAllForUser(userId) {
    return execute(
      `UPDATE refresh_tokens 
       SET revoked_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND revoked_at IS NULL`,
      [userId]
    );
  }

  async cleanupExpired() {
    return execute(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL`
    );
  }
}

export const userRepository = new UserRepository();
export const refreshTokenRepository = new RefreshTokenRepository();
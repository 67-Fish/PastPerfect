import { BaseRepository } from '../../shared/database/baseRepository.js';
import { query, queryOne, execute, transaction } from '../../shared/database/pool.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findWithRoles(filters, options, schoolId) {
    let whereConditions = ['u.deleted_at IS NULL'];
    const whereParams = [];
    
    if (schoolId) {
      whereConditions.push('u.school_id = ?');
      whereParams.push(schoolId);
    }
    
    if (filters.search) {
      whereConditions.push('(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      const term = `%${filters.search}%`;
      whereParams.push(term, term, term);
    }
    if (filters.role) {
      whereConditions.push('EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON ur2.role_id = r2.id WHERE ur2.user_id = u.id AND r2.name = ?)');
      whereParams.push(filters.role);
    }
    if (filters.isActive !== undefined) {
      whereConditions.push('u.is_active = ?');
      whereParams.push(filters.isActive);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const { limit = 50, offset = 0, orderBy = 'u.created_at', orderDir = 'DESC' } = options;
    
    const dataSql = `
      SELECT u.*, GROUP_CONCAT(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.${orderBy} ${orderDir}
      LIMIT ? OFFSET ?
    `;
    
    const countSql = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      ${whereClause}
    `;
    
    const [data, countResult] = await Promise.all([
      query(dataSql, [...whereParams, limit, offset]),
      queryOne(countSql, whereParams),
    ]);
    
    return { data, total: countResult?.count || 0 };
  }

  async getUserWithRoles(userId, schoolId) {
    const user = await this.findByIdWithRoles(userId, schoolId);
    if (!user) return null;
    
    const roles = user.roles ? user.roles.split(',') : [];
    return { ...user, roles };
  }

  async assignRole(userId, roleName, assignedBy) {
    const [roleResult] = await query(
      `SELECT id FROM roles WHERE name = ?`,
      [roleName]
    );
    if (roleResult.length === 0) {
      throw new Error(`Role ${roleName} not found`);
    }
    
    return execute(
      `INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
      [userId, roleResult[0].id, assignedBy]
    );
  }

  async removeRole(userId, roleName) {
    const [roleResult] = await query(
      `SELECT id FROM roles WHERE name = ?`,
      [roleName]
    );
    if (roleResult.length === 0) return false;
    
    return execute(
      `DELETE FROM user_roles WHERE user_id = ? AND role_id = ?`,
      [userId, roleResult[0].id]
    );
  }

  async getRoles() {
    return query(`SELECT * FROM roles ORDER BY hierarchy_level DESC`);
  }
}

export const userRepository = new UserRepository();
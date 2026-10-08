import { query, queryOne, execute, transaction } from './pool.js';

export class BaseRepository {
  constructor(tableName, schoolScoped = true) {
    this.tableName = tableName;
    this.schoolScoped = schoolScoped;
  }

  buildWhereClause(where, schoolId) {
    const conditions = [];
    const params = [];

    if (this.schoolScoped && schoolId) {
      conditions.push(`${this.tableName}.school_id = ?`);
      params.push(schoolId);
    }

    for (const [key, value] of Object.entries(where)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${this.tableName}.${key} = ?`);
        params.push(value);
      }
    }

    const sql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { sql, params };
  }

  async findById(id, schoolId) {
    const { sql, params } = this.buildWhereClause({ id }, schoolId);
    return queryOne(
      `SELECT * FROM ${this.tableName} ${sql} LIMIT 1`,
      params
    );
  }

  async findAll(filters = {}, options = {}) {
    const { schoolId, limit = 50, offset = 0, orderBy = 'id', orderDir = 'DESC' } = options;
    const { sql: whereSql, params: whereParams } = this.buildWhereClause(filters, schoolId);
    
    const sql = `
      SELECT * FROM ${this.tableName}
      ${whereSql}
      ORDER BY ${this.tableName}.${orderBy} ${orderDir}
      LIMIT ? OFFSET ?
    `;
    
    return query(sql, [...whereParams, limit, offset]);
  }

  async count(filters = {}, schoolId) {
    const { sql, params } = this.buildWhereClause(filters, schoolId);
    const result = await queryOne(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${sql}`,
      params
    );
    return result?.count || 0;
  }

  async create(data, schoolId) {
    if (this.schoolScoped && schoolId) {
      data.school_id = schoolId;
    }

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const result = await execute(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
      values
    );
    return result.insertId;
  }

  async update(id, data, schoolId) {
    const { sql: whereSql, params: whereParams } = this.buildWhereClause({ id }, schoolId);
    
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];

    const result = await execute(
      `UPDATE ${this.tableName} SET ${setClause} ${whereSql}`,
      values
    );
    return result.affectedRows > 0;
  }

  async delete(id, schoolId) {
    const { sql, params } = this.buildWhereClause({ id }, schoolId);
    const result = await execute(
      `DELETE FROM ${this.tableName} ${sql}`,
      params
    );
    return result.affectedRows > 0;
  }

  async softDelete(id, schoolId) {
    return this.update(id, { deleted_at: new Date() }, schoolId);
  }

  async findOne(where, params = [], schoolId) {
    const { sql: whereSql, params: whereParams } = this.buildWhereClause(where, schoolId);
    return queryOne(
      `SELECT * FROM ${this.tableName} ${whereSql} AND ${params.map((_, i) => `$${i + 1}`).join(' AND ')} LIMIT 1`,
      [...whereParams, ...params]
    );
  }

  async findPaginated(filters = {}, options = {}) {
    const { schoolId, page = 1, limit = 20, orderBy = 'id', orderDir = 'DESC' } = options;
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.findAll(filters, { schoolId, limit, offset, orderBy, orderDir }),
      this.count(filters, schoolId),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
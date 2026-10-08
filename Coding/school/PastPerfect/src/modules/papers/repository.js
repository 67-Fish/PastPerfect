import { BaseRepository } from '../../shared/database/baseRepository.js';
import { query, queryOne, execute, transaction } from '../../shared/database/pool.js';

export class PaperRepository extends BaseRepository {
  constructor() {
    super('papers');
  }

  async findWithDetails(id, schoolId) {
    const { sql, params } = this.buildWhereClause({ 'p.id': id }, schoolId);
    return queryOne(
      `SELECT p.*, s.name as subject_name, s.code as subject_code, s.color as subject_color,
              es.name as exam_series_name, es.year as exam_series_year,
              u.first_name as creator_first_name, u.last_name as creator_last_name
       FROM papers p
       JOIN subjects s ON p.subject_id = s.id
       JOIN exam_series es ON p.exam_series_id = es.id
       LEFT JOIN users u ON p.created_by = u.id
       ${sql}
       LIMIT 1`,
      params
    );
  }

  async findAllWithDetails(filters, options, schoolId) {
    const { schoolId: _, limit = 50, offset = 0, orderBy = 'p.created_at', orderDir = 'DESC' } = options;
    
    let whereConditions = ['p.deleted_at IS NULL'];
    const whereParams = [];
    
    if (schoolId) {
      whereConditions.push('p.school_id = ?');
      whereParams.push(schoolId);
    }
    
    if (filters.subject) {
      whereConditions.push('p.subject_id = ?');
      whereParams.push(filters.subject);
    }
    if (filters.examSeries) {
      whereConditions.push('p.exam_series_id = ?');
      whereParams.push(filters.examSeries);
    }
    if (filters.grade) {
      whereConditions.push('p.grade_level = ?');
      whereParams.push(filters.grade);
    }
    if (filters.status) {
      whereConditions.push('p.status = ?');
      whereParams.push(filters.status);
    }
    if (filters.paperType) {
      whereConditions.push('p.paper_type = ?');
      whereParams.push(filters.paperType);
    }
    if (filters.search) {
      whereConditions.push('(p.title LIKE ? OR p.description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      whereParams.push(searchTerm, searchTerm);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const dataSql = `
      SELECT p.*, s.name as subject_name, s.code as subject_code, s.color as subject_color,
             es.name as exam_series_name, es.year as exam_series_year,
             u.first_name as creator_first_name, u.last_name as creator_last_name
      FROM papers p
      JOIN subjects s ON p.subject_id = s.id
      JOIN exam_series es ON p.exam_series_id = es.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.${orderBy} ${orderDir}
      LIMIT ? OFFSET ?
    `;
    
    const countSql = `
      SELECT COUNT(*) as count
      FROM papers p
      ${whereClause}
    `;
    
    const [data, countResult] = await Promise.all([
      query(dataSql, [...whereParams, limit, offset]),
      queryOne(countSql, whereParams),
    ]);
    
    return {
      data,
      total: countResult?.count || 0,
    };
  }

  async getGrades(schoolId) {
    return query(
      `SELECT DISTINCT grade_level FROM papers 
       WHERE school_id = ? AND deleted_at IS NULL AND grade_level IS NOT NULL
       ORDER BY grade_level`,
      [schoolId]
    );
  }

  async getRelatedPapers(paperId, schoolId, limit = 5) {
    return query(
      `SELECT p.id, p.title, p.grade_level, p.status, s.name as subject_name, es.year as exam_series_year
       FROM papers p
       JOIN subjects s ON p.subject_id = s.id
       JOIN exam_series es ON p.exam_series_id = es.id
       WHERE p.school_id = ? 
         AND p.id != ?
         AND p.subject_id = (SELECT subject_id FROM papers WHERE id = ?)
         AND p.deleted_at IS NULL
         AND p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [schoolId, paperId, paperId, limit]
    );
  }

  async createWithFile(paperData, fileData, schoolId, createdBy) {
    return transaction(async (conn) => {
      const [paperResult] = await conn.execute(
        `INSERT INTO papers (school_id, subject_id, exam_series_id, title, description, 
                            grade_level, paper_type, duration_minutes, total_marks, status, 
                            published_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          paperData.subjectId,
          paperData.examSeriesId,
          paperData.title,
          paperData.description || null,
          paperData.gradeLevel || null,
          paperData.paperType || 'exam',
          paperData.durationMinutes || null,
          paperData.totalMarks || null,
          paperData.publish ? 'published' : 'draft',
          paperData.publish ? new Date() : null,
          createdBy,
        ]
      );
      const paperId = paperResult.insertId;

      await conn.execute(
        `INSERT INTO paper_files (paper_id, file_name, file_size, mime_type, file_data, page_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          paperId,
          fileData.originalName,
          fileData.size,
          fileData.mimeType,
          fileData.buffer,
          fileData.pageCount || null,
        ]
      );

      return paperId;
    });
  }

  async getFile(paperId, schoolId) {
    const { sql, params } = this.buildWhereClause({ 'pf.paper_id': paperId }, schoolId);
    return queryOne(
      `SELECT pf.* FROM paper_files pf
       JOIN papers p ON pf.paper_id = p.id
       ${sql}
       LIMIT 1`,
      params
    );
  }

  async updateWithFile(paperId, paperData, fileData, schoolId) {
    return transaction(async (conn) => {
      // Update paper metadata
      const updateFields = [];
      const updateParams = [];
      
      const allowedFields = ['subject_id', 'exam_series_id', 'title', 'description', 'grade_level', 'paper_type', 'duration_minutes', 'total_marks', 'status'];
      for (const field of allowedFields) {
        const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        if (paperData[camelField] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateParams.push(paperData[camelField]);
        }
      }
      
      if (paperData.publish !== undefined) {
        updateFields.push('status = ?');
        updateFields.push('published_at = ?');
        updateParams.push(paperData.publish ? 'published' : 'draft');
        updateParams.push(paperData.publish ? new Date() : null);
      }
      
      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateParams.push(paperId);
        if (schoolId) updateParams.push(schoolId);
        
        await conn.execute(
          `UPDATE papers SET ${updateFields.join(', ')} WHERE id = ? ${schoolId ? 'AND school_id = ?' : ''}`,
          updateParams
        );
      }
      
      // Update file if provided
      if (fileData) {
        // Delete old file
        await conn.execute(`DELETE FROM paper_files WHERE paper_id = ?`, [paperId]);
        
        // Insert new file
        await conn.execute(
          `INSERT INTO paper_files (paper_id, file_name, file_size, mime_type, file_data, page_count)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [paperId, fileData.originalName, fileData.size, fileData.mimeType, fileData.buffer, fileData.pageCount || null]
        );
      }
      
      return paperId;
    });
  }

  async softDelete(paperId, schoolId) {
    return execute(
      `UPDATE papers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? ${schoolId ? 'AND school_id = ?' : ''}`,
      schoolId ? [paperId, schoolId] : [paperId]
    );
  }
}

export const paperRepository = new PaperRepository();
import { paperRepository } from './repository.js';
import { queryOne, execute } from '../../shared/database/pool.js';
import { AppError, NotFoundError } from '../../shared/middleware/errorHandler.js';
import { logger } from '../../shared/utils/logger.js';
import { env } from '../../config/env.js';

export class PaperService {
  async createPaper(user, paperData, file) {
    // Validate file
    if (!file) {
      throw new AppError('PDF file is required', 400, 'FILE_REQUIRED');
    }
    
    if (file.mimetype !== 'application/pdf') {
      throw new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE');
    }
    
    if (file.size > env.UPLOAD.MAX_FILE_SIZE) {
      throw new AppError('File size exceeds 50MB limit', 400, 'FILE_TOO_LARGE');
    }

    // Validate subject belongs to school
    const subject = await queryOne(
      `SELECT id FROM subjects WHERE id = ? AND school_id = ?`,
      [paperData.subjectId, user.schoolId]
    );
    if (!subject) {
      throw new AppError('Subject not found', 404, 'SUBJECT_NOT_FOUND');
    }

    // Validate exam series belongs to school
    const examSeries = await queryOne(
      `SELECT id FROM exam_series WHERE id = ? AND school_id = ?`,
      [paperData.examSeriesId, user.schoolId]
    );
    if (!examSeries) {
      throw new AppError('Exam series not found', 404, 'EXAM_SERIES_NOT_FOUND');
    }

    // Prepare file data
    const fileData = {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      buffer: file.buffer,
      pageCount: null, // Could be extracted with pdf-lib if needed
    };

    const paperId = await paperRepository.createWithFile(paperData, fileData, user.schoolId, user.id);
    
    logger.info({ paperId, userId: user.id }, 'Paper created');
    
    return this.getPaperById(paperId, user.schoolId);
  }

  async getPapers(user, filters, options) {
    const result = await paperRepository.findAllWithDetails(filters, options, user.schoolId);
    return result;
  }

  async getPaperById(paperId, schoolId) {
    const paper = await paperRepository.findWithDetails(paperId, schoolId);
    if (!paper) {
      throw new NotFoundError('Paper');
    }
    return paper;
  }

  async getPaperFile(paperId, schoolId) {
    const file = await paperRepository.getFile(paperId, schoolId);
    if (!file) {
      throw new NotFoundError('Paper file');
    }
    return file;
  }

  async updatePaper(user, paperId, paperData, file) {
    // Check paper exists and user has permission
    const paper = await this.getPaperById(paperId, user.schoolId);
    
    // Check ownership (teachers can only edit their own papers)
    if (user.roles.includes('teacher') && !user.roles.includes('schoolAdmin') && paper.created_by !== user.id) {
      throw new AppError('You can only edit your own papers', 403, 'FORBIDDEN');
    }

    // Validate subject if provided
    if (paperData.subjectId) {
      const subject = await queryOne(
        `SELECT id FROM subjects WHERE id = ? AND school_id = ?`,
        [paperData.subjectId, user.schoolId]
      );
      if (!subject) throw new AppError('Subject not found', 404, 'SUBJECT_NOT_FOUND');
    }

    // Validate exam series if provided
    if (paperData.examSeriesId) {
      const examSeries = await queryOne(
        `SELECT id FROM exam_series WHERE id = ? AND school_id = ?`,
        [paperData.examSeriesId, user.schoolId]
      );
      if (!examSeries) throw new AppError('Exam series not found', 404, 'EXAM_SERIES_NOT_FOUND');
    }

    // Validate file if provided
    if (file) {
      if (file.mimetype !== 'application/pdf') {
        throw new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE');
      }
      if (file.size > env.UPLOAD.MAX_FILE_SIZE) {
        throw new AppError('File size exceeds 50MB limit', 400, 'FILE_TOO_LARGE');
      }
    }

    const fileData = file ? {
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      buffer: file.buffer,
      pageCount: null,
    } : null;

    await paperRepository.updateWithFile(paperId, paperData, fileData, user.schoolId);
    
    logger.info({ paperId, userId: user.id }, 'Paper updated');
    
    return this.getPaperById(paperId, user.schoolId);
  }

  async deletePaper(user, paperId) {
    const paper = await this.getPaperById(paperId, user.schoolId);
    
    // Check ownership
    if (user.roles.includes('teacher') && !user.roles.includes('schoolAdmin') && paper.created_by !== user.id) {
      throw new AppError('You can only delete your own papers', 403, 'FORBIDDEN');
    }

    await paperRepository.softDelete(paperId, user.schoolId);
    
    logger.info({ paperId, userId: user.id }, 'Paper deleted');
    
    return { success: true };
  }

  async getGrades(user) {
    const grades = await paperRepository.getGrades(user.schoolId);
    return grades.map(g => g.grade_level).filter(Boolean);
  }

  async getRelatedPapers(paperId, schoolId) {
    return paperRepository.getRelatedPapers(paperId, schoolId);
  }
}

export const paperService = new PaperService();
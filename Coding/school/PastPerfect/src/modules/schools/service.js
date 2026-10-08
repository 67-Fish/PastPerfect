import { schoolRepository, subjectRepository, examSeriesRepository } from './repository.js';
import { queryOne, execute, transaction } from '../../shared/database/pool.js';
import { AppError, NotFoundError } from '../../shared/middleware/errorHandler.js';

export class SchoolService {
  async getSchools(user, filters, options) {
    if (!user.roles.includes('admin')) {
      // Non-admins can only see their own school
      const school = await schoolRepository.findById(user.schoolId);
      return { data: school ? [school] : [], total: school ? 1 : 0 };
    }
    return schoolRepository.findPaginated(filters, options);
  }

  async getSchoolById(id, user) {
    if (!user.roles.includes('admin') && id != user.schoolId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    const school = await schoolRepository.findById(id);
    if (!school) throw new NotFoundError('School');
    return school;
  }

  async createSchool(data) {
    const existing = await schoolRepository.findBySlug(data.slug);
    if (existing) {
      throw new AppError('School with this URL already exists', 409, 'DUPLICATE_SLUG');
    }
    return schoolRepository.create(data);
  }

  async updateSchool(id, data, user) {
    if (!user.roles.includes('admin')) {
      throw new AppError('Only admins can update schools', 403, 'FORBIDDEN');
    }
    return schoolRepository.update(id, data);
  }

  async deleteSchool(id, user) {
    if (!user.roles.includes('admin')) {
      throw new AppError('Only admins can delete schools', 403, 'FORBIDDEN');
    }
    return schoolRepository.softDelete(id);
  }

  // Subjects
  async getSubjects(schoolId, user) {
    if (!user.roles.includes('admin') && schoolId != user.schoolId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    return subjectRepository.findAll({ school_id: schoolId });
  }

  async createSubject(schoolId, data, user) {
    if (!user.roles.includes('admin') && !user.roles.includes('schoolAdmin')) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    if (schoolId != user.schoolId && !user.roles.includes('admin')) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    return subjectRepository.create({ ...data, school_id: schoolId });
  }

  async updateSubject(id, data, user) {
    const subject = await subjectRepository.findById(id);
    if (!subject) throw new NotFoundError('Subject');
    if (!user.roles.includes('admin') && subject.school_id != user.schoolId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    return subjectRepository.update(id, data);
  }

  async deleteSubject(id, user) {
    const subject = await subjectRepository.findById(id);
    if (!subject) throw new NotFoundError('Subject');
    if (!user.roles.includes('admin') && subject.school_id != user.schoolId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    return subjectRepository.softDelete(id);
  }

  // Exam Series
  async getExamSeries(schoolId, user) {
    if (!user.roles.includes('admin') && schoolId != user.schoolId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    return examSeriesRepository.findAll({ school_id: schoolId });
  }

  async createExamSeries(schoolId, data, user) {
    if (!user.roles.includes('admin') && !user.roles.includes('schoolAdmin')) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
    if (schoolId != user.schoolId && !user.roles.includes('admin')) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    return examSeriesRepository.create({ ...data, school_id: schoolId });
  }

  async updateExamSeries(id, data, user) {
    const series = await examSeriesRepository.findById(id);
    if (!series) throw new NotFoundError('Exam Series');
    if (!user.roles.includes('admin') && series.school_id != user.schoolId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    return examSeriesRepository.update(id, data);
  }

  async deleteExamSeries(id, user) {
    const series = await examSeriesRepository.findById(id);
    if (!series) throw new NotFoundError('Exam Series');
    if (!user.roles.includes('admin') && series.school_id != user.schoolId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }
    return examSeriesRepository.softDelete(id);
  }
}

export const schoolService = new SchoolService();
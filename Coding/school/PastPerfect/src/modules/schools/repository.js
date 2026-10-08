import { BaseRepository } from '../../shared/database/baseRepository.js';

export class SchoolRepository extends BaseRepository {
  constructor() {
    super('schools');
  }

  async findBySlug(slug) {
    return this.findOne({ slug });
  }

  async findByDomain(domain) {
    return this.findOne({ domain });
  }
}

export class SubjectRepository extends BaseRepository {
  constructor() {
    super('subjects');
  }
}

export class ExamSeriesRepository extends BaseRepository {
  constructor() {
    super('exam_series');
  }
}

export const schoolRepository = new SchoolRepository();
export const subjectRepository = new SubjectRepository();
export const examSeriesRepository = new ExamSeriesRepository();
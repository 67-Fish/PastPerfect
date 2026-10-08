import { BaseRepository } from '../../shared/database/baseRepository.js';

export class StudySessionRepository extends BaseRepository {
  constructor() {
    super('study_sessions');
  }
}

export const studySessionRepository = new StudySessionRepository();
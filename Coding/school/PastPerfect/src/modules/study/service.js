import { studySessionRepository } from './repository.js';
import { AppError } from '../../shared/middleware/errorHandler.js';

export class StudyService {
  async startSession(user, data) {
    throw new AppError('Study features not yet implemented', 501, 'NOT_IMPLEMENTED');
  }

  async getSession(sessionId, user) {
    throw new AppError('Study features not yet implemented', 501, 'NOT_IMPLEMENTED');
  }

  async completeQuestion(sessionId, questionId, answer, user) {
    throw new AppError('Study features not yet implemented', 501, 'NOT_IMPLEMENTED');
  }

  async getProgress(user, filters, options) {
    return studySessionRepository.findPaginated(filters, { ...options, schoolId: user.schoolId });
  }
}

export const studyService = new StudyService();
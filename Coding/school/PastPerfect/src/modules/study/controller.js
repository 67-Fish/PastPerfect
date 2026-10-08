import { studyService } from './service.js';
import { asyncHandler } from '../../shared/middleware/errorHandler.js';

export class StudyController {
  startSession = asyncHandler(async (req, res) => {
    const session = await studyService.startSession(req.user, req.body);
    res.status(201).json({ session });
  });

  getSession = asyncHandler(async (req, res) => {
    const session = await studyService.getSession(req.params.id, req.user);
    res.json({ session });
  });

  completeQuestion = asyncHandler(async (req, res) => {
    const result = await studyService.completeQuestion(req.params.sessionId, req.body.questionId, req.body.answer, req.user);
    res.json({ result });
  });

  getProgress = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const options = { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100) };
    const result = await studyService.getProgress(req.user, {}, options);
    res.json({ sessions: result.data, pagination: result });
  });
}

export const studyController = new StudyController();
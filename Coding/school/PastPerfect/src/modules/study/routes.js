import express from 'express';
import { studyController } from './controller.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/sessions', studyController.startSession);
router.get('/sessions', studyController.getProgress);
router.get('/sessions/:id', studyController.getSession);
router.post('/sessions/:sessionId/questions/:questionId', studyController.completeQuestion);

export default router;
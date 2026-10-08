import express from 'express';
import { body } from 'express-validator';
import { schoolController } from './controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, requireRole } from '../../shared/middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// School routes (admin only)
router.get('/', requireRole('admin'), schoolController.list);
router.post('/', requireRole('admin'), [
  body('name').trim().notEmpty(),
  body('slug').trim().matches(/^[a-z0-9-]+$/),
  body('domain').optional().trim(),
  body('primaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('secondaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], validate, schoolController.create);

router.get('/:id', requireRole('admin'), schoolController.getById);
router.put('/:id', requireRole('admin'), schoolController.update);
router.delete('/:id', requireRole('admin'), schoolController.delete);

// Subjects (schoolAdmin, admin)
router.get('/subjects', requireRole('admin', 'schoolAdmin'), schoolController.listSubjects);
router.post('/subjects', requireRole('admin', 'schoolAdmin'), [
  body('schoolId').optional().isInt({ min: 1 }),
  body('name').trim().notEmpty(),
  body('code').trim().notEmpty().isLength({ max: 50 }),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], validate, schoolController.createSubject);

router.put('/subjects/:subjectId', requireRole('admin', 'schoolAdmin'), schoolController.updateSubject);
router.delete('/subjects/:subjectId', requireRole('admin', 'schoolAdmin'), schoolController.deleteSubject);

// Exam Series (schoolAdmin, admin)
router.get('/exam-series', requireRole('admin', 'schoolAdmin'), schoolController.listExamSeries);
router.post('/exam-series', requireRole('admin', 'schoolAdmin'), [
  body('schoolId').optional().isInt({ min: 1 }),
  body('name').trim().notEmpty(),
  body('year').isInt({ min: 2000, max: 2100 }),
  body('term').optional().trim(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
], validate, schoolController.createExamSeries);

router.put('/exam-series/:seriesId', requireRole('admin', 'schoolAdmin'), schoolController.updateExamSeries);
router.delete('/exam-series/:seriesId', requireRole('admin', 'schoolAdmin'), schoolController.deleteExamSeries);

export default router;
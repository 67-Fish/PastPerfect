import express from 'express';
import { body } from 'express-validator';
import { userController } from './controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, requireRole } from '../../shared/middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin', 'schoolAdmin'));

router.get('/', userController.list);
router.get('/roles', userController.getRoles);
router.post('/', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('phone').optional().trim(),
  body('role').optional().isIn(['admin', 'schoolAdmin', 'teacher', 'student']),
  body('schoolId').optional().isInt({ min: 1 }),
], validate, userController.create);

router.get('/:id', userController.getById);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

router.post('/:id/roles', [
  body('role').isIn(['admin', 'schoolAdmin', 'teacher', 'student']),
], validate, userController.assignRole);

router.delete('/:id/roles', [
  body('role').isIn(['admin', 'schoolAdmin', 'teacher', 'student']),
], validate, userController.removeRole);

export default router;
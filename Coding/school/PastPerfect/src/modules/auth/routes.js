import express from 'express';
import { body } from 'express-validator';
import { authController } from './controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('schoolName').trim().notEmpty(),
  body('schoolSlug').trim().matches(/^[a-z0-9-]+$/),
  body('phone').optional().trim(),
], validate, authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('schoolSlug').trim().notEmpty(),
], validate, authController.login);

router.post('/refresh', authController.refresh);

router.post('/logout', authController.logout);

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
  body('schoolSlug').trim().notEmpty(),
], validate, authController.requestPasswordReset);

router.post('/reset-password', [
  body('resetToken').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], validate, authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.me);

router.post('/change-password', [
  authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], validate, authController.changePassword);

export default router;
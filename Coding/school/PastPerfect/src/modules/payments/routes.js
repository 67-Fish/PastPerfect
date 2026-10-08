import express from 'express';
import { paymentController } from './controller.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Webhook (no auth, but verify signature in service)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.webhook);

// Protected routes
router.post('/intent', paymentController.createIntent);
router.get('/', paymentController.list);

export default router;
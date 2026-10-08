import { paymentService } from './service.js';
import { asyncHandler } from '../../shared/middleware/errorHandler.js';

export class PaymentController {
  createIntent = asyncHandler(async (req, res) => {
    const intent = await paymentService.createPaymentIntent(req.user, req.body);
    res.json({ intent });
  });

  webhook = asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'] || req.headers['paddle-signature'];
    await paymentService.handleWebhook(req.body, signature);
    res.json({ received: true });
  });

  list = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, type } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    const options = { page: parseInt(page, 10), limit: Math.min(parseInt(limit, 10), 100) };
    const result = await paymentService.getPayments(req.user, filters, options);
    res.json({ payments: result.data, pagination: result });
  });
}

export const paymentController = new PaymentController();
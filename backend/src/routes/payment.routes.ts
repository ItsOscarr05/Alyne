import { Router, type Express } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router: Express['Router'] = Router();

// All payment routes require authentication
router.use(authenticate);

router.post('/create-intent', paymentController.createPaymentIntent);
router.post('/confirm', paymentController.confirmPayment);
router.get('/booking/:bookingId', paymentController.getPaymentByBooking);
router.get('/history', paymentController.getPaymentHistory);

export { router as paymentRoutes };


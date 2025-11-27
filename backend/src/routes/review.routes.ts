import { Router, type Express } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';

const router: Express['Router'] = Router();

// All review routes require authentication
router.use(authenticate);

router.post('/submit', reviewController.submitReview);
router.get('/booking/:bookingId', reviewController.getReviewByBooking);
router.put('/:id', reviewController.updateReview);
router.post('/:id/flag', reviewController.flagReview);

export { router as reviewRoutes };


import { Router, type Express } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';

const router: Express['Router'] = Router();

// All message routes require authentication
router.use(authenticate);

router.post('/send', messageController.sendMessage);
router.get('/conversations', messageController.getConversations);
router.get('/:otherUserId', messageController.getMessages);
router.post('/:otherUserId/read', messageController.markAsRead);

export { router as messageRoutes };


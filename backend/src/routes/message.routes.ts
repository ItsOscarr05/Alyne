import { Router, type Express } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router: Express['Router'] = Router();

// All message routes require authentication
router.use(authenticate);

// Validation schemas
const sendMessageSchema = z.object({
  body: z.object({
    receiverId: z.string().min(1, 'Receiver ID is required'),
    content: z.string().min(1, 'Message content is required').max(5000, 'Message too long'),
  }),
});

const getMessagesSchema = z.object({
  params: z.object({
    otherUserId: z.string().min(1, 'User ID is required'),
  }),
  query: z.object({
    limit: z.string().optional(),
    offset: z.string().optional(),
  }).optional(),
});

const markAsReadSchema = z.object({
  params: z.object({
    otherUserId: z.string().min(1, 'User ID is required'),
  }),
});

// Routes with validation
router.post(
  '/send',
  validateRequest(sendMessageSchema),
  messageController.sendMessage
);

router.get('/conversations', messageController.getConversations);

router.get(
  '/:otherUserId',
  validateRequest(getMessagesSchema),
  messageController.getMessages
);

router.post(
  '/:otherUserId/read',
  validateRequest(markAsReadSchema),
  messageController.markAsRead
);

export { router as messageRoutes };


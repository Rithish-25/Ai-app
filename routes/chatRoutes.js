import express from 'express';
import { sendChatMessage, getChatHistory, getConceptExplanation } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { chatValidator, conceptValidator, validate } from '../validators/inputValidators.js';

const router = express.Router();

// Apply AI rate-limiting for expensive calls
router.post('/chat', protect, aiLimiter, chatValidator, validate, sendChatMessage);
router.post('/explain', protect, aiLimiter, conceptValidator, validate, getConceptExplanation);
router.get('/history', protect, getChatHistory);

export default router;

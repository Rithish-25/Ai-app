import express from 'express';
import { generateNewQuiz, getQuizzesBySubject, getQuizDetails, attemptQuiz, deleteQuiz } from '../controllers/quizController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { quizValidator, validate } from '../validators/inputValidators.js';

const router = express.Router();

router.post('/generate', protect, aiLimiter, quizValidator, validate, generateNewQuiz);
router.get('/subject/:subjectId', protect, getQuizzesBySubject);

router.route('/:id')
  .get(protect, getQuizDetails)
  .post(protect, attemptQuiz)
  .delete(protect, deleteQuiz);

router.post('/:id/attempt', protect, attemptQuiz);

export default router;

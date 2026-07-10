import express from 'express';
import { generateNewFlashcards, createFlashcard, getFlashcardsBySubject, updateFlashcardDifficulty, deleteFlashcard } from '../controllers/flashcardController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { flashcardValidator, validate } from '../validators/inputValidators.js';

const router = express.Router();

router.post('/generate', protect, aiLimiter, generateNewFlashcards);

router.route('/')
  .post(protect, flashcardValidator, validate, createFlashcard);

router.get('/subject/:subjectId', protect, getFlashcardsBySubject);

router.route('/:id')
  .put(protect, updateFlashcardDifficulty)
  .delete(protect, deleteFlashcard);

export default router;

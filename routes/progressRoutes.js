import express from 'express';
import { getProgressStats, logStudySession, deleteQuizScoreLog } from '../controllers/progressController.js';
import { protect } from '../middleware/auth.js';
import { logSessionValidator, validate } from '../validators/inputValidators.js';

const router = express.Router();

router.get('/', protect, getProgressStats);
router.post('/log-session', protect, logSessionValidator, validate, logStudySession);
router.delete('/quiz-log/:logId', protect, deleteQuizScoreLog);

export default router;

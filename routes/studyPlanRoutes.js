import express from 'express';
import { generateNewStudyPlan, getActiveStudyPlan, toggleTaskCompletion, addExamCountdown, deleteExamCountdown, createManualTask } from '../controllers/studyPlanController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { studyPlanValidator, countdownValidator, validate } from '../validators/inputValidators.js';

const router = express.Router();

router.post('/generate', protect, aiLimiter, generateNewStudyPlan);
router.get('/', protect, getActiveStudyPlan);

router.put('/tasks/:taskId', protect, toggleTaskCompletion);
router.post('/tasks', protect, studyPlanValidator, validate, createManualTask);

router.post('/countdowns', protect, countdownValidator, validate, addExamCountdown);
router.delete('/countdowns/:countdownId', protect, deleteExamCountdown);

export default router;

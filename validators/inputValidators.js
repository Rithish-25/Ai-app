import { body, param, validationResult } from 'express-validator';

// Middleware to check validation results
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

export const subjectValidator = [
  body('name').trim().notEmpty().withMessage('Subject name is required').isLength({ max: 50 }).withMessage('Subject name cannot exceed 50 characters'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color code (e.g. #3F51B5)'),
];

export const chatValidator = [
  body('message').trim().notEmpty().withMessage('Chat message cannot be empty'),
  body('documentId').optional().isMongoId().withMessage('Invalid document reference ID'),
  body('subjectId').optional().isMongoId().withMessage('Invalid subject reference ID'),
];

export const conceptValidator = [
  body('concept').trim().notEmpty().withMessage('Academic concept is required'),
  body('complexityLevel').optional().isIn(['beginner', 'intermediate', 'expert']).withMessage('Complexity must be: beginner, intermediate, or expert'),
];

export const quizValidator = [
  body('subjectId').isMongoId().withMessage('A valid subjectId is required'),
  body('documentId').optional().isMongoId().withMessage('Invalid document reference ID'),
  body('type').optional().isIn(['mcq', 'true_false', 'fill_in_blanks', 'short_answer']).withMessage('Invalid quiz type'),
  body('count').optional().isInt({ min: 1, max: 20 }).withMessage('Question count must be between 1 and 20'),
];

export const flashcardValidator = [
  body('subjectId').isMongoId().withMessage('A valid subjectId is required'),
  body('front').trim().notEmpty().withMessage('Flashcard front text is required'),
  body('back').trim().notEmpty().withMessage('Flashcard back text is required'),
];

export const studyPlanValidator = [
  body('taskName').trim().notEmpty().withMessage('Task name is required'),
  body('dueDate').isISO8601().withMessage('Due date must be a valid ISO8601 date string'),
  body('subjectId').optional().isMongoId().withMessage('Invalid subject ID format'),
];

export const countdownValidator = [
  body('examName').trim().notEmpty().withMessage('Exam name is required'),
  body('examDate').isISO8601().withMessage('Exam date must be a valid ISO8601 date string'),
];

export const logSessionValidator = [
  body('minutes').isInt({ min: 1, max: 480 }).withMessage('Study minutes must be an integer between 1 and 480'),
];

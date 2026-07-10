import { Quiz } from '../models/Quiz.js';
import { Document } from '../models/Document.js';
import { Subject } from '../models/Subject.js';
import { Progress } from '../models/Progress.js';
import { generateQuiz } from '../services/geminiService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// AI Generate a quiz based on subject documents
export const generateNewQuiz = async (req, res) => {
  try {
    const { subjectId, documentId, type = 'mcq', count = 5 } = req.body;
    const userId = req.user._id;

    if (!subjectId) {
      return sendError(res, 'subjectId is required', 400);
    }

    const subject = await Subject.findOne({ _id: subjectId, userId });
    if (!subject) {
      return sendError(res, 'Subject not found or unauthorized', 404);
    }

    // Accumulate text source
    let sourceText = '';

    if (documentId) {
      const doc = await Document.findOne({ _id: documentId, userId });
      if (!doc) return sendError(res, 'Document not found', 404);
      sourceText = doc.extractedText || '';
    } else {
      // Find all documents for subject
      const docs = await Document.find({ subjectId, userId });
      sourceText = docs.map(d => d.extractedText).join('\n\n');
    }

    if (!sourceText || sourceText.trim().length < 50) {
      return sendError(res, 'Insufficient study materials found. Please upload text documents first to generate quizzes.', 400);
    }

    logger.info(`Generating ${count} questions of type ${type} for subject: ${subject.name}`);
    const questions = await generateQuiz(sourceText, type, count);

    const quiz = await Quiz.create({
      subjectId,
      userId,
      title: `${subject.name} - ${type.toUpperCase().replace('_', ' ')} Quiz`,
      questions: questions.map(q => ({
        questionText: q.questionText,
        type: q.type,
        options: q.options || [],
        correctAnswer: String(q.correctAnswer),
        explanation: q.explanation || '',
      })),
      totalQuestions: questions.length,
      score: null,
      attempts: [],
    });

    logger.info(`Quiz created: ${quiz._id} with ${quiz.totalQuestions} questions`);
    return sendSuccess(res, quiz, 'Quiz generated successfully', 201);
  } catch (error) {
    logger.error(`Error in generateNewQuiz: ${error.message}`);
    return sendError(res, 'Failed to generate quiz', 500, error);
  }
};

// Fetch quizzes by subject
export const getQuizzesBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user._id;

    const quizzes = await Quiz.find({ subjectId, userId }).select('-questions'); // omit questions in listing for performance
    return sendSuccess(res, quizzes, 'Quizzes retrieved successfully');
  } catch (error) {
    logger.error(`Error in getQuizzesBySubject: ${error.message}`);
    return sendError(res, 'Failed to retrieve quizzes', 500, error);
  }
};

// Get single quiz details
export const getQuizDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const quiz = await Quiz.findOne({ _id: id, userId });
    if (!quiz) {
      return sendError(res, 'Quiz not found or unauthorized', 404);
    }

    return sendSuccess(res, quiz, 'Quiz details retrieved successfully');
  } catch (error) {
    logger.error(`Error in getQuizDetails: ${error.message}`);
    return sendError(res, 'Failed to retrieve quiz details', 500, error);
  }
};

// Grade quiz attempt and record performance in database and progress
export const attemptQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Array of user answers matching question order
    const userId = req.user._id;

    const quiz = await Quiz.findOne({ _id: id, userId });
    if (!quiz) {
      return sendError(res, 'Quiz not found or unauthorized', 404);
    }

    if (!answers || !Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return sendError(res, 'Invalid answers count submitted', 400);
    }

    // Grade options
    let correctCount = 0;
    const results = quiz.questions.map((q, idx) => {
      const userAns = String(answers[idx] || '').trim().toLowerCase();
      const correctAns = String(q.correctAnswer).trim().toLowerCase();
      const isCorrect = userAns === correctAns;
      
      if (isCorrect) {
        correctCount++;
      }

      return {
        questionId: q._id,
        questionText: q.questionText,
        userAnswer: answers[idx],
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const scorePercentage = Math.round((correctCount / quiz.questions.length) * 100);

    // Save attempt inside Quiz document
    quiz.attempts.push({
      score: scorePercentage,
      answers,
      attemptedAt: new Date(),
    });
    quiz.score = scorePercentage; // update latest score
    await quiz.save();

    // Log progress details for charts
    let progress = await Progress.findOne({ userId });
    if (!progress) {
      progress = await Progress.create({
        userId,
        streakCount: 1,
        lastActiveDate: new Date(),
        completedTopicsCount: 0,
        studyLogs: [],
        quizScores: [],
      });
    }

    // Add score log
    progress.quizScores.push({
      quizId: quiz._id,
      quizTitle: quiz.title,
      score: scorePercentage,
      totalQuestions: quiz.questions.length,
      date: new Date(),
    });

    // Handle activity streak increment
    const todayStr = new Date().toDateString();
    if (progress.lastActiveDate) {
      const lastActiveStr = progress.lastActiveDate.toDateString();
      if (todayStr !== lastActiveStr) {
        const diffTime = Math.abs(new Date() - progress.lastActiveDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          progress.streakCount += 1;
        } else if (diffDays > 1) {
          progress.streakCount = 1;
        }
        progress.lastActiveDate = new Date();
      }
    } else {
      progress.streakCount = 1;
      progress.lastActiveDate = new Date();
    }
    
    await progress.save();

    logger.info(`Quiz graded: User ${userId} scored ${scorePercentage}% on quiz ${quiz._id}`);
    
    return sendSuccess(res, {
      score: scorePercentage,
      correctCount,
      totalQuestions: quiz.questions.length,
      results,
    }, 'Quiz graded successfully');
  } catch (error) {
    logger.error(`Error in attemptQuiz: ${error.message}`);
    return sendError(res, 'Failed to grade quiz attempt', 500, error);
  }
};

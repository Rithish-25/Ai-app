import { Progress } from '../models/Progress.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// Get comprehensive user study progress statistics
export const getProgressStats = async (req, res) => {
  try {
    const userId = req.user._id;
    let progress = await Progress.findOne({ userId });

    if (!progress) {
      // Lazy initialize progress schema if empty
      progress = await Progress.create({
        userId,
        streakCount: 0,
        lastActiveDate: null,
        completedTopicsCount: 0,
        studyLogs: [],
        quizScores: [],
      });
    }

    return sendSuccess(res, progress, 'Progress statistics retrieved successfully');
  } catch (error) {
    logger.error(`Error in getProgressStats: ${error.message}`);
    return sendError(res, 'Failed to retrieve progress statistics', 500, error);
  }
};

// Log study time in minutes
export const logStudySession = async (req, res) => {
  try {
    const { minutes } = req.body;
    const userId = req.user._id;

    if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
      return sendError(res, 'A positive number of study minutes is required', 400);
    }

    // Get today's normalized date (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let progress = await Progress.findOne({ userId });
    if (!progress) {
      progress = new Progress({
        userId,
        streakCount: 1,
        lastActiveDate: new Date(),
        completedTopicsCount: 0,
        studyLogs: [],
        quizScores: [],
      });
    }

    // Check if a study log already exists for today
    const existingLogIndex = progress.studyLogs.findIndex(
      (log) => new Date(log.date).toDateString() === today.toDateString()
    );

    if (existingLogIndex !== -1) {
      progress.studyLogs[existingLogIndex].minutes += minutes;
    } else {
      progress.studyLogs.push({
        date: today,
        minutes: minutes,
      });
    }

    // Update study activity streak
    const now = new Date();
    if (progress.lastActiveDate) {
      const lastActiveStr = progress.lastActiveDate.toDateString();
      const todayStr = now.toDateString();

      if (todayStr !== lastActiveStr) {
        const diffTime = Math.abs(now - progress.lastActiveDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          progress.streakCount += 1;
        } else if (diffDays > 1) {
          progress.streakCount = 1; // streak broken, reset to 1
        }
        progress.lastActiveDate = now;
      }
    } else {
      progress.streakCount = 1;
      progress.lastActiveDate = now;
    }

    await progress.save();
    logger.info(`Logged ${minutes} minutes of study for user ${userId}. Current streak: ${progress.streakCount}`);

    return sendSuccess(res, progress, 'Study session logged successfully');
  } catch (error) {
    logger.error(`Error in logStudySession: ${error.message}`);
    return sendError(res, 'Failed to log study session', 500, error);
  }
};

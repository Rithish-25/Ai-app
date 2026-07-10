import { StudyPlan } from '../models/StudyPlan.js';
import { Subject } from '../models/Subject.js';
import { Progress } from '../models/Progress.js';
import { generateStudyPlan } from '../services/geminiService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// AI Generate study planner schedule tasks
export const generateNewStudyPlan = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get subjects for user
    const subjects = await Subject.find({ userId });
    if (subjects.length === 0) {
      return sendError(res, 'Please create at least one subject before generating a study plan', 400);
    }

    // Get active study plan to extract existing countdowns (if any)
    let activePlan = await StudyPlan.findOne({ userId }).sort({ createdAt: -1 });
    const examDates = activePlan ? activePlan.examCountdowns.map(e => ({ examName: e.examName, examDate: e.examDate })) : [];

    logger.info(`Generating study plan tasks for user ${userId} with ${subjects.length} subjects`);
    const generatedTasks = await generateStudyPlan(subjects, examDates);

    const today = new Date();
    const endWeek = new Date();
    endWeek.setDate(today.getDate() + 7);

    // Prepare tasks with standard ObjectIds
    const tasks = generatedTasks.map(t => ({
      taskName: t.taskName,
      description: t.description || '',
      dueDate: new Date(t.dueDate),
      isCompleted: false,
      subjectId: t.subjectId || null,
    }));

    if (activePlan) {
      // Overwrite current plan tasks, preserve exam countdowns
      activePlan.title = `Weekly Planner (Generated ${today.toLocaleDateString()})`;
      activePlan.startDate = today;
      activePlan.endDate = endWeek;
      activePlan.tasks = tasks;
      await activePlan.save();
    } else {
      activePlan = await StudyPlan.create({
        userId,
        title: `Weekly Planner (Generated ${today.toLocaleDateString()})`,
        startDate: today,
        endDate: endWeek,
        tasks,
        examCountdowns: [],
      });
    }

    logger.info(`Weekly study plan synced: ${activePlan._id}`);
    return sendSuccess(res, activePlan, 'AI Study Plan generated successfully');
  } catch (error) {
    logger.error(`Error in generateNewStudyPlan: ${error.message}`);
    return sendError(res, 'Failed to generate study plan', 500, error);
  }
};

// Fetch current user study plan
export const getActiveStudyPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    let plan = await StudyPlan.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!plan) {
      // Initialize a default study plan with empty tasks and countdowns
      plan = await StudyPlan.create({
        userId,
        title: 'Weekly Planner',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tasks: [],
        examCountdowns: [],
      });
    }

    return sendSuccess(res, plan, 'Active study plan retrieved successfully');
  } catch (error) {
    logger.error(`Error in getActiveStudyPlan: ${error.message}`);
    return sendError(res, 'Failed to retrieve study plan', 500, error);
  }
};

// Toggle study plan task status (complete/incomplete) and update progress counts
export const toggleTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    const plan = await StudyPlan.findOne({ userId, 'tasks._id': taskId });
    if (!plan) {
      return sendError(res, 'Study task not found', 404);
    }

    const task = plan.tasks.id(taskId);
    const wasCompleted = task.isCompleted;
    task.isCompleted = !task.isCompleted;
    await plan.save();

    // Increment or decrement overall completed topics count in Progress
    if (task.isCompleted && !wasCompleted) {
      await Progress.findOneAndUpdate(
        { userId },
        { $inc: { completedTopicsCount: 1 } },
        { upsert: true }
      );
    } else if (!task.isCompleted && wasCompleted) {
      await Progress.findOneAndUpdate(
        { userId },
        { $inc: { completedTopicsCount: -1 } }
      );
    }

    logger.info(`Task status toggled. Task ${taskId} completed: ${task.isCompleted}`);
    return sendSuccess(res, plan, 'Task status toggled successfully');
  } catch (error) {
    logger.error(`Error in toggleTaskCompletion: ${error.message}`);
    return sendError(res, 'Failed to toggle task completion', 500, error);
  }
};

// Add exam countdown dates
export const addExamCountdown = async (req, res) => {
  try {
    const { examName, examDate } = req.body;
    const userId = req.user._id;

    if (!examName || !examDate) {
      return sendError(res, 'examName and examDate are required', 400);
    }

    let plan = await StudyPlan.findOne({ userId }).sort({ createdAt: -1 });
    if (!plan) {
      plan = await StudyPlan.create({
        userId,
        title: 'Weekly Planner',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tasks: [],
        examCountdowns: [],
      });
    }

    plan.examCountdowns.push({
      examName,
      examDate: new Date(examDate),
    });
    await plan.save();

    logger.info(`Exam countdown added: ${examName} on ${examDate}`);
    return sendSuccess(res, plan, 'Exam countdown added successfully');
  } catch (error) {
    logger.error(`Error in addExamCountdown: ${error.message}`);
    return sendError(res, 'Failed to add exam countdown', 500, error);
  }
};

// Delete exam countdown date
export const deleteExamCountdown = async (req, res) => {
  try {
    const { countdownId } = req.params;
    const userId = req.user._id;

    const plan = await StudyPlan.findOne({ userId, 'examCountdowns._id': countdownId });
    if (!plan) {
      return sendError(res, 'Countdown event not found', 404);
    }

    plan.examCountdowns.pull({ _id: countdownId });
    await plan.save();

    logger.info(`Countdown event deleted: ${countdownId}`);
    return sendSuccess(res, plan, 'Countdown deleted successfully');
  } catch (error) {
    logger.error(`Error in deleteExamCountdown: ${error.message}`);
    return sendError(res, 'Failed to delete countdown', 500, error);
  }
};

// Add manual task to planner
export const createManualTask = async (req, res) => {
  try {
    const { taskName, description, dueDate, subjectId } = req.body;
    const userId = req.user._id;

    if (!taskName || !dueDate) {
      return sendError(res, 'taskName and dueDate are required', 400);
    }

    let plan = await StudyPlan.findOne({ userId }).sort({ createdAt: -1 });
    if (!plan) {
      plan = await StudyPlan.create({
        userId,
        title: 'Weekly Planner',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tasks: [],
        examCountdowns: [],
      });
    }

    plan.tasks.push({
      taskName,
      description: description || '',
      dueDate: new Date(dueDate),
      isCompleted: false,
      subjectId: subjectId || null,
    });
    await plan.save();

    logger.info(`Manual task added to planner: ${taskName}`);
    return sendSuccess(res, plan, 'Manual task added successfully');
  } catch (error) {
    logger.error(`Error in createManualTask: ${error.message}`);
    return sendError(res, 'Failed to add manual task', 500, error);
  }
};

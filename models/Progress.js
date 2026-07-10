import mongoose from 'mongoose';

const StudyLogSchema = new mongoose.Schema({
  date: {
    type: Date, // Normalized to start of day (00:00:00)
    required: true,
  },
  minutes: {
    type: Number,
    required: true,
    default: 0,
  },
});

const QuizScoreLogSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  quizTitle: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const ProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  streakCount: {
    type: Number,
    default: 0,
  },
  lastActiveDate: {
    type: Date,
    default: null,
  },
  completedTopicsCount: {
    type: Number,
    default: 0,
  },
  studyLogs: [StudyLogSchema],
  quizScores: [QuizScoreLogSchema],
}, {
  timestamps: true,
});

export const Progress = mongoose.model('Progress', ProgressSchema);
export default Progress;

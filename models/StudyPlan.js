import mongoose from 'mongoose';

const StudyTaskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  dueDate: {
    type: Date,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null,
  },
});

const ExamCountdownSchema = new mongoose.Schema({
  examName: {
    type: String,
    required: true,
    trim: true,
  },
  examDate: {
    type: Date,
    required: true,
  },
});

const StudyPlanSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  tasks: [StudyTaskSchema],
  examCountdowns: [ExamCountdownSchema],
}, {
  timestamps: true,
});

export const StudyPlan = mongoose.model('StudyPlan', StudyPlanSchema);
export default StudyPlan;

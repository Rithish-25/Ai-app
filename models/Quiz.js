import mongoose from 'mongoose';

const QuizQuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['mcq', 'true_false', 'fill_in_blanks', 'short_answer'],
    required: true,
  },
  options: {
    type: [String], // Array of choices for MCQ, empty for other types
    default: [],
  },
  correctAnswer: {
    type: String, // String representation of answer
    required: true,
  },
  explanation: {
    type: String,
    default: '',
  },
});

const QuizAttemptSchema = new mongoose.Schema({
  score: {
    type: Number,
    required: true,
  },
  answers: {
    type: [String], // User answers in order matching questions array
    required: true,
  },
  attemptedAt: {
    type: Date,
    default: Date.now,
  },
});

const QuizSchema = new mongoose.Schema({
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true,
  },
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
  questions: [QuizQuestionSchema],
  score: {
    type: Number, // Latest score, null if never attempted
    default: null,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  attempts: [QuizAttemptSchema],
}, {
  timestamps: true,
});

export const Quiz = mongoose.model('Quiz', QuizSchema);
export default Quiz;

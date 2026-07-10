import mongoose from 'mongoose';

const FlashcardSchema = new mongoose.Schema({
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
  front: {
    type: String,
    required: true,
    trim: true,
  },
  back: {
    type: String,
    required: true,
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  lastReviewed: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

export const Flashcard = mongoose.model('Flashcard', FlashcardSchema);
export default Flashcard;

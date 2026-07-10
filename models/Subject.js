import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  color: {
    type: String,
    default: '#3F51B5', // Hex code color tag
  },
}, {
  timestamps: true,
});

// Subject compound unique index for the user to prevent duplicate names
SubjectSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Subject = mongoose.model('Subject', SubjectSchema);
export default Subject;

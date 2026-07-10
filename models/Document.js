import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
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
  fileName: {
    type: String,
    required: true,
    trim: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'docx', 'ppt', 'image', 'txt'],
  },
  extractedText: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

export const Document = mongoose.model('Document', DocumentSchema);
export default Document;

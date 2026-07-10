import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  _id: {
    type: String, // Matches the Firebase uid
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  displayName: {
    type: String,
    trim: true,
  },
  photoURL: {
    type: String,
    default: '',
  },
  darkMode: {
    type: Boolean,
    default: false,
  },
  notificationSettings: {
    dailyReminders: {
      type: Boolean,
      default: true,
    },
    quizAlerts: {
      type: Boolean,
      default: true,
    },
  },
}, {
  timestamps: true,
});

export const User = mongoose.model('User', UserSchema);
export default User;

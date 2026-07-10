import express from 'express';
import { getProfile, registerOrLogin, updateSettings, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Synchronize Firebase Auth user with Mongoose DB
router.post('/register-or-login', protect, registerOrLogin);

// Fetch current user details
router.get('/profile', protect, getProfile);

// Update user preferences (theme settings, notifications)
router.put('/settings', protect, updateSettings);

// Update displayName and profile image
router.put('/profile', protect, upload.single('avatar'), updateProfile);

export default router;

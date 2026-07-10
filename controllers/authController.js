import fs from 'fs';
import { User } from '../models/User.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// Sync Firebase User with MongoDB User
export const registerOrLogin = async (req, res) => {
  try {
    // req.user is attached by protect middleware
    const user = req.user;
    const { displayName } = req.body;

    if (displayName && user.displayName !== displayName) {
      user.displayName = displayName;
      await user.save();
      logger.info(`Updated user displayName from request: ${user.email} -> ${displayName}`);
    }

    logger.info(`User login synced: ${user.email}`);
    return sendSuccess(res, user, 'User authenticated and synced successfully');
  } catch (error) {
    logger.error(`Error in registerOrLogin: ${error.message}`);
    return sendError(res, 'Failed to authenticate user', 500, error);
  }
};

// Update user settings (dark mode, notification preferences)
export const updateSettings = async (req, res) => {
  try {
    const { darkMode, notificationSettings } = req.body;
    const userId = req.user._id;

    const updates = {};
    if (darkMode !== undefined) updates.darkMode = darkMode;
    if (notificationSettings !== undefined) {
      updates.notificationSettings = {
        ...req.user.notificationSettings.toObject(),
        ...notificationSettings,
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    logger.info(`User settings updated: ${userId}`);
    return sendSuccess(res, updatedUser, 'Settings updated successfully');
  } catch (error) {
    logger.error(`Error in updateSettings: ${error.message}`);
    return sendError(res, 'Failed to update settings', 500, error);
  }
};

// Get current user profile details
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, user, 'Profile retrieved successfully');
  } catch (error) {
    logger.error(`Error in getProfile: ${error.message}`);
    return sendError(res, 'Failed to retrieve profile', 500, error);
  }
};

// Update user displayName and avatar photoURL
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { displayName } = req.body;
    
    const updates = {};
    if (displayName) {
      updates.displayName = displayName;
    }
    
    if (req.file) {
      const localFilePath = req.file.path;
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(localFilePath, `study_assistant/${userId}/avatar`);
      updates.photoURL = uploadResult.url;
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return sendError(res, 'User not found', 404);
    }
    
    logger.info(`User profile updated: ${userId}`);
    return sendSuccess(res, updatedUser, 'Profile updated successfully');
  } catch (error) {
    logger.error(`Error in updateProfile: ${error.message}`);
    // Cleanup local file if it exists and error happened
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    return sendError(res, 'Failed to update profile', 500, error);
  }
};

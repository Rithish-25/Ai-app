import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// Sync Firebase User with MongoDB User
export const registerOrLogin = async (req, res) => {
  try {
    // req.user is attached by protect middleware
    const user = req.user;
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

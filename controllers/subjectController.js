import { Subject } from '../models/Subject.js';
import { Document } from '../models/Document.js';
import { Quiz } from '../models/Quiz.js';
import { Flashcard } from '../models/Flashcard.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// Get all subjects for logged-in user
export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user._id });
    return sendSuccess(res, subjects, 'Subjects retrieved successfully');
  } catch (error) {
    logger.error(`Error in getSubjects: ${error.message}`);
    return sendError(res, 'Failed to retrieve subjects', 500, error);
  }
};

// Create a new subject
export const createSubject = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const userId = req.user._id;

    // Check for duplicate name for this specific user
    const existingSubject = await Subject.findOne({ userId, name });
    if (existingSubject) {
      return sendError(res, 'Subject with this name already exists', 400);
    }

    const subject = await Subject.create({
      userId,
      name,
      description,
      color,
    });

    logger.info(`Subject created: ${subject.name} by user ${userId}`);
    return sendSuccess(res, subject, 'Subject created successfully', 201);
  } catch (error) {
    logger.error(`Error in createSubject: ${error.message}`);
    return sendError(res, 'Failed to create subject', 500, error);
  }
};

// Update a subject
export const updateSubject = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const { id } = req.params;
    const userId = req.user._id;

    const subject = await Subject.findOne({ _id: id, userId });
    if (!subject) {
      return sendError(res, 'Subject not found or unauthorized', 404);
    }

    if (name) {
      // Check duplicate name
      const duplicate = await Subject.findOne({ userId, name, _id: { $ne: id } });
      if (duplicate) {
        return sendError(res, 'Another subject with this name already exists', 400);
      }
      subject.name = name;
    }

    if (description !== undefined) subject.description = description;
    if (color) subject.color = color;

    await subject.save();
    logger.info(`Subject updated: ${id}`);
    return sendSuccess(res, subject, 'Subject updated successfully');
  } catch (error) {
    logger.error(`Error in updateSubject: ${error.message}`);
    return sendError(res, 'Failed to update subject', 500, error);
  }
};

// Delete a subject and cascade delete documents, quizzes, and flashcards
export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const subject = await Subject.findOne({ _id: id, userId });
    if (!subject) {
      return sendError(res, 'Subject not found or unauthorized', 404);
    }

    // Cascade delete other collections tied to this subject
    await Document.deleteMany({ subjectId: id });
    await Quiz.deleteMany({ subjectId: id });
    await Flashcard.deleteMany({ subjectId: id });
    await Subject.deleteOne({ _id: id });

    logger.info(`Subject deleted cascadingly: ${id} by user ${userId}`);
    return sendSuccess(res, null, 'Subject and all associated materials deleted successfully');
  } catch (error) {
    logger.error(`Error in deleteSubject: ${error.message}`);
    return sendError(res, 'Failed to delete subject', 500, error);
  }
};

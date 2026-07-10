import { Flashcard } from '../models/Flashcard.js';
import { Document } from '../models/Document.js';
import { Subject } from '../models/Subject.js';
import { generateFlashcards } from '../services/geminiService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// AI Generate flashcards based on subject notes
export const generateNewFlashcards = async (req, res) => {
  try {
    const { subjectId, documentId, count = 8 } = req.body;
    const userId = req.user._id;

    if (!subjectId) {
      return sendError(res, 'subjectId is required', 400);
    }

    const subject = await Subject.findOne({ _id: subjectId, userId });
    if (!subject) {
      return sendError(res, 'Subject not found or unauthorized', 404);
    }

    let sourceText = '';
    if (documentId) {
      const doc = await Document.findOne({ _id: documentId, userId });
      if (!doc) return sendError(res, 'Document not found', 404);
      sourceText = doc.extractedText || '';
    } else {
      const docs = await Document.find({ subjectId, userId });
      sourceText = docs.map(d => d.extractedText).join('\n\n');
    }

    if (!sourceText || sourceText.trim().length < 50) {
      return sendError(res, 'Insufficient study materials. Please upload text documents first to generate flashcards.', 400);
    }

    logger.info(`Generating ${count} flashcards for subject ${subject.name}`);
    const cardData = await generateFlashcards(sourceText, count);

    const createdCards = await Flashcard.insertMany(
      cardData.map(card => ({
        subjectId,
        userId,
        front: card.front,
        back: card.back,
        difficulty: 'medium',
        lastReviewed: null,
      }))
    );

    logger.info(`Generated ${createdCards.length} flashcards for user ${userId}`);
    return sendSuccess(res, createdCards, 'Flashcards generated successfully', 201);
  } catch (error) {
    logger.error(`Error in generateNewFlashcards: ${error.message}`);
    return sendError(res, 'Failed to generate flashcards', 500, error);
  }
};

// Create flashcard manually
export const createFlashcard = async (req, res) => {
  try {
    const { subjectId, front, back } = req.body;
    const userId = req.user._id;

    if (!subjectId || !front || !back) {
      return sendError(res, 'subjectId, front, and back content are required', 400);
    }

    const subject = await Subject.findOne({ _id: subjectId, userId });
    if (!subject) {
      return sendError(res, 'Subject not found or unauthorized', 404);
    }

    const newCard = await Flashcard.create({
      subjectId,
      userId,
      front,
      back,
      difficulty: 'medium',
      lastReviewed: null,
    });

    logger.info(`Flashcard created manually: ${newCard._id}`);
    return sendSuccess(res, newCard, 'Flashcard created successfully', 201);
  } catch (error) {
    logger.error(`Error in createFlashcard: ${error.message}`);
    return sendError(res, 'Failed to create flashcard', 500, error);
  }
};

// Get all flashcards for a specific subject
export const getFlashcardsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user._id;

    const cards = await Flashcard.find({ subjectId, userId });
    return sendSuccess(res, cards, 'Flashcards retrieved successfully');
  } catch (error) {
    logger.error(`Error in getFlashcardsBySubject: ${error.message}`);
    return sendError(res, 'Failed to retrieve flashcards', 500, error);
  }
};

// Update flashcard review details (spaced repetition feedback loop)
export const updateFlashcardDifficulty = async (req, res) => {
  try {
    const { id } = req.params;
    const { difficulty } = req.body; // 'easy' | 'medium' | 'hard'
    const userId = req.user._id;

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return sendError(res, 'Invalid difficulty score. Allowed: easy, medium, hard', 400);
    }

    const card = await Flashcard.findOne({ _id: id, userId });
    if (!card) {
      return sendError(res, 'Flashcard not found or unauthorized', 404);
    }

    card.difficulty = difficulty;
    card.lastReviewed = new Date();
    await card.save();

    logger.info(`Flashcard review updated: ${id} as ${difficulty}`);
    return sendSuccess(res, card, 'Flashcard reviewed successfully');
  } catch (error) {
    logger.error(`Error in updateFlashcardDifficulty: ${error.message}`);
    return sendError(res, 'Failed to update review status', 500, error);
  }
};

// Delete a flashcard
export const deleteFlashcard = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const card = await Flashcard.findOneAndDelete({ _id: id, userId });
    if (!card) {
      return sendError(res, 'Flashcard not found or unauthorized', 404);
    }

    logger.info(`Flashcard deleted: ${id}`);
    return sendSuccess(res, null, 'Flashcard deleted successfully');
  } catch (error) {
    logger.error(`Error in deleteFlashcard: ${error.message}`);
    return sendError(res, 'Failed to delete flashcard', 500, error);
  }
};

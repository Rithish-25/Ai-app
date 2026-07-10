import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Document } from '../models/Document.js';
import { Subject } from '../models/Subject.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../services/cloudinaryService.js';
import { generateSummary } from '../services/geminiService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// Text parser helper for local parsing
const extractTextFromFile = async (filePath, fileType) => {
  try {
    if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(dataBuffer);
      return parsed.text || '';
    } else if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    } else if (fileType === 'txt') {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    logger.error(`Failed text extraction for ${filePath}: ${error.message}`);
  }
  return '';
};

// Upload document and generate AI summary
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    const { subjectId } = req.body;
    const userId = req.user._id;

    if (!subjectId) {
      // Clean up the local file if verification fails
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return sendError(res, 'subjectId is required', 400);
    }

    // Check if subject exists and belongs to user
    const subject = await Subject.findOne({ _id: subjectId, userId });
    if (!subject) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return sendError(res, 'Subject not found or unauthorized', 404);
    }

    const localFilePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    let fileType = 'txt';
    if (ext === '.pdf') fileType = 'pdf';
    else if (ext === '.docx') fileType = 'docx';
    else if (ext === '.pptx') fileType = 'ppt';
    else if (['.png', '.jpg', '.jpeg'].includes(ext)) fileType = 'image';

    logger.info(`Parsing uploaded file: ${req.file.originalname} of type ${fileType}`);
    
    // Extract text content locally for AI analysis
    const textContent = await extractTextFromFile(localFilePath, fileType);

    // Upload to Cloudinary (this automatically unlinks the local file inside)
    const uploadResult = await uploadToCloudinary(localFilePath, `study_assistant/${userId}`);

    // Call AI service to generate a summary
    let summaryText = '';
    if (textContent.trim().length > 0) {
      logger.info('Generating AI summary for document...');
      summaryText = await generateSummary(textContent);
    } else {
      summaryText = 'AI summary could not be generated: No readable text detected in this document.';
    }

    const newDocument = await Document.create({
      subjectId,
      userId,
      fileName: req.file.originalname,
      fileUrl: uploadResult.url,
      fileType,
      extractedText: textContent,
      summary: summaryText,
    });

    logger.info(`Document successfully created: ${newDocument._id}`);
    return sendSuccess(res, newDocument, 'Document uploaded and analyzed successfully', 201);
  } catch (error) {
    logger.error(`Error in uploadDocument: ${error.message}`);
    return sendError(res, 'Failed to upload document', 500, error);
  }
};

// Get all documents for a specific subject
export const getDocumentsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user._id;

    // Verify ownership of the subject
    const subject = await Subject.findOne({ _id: subjectId, userId });
    if (!subject) {
      return sendError(res, 'Subject not found or unauthorized', 404);
    }

    const documents = await Document.find({ subjectId, userId }).select('-extractedText'); // Exclude heavy text body in listing
    return sendSuccess(res, documents, 'Documents retrieved successfully');
  } catch (error) {
    logger.error(`Error in getDocumentsBySubject: ${error.message}`);
    return sendError(res, 'Failed to retrieve documents', 500, error);
  }
};

// Get a single document details including text/summary
export const getDocumentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const doc = await Document.findOne({ _id: id, userId });
    if (!doc) {
      return sendError(res, 'Document not found or unauthorized', 404);
    }

    return sendSuccess(res, doc, 'Document details retrieved successfully');
  } catch (error) {
    logger.error(`Error in getDocumentDetails: ${error.message}`);
    return sendError(res, 'Failed to retrieve document details', 500, error);
  }
};

// Delete a document from MongoDB and Cloudinary
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const doc = await Document.findOne({ _id: id, userId });
    if (!doc) {
      return sendError(res, 'Document not found or unauthorized', 404);
    }

    // Delete from Cloudinary
    const publicId = extractPublicIdFromUrl(doc.fileUrl);
    if (publicId) {
      logger.info(`Deleting asset from Cloudinary: ${publicId}`);
      await deleteFromCloudinary(publicId);
    }

    // Delete from database
    await Document.deleteOne({ _id: id });
    logger.info(`Document deleted from database: ${id}`);

    return sendSuccess(res, null, 'Document deleted successfully');
  } catch (error) {
    logger.error(`Error in deleteDocument: ${error.message}`);
    return sendError(res, 'Failed to delete document', 500, error);
  }
};

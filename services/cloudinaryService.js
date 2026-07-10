import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import { logger } from '../utils/logger.js';

export const uploadToCloudinary = async (filePath, folder = 'study_assistant') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto', // Detects pdf, docx, image automatically
    });
    
    // Clean up local temporary file asynchronously
    fs.unlink(filePath, (err) => {
      if (err) logger.error(`Error deleting temp file ${filePath}: ${err.message}`);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    // Make sure to clean up the file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    logger.error(`Cloudinary upload error: ${error.message}`);
    throw new Error('Failed to upload file to cloud storage');
  }
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
    throw new Error('Failed to delete file from cloud storage');
  }
};

export const extractPublicIdFromUrl = (url) => {
  // Cloudinary URL: http://res.cloudinary.com/cloudname/image/upload/v1234567/folder/file.pdf
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const pathAndExt = parts[1].substring(parts[1].indexOf('/') + 1); // remove v1234567/
    const lastDotIndex = pathAndExt.lastIndexOf('.');
    return lastDotIndex !== -1 ? pathAndExt.substring(0, lastDotIndex) : pathAndExt;
  } catch (error) {
    logger.error(`Error extracting public ID: ${error.message}`);
    return null;
  }
};

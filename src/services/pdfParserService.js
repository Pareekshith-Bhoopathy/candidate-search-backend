// src/services/pdfParserService.js
const fs = require('fs');
const pdf = require('pdf-parse');
const logger = require('../utils/logger');

const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    logger.error(`PDF Parsing Error: ${error.message}`);
    throw new Error('Failed to parse PDF');
  }
};

module.exports = { extractTextFromPDF };
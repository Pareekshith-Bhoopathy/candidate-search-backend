// src/controllers/candidateController.js
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { extractTextFromPDF } = require('../services/pdfParserService');
const { getEmbeddings, getLLMResponse } = require('../services/azureOpenAIService');
const { createCandidate, createOrUpdateCandidate } = require('../services/graphDBService');
const Candidate = require('../models/Candidate');
const config = require('../config/config');
const logger = require('../utils/logger');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

// Upload Candidates
const uploadCandidates = [
  upload.array('files'),
  async (req, res) => {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
      }

      const candidateResponses = [];

      for (const file of files) {
        if (file.mimetype !== 'application/pdf') {
          fs.unlinkSync(file.path);
          return res.status(400).json({ message: 'Only PDF files are allowed.' });
        }

        // Extract text from PDF
        const text = await extractTextFromPDF(file.path);

        // Prepare prompt for LLM
        const prompt = `
        Extract the candidate information from the following resume text and provide it in JSON format according to the schema below:
        - extract as much data as possible. list all the possible skills, certifications, and any other relevant information.
        - list all the skills from the resume text. everything as skills.
        - calculate the total years of experience from all work experiences mentioned.
        - If no specific data for a field is mentioned in the resume text, set it to "Not specified".
        - expected output:
        {
        "email": "string",
        "phone": "string",
        "name": "string",
        "summary": "string",
        "experience": "string",
        "totalExperienceYears": float,
        "education": "string",
        "skills": ["string"],
        "certifications": ["string"],
        "linkedin": "string",
        "portfolio": "string"
        }

        Resume Text:
        ${text}
        `;

        // Get LLM response
        const llmOutput = await getLLMResponse(prompt);

        // Parse JSON
        let candidateData;
        try {
        // Remove any markdown formatting if present
        const cleanedOutput = llmOutput.replace(/```json\n|\n```/g, '').trim();
        candidateData = JSON.parse(cleanedOutput);
        } catch (error) {
        logger.error(`JSON Parsing Error: ${error.message}`);
        logger.error(`LLM Output: ${llmOutput}`);
        return res.status(500).json({ message: 'Failed to parse candidate data.' });
        }

        // Validate required fields
        const requiredFields = ['email', 'phone', 'name', 'summary', 'experience', 'skills'];
        for (const field of requiredFields) {
        if (!candidateData[field]) {
            return res.status(400).json({ message: `Missing field: ${field}` });
        }
        }

        // Set default values for optional fields
        candidateData.education = candidateData.education || 'Not specified';
        candidateData.certifications = candidateData.certifications || [];
        candidateData.linkedin = candidateData.linkedin || '';
        candidateData.portfolio = candidateData.portfolio || '';

        // Get embeddings
        const embedding = await getEmbeddings(candidateData.summary);

        // Create Candidate in Graph DB
        await createOrUpdateCandidate(candidateData, embedding);
        // Prepare response
        candidateResponses.push({
          id: candidateData.email,
          ...candidateData,
        });
      }

      return res.status(200).json({ candidates: candidateResponses });
    } catch (error) {
      logger.error(`Upload Candidates Error: ${error.message}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },
];

module.exports = { uploadCandidates };
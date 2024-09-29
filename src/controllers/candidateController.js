// src/controllers/candidateController.js
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { extractTextFromPDF } = require('../services/pdfParserService');
const { getEmbeddings, getLLMResponse } = require('../services/azureOpenAIService');
const { createOrUpdateCandidate } = require('../services/graphDBService');
const config = require('../config/config');
const logger = require('../utils/logger');
const sqliteQueue = require('../services/sqliteQueue');

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

const processUpload = async (file) => {
  try {
    const text = await extractTextFromPDF(file.path);
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

    const { content: llmOutput, error: llmError, retryAfter } = await getLLMResponse(prompt);
    if (llmError) {
      if (llmError === 'Rate limited') {
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
      }
      throw new Error(llmError);
    }

    const cleanedOutput = llmOutput.replace(/```json\n|\n```/g, '').trim();
    const candidateData = JSON.parse(cleanedOutput);

    const { embedding, error: embeddingError } = await getEmbeddings(candidateData.summary);
    if (embeddingError) {
      if (embeddingError === 'Rate limited') {
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
      }
      throw new Error(embeddingError);
    }

    await createOrUpdateCandidate(candidateData, embedding);
    return { id: candidateData.email, ...candidateData };
  } catch (error) {
    logger.error(`Upload Processing Error: ${error.message}`);
    throw error;
  }
};

const processJob = async (job) => {
  try {
    const result = await processUpload(job.data);
    sqliteQueue.completeJob(job.id, result);
    logger.info(`Job ${job.id} completed processing for candidate: ${result.email}`);
  } catch (error) {
    if (error.message.includes('Rate limited')) {
      const retryAfter = parseInt(error.message.split('after ')[1]) || 60;
      const retryTime = Math.floor(Date.now() / 1000) + retryAfter;
      sqliteQueue.failJob(job.id, error, retryTime);
      throw error; // Rethrow the error to be caught in processNextJob
    } else {
      sqliteQueue.failJob(job.id, error);
      throw error; // Rethrow other errors as well
    }
  }
};

const processNextJob = async () => {
  const job = sqliteQueue.getNextReadyJob();
  if (job) {
    try {
      await processJob(job);
      // If job processed successfully, immediately process the next job
      setTimeout(processNextJob, 0);
    } catch (error) {
      if (error.message.includes('Rate limited')) {
        const retryAfter = parseInt(error.message.split('after ')[1]) || 60;
        logger.info(`Job ${job.id} rate limited. Will retry after ${retryAfter} seconds.`);
        // Schedule the next job processing after the retry time
        setTimeout(processNextJob, retryAfter * 1000);
      } else {
        // If there's a non-rate-limit error, log it and move to the next job
        logger.error(`Job ${job.id} failed processing. Error: ${error.message}`);
        setTimeout(processNextJob, 0);
      }
    }
  } else {
    // No jobs ready, check again after a short delay
    setTimeout(processNextJob, 1000);
  }
};

const processJobs = async () => {
  // Start processing jobs
  processNextJob();
};

const uploadCandidates = [
  upload.array('files'),
  async (req, res) => {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
      }

      const jobIds = files.map(file => sqliteQueue.add(file));

      res.status(202).json({
        message: 'Files uploaded and queued for processing.',
        jobIds: jobIds
      });

      // Start processing jobs if not already running
      if (!global.isProcessingJobs) {
        global.isProcessingJobs = true;
        processJobs();
      }
    } catch (error) {
      logger.error(`Upload Candidates Error: ${error.message}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
];

const getUploadStatus = async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = sqliteQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json({ jobId, state: job.status, result: job.result });
  } catch (error) {
    logger.error(`Get Upload Status Error: ${error.message}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { uploadCandidates, getUploadStatus, processJobs};
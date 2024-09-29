// src/routes/candidateRoutes.js
const express = require('express');
const { uploadCandidates, getUploadStatus } = require('../controllers/candidateController');

const router = express.Router();

/**
 * @route POST /api/candidates/upload
 * @desc Upload one or multiple PDF resumes
 * @access Public
 */
router.post('/upload', uploadCandidates);

/**
 * @route GET /api/candidates/upload/:jobId
 * @desc Get the status of an upload job
 * @access Public
 */
router.get('/upload/:jobId', getUploadStatus);

module.exports = router;
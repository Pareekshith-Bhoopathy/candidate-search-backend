// src/routes/candidateRoutes.js
const express = require('express');
const { uploadCandidates } = require('../controllers/candidateController');

const router = express.Router();

/**
 * @route POST /api/candidates/upload
 * @desc Upload one or multiple PDF resumes
 * @access Public
 */
router.post('/upload', uploadCandidates);

module.exports = router;
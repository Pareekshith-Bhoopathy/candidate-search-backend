// src/routes/searchRoutes.js
const express = require('express');
const { searchCandidatesHandler } = require('../controllers/searchController');

const router = express.Router();

/**
 * @route POST /api/search
 * @desc Search candidates with filters or natural language queries
 * @access Public
 */
router.post('/', searchCandidatesHandler);

module.exports = router;
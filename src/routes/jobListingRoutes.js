// src/routes/jobListingRoutes.js
const express = require('express');
const { matchJobListing } = require('../controllers/jobListingController');

const router = express.Router();

/**
 * @route POST /api/job_listings/match
 * @desc Upload a job listing and find best-suited candidates
 * @access Public
 */
router.post('/match', matchJobListing);

module.exports = router;
// src/app.js
const express = require('express');
const path = require('path');
const candidateRoutes = require('./routes/candidateRoutes');
const searchRoutes = require('./routes/searchRoutes');
const jobListingRoutes = require('./routes/jobListingRoutes');
const config = require('./config/config');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/candidates', candidateRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/job_listings', jobListingRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root Endpoint
app.get('/', (req, res) => {
  res.send({ message: 'Welcome to the Candidate Search API' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled Error: ${err.message}`);
  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
// src/server.js
const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');
const cors = require('cors');

// Ensure upload directory exists
const fs = require('fs');
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}


// CORS configuration
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow all methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
  credentials: true, // Allow cookies to be sent with requests
  optionsSuccessStatus: 200 // Set the status for successful OPTIONS requests
};

app.use(cors(corsOptions));
// Start Server
app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`);
});
// src/server.js
const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');

// Ensure upload directory exists
const fs = require('fs');
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Start Server
app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`);
});
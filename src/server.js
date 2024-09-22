// src/server.js
const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');
const cors = require('cors');

app.use(cors());
// Ensure upload directory exists
const fs = require('fs');
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}


const corsOptions = {
  origin: '*', // Allow all origins
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'Authorization']
};


app.use(cors(corsOptions));
// Start Server
app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`);
});
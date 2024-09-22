// src/config/config.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  azureOpenAI: {
    embeddingsEndpoint: process.env.AZURE_OPENAI_EMBEDDINGS_ENDPOINT,
    embeddingsKey: process.env.AZURE_OPENAI_EMBEDDINGS_KEY,
    llmEndpoint: process.env.AZURE_OPENAI_LLM_ENDPOINT,
    llmKey: process.env.AZURE_OPENAI_LLM_KEY,
  },
  neo4j: {
    uri: process.env.NEO4J_URI,
    user: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD,
  },
  uploadDir: process.env.UPLOAD_DIRECTORY || './uploads',
  port: process.env.PORT || 3000,
};
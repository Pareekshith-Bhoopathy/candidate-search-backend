// src/services/azureOpenAIService.js
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');
const logger = require('../utils/logger');

const getEmbeddings = async (text) => {
  try {
    const response = await axios.post(
      config.azureOpenAI.embeddingsEndpoint,
      { input: text },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.azureOpenAI.embeddingsKey,
        },
      }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    logger.error(`Azure OpenAI Embeddings Error: ${error.message}`);
    throw new Error('Failed to get embeddings');
  }
};

const getLLMResponse = async (prompt) => {
  try {
    const response = await axios.post(
      config.azureOpenAI.llmEndpoint,
      {
        messages: [
          { role: 'system', content: 'You are an intelligent assistant that extracts candidate information.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 3000,
        model: 'gpt-4o',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.azureOpenAI.llmKey,
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error(`Azure OpenAI LLM Error: ${error.message}`);
    throw new Error('Failed to get LLM response');
  }
};

module.exports = { getEmbeddings, getLLMResponse };
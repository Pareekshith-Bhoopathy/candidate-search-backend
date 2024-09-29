const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');
const logger = require('../utils/logger');

const handleRateLimit = (error) => {
  if (error.response && error.response.status === 429) {
    const retryAfter = parseInt(error.response.headers['retry-after']) || 14;
    return { isRateLimited: true, retryAfter };
  }
  return { isRateLimited: false, retryAfter: 0 };
};

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
    return { embedding: response.data.data[0].embedding, error: null };
  } catch (error) {
    const { isRateLimited, retryAfter } = handleRateLimit(error);
    if (isRateLimited) {
      return { embedding: null, error: 'Rate limited', retryAfter };
    }
    logger.error(`Azure OpenAI Embeddings Error: ${error.message}`);
    return { embedding: null, error: 'Failed to get embeddings' };
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
    return { content: response.data.choices[0].message.content, error: null };
  } catch (error) {
    const { isRateLimited, retryAfter } = handleRateLimit(error);
    if (isRateLimited) {
      return { content: null, error: 'Rate limited', retryAfter };
    }
    logger.error(`Azure OpenAI LLM Error: ${error.message}`);
    return { content: null, error: 'Failed to get LLM response' };
  }
};

module.exports = { getEmbeddings, getLLMResponse };
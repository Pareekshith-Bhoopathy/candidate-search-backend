// src/controllers/jobListingController.js
const { getEmbeddings, getLLMResponse } = require('../services/azureOpenAIService');
const { getCandidateByEmailOrPhone, getAllCandidates } = require('../services/graphDBService');
const logger = require('../utils/logger');

const matchJobListing = async (req, res) => {
  try {
    const { title, location, description, limit = 10 } = req.body;

    if (!description) {
      return res.status(400).json({ message: 'Job description is required.' });
    }

    const { embedding: jobEmbedding, error: embeddingError, retryAfter: embeddingRetryAfter } = await getEmbeddings(description);
    if (embeddingError) {
      if (embeddingError === 'Rate limited') {
        return res.status(429).json({ message: 'Rate limit reached', retryAfter: embeddingRetryAfter });
      }
      throw new Error(embeddingError);
    }

    const candidates = await getAllCandidates();

    if (candidates.length === 0) {
      return res.status(200).json({ candidates: [] });
    }

    const candidateData = candidates.map(c => ({
      name: c.name,
      email: c.email,
      summary: c.summary,
      experience: c.experience,
      skills: Array.isArray(c.skills) ? c.skills.join(', ') : c.skills
    }));

    const gradingPrompt = `
You are an expert AI recruiter. Your task is to evaluate and rank candidates based on the given job description. Here are the detailed instructions:

1. Carefully review the job description and requirements.
2. Evaluate each candidate based on how well they match the job description. Consider the following factors:
   - Relevance of their skills to the required skills
   - Years and quality of experience
   - Overall suitability based on their summary
3. Assign a score from 0 to 100 for each candidate, where 100 is a perfect match and 0 is completely irrelevant.
4. Rank the candidates based on their scores.
5. Provide a brief explanation (1-2 sentences) for each candidate's score.
6. Return the top ${limit} candidates in JSON format.

Job Description:
${description}

Candidate Information:
${JSON.stringify(candidateData, null, 2)}

Output Format:
[
  {
    "name": "Candidate Name",
    "email": "candidate@example.com",
    "score": 95,
    "explanation": "Brief explanation of the score"
  },
  ...
]

Only return the JSON array, nothing else. If no candidates match the criteria, return an empty array.
`;

    const { content: llmOutput, error: llmError, retryAfter: llmRetryAfter } = await getLLMResponse(gradingPrompt);
    if (llmError) {
      if (llmError === 'Rate limited') {
        return res.status(429).json({ message: 'Rate limit reached', retryAfter: llmRetryAfter });
      }
      throw new Error(llmError);
    }

    let gradedCandidates;
    try {
      const cleanedOutput = llmOutput.replace(/```json\n|\n```/g, '').trim();
      gradedCandidates = JSON.parse(cleanedOutput);
    } catch (error) {
      logger.error(`LLM Output Parsing Error: ${error.message}`);
      logger.error(`Raw LLM Output: ${llmOutput}`);
      return res.status(500).json({ message: 'Failed to parse LLM response.' });
    }

    if (!Array.isArray(gradedCandidates) || gradedCandidates.length === 0) {
      return res.status(200).json({ candidates: [] });
    }

    gradedCandidates.sort((a, b) => b.score - a.score);

    const response = [];

    for (const candidate of gradedCandidates) {
      const candidateData = await getCandidateByEmailOrPhone(candidate.email);
      if (candidateData) {
        const { embedding, ...candidateWithoutEmbedding } = candidateData;
        response.push({
          ...candidateWithoutEmbedding,
          score: candidate.score,
          explanation: candidate.explanation
        });
      }
    }

    return res.status(200).json({ candidates: response });
  } catch (error) {
    logger.error(`Match Job Listing Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { matchJobListing };
// src/controllers/searchController.js
const logger = require('../utils/logger');
const { getAllCandidates, getCandidateByEmailOrPhone } = require('../services/graphDBService');
const { getLLMResponse } = require('../services/azureOpenAIService');

const searchCandidatesHandler = async (req, res) => {
  try {
    const { query, filters, limit = 10 } = req.body;

    let candidates;
    if (query || filters) {
      candidates = await getAllCandidates();
    } else {
      return res.status(400).json({ message: 'No search parameters provided.' });
    }

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
You are an expert AI recruiter. Your task is to evaluate and rank candidates based on the given criteria. Here are the detailed instructions:

1. Carefully review the information for each candidate, including their name, email, summary, experience, and skills.
2. Consider the following search criteria:
   ${query ? `Natural language query: ${query}` : `Filters: ${JSON.stringify(filters)}`}
3. Evaluate each candidate based on how well they match the search criteria. Consider the following factors:
   - Relevance of their skills to the required skills (if specified)
   - Years and quality of experience
   - Overall suitability based on their summary
4. Assign a score from 0 to 100 for each candidate, where 100 is a perfect match and 0 is completely irrelevant.
5. Rank the candidates based on their scores.
6. Provide a brief explanation (1-2 sentences) for each candidate's score.
7. Return the top ${limit} candidates in JSON format.

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

    const { content: llmOutput, error: llmError, retryAfter } = await getLLMResponse(gradingPrompt);
    if (llmError) {
      if (llmError === 'Rate limited') {
        return res.status(429).json({ message: 'Rate limit reached', retryAfter });
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
    const topCandidates = gradedCandidates.slice(0, limit);

    const result = [];
    for (const candidate of topCandidates) {
      const fullData = await getCandidateByEmailOrPhone(candidate.email);
      if (fullData) {
        const { embedding, ...candidateWithoutEmbedding } = fullData;
        result.push({
          ...candidateWithoutEmbedding,
          score: candidate.score,
          explanation: candidate.explanation
        });
      }
    }

    return res.status(200).json({ candidates: result });
  } catch (error) {
    logger.error(`Search Candidates Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = { searchCandidatesHandler };
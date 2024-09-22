# Candidate Search Backend

## Overview

This project is a Node.js-based API backend built with Express. It handles the upload and processing of candidate resumes, embedding data using Azure OpenAI services, storing information in a Neo4j graph database, and providing advanced search functionalities.

## Features


```7:17:candidate-search-backend/README.md
## Features

- **Resume Upload:** Accepts single or multiple PDF resumes.
- **Data Extraction:** Parses PDF resumes using LLM to extract structured candidate information.
- **Embedding:** Generates embeddings for candidate data using Azure OpenAI Embeddings.
- **Graph Database Storage:** Stores candidate data in a Neo4j graph database.
- **Search Functionality:**
  - **Normal Filters:** Search by experience, skills, technology stack, etc.
  - **Prompt-Based Search:** Natural language queries like "most experienced in React".
  - **Job Listing Matching:** Upload a job listing and find the best-suited candidates.
- **Candidate Details Retrieval:** Fetch candidate contact information and associated PDF data.
```


## Prerequisites


```23:25:candidate-search-backend/README.md
- **Node.js**: v14.x or higher
- **Neo4j Database**
- **Azure OpenAI Service Account**
```


## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (see Configuration section)
4. Start the server:
   ```
   npm start
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_API_ENDPOINT=your_azure_openai_endpoint
```

## API Endpoints

### 1. Upload Candidates

- **URL:** `/api/candidates/upload`
- **Method:** `POST`
- **Description:** Upload one or more candidate resumes in PDF format.
- **Request Body:** "files" Form-data with PDF files
- **Response:**
  ```json
  {
    "candidates": [
      {
        "id": "candidate@example.com",
        "email": "candidate@example.com",
        "phone": "+1234567890",
        "name": "John Doe",
        "summary": "Experienced software developer...",
        "experience": "5 years at XYZ...",
        "totalExperienceYears": 5,
        "education": "B.Tech in Computer Science...",
        "skills": ["JavaScript", "React", "Node.js"],
        "certifications": ["AWS Certified", "Certified Scrum Master"],
        "linkedin": "https://linkedin.com/in/johndoe",
        "portfolio": "https://johndoe.com"
      }
    ]
  }
  ```

### 2. Search Candidates

- **URL:** `/api/search`
- **Method:** `POST`
- **Description:** Search candidates with filters or natural language queries.
- **Request Body:**
  - For Prompt-Based Search:
    ```json
    {
      "query": "Candidate with the most years of experience in React"
    }
    ```
  - For Filter-Based Search:
    ```json
    {
      "filters": {
        "experience": 5,
        "skills": ["React", "Node.js"]
      },
      "limit": 10
    }
    ```
- **Response:**
  ```json
  {
    "candidates": [
      {
        "email": "candidate@example.com",
        "phone": "+1234567890",
        "name": "John Doe",
        "summary": "Experienced software developer...",
        "experience": "5 years at XYZ...",
        "totalExperienceYears": 5,
        "education": "B.Tech in Computer Science...",
        "skills": ["JavaScript", "React", "Node.js"],
        "certifications": ["AWS Certified", "Certified Scrum Master"],
        "linkedin": "https://linkedin.com/in/johndoe",
        "portfolio": "https://johndoe.com",
        "score": 95,
        "explanation": "Strong experience in React and relevant skills"
      }
    ]
  }
  ```

### 3. Match Job Listing

- **URL:** `/api/job_listings/match`
- **Method:** `POST`
- **Description:** Upload a job listing and retrieve matched candidates.
- **Request Body:**
  ```json
  {
    "title": "Sr. Frontend Developer",
    "location": "Hyderabad, India",
    "description": "We are looking for an experienced frontend developer with expertise in React Native..."
  }
  ```
- **Response:**
  ```json
  {
    "candidates": [
      {
        "email": "candidate@example.com",
        "phone": "+1234567890",
        "name": "John Doe",
        "summary": "Experienced software developer...",
        "experience": "5 years at XYZ...",
        "totalExperienceYears": 5,
        "education": "B.Tech in Computer Science...",
        "skills": ["JavaScript", "React", "Node.js"],
        "certifications": ["AWS Certified", "Certified Scrum Master"],
        "linkedin": "https://linkedin.com/in/johndoe",
        "portfolio": "https://johndoe.com",
        "score": 95,
        "explanation": "Excellent match for the frontend developer position"
      }
    ]
  }
  ```

## Implementation Details

### Candidate Upload Process

1. The system accepts PDF resumes through the `/api/candidates/upload` endpoint.
2. For each PDF:
   - The text is extracted using a PDF parser.
   - The extracted text is sent to an LLM (Language Model) to structure the data.
   - The structured data is validated for required fields.
   - Embeddings are generated for the candidate's summary.
   - The candidate data and embedding are stored in the Neo4j database.


```27:106:candidate-search-backend/src/controllers/candidateController.js
  async (req, res) => {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
      }

      const candidateResponses = [];

      for (const file of files) {
        if (file.mimetype !== 'application/pdf') {
          fs.unlinkSync(file.path);
          return res.status(400).json({ message: 'Only PDF files are allowed.' });
        }

        // Extract text from PDF
        const text = await extractTextFromPDF(file.path);

        // Prepare prompt for LLM
        const prompt = `
        Extract the candidate information from the following resume text and provide it in JSON format according to the schema below:
        - extract as much data as possible. list all the possible skills, certifications, and any other relevant information.
        - list all the skills from the resume text. everything as skills.
        - calculate the total years of experience from all work experiences mentioned.
        - expected output:
        {
        "email": "string",
        "phone": "string",
        "name": "string",
        "summary": "string",
        "experience": "string",
        "totalExperienceYears": float,
        "education": "string",
        "skills": ["string"],
        "certifications": ["string"],
        "linkedin": "string",
        "portfolio": "string"
        }
${text}
        Resume Text:
        ${text}
        `;
        // Parse JSON
        // Get LLM response
        const llmOutput = await getLLMResponse(prompt);
        // Remove any markdown formatting if present
        // Parse JSON
        let candidateData;
        try {
        // Remove any markdown formatting if present
        const cleanedOutput = llmOutput.replace(/```json\n|\n```/g, '').trim();
        candidateData = JSON.parse(cleanedOutput);
        } catch (error) {
        logger.error(`JSON Parsing Error: ${error.message}`);
        logger.error(`LLM Output: ${llmOutput}`);
        return res.status(500).json({ message: 'Failed to parse candidate data.' });
        }
          if (!candidateData[field]) {
        // Validate required fields
        const requiredFields = ['email', 'phone', 'name', 'summary', 'experience', 'education', 'skills', 'certifications'];
        for (const field of requiredFields) {
          if (!candidateData[field]) {
            return res.status(400).json({ message: `Missing field: ${field}` });
          }
        }
        // Create Candidate in Graph DB
        // Get embeddings
        const embedding = await getEmbeddings(candidateData.summary);
        // Prepare response
        // Create Candidate in Graph DB
        await createOrUpdateCandidate(candidateData, embedding);
        // Prepare response
        candidateResponses.push({
          id: candidateData.email,
          ...candidateData,
        });
      }
      logger.error(`Upload Candidates Error: ${error.message}`);
      return res.status(200).json({ candidates: candidateResponses });
    } catch (error) {
```


### Search Process

1. The system accepts search queries or filters through the `/api/search` endpoint.
2. For prompt-based searches:
   - The query is sent to an LLM to evaluate and rank candidates.
   - The LLM returns scored and explained results.
3. For filter-based searches:
   - The system queries the Neo4j database using the provided filters.
4. The results are processed, sorted, and returned with scores and explanations.


```13:102:candidate-search-backend/src/controllers/searchController.js
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
  
      // Prepare candidate data for LLM grading
      const candidateData = candidates.map(c => ({
        name: c.name,
        email: c.email,
        summary: c.summary,
        experience: c.experience,
        skills: Array.isArray(c.skills) ? c.skills.join(', ') : c.skills
      }));
  
      // Prepare prompt for LLM grading
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
        return res.status(200).json({ candidates });
      const llmOutput = await getLLMResponse(gradingPrompt);
  
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
  
      // Sort candidates by score and limit the results
      gradedCandidates.sort((a, b) => b.score - a.score);
      const topCandidates = gradedCandidates.slice(0, limit);
  
      // Fetch full candidate data for the top candidates
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
```


### Job Listing Matching Process

1. The system accepts job listings through the `/api/job_listings/match` endpoint.
2. The job description is embedded using Azure OpenAI.
3. All candidates are retrieved from the database.
4. Candidate data is prepared and sent to an LLM for evaluation.
5. The LLM ranks and explains the suitability of each candidate.
6. The results are processed, sorted, and returned.


```7:71:candidate-search-backend/src/controllers/jobListingController.js
const matchJobListing = async (req, res) => {
    try {
      const { title, location, description } = req.body;
  
      if (!description) {
        return res.status(400).json({ message: 'Job description is required.' });
      }
  
      // Get embedding for job description
      const jobEmbedding = await getEmbeddings(description);
  
      // Retrieve all candidates
      const candidates = await getAllCandidates();
  
      if (candidates.length === 0) {
        return res.status(200).json({ candidates: [] });
      }
  
      // Prepare candidate data for LLM grading
      const candidateData = candidates.map(c => ({
        name: c.name,
        email: c.email,
        summary: c.summary,
        experience: c.experience,
        skills: Array.isArray(c.skills) ? c.skills.join(', ') : c.skills
      }));
  
      // Prepare prompt for LLM grading
      const gradingPrompt = `
  You are an expert AI recruiter. Your task is to evaluate and rank candidates based on the given job description. Here are the detailed instructions:
  
  1. Carefully review the job description and requirements.
  2. Evaluate each candidate based on how well they match the job description. Consider the following factors:
     - Relevance of their skills to the required skills
     - Years and quality of experience
     - Overall suitability based on their summary
  3. Assign a score from 0 to 100 for each candidate, where 100 is a perfect match and 0 is completely irrelevant.
  4. Rank the candidates based on their scores.
  5. Prov

  
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
  
      const llmOutput = await getLLMResponse(gradingPrompt);
  
      let gradedCandidates;
      try {
```


## Database Schema

The system uses Neo4j, a graph database, to store candidate information. The main node type is `Candidate` with properties corresponding to the fields extracted from resumes.


```44:82:candidate-search-backend/src/services/graphDBService.js
const createOrUpdateCandidate = async (candidateData, embedding) => {
    const session = driver.session();
    try {
      const result = await session.run(
        `
        MERGE (c:Candidate {email: $email})
        ON CREATE SET c = $candidateData, c.embedding = $embedding, c.totalExperienceYears = $totalExperienceYears
        ON MATCH SET c += $candidateData, c.embedding = $embedding, c.totalExperienceYears = $totalExperienceYears
        RETURN c
        `,
        {
          email: candidateData.email,
          candidateData: { ...candidateData, embedding: null, totalExperienceYears: null },
          embedding: embedding,
          totalExperienceYears: candidateData.totalExperienceYears
        }
      );
      logger.info(`Candidate ${candidateData.email} created or updated successfully.`);
      return result.records[0].get('c').properties;
    } catch (error) {
      logger.error(`Neo4j Error: ${error.message}`);
      throw new Error('Failed to create or update candidate in graph DB');
    } finally {
      await session.close();
    }
  };
    await session.close();
  const getAllCandidates = async () => {
    const session = driver.session();
    try {
      const result = await session.run(`MATCH (c:Candidate) RETURN c`);
      return result.records.map((record) => record.get('c').properties);
    } catch (error) {
      logger.error(`Neo4j Fetch Error: ${error.message}`);
      throw new Error('Failed to fetch candidates');
    } finally {
      await session.close();
    }
  };
```


## Error Handling

The system logs errors and provides appropriate error responses. Common errors include:
- PDF parsing issues
- LLM output parsing errors
- Database connection or query errors

Error logs can be found in the `app.log` file.

## Future Improvements

1. Implement user authentication and authorization.
2. Add more advanced filtering options for candidate searches.
3. Implement a caching mechanism to improve performance for frequent searches.
4. Add support for more resume formats (e.g., DOCX, TXT).
5. Implement a feedback system to improve LLM accuracy over time.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
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

Certainly! I'll add the new API changes to the README, providing detailed information about the request and response for all endpoints. Here's the updated API Endpoints section for the README:

## API Endpoints

### 1. Upload Candidates

- **URL:** `/api/candidates/upload`
- **Method:** `POST`
- **Description:** Upload one or more candidate resumes in PDF format. The files are queued for processing.
- **Request Body:** Form-data with "files" field containing PDF files
- **Response:**
  ```json
  {
    "message": "Files uploaded and queued for processing.",
    "jobIds": ["1", "2", "3"]
  }
  ```
  - `jobIds`: An array of job IDs for each uploaded file. These can be used to check the processing status.

### 2. Get Upload Status

- **URL:** `/api/candidates/upload/:jobId`
- **Method:** `GET`
- **Description:** Check the status of a specific upload job.
- **Parameters:** 
  - `jobId`: The ID of the upload job (received from the upload response)
- **Response:**
  ```json
  {
    "jobId": "1",
    "state": "completed",
    "result": {
      "id": "candidate@example.com",
      "email": "candidate@example.com",
      "phone": "+1234567890",
      "name": "John Doe",
      "summary": "Experienced software developer...",
      "experience": "5 years of experience in...",
      "totalExperienceYears": 5,
      "education": "Bachelor's in Computer Science",
      "skills": ["JavaScript", "React", "Node.js"],
      "certifications": ["AWS Certified Developer"],
      "linkedin": "linkedin.com/in/johndoe",
      "portfolio": "johndoe.com"
    }
  }
  ```
  - `state`: Can be "waiting", "active", "completed", "failed", or "delayed"
  - `result`: The processed candidate data (only present if state is "completed")

### 3. Search Candidates

- **URL:** `/api/search`
- **Method:** `POST`
- **Description:** Search candidates with filters or natural language queries.
- **Request Body:**
  - For Prompt-Based Search:
    ```json
    {
      "query": "Candidate with the most years of experience in React",
      "limit": 3
    }
    ```
  - For Filter-Based Search:
    ```json
    {
      "filters": {
        "experience": 2,
        "skills": ["React", "CSS"]
      },
      "limit": 3
    }
    ```
- **Response:**
  ```json
  {
    "candidates": [
      {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1987654321",
        "summary": "Experienced React developer...",
        "experience": "7 years of experience...",
        "totalExperienceYears": 7,
        "education": "Master's in Computer Science",
        "skills": ["React", "JavaScript", "CSS"],
        "certifications": ["React Certification"],
        "linkedin": "linkedin.com/in/janesmith",
        "portfolio": "janesmith.com",
        "score": 95,
        "explanation": "Extensive experience in React development."
      },
      // ... more candidates
    ]
  }
  ```

### 4. Match Job Listing

- **URL:** `/api/job_listings/match`
- **Method:** `POST`
- **Description:** Upload a job listing and retrieve matched candidates.
- **Request Body:**
  ```json
  {
    "title": "Sr. Frontend Developer",
    "location": "Hyderabad, India",
    "description": "We are looking for an experienced frontend developer with expertise in React",
    "limit": 3
  }
  ```
- **Response:**
  ```json
  {
    "candidates": [
      {
        "name": "Alex Johnson",
        "email": "alex@example.com",
        "phone": "+1122334455",
        "summary": "Senior frontend developer with React expertise...",
        "experience": "8 years of experience in frontend development...",
        "totalExperienceYears": 8,
        "education": "Bachelor's in Software Engineering",
        "skills": ["React", "JavaScript", "TypeScript", "HTML", "CSS"],
        "certifications": ["React Advanced Concepts"],
        "linkedin": "linkedin.com/in/alexjohnson",
        "portfolio": "alexjohnson.dev",
        "score": 95,
        "explanation": "Extensive experience in React and frontend development, perfectly matching the job requirements."
      },
      // ... more candidates
    ]
  }
  ```

## Error Handling

The system now includes improved error handling for rate limiting:

- If a rate limit is reached during candidate upload processing, search, or job matching, the API will respond with a 429 status code and include a `retryAfter` value in the response.

Example rate limit error response:
```json
{
  "message": "Rate limit reached",
  "retryAfter": 14
}
```

The `retryAfter` value indicates the number of seconds to wait before retrying the request.



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

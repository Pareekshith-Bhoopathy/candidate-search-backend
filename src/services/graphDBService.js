// src/services/graphDBService.js
const neo4j = require('neo4j-driver');
const config = require('../config/config');
const logger = require('../utils/logger');

const driver = neo4j.driver(
  config.neo4j.uri,
  neo4j.auth.basic(config.neo4j.user, config.neo4j.password)
);

const createCandidate = async (candidateData, embedding) => {
  const session = driver.session();
  try {
    await session.writeTransaction((tx) =>
      tx.run(
        `CREATE (c:Candidate {
          email: $email,
          phone: $phone,
          name: $name,
          summary: $summary,
          experience: $experience,
          education: $education,
          skills: $skills,
          certifications: $certifications,
          linkedin: $linkedin,
          portfolio: $portfolio,
          embedding: $embedding
        })`,
        {
          ...candidateData,
          embedding: embedding,
        }
      )
    );
    logger.info(`Candidate ${candidateData.email} created successfully.`);
  } catch (error) {
    logger.error(`Neo4j Error: ${error.message}`);
    throw new Error('Failed to create candidate in graph DB');
  } finally {
    await session.close();
  }
};

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

const getCandidateByEmailOrPhone = async (identifier) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (c:Candidate) WHERE c.email = $identifier OR c.phone = $identifier RETURN c`,
      { identifier }
    );
    if (result.records.length === 0) return null;
    return result.records[0].get('c').properties;
  } catch (error) {
    logger.error(`Neo4j Query Error: ${error.message}`);
    throw new Error('Failed to fetch candidate');
  } finally {
    await session.close();
  }
};

const searchCandidates = async (filters, limit = 10) => {
    const session = driver.session();
    try {
      let query = 'MATCH (c:Candidate) WHERE ';
      const conditions = [];
      const params = {};
  
      if (filters.experience) {
        conditions.push('c.totalExperienceYears >= $experience');
        params.experience = parseFloat(filters.experience);
      }
      if (filters.skills && filters.skills.length > 0) {
        conditions.push('ANY(skill IN $skills WHERE ANY(candidateSkill IN c.skills WHERE apoc.text.fuzzyMatch(candidateSkill, skill) > 0.7) OR apoc.text.fuzzyMatch(c.summary + " " + c.experience, skill) > 0.7)');
        params.skills = filters.skills;
      }
  
      if (conditions.length === 0) {
        query += 'TRUE ';
      } else {
        query += conditions.join(' AND ') + ' ';
      }
  
      query += 'RETURN c ORDER BY c.totalExperienceYears DESC LIMIT $limit';
      params.limit = neo4j.int(limit);
  
      const result = await session.run(query, params);
      return result.records.map((record) => record.get('c').properties);
    } catch (error) {
      logger.error(`Neo4j Search Error: ${error.message}`);
      throw new Error('Failed to search candidates');
    } finally {
      await session.close();
    }
  };

module.exports = {
  createCandidate,
  getAllCandidates,
  getCandidateByEmailOrPhone,
  searchCandidates,
  driver,
  createOrUpdateCandidate,
};
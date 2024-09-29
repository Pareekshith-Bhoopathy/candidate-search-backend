const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

const db = new Database(path.join(__dirname, '../../queue.sqlite'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create the jobs table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT,
    status TEXT CHECK(status IN ('pending', 'active', 'completed', 'failed')) DEFAULT 'pending',
    result TEXT,
    retryAfter INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Prepare statements
const addJob = db.prepare('INSERT INTO jobs (data) VALUES (?)');
const getJob = db.prepare('SELECT * FROM jobs WHERE id = ?');
const updateJob = db.prepare('UPDATE jobs SET status = ?, result = ?, retryAfter = ? WHERE id = ?');
const getPendingJobs = db.prepare("SELECT * FROM jobs WHERE status = 'pending' OR (status = 'failed' AND (retryAfter IS NULL OR retryAfter <= ?))");

// Helper function to log and throw database errors
const handleDbError = (operation, error) => {
  logger.error(`Database ${operation} Error: ${error.message}`);
  throw error;
};

const getNextReadyJob = db.prepare(`
    SELECT * FROM jobs 
    WHERE status = 'pending' 
       OR (status = 'failed' AND (retryAfter IS NULL OR retryAfter <= ?)) 
    ORDER BY id ASC 
    LIMIT 1
  `);

module.exports = {
  add: (data) => {
    try {
      const result = addJob.run(JSON.stringify(data));
      return result.lastInsertRowid;
    } catch (error) {
      handleDbError('Insert', error);
    }
  },
  getJob: (id) => {
    try {
      const job = getJob.get(id);
      if (job) {
        job.data = JSON.parse(job.data);
        if (job.result) job.result = JSON.parse(job.result);
      }
      return job;
    } catch (error) {
      handleDbError('Select', error);
    }
  },
  completeJob: (id, result) => {
    try {
      updateJob.run('completed', JSON.stringify(result), null, id);
    } catch (error) {
      handleDbError('Update', error);
    }
  },
  failJob: (id, error, retryAfter = null) => {
    try {
      updateJob.run('failed', JSON.stringify({ error: error.message }), retryAfter, id);
    } catch (dbError) {
      handleDbError('Update', dbError);
    }
  },
  getNextReadyJob: () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const job = getNextReadyJob.get(now);
      if (job) {
        job.data = JSON.parse(job.data);
        if (job.result) job.result = JSON.parse(job.result);
      }
      return job;
    } catch (error) {
      handleDbError('Select', error);
    }
  },
  getPendingJobs: () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      return getPendingJobs.all(now).map(job => ({
        ...job,
        data: JSON.parse(job.data),
        result: job.result ? JSON.parse(job.result) : null
      }));
    } catch (error) {
      handleDbError('Select', error);
    }
  }
};
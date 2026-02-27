import pool from './db.js';

// run this once to set up the tables
// usage: node src/config/initDb.js

async function createTables() {
  const query = `
        CREATE TABLE IF NOT EXISTS polls (
            id SERIAL PRIMARY KEY,
            question TEXT NOT NULL,
            options JSONB NOT NULL,
            duration INTEGER NOT NULL,
            start_time BIGINT,
            correct_answer VARCHAR(255),
            marks INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS votes (
            id SERIAL PRIMARY KEY,
            poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
            student_id VARCHAR(255) NOT NULL,
            student_name VARCHAR(255) NOT NULL,
            option_selected VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(poll_id, student_id)
        );
    `;

  try {
    await pool.query(query);
    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    pool.end();
  }
}

createTables();

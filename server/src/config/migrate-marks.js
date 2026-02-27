import pool from './db.js';

// adds the correct_answer and marks columns to the polls table
// only need to run this once: node src/config/migrate-marks.js

async function migrate() {
    try {
        await pool.query(`ALTER TABLE polls ADD COLUMN IF NOT EXISTS correct_answer VARCHAR(255)`);
        await pool.query(`ALTER TABLE polls ADD COLUMN IF NOT EXISTS marks INTEGER DEFAULT 0`);
        console.log('Done - added correct_answer and marks columns');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();

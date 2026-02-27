import pool from './db.js';

/**
 * Migration: Add columns needed for Fix 2 (UUID identity) and Fix 3 (state recovery).
 * Safe to run multiple times — uses IF NOT EXISTS / IF EXISTS checks.
 */
const migrate = async () => {
    try {
        // Fix 3: Add start_time to polls (if not already present)
        await pool.query(`
            ALTER TABLE polls ADD COLUMN IF NOT EXISTS start_time BIGINT;
        `);
        console.log('✓ polls.start_time column ensured.');

        // Fix 2: Add student_id to votes (if not already present)
        await pool.query(`
            ALTER TABLE votes ADD COLUMN IF NOT EXISTS student_id VARCHAR(255);
        `);
        console.log('✓ votes.student_id column ensured.');

        // Backfill student_id with student_name for existing rows (so NOT NULL works)
        await pool.query(`
            UPDATE votes SET student_id = student_name WHERE student_id IS NULL;
        `);
        console.log('✓ Backfilled student_id from student_name for existing rows.');

        // Make student_id NOT NULL
        await pool.query(`
            ALTER TABLE votes ALTER COLUMN student_id SET NOT NULL;
        `);
        console.log('✓ votes.student_id set to NOT NULL.');

        // Drop old unique constraint and add new one
        // (constraint name may vary — drop by finding it)
        const constraintCheck = await pool.query(`
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'votes' AND constraint_type = 'UNIQUE';
        `);

        for (const row of constraintCheck.rows) {
            await pool.query(`ALTER TABLE votes DROP CONSTRAINT IF EXISTS "${row.constraint_name}";`);
            console.log(`✓ Dropped old constraint: ${row.constraint_name}`);
        }

        // Add new unique constraint on (poll_id, student_id)
        await pool.query(`
            ALTER TABLE votes ADD CONSTRAINT votes_poll_id_student_id_unique UNIQUE (poll_id, student_id);
        `);
        console.log('✓ Added UNIQUE(poll_id, student_id) constraint.');

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        pool.end();
    }
};

migrate();

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// connection pool for postgres - reused across the app
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export default pool;

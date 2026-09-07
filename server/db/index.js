const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Cloud providers (Neon, Supabase) require SSL; this is safe for local too.
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  max: 10,                // maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log connection errors without crashing the process.
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;

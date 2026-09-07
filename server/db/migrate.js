/**
 * migrate.js — Run this once to initialize the database schema.
 * Usage: npm run db:migrate
 */
const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function migrate() {
  console.log('[Migrate] Connecting to database…');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('[Migrate] ✅ Schema applied successfully.');
  } catch (err) {
    console.error('[Migrate] ❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── Helper ──────────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required.' });
  }
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'Username must be 3–30 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    const token = signToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') {
      const field = err.detail?.includes('username') ? 'username' : 'email';
      return res.status(409).json({ error: `That ${field} is already taken.` });
    }
    console.error('[Auth] Register error:', err.message || err);
    if (err.code === 'ECONNREFUSED' || err.message?.includes('password') || !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('user:password')) {
      return res.status(503).json({ error: 'Database not configured. Please set DATABASE_URL in .env and run: npm run db:migrate' });
    }
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    const { password_hash, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('[Auth] Login error:', err.message || err);
    if (err.code === 'ECONNREFUSED' || !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('user:password')) {
      return res.status(503).json({ error: 'Database not configured. Please set DATABASE_URL in .env and run: npm run db:migrate' });
    }
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Auth] Me error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

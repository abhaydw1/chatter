const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All room routes require authentication
router.use(authMiddleware);

// ─── GET /api/rooms ───────────────────────────────────────────────────────────
// Returns all rooms with member count and whether the current user has joined.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         r.id,
         r.name,
         r.created_at,
         COUNT(DISTINCT rm.user_id)::int AS member_count,
         BOOL_OR(rm.user_id = $1) AS is_member
       FROM rooms r
       LEFT JOIN room_members rm ON rm.room_id = r.id
       GROUP BY r.id
       ORDER BY r.name ASC`,
      [req.user.id]
    );
    res.json({ rooms: result.rows });
  } catch (err) {
    console.error('[Rooms] List error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST /api/rooms ─────────────────────────────────────────────────────────
// Create a new room; the creator is automatically added as a member.
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Room name must be at least 2 characters.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const roomResult = await client.query(
      `INSERT INTO rooms (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name, created_at`,
      [name.trim().toLowerCase().replace(/\s+/g, '-'), req.user.id]
    );
    const room = roomResult.rows[0];

    await client.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)',
      [room.id, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ room: { ...room, member_count: 1, is_member: true } });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A room with that name already exists.' });
    }
    console.error('[Rooms] Create error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    client.release();
  }
});

// ─── POST /api/rooms/:id/join ─────────────────────────────────────────────────
router.post('/:id/join', async (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  if (isNaN(roomId)) return res.status(400).json({ error: 'Invalid room id.' });

  try {
    await pool.query(
      `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [roomId, req.user.id]
    );
    res.json({ message: 'Joined room.' });
  } catch (err) {
    console.error('[Rooms] Join error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST /api/rooms/:id/leave ────────────────────────────────────────────────
router.post('/:id/leave', async (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  if (isNaN(roomId)) return res.status(400).json({ error: 'Invalid room id.' });

  try {
    await pool.query(
      'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, req.user.id]
    );
    res.json({ message: 'Left room.' });
  } catch (err) {
    console.error('[Rooms] Leave error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/rooms/:id/members ───────────────────────────────────────────────
router.get('/:id/members', async (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  if (isNaN(roomId)) return res.status(400).json({ error: 'Invalid room id.' });

  try {
    const result = await pool.query(
      `SELECT u.id, u.username, rm.joined_at
       FROM room_members rm
       JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = $1
       ORDER BY u.username ASC`,
      [roomId]
    );
    res.json({ members: result.rows });
  } catch (err) {
    console.error('[Rooms] Members error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/rooms/:id/messages ─────────────────────────────────────────────
// Fetch last 50 messages for a room (only if the user is a member).
router.get('/:id/messages', async (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  if (isNaN(roomId)) return res.status(400).json({ error: 'Invalid room id.' });

  try {
    // Check membership
    const memberCheck = await pool.query(
      'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this room.' });
    }

    const result = await pool.query(
      `SELECT m.id, m.content, m.created_at, u.id AS user_id, u.username
       FROM messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.room_id = $1
       ORDER BY m.created_at ASC
       LIMIT 50`,
      [roomId]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error('[Rooms] Messages error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

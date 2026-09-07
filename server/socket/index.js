const jwt = require('jsonwebtoken');
const pool = require('../db');

/**
 * Socket.IO handler.
 * Manages:
 *  - JWT authentication on connection
 *  - Room join/leave with presence broadcasts
 *  - Real-time message sending (persisted to PostgreSQL)
 *  - Typing indicators
 *  - Online/offline presence tracking (per-user, multi-tab safe)
 *
 * @param {import('socket.io').Server} io
 */
function initSocket(io) {
  // In-memory presence: userId -> Set of socketIds
  // Using a Set per user safely handles multiple tabs/devices.
  const activeUsers = new Map();

  // ─── JWT Middleware ─────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication token required.'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, username: decoded.username };
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  // ─── Connection ─────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { id: userId, username } = socket.user;
    console.log(`[Socket] Connected: ${username} (socket=${socket.id})`);

    // Track presence: add this socket to the user's set
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);

    // If this is the user's first connection (first tab), broadcast online status
    if (activeUsers.get(userId).size === 1) {
      io.emit('user_online', { userId, username });
    }

    // Send current online user list to the newly connected socket
    const onlineUserIds = [...activeUsers.keys()];
    socket.emit('online_users', onlineUserIds);

    // ─── join_room ────────────────────────────────────────────────────────────
    socket.on('join_room', async ({ roomId }) => {
      if (!roomId || typeof roomId !== 'number') return;

      // Verify the user is a member of the room before allowing socket join
      try {
        const check = await pool.query(
          'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
          [roomId, userId]
        );
        if (check.rows.length === 0) {
          return socket.emit('error', { message: 'You are not a member of that room.' });
        }
      } catch {
        return socket.emit('error', { message: 'Database error.' });
      }

      socket.join(`room:${roomId}`);
      // Inform other room members that this user joined
      socket.to(`room:${roomId}`).emit('user_joined_room', { userId, username, roomId });
    });

    // ─── leave_room ───────────────────────────────────────────────────────────
    socket.on('leave_room', ({ roomId }) => {
      socket.leave(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('user_left_room', { userId, username, roomId });
    });

    // ─── send_message ─────────────────────────────────────────────────────────
    socket.on('send_message', async ({ roomId, content }) => {
      if (!roomId || !content || typeof content !== 'string') return;
      const trimmed = content.trim();
      if (!trimmed || trimmed.length > 4000) return;

      try {
        // Persist to PostgreSQL — always go through the DB, never trust in-memory only
        const result = await pool.query(
          `INSERT INTO messages (room_id, user_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, room_id, user_id, content, created_at`,
          [roomId, userId, trimmed]
        );
        const message = { ...result.rows[0], username };

        // Broadcast to ALL sockets in the room (including sender)
        io.to(`room:${roomId}`).emit('receive_message', message);
      } catch (err) {
        console.error('[Socket] send_message error:', err.message);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    // ─── typing ───────────────────────────────────────────────────────────────
    socket.on('typing', ({ roomId }) => {
      // Broadcast to everyone else in the room — not back to sender
      socket.to(`room:${roomId}`).emit('user_typing', { userId, username, roomId });
    });

    socket.on('stop_typing', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('user_stop_typing', { userId, username, roomId });
    });

    // ─── Disconnection ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${username} (socket=${socket.id})`);

      const userSockets = activeUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        // Only broadcast offline if the user has no remaining connections
        if (userSockets.size === 0) {
          activeUsers.delete(userId);
          io.emit('user_offline', { userId, username });
        }
      }
    });
  });
}

module.exports = initSocket;

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const initSocket = require('./socket');

const app = express();
const httpServer = http.createServer(app);

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production: mirror any origin back (works with credentials, unlike '*')
// In development: restrict to CLIENT_URL / localhost
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? true
    : (process.env.CLIENT_URL || 'http://localhost:5173'),
  credentials: true,
};
app.use(cors(corsOptions));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
});
initSocket(io);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);
httpServer.listen(PORT, () => {
  console.log(`[Server] 🚀 Chatter API listening on http://localhost:${PORT}`);
  console.log(`[Server] 🌐 Accepting connections from ${corsOptions.origin}`);
});

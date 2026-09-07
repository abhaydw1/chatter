import { io } from 'socket.io-client';

let socket = null;

/**
 * Initialize a Socket.IO connection authenticated with the provided JWT token.
 * Call this once after successful login.
 * @param {string} token - JWT token
 * @returns {import('socket.io-client').Socket}
 */
export function initSocket(token) {
  if (socket) socket.disconnect();

  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  socket = io(serverUrl, {
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket'],
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.error('[Socket] Connection error:', err.message));

  return socket;
}

/**
 * Get the current Socket.IO singleton instance.
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect and clear the socket singleton.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

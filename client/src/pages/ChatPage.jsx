import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import api from '../services/api';
import RoomList from '../components/RoomList';
import ChatArea from '../components/ChatArea';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // ─── Fetch rooms ────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await api.get('/rooms');
      setRooms(data.rooms);
    } catch (err) {
      console.error('[ChatPage] fetchRooms error:', err);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // ─── Socket presence events ─────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOnlineUsers = (userIds) => setOnlineUsers(new Set(userIds));
    const handleUserOnline = ({ userId }) => setOnlineUsers((prev) => new Set([...prev, userId]));
    const handleUserOffline = ({ userId }) => setOnlineUsers((prev) => { const n = new Set(prev); n.delete(userId); return n; });

    socket.on('online_users', handleOnlineUsers);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('online_users', handleOnlineUsers);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, []);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;

  const handleSelectRoom = (room) => {
    setActiveRoomId(room.id);
  };

  const handleRoomUpdate = (updatedRoom) => {
    setRooms((prev) => prev.map((r) => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
  };

  const handleRoomCreated = (newRoom) => {
    setRooms((prev) => [...prev, newRoom].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveRoomId(newRoom.id);
  };

  return (
    <div className="app-layout">
      <RoomList
        rooms={rooms}
        activeRoomId={activeRoomId}
        user={user}
        onlineUsers={onlineUsers}
        onSelectRoom={handleSelectRoom}
        onRoomCreated={handleRoomCreated}
        onLogout={logout}
      />
      {activeRoom ? (
        <ChatArea
          room={activeRoom}
          user={user}
          onlineUsers={onlineUsers}
          onRoomUpdate={handleRoomUpdate}
        />
      ) : (
        <div className="no-room-selected">
          <div className="no-room-icon">💬</div>
          <div className="no-room-title">Pick a room to start chatting</div>
          <div className="no-room-sub">Select a room from the sidebar or create a new one.</div>
        </div>
      )}
    </div>
  );
}

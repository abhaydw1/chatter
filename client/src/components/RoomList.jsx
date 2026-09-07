import { useState } from 'react';
import api from '../services/api';

export default function RoomList({ rooms, activeRoomId, user, onlineUsers, onSelectRoom, onRoomCreated, onLogout }) {
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/rooms', { name: newRoomName.trim() });
      onRoomCreated(data.room);
      setNewRoomName('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create room.');
    } finally {
      setCreating(false);
    }
  };

  const initials = (name) => name.slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">💬</div>
          Chatter
        </div>
      </div>

      {/* Current user info */}
      <div className="sidebar-user">
        <div className="avatar">{initials(user.username)}</div>
        <div className="user-info">
          <div className="user-name">{user.username}</div>
          <div className="user-status">Online</div>
        </div>
        <button id="btn-logout" className="btn-logout" onClick={onLogout} title="Sign out">
          ⎋
        </button>
      </div>

      {/* Rooms list */}
      <div className="rooms-section">
        <div className="rooms-section-header">
          <span className="rooms-section-title">Channels</span>
        </div>
        <ul>
          {rooms.map((room) => (
            <li key={room.id}>
              <div
                id={`room-item-${room.id}`}
                className={`room-item${activeRoomId === room.id ? ' active' : ''}`}
                onClick={() => onSelectRoom(room)}
              >
                <span className="room-hash">#</span>
                <span className="room-name">{room.name}</span>
                <span className="room-badge">{room.member_count}</span>
              </div>
            </li>
          ))}
          {rooms.length === 0 && (
            <li style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No rooms yet. Create one below!
            </li>
          )}
        </ul>
      </div>

      {/* Create room */}
      <div className="create-room-form">
        <form onSubmit={handleCreate}>
          <div className="create-room-input-row">
            <input
              id="create-room-input"
              type="text"
              className="create-room-input"
              placeholder="new-room-name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              maxLength={50}
            />
            <button
              id="btn-create-room"
              type="submit"
              className="btn-create"
              disabled={creating || !newRoomName.trim()}
            >
              {creating ? '…' : '+ Add'}
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}

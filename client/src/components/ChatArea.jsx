import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import MessageInput from './MessageInput';
import MemberList from './MemberList';

export default function ChatArea({ room, user, onlineUsers, onRoomUpdate }) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { userId: username }
  const [showMembers, setShowMembers] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const prevRoomId = useRef(null);

  // ─── Load history + members when room changes ───────────────────────────────
  useEffect(() => {
    if (!room) return;

    const socket = getSocket();

    // Leave previous room socket channel
    if (prevRoomId.current && prevRoomId.current !== room.id) {
      socket?.emit('leave_room', { roomId: prevRoomId.current });
    }
    prevRoomId.current = room.id;

    setMessages([]);
    setTypingUsers({});

    if (!room.is_member) return;

    // Fetch message history
    api.get(`/rooms/${room.id}/messages`)
      .then(({ data }) => setMessages(data.messages))
      .catch(console.error);

    // Fetch members
    api.get(`/rooms/${room.id}/members`)
      .then(({ data }) => setMembers(data.members))
      .catch(console.error);

    // Tell the server we're joining this socket room
    socket?.emit('join_room', { roomId: room.id });
  }, [room?.id, room?.is_member]);

  // ─── Socket event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onReceiveMessage = (msg) => {
      if (msg.room_id !== room.id) return;
      setMessages((prev) => [...prev, msg]);
      // Clear typing indicator for this user when they send a message
      setTypingUsers((prev) => { const n = { ...prev }; delete n[msg.user_id]; return n; });
    };

    const onUserTyping = ({ userId, username, roomId }) => {
      if (roomId !== room.id || userId === user.id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: username }));
    };

    const onUserStopTyping = ({ userId, roomId }) => {
      if (roomId !== room.id) return;
      setTypingUsers((prev) => { const n = { ...prev }; delete n[userId]; return n; });
    };

    const onUserJoinedRoom = ({ userId, username, roomId }) => {
      if (roomId !== room.id) return;
      setMembers((prev) => prev.find((m) => m.id === userId) ? prev : [...prev, { id: userId, username }]);
    };

    const onUserLeftRoom = ({ userId, roomId }) => {
      if (roomId !== room.id) return;
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    };

    socket.on('receive_message', onReceiveMessage);
    socket.on('user_typing', onUserTyping);
    socket.on('user_stop_typing', onUserStopTyping);
    socket.on('user_joined_room', onUserJoinedRoom);
    socket.on('user_left_room', onUserLeftRoom);

    return () => {
      socket.off('receive_message', onReceiveMessage);
      socket.off('user_typing', onUserTyping);
      socket.off('user_stop_typing', onUserStopTyping);
      socket.off('user_joined_room', onUserJoinedRoom);
      socket.off('user_left_room', onUserLeftRoom);
    };
  }, [room.id, user.id]);

  // ─── Join / Leave ─────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.post(`/rooms/${room.id}/join`);
      onRoomUpdate({ id: room.id, is_member: true, member_count: room.member_count + 1 });
      // Fetch history after joining
      const [msgs, mems] = await Promise.all([
        api.get(`/rooms/${room.id}/messages`),
        api.get(`/rooms/${room.id}/members`),
      ]);
      setMessages(msgs.data.messages);
      setMembers(mems.data.members);
      getSocket()?.emit('join_room', { roomId: room.id });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join room.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm(`Leave #${room.name}?`)) return;
    setLeaving(true);
    try {
      await api.post(`/rooms/${room.id}/leave`);
      getSocket()?.emit('leave_room', { roomId: room.id });
      onRoomUpdate({ id: room.id, is_member: false, member_count: Math.max(0, room.member_count - 1) });
      setMessages([]);
      setMembers([]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to leave room.');
    } finally {
      setLeaving(false);
    }
  };

  const handleSendMessage = useCallback((content) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('send_message', { roomId: room.id, content });
  }, [room.id]);

  const handleTyping = useCallback((isTyping) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit(isTyping ? 'typing' : 'stop_typing', { roomId: room.id });
  }, [room.id]);

  const typingNames = Object.values(typingUsers);

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <span className="chat-header-hash">#</span>
          <span className="chat-header-title">{room.name}</span>
          <span className="chat-header-meta">{room.member_count} member{room.member_count !== 1 ? 's' : ''}</span>
        </div>
        <div className="chat-header-actions">
          {room.is_member && (
            <button
              id="btn-toggle-members"
              className={`btn-members${showMembers ? ' active' : ''}`}
              onClick={() => setShowMembers((v) => !v)}
            >
              👥 Members
            </button>
          )}
          {room.is_member ? (
            <button id="btn-leave-room" className="btn-leave" onClick={handleLeave} disabled={leaving}>
              {leaving ? '…' : 'Leave'}
            </button>
          ) : (
            <button id="btn-join-room" className="btn-join" onClick={handleJoin} disabled={joining}>
              {joining ? 'Joining…' : 'Join Room'}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="chat-content">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {room.is_member ? (
            <>
              <MessageList messages={messages} currentUser={user} />
              <TypingIndicator typingNames={typingNames} />
              <MessageInput
                roomId={room.id}
                onSend={handleSendMessage}
                onTyping={handleTyping}
                disabled={!room.is_member}
              />
            </>
          ) : (
            <div className="join-prompt">
              <div style={{ fontSize: '2rem' }}>🔒</div>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Join #{room.name} to see messages</div>
              <button id="btn-join-room-prompt" className="btn-primary" onClick={handleJoin} disabled={joining}>
                {joining ? 'Joining…' : `Join #${room.name}`}
              </button>
            </div>
          )}
        </div>

        {showMembers && room.is_member && (
          <MemberList members={members} onlineUsers={onlineUsers} />
        )}
      </div>
    </div>
  );
}

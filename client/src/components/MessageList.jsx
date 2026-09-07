import { useEffect, useRef } from 'react';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameMinute(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate()
    && da.getHours() === db.getHours()
    && da.getMinutes() === db.getMinutes();
}

function getInitials(username) {
  return username.slice(0, 2).toUpperCase();
}

export default function MessageList({ messages, currentUser }) {
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="messages-container messages-empty">
        <div className="messages-empty-icon">👋</div>
        <div>No messages yet — say hello!</div>
      </div>
    );
  }

  return (
    <div className="messages-container" id="message-list">
      {messages.map((msg, idx) => {
        const prev = messages[idx - 1];
        const isContinuation =
          prev &&
          prev.user_id === msg.user_id &&
          isSameMinute(prev.created_at, msg.created_at);

        const isOwn = msg.user_id === currentUser.id;

        if (isContinuation) {
          return (
            <div key={msg.id} className="message-continuation">
              <p className="message-text">{msg.content}</p>
            </div>
          );
        }

        return (
          <div key={msg.id} className={`message-row${isOwn ? ' own' : ''}`}>
            <div className="message-avatar-col">
              <div className={`avatar sm${isOwn ? '' : ''}`}>{getInitials(msg.username)}</div>
            </div>
            <div className="message-body">
              <div className="message-header">
                <span className={`message-username${isOwn ? ' own' : ''}`}>{msg.username}</span>
                <span className="message-time">{formatTime(msg.created_at)}</span>
              </div>
              <p className="message-text">{msg.content}</p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';

const TYPING_DEBOUNCE_MS = 1500;

export default function MessageInput({ onSend, onTyping, disabled }) {
  const [value, setValue] = useState('');
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }
    // Reset the stop-typing debounce timer
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, TYPING_DEBOUNCE_MS);
  }, [onTyping]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping(false);
    }
  }, [onTyping]);

  const handleChange = (e) => {
    setValue(e.target.value);
    if (e.target.value) startTyping();
    else stopTyping();
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    stopTyping();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-container">
      <div className="message-input-row">
        <textarea
          id="message-input"
          className="message-textarea"
          placeholder="Message (Enter to send, Shift+Enter for newline)"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <button
          id="btn-send-message"
          className="btn-send"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          title="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

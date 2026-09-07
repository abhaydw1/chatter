export default function TypingIndicator({ typingNames }) {
  if (typingNames.length === 0) {
    return <div className="typing-indicator" />;
  }

  let text;
  if (typingNames.length === 1) {
    text = `${typingNames[0]} is typing`;
  } else if (typingNames.length === 2) {
    text = `${typingNames[0]} and ${typingNames[1]} are typing`;
  } else {
    text = 'Several people are typing';
  }

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span /><span /><span />
      </div>
      {text}
    </div>
  );
}

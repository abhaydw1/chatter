export default function MemberList({ members, onlineUsers }) {
  const online = members.filter((m) => onlineUsers.has(m.id));
  const offline = members.filter((m) => !onlineUsers.has(m.id));

  const renderMember = (member) => (
    <li key={member.id} className="member-item">
      <div className="avatar sm">{member.username.slice(0, 2).toUpperCase()}</div>
      <span className="member-name">{member.username}</span>
      {onlineUsers.has(member.id)
        ? <span className="online-dot" title="Online" />
        : <span className="offline-dot" title="Offline" />}
    </li>
  );

  return (
    <aside className="members-sidebar">
      {online.length > 0 && (
        <>
          <div className="members-sidebar-header">Online — {online.length}</div>
          <ul>{online.map(renderMember)}</ul>
        </>
      )}
      {offline.length > 0 && (
        <>
          <div className="members-sidebar-header" style={{ marginTop: '0.75rem' }}>
            Offline — {offline.length}
          </div>
          <ul>{offline.map(renderMember)}</ul>
        </>
      )}
      {members.length === 0 && (
        <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          No members yet.
        </div>
      )}
    </aside>
  );
}

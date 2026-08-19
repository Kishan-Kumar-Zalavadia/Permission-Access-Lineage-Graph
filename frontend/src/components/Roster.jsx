export default function Roster({ users, selectedUserId, onSelect, loading }) {
  return (
    <div className="panel roster">
      <div className="panel-eyebrow">Roster</div>
      {loading && <div className="skeleton-list" aria-live="polite">Loading personnel…</div>}
      {!loading && users.length === 0 && (
        <div className="empty-note">No users found in the graph.</div>
      )}
      <ul className="roster-list">
        {users.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              className={`roster-item${user.id === selectedUserId ? ' roster-item--active' : ''}`}
              onClick={() => onSelect(user.id)}
              aria-pressed={user.id === selectedUserId}
            >
              <span className="roster-item-name">{user.name}</span>
              <span className="roster-item-email">{user.email}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

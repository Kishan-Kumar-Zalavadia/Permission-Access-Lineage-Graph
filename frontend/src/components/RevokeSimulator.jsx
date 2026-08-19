export default function RevokeSimulator({
  directRoles,
  selectedRoleId,
  onSelectRole,
  onSimulate,
  onReset,
  simulating,
  simulation,
  error,
}) {
  if (directRoles.length === 0) {
    return (
      <div className="panel simulator">
        <div className="panel-eyebrow">Simulate revoke</div>
        <div className="empty-note">This person has no directly-assigned roles to revoke.</div>
      </div>
    );
  }

  return (
    <div className="panel simulator">
      <div className="panel-eyebrow">Simulate revoke</div>
      <p className="simulator-copy">
        Pick a directly-assigned role and see exactly what this person loses —
        accounting for anything they'd keep anyway through team-inherited access.
      </p>

      <label className="field-label" htmlFor="role-select">Role to revoke</label>
      <select
        id="role-select"
        className="select"
        value={selectedRoleId || ''}
        onChange={(e) => onSelectRole(e.target.value)}
      >
        <option value="" disabled>Choose a role…</option>
        {directRoles.map((role) => (
          <option key={role.id} value={role.id}>{role.name}</option>
        ))}
      </select>

      <div className="simulator-actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onSimulate}
          disabled={!selectedRoleId || simulating}
        >
          {simulating ? 'Simulating…' : 'Simulate revoke'}
        </button>
        {simulation && (
          <button type="button" className="btn btn--ghost" onClick={onReset}>
            Reset
          </button>
        )}
      </div>

      {error && <div className="error-note" role="alert">{error}</div>}

      {simulation && (
        <div className="simulation-result">
          <div className="simulation-group">
            <div className="simulation-group-label simulation-group-label--lost">
              Actually lost ({simulation.actuallyLost.length})
            </div>
            {simulation.actuallyLost.length === 0 ? (
              <div className="empty-note empty-note--tight">Nothing — fully covered elsewhere.</div>
            ) : (
              <ul className="simulation-list">
                {simulation.actuallyLost.map((r) => (
                  <li key={r.id} className="simulation-list-item simulation-list-item--lost">
                    {r.name} <span className="tag tag--permission">{r.permission}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="simulation-group">
            <div className="simulation-group-label simulation-group-label--retained">
              Retained anyway ({simulation.retainedAnyway.length})
            </div>
            {simulation.retainedAnyway.length === 0 ? (
              <div className="empty-note empty-note--tight">Nothing retained through another path.</div>
            ) : (
              <ul className="simulation-list">
                {simulation.retainedAnyway.map((r) => (
                  <li key={r.id} className="simulation-list-item simulation-list-item--retained">
                    {r.name} <span className="tag tag--permission">{r.permission}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function groupSources(sources) {
  const direct = sources.filter((s) => s.pathType === 'direct_role');
  const team = sources.filter((s) => s.pathType === 'team_default_role');
  return { direct, team };
}

export default function RevokeSimulator({
  accessSources,
  selectedSourceIds,
  onToggleSource,
  onSimulate,
  onReset,
  simulating,
  simulation,
  error,
}) {
  if (accessSources.length === 0) {
    return (
      <div className="panel simulator">
        <div className="panel-eyebrow">Simulate revoke</div>
        <div className="empty-note">This person has no access sources to revoke.</div>
      </div>
    );
  }

  const { direct, team } = groupSources(accessSources);
  const selectedCount = selectedSourceIds.length;

  return (
    <div className="panel simulator">
      <div className="panel-eyebrow">Simulate revoke</div>
      <p className="simulator-copy">
        Select any combination of direct and team-inherited roles and see exactly what this
        person loses — accounting for anything they'd keep anyway through the sources you
        didn't select.
      </p>

      {direct.length > 0 && (
        <fieldset className="source-group">
          <legend className="field-label">Direct roles</legend>
          {direct.map((source) => (
            <label key={source.sourceId} className="checkbox-row">
              <input
                type="checkbox"
                checked={selectedSourceIds.includes(source.sourceId)}
                onChange={() => onToggleSource(source.sourceId)}
              />
              <span>{source.roleName}</span>
            </label>
          ))}
        </fieldset>
      )}

      {team.length > 0 && (
        <fieldset className="source-group">
          <legend className="field-label">Team-inherited roles (indirect)</legend>
          {team.map((source) => (
            <label key={source.sourceId} className="checkbox-row">
              <input
                type="checkbox"
                checked={selectedSourceIds.includes(source.sourceId)}
                onChange={() => onToggleSource(source.sourceId)}
              />
              <span>{source.roleName} <span className="checkbox-row-sub">via {source.teamName}</span></span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="simulator-actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onSimulate}
          disabled={selectedCount === 0 || simulating}
        >
          {simulating ? 'Simulating…' : `Simulate revoke (${selectedCount})`}
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

import { useEffect, useState, useCallback, useMemo } from 'react';
import { api, ApiError } from './api';
import Roster from './components/Roster';
import Dossier from './components/Dossier';
import RevokeSimulator from './components/RevokeSimulator';
import GraphSchematic from './components/GraphSchematic';

export default function App() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [accessData, setAccessData] = useState([]);
  const [accessSources, setAccessSources] = useState([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState(null);

  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState(null);

  useEffect(() => {
    api
      .listUsers()
      .then((data) => setUsers(data))
      .catch((err) => setUsersError(err instanceof ApiError ? err.message : 'Something went wrong loading the roster.'))
      .finally(() => setUsersLoading(false));
  }, []);

  const selectUser = useCallback((userId) => {
    setSelectedUserId(userId);
    setSelectedSourceIds([]);
    setSimulation(null);
    setSimError(null);
    setAccessLoading(true);
    setAccessError(null);

    Promise.all([api.getUserAccess(userId), api.getAccessSources(userId)])
      .then(([access, sources]) => {
        setAccessData(access);
        setAccessSources(sources);
      })
      .catch((err) => setAccessError(err instanceof ApiError ? err.message : 'Something went wrong loading this person\u2019s access.'))
      .finally(() => setAccessLoading(false));
  }, []);

  const toggleSource = useCallback((sourceId) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  }, []);

  const runSimulation = useCallback(() => {
    if (!selectedUserId || selectedSourceIds.length === 0) return;
    setSimulating(true);
    setSimError(null);
    api
      .simulateRevoke(selectedUserId, selectedSourceIds)
      .then((result) => setSimulation(result))
      .catch((err) => setSimError(err instanceof ApiError ? err.message : 'Could not run the simulation.'))
      .finally(() => setSimulating(false));
  }, [selectedUserId, selectedSourceIds]);

  const resetSimulation = useCallback(() => {
    setSimulation(null);
    setSimError(null);
  }, []);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Map selected sourceIds -> the GraphSchematic's role-node key format
  // (`${pathType}:${roleName}:${teamName||''}`), so the diagram can
  // highlight every selected role, not just one.
  const revokedRoleKeys = useMemo(() => {
    const keys = new Set();
    selectedSourceIds.forEach((sourceId) => {
      const source = accessSources.find((s) => s.sourceId === sourceId);
      if (source) {
        keys.add(`${source.pathType}:${source.roleName}:${source.teamName || ''}`);
      }
    });
    return keys;
  }, [selectedSourceIds, accessSources]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-eyebrow">Access Lineage</div>
        <h1 className="app-header-title">Clearance Dossier</h1>
        <p className="app-header-sub">
          Trace who can reach what, through which path — and see exactly what revoking any
          combination of roles actually changes.
        </p>
      </header>

      {usersError && (
        <div className="banner banner--error" role="alert">{usersError}</div>
      )}

      <main className="app-grid">
        <Roster
          users={users}
          selectedUserId={selectedUserId}
          onSelect={selectUser}
          loading={usersLoading}
        />

        <section className="panel graph-panel">
          <div className="panel-eyebrow">Access diagram</div>

          {!selectedUserId && (
            <div className="empty-note empty-note--center">
              Select a person from the roster to view their access lineage.
            </div>
          )}

          {selectedUserId && accessLoading && (
            <div className="empty-note empty-note--center" aria-live="polite">
              Resolving access paths…
            </div>
          )}

          {selectedUserId && accessError && (
            <div className="banner banner--error">{accessError}</div>
          )}

          {selectedUserId && !accessLoading && !accessError && accessData.length === 0 && (
            <div className="empty-note empty-note--center">
              {selectedUser?.name} has no resolvable access in the graph — no team membership
              and no directly-assigned role.
            </div>
          )}

          {selectedUserId && !accessLoading && !accessError && accessData.length > 0 && (
            <>
              <GraphSchematic
                userName={selectedUser?.name || ''}
                accessData={accessData}
                revokedRoleKeys={revokedRoleKeys}
                simulation={simulation}
              />
              <div className="legend">
                <span className="legend-item"><span className="legend-swatch legend-swatch--solid" /> direct role</span>
                <span className="legend-item"><span className="legend-swatch legend-swatch--dashed" /> team-inherited</span>
                {simulation && (
                  <>
                    <span className="legend-item"><span className="legend-swatch legend-swatch--rose" /> lost on revoke</span>
                    <span className="legend-item"><span className="legend-swatch legend-swatch--amber" /> retained anyway</span>
                  </>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="side-rail">
          {selectedUserId && !accessLoading && !accessError && (
            <>
              <div className="panel dossier-panel">
                <div className="panel-eyebrow">Dossier</div>
                <Dossier accessData={accessData} />
              </div>

              <RevokeSimulator
                accessSources={accessSources}
                selectedSourceIds={selectedSourceIds}
                onToggleSource={toggleSource}
                onSimulate={runSimulation}
                onReset={resetSimulation}
                simulating={simulating}
                simulation={simulation}
                error={simError}
              />
            </>
          )}
          {!selectedUserId && (
            <div className="panel">
              <div className="empty-note">Nothing to show yet.</div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

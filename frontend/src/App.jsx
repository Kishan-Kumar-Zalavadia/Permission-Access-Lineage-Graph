import { useEffect, useState, useCallback } from 'react';
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
  const [directRoles, setDirectRoles] = useState([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState(null);

  const [selectedRoleId, setSelectedRoleId] = useState(null);
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
    setSelectedRoleId(null);
    setSimulation(null);
    setSimError(null);
    setAccessLoading(true);
    setAccessError(null);

    Promise.all([api.getUserAccess(userId), api.getUserDirectRoles(userId)])
      .then(([access, roles]) => {
        setAccessData(access);
        setDirectRoles(roles);
      })
      .catch((err) => setAccessError(err instanceof ApiError ? err.message : 'Something went wrong loading this person\u2019s access.'))
      .finally(() => setAccessLoading(false));
  }, []);

  const runSimulation = useCallback(() => {
    if (!selectedUserId || !selectedRoleId) return;
    setSimulating(true);
    setSimError(null);
    api
      .simulateRevoke(selectedUserId, selectedRoleId)
      .then((result) => setSimulation(result))
      .catch((err) => setSimError(err instanceof ApiError ? err.message : 'Could not run the simulation.'))
      .finally(() => setSimulating(false));
  }, [selectedUserId, selectedRoleId]);

  const resetSimulation = useCallback(() => {
    setSimulation(null);
    setSimError(null);
  }, []);

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const revokedRole = directRoles.find((r) => r.id === selectedRoleId);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-eyebrow">Access Lineage</div>
        <h1 className="app-header-title">Clearance Dossier</h1>
        <p className="app-header-sub">
          Trace who can reach what, through which path — and see exactly what a role revocation actually changes.
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

          {selectedUserId && !accessLoading && !accessError && (
            <>
              <GraphSchematic
                userName={selectedUser?.name || ''}
                accessData={accessData}
                revokedRoleId={selectedRoleId}
                revokedRoleName={revokedRole?.name}
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
                directRoles={directRoles}
                selectedRoleId={selectedRoleId}
                onSelectRole={setSelectedRoleId}
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

function pathBadgeLabel(path) {
  if (path.pathType === 'direct_role') return `direct · ${path.viaRole}`;
  return `via ${path.viaTeam} team · ${path.viaRole}`;
}

export default function Dossier({ accessData }) {
  if (accessData.length === 0) {
    return <div className="empty-note">This person has no resolvable access in the graph.</div>;
  }

  return (
    <div className="dossier-list">
      {accessData.map((resource) => (
        <div key={resource.resourceId} className="dossier-row">
          <div className="dossier-row-head">
            <span className="dossier-row-name">{resource.resourceName}</span>
            <span className="dossier-row-type">{resource.resourceType}</span>
          </div>
          <div className="dossier-row-permissions">
            {resource.permissions.map((p) => (
              <span key={p} className="tag tag--permission">{p}</span>
            ))}
          </div>
          <div className="dossier-row-paths">
            {resource.accessPaths.map((path, i) => (
              <span
                key={i}
                className={`tag tag--path tag--path-${path.pathType}`}
              >
                {pathBadgeLabel(path)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import { useMemo } from 'react';

const WIDTH = 720;
const HEIGHT = 640;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 - 20 };
const ROLE_RADIUS = 150;
const RESOURCE_RADIUS = 280;

function pointOnRing(index, count, radius, center) {
  // -90deg offset so the first node lands at 12 o'clock, reads more like a
  // schematic dial than a default clock-position-0 layout.
  const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

function buildGraph(accessData) {
  const roleMap = new Map();
  const resourceNodes = [];
  const edges = [];

  accessData.forEach((resource) => {
    resourceNodes.push({
      id: resource.resourceId,
      name: resource.resourceName,
      type: resource.resourceType,
      permissions: resource.permissions,
    });

    resource.accessPaths.forEach((path) => {
      const key = `${path.pathType}:${path.viaRole}:${path.viaTeam || ''}`;
      if (!roleMap.has(key)) {
        roleMap.set(key, {
          key,
          label: path.viaRole,
          pathType: path.pathType,
          viaTeam: path.viaTeam,
        });
      }
      edges.push({ roleKey: key, resourceId: resource.resourceId, pathType: path.pathType });
    });
  });

  return { roleNodes: [...roleMap.values()], resourceNodes, edges };
}

export default function GraphSchematic({ userName, accessData, revokedRoleKeys, simulation }) {
  const graph = useMemo(() => buildGraph(accessData), [accessData]);

  const rolePositions = useMemo(() => {
    const positions = new Map();
    graph.roleNodes.forEach((node, i) => {
      positions.set(node.key, pointOnRing(i, graph.roleNodes.length, ROLE_RADIUS, CENTER));
    });
    return positions;
  }, [graph.roleNodes]);

  const resourcePositions = useMemo(() => {
    const positions = new Map();
    graph.resourceNodes.forEach((node, i) => {
      positions.set(node.id, pointOnRing(i, graph.resourceNodes.length, RESOURCE_RADIUS, CENTER));
    });
    return positions;
  }, [graph.resourceNodes]);

  const lostIds = new Set((simulation?.actuallyLost || []).map((r) => r.id));
  const retainedIds = new Set((simulation?.retainedAnyway || []).map((r) => r.id));
  const revokedKeys = revokedRoleKeys || new Set();

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="schematic-svg"
      role="img"
      aria-label={`Access lineage diagram for ${userName}`}
    >
      {/* Radial guide rings — decorative but also genuinely orient the two node tiers */}
      <circle cx={CENTER.x} cy={CENTER.y} r={ROLE_RADIUS} className="guide-ring" />
      <circle cx={CENTER.x} cy={CENTER.y} r={RESOURCE_RADIUS} className="guide-ring" />

      {/* Center -> Role edges */}
      {graph.roleNodes.map((role) => {
        const pos = rolePositions.get(role.key);
        const isRevoked = revokedKeys.has(role.key);
        return (
          <line
            key={`center-${role.key}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={pos.x}
            y2={pos.y}
            className={`edge edge--${role.pathType}${isRevoked ? ' edge--revoked' : ''}`}
          />
        );
      })}

      {/* Role -> Resource edges */}
      {graph.edges.map((edge) => {
        const from = rolePositions.get(edge.roleKey);
        const to = resourcePositions.get(edge.resourceId);
        const isFromRevokedRole = revokedKeys.has(edge.roleKey);
        const isLost = isFromRevokedRole && lostIds.has(edge.resourceId);
        const isRetained = simulation && retainedIds.has(edge.resourceId);
        let cls = `edge edge--${edge.pathType}`;
        if (isLost) cls += ' edge--lost';
        else if (isRetained) cls += ' edge--retained';
        return (
          <line
            key={`${edge.roleKey}-${edge.resourceId}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className={cls}
          />
        );
      })}

      {/* Resource nodes (outer ring) */}
      {graph.resourceNodes.map((node) => {
        const pos = resourcePositions.get(node.id);
        const isLost = simulation && lostIds.has(node.id);
        const isRetained = simulation && retainedIds.has(node.id);
        let cls = 'node node--resource';
        if (isLost) cls += ' node--lost';
        else if (isRetained) cls += ' node--retained';
        return (
          <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`} className={cls}>
            <rect x={-58} y={-22} width={116} height={44} rx={4} className="node-box" />
            <text className="node-label node-label--mono" y={-2} textAnchor="middle">
              {node.name}
            </text>
            <text className="node-sublabel" y={14} textAnchor="middle">
              {node.type} · {node.permissions.join(', ')}
            </text>
            {isLost && (
              <text className="node-strike" y={4} textAnchor="middle">
                ✕ revoked
              </text>
            )}
          </g>
        );
      })}

      {/* Role nodes (middle ring) */}
      {graph.roleNodes.map((role) => {
        const pos = rolePositions.get(role.key);
        const isRevoked = revokedKeys.has(role.key);
        return (
          <g
            key={role.key}
            transform={`translate(${pos.x}, ${pos.y})`}
            className={`node node--role${isRevoked ? ' node--role-revoked' : ''}`}
          >
            <rect x={-52} y={-18} width={104} height={36} rx={18} className="node-box node-box--role" />
            <text className="node-label node-label--mono" textAnchor="middle" y={2}>
              {role.label}
            </text>
            {role.viaTeam && (
              <text className="node-sublabel" y={30} textAnchor="middle">
                via {role.viaTeam}
              </text>
            )}
          </g>
        );
      })}

      {/* Center: the user */}
      <g transform={`translate(${CENTER.x}, ${CENTER.y})`} className="node node--user">
        <rect x={-64} y={-24} width={128} height={48} rx={4} className="node-box node-box--user" />
        <text className="node-label" textAnchor="middle" y={5}>
          {userName}
        </text>
      </g>
    </svg>
  );
}

// Query 1: Resolve everything a user can access, and via which path(s).
// Multi-hop: traverses ASSIGNED_ROLE and MEMBER_OF->HAS_DEFAULT_ROLE,
// then walks INHERITS_FROM up to 5 levels, then GRANTS to a Resource.
// Params: $userId (string)
//
// Two separate CALL {} subqueries combined afterward (rather than UNION
// inside a single CALL {}), since UNION-inside-CALL returned zero rows
// against CognoDB even though each traversal works fine independently.

MATCH (u:User {id: $userId})

CALL {
  WITH u
  MATCH (u)-[:ASSIGNED_ROLE]->(baseRole:Role)-[:INHERITS_FROM*0..5]->(effectiveRole:Role)-[g:GRANTS]->(res:Resource)
  RETURN res.id AS resourceId, res.name AS resourceName, res.type AS resourceType,
         g.permission AS permission, 'direct_role' AS pathType, baseRole.name AS viaRole,
         null AS viaTeam
}
WITH u, collect({
  resourceId: resourceId, resourceName: resourceName, resourceType: resourceType,
  permission: permission, pathType: pathType, viaRole: viaRole, viaTeam: viaTeam
}) AS directResults

CALL {
  WITH u
  MATCH (u)-[:MEMBER_OF]->(t:Team)-[:HAS_DEFAULT_ROLE]->(baseRole:Role)-[:INHERITS_FROM*0..5]->(effectiveRole:Role)-[g:GRANTS]->(res:Resource)
  RETURN res.id AS resourceId, res.name AS resourceName, res.type AS resourceType,
         g.permission AS permission, 'team_default_role' AS pathType, baseRole.name AS viaRole,
         t.name AS viaTeam
}
WITH directResults, collect({
  resourceId: resourceId, resourceName: resourceName, resourceType: resourceType,
  permission: permission, pathType: pathType, viaRole: viaRole, viaTeam: viaTeam
}) AS teamResults

WITH directResults + teamResults AS allAccess
UNWIND allAccess AS row
RETURN row.resourceId AS resourceId, row.resourceName AS resourceName, row.resourceType AS resourceType,
       collect(DISTINCT row.permission) AS permissions,
       collect(DISTINCT {pathType: row.pathType, viaRole: row.viaRole, viaTeam: row.viaTeam}) AS accessPaths
ORDER BY resourceName;

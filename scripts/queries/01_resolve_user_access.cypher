// Query 1: Resolve everything a user can access, and via which path(s).
// Multi-hop: traverses ASSIGNED_ROLE and MEMBER_OF->HAS_DEFAULT_ROLE,
// then walks INHERITS_FROM up to 5 levels, then GRANTS to a Resource.
// Params: $userId (string)

MATCH (u:User {id: $userId})
CALL {
  WITH u
  MATCH (u)-[:ASSIGNED_ROLE]->(baseRole:Role)
  MATCH (baseRole)-[:INHERITS_FROM*0..5]->(effectiveRole:Role)
  MATCH (effectiveRole)-[g:GRANTS]->(res:Resource)
  RETURN res.id AS resourceId, res.name AS resourceName, res.type AS resourceType,
         g.permission AS permission, 'direct_role' AS pathType, baseRole.name AS viaRole
  UNION
  WITH u
  MATCH (u)-[:MEMBER_OF]->(t:Team)-[:HAS_DEFAULT_ROLE]->(baseRole:Role)
  MATCH (baseRole)-[:INHERITS_FROM*0..5]->(effectiveRole:Role)
  MATCH (effectiveRole)-[g:GRANTS]->(res:Resource)
  RETURN res.id AS resourceId, res.name AS resourceName, res.type AS resourceType,
         g.permission AS permission, 'team_default_role' AS pathType, baseRole.name AS viaRole
}
RETURN resourceId, resourceName, resourceType, collect(DISTINCT permission) AS permissions,
       collect(DISTINCT {pathType: pathType, viaRole: viaRole}) AS accessPaths
ORDER BY resourceName;

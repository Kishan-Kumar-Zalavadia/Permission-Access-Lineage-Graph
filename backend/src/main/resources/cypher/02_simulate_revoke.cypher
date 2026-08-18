// Query 2: Simulate revoking a user's DIRECT role assignment and compute
// exactly what they lose vs. what they retain via team-inherited access.
// This is the "awkward in SQL" query: it requires independently traversing
// two separate inheritance chains (direct-role and team-role), each of
// variable depth, then computing a set difference between the results.
// In SQL this needs two recursive CTEs plus a NOT EXISTS / LEFT JOIN
// anti-join, and gets significantly worse if a third access path
// (e.g. project-based sharing) is added later — in Cypher it's a
// symmetric pair of subqueries plus a list comprehension.
//
// Params: $userId (string), $roleIdToRevoke (string)

MATCH (u:User {id: $userId})

// Everything reachable via the role being revoked (and anything it inherits)
CALL {
  WITH u
  MATCH (u)-[:ASSIGNED_ROLE]->(r:Role {id: $roleIdToRevoke})
  MATCH (r)-[:INHERITS_FROM*0..5]->(effectiveRole:Role)-[g:GRANTS]->(res:Resource)
  RETURN DISTINCT res.id AS resourceId, res.name AS resourceName, g.permission AS permission
}
WITH u, collect({id: resourceId, name: resourceName, permission: permission}) AS viaRevokedRole

// Everything still reachable via team-inherited default role, independent of the revoked role
CALL {
  WITH u
  MATCH (u)-[:MEMBER_OF]->(:Team)-[:HAS_DEFAULT_ROLE]->(baseRole:Role)
  MATCH (baseRole)-[:INHERITS_FROM*0..5]->(effectiveRole:Role)-[g:GRANTS]->(res:Resource)
  RETURN DISTINCT res.id AS resourceId
}
WITH viaRevokedRole, collect(resourceId) AS retainedResourceIds

RETURN
  [x IN viaRevokedRole WHERE NOT x.id IN retainedResourceIds] AS actuallyLost,
  [x IN viaRevokedRole WHERE x.id IN retainedResourceIds] AS retainedAnyway;

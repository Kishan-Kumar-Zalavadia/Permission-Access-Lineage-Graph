// Query 2: Simulate revoking a SET of access sources (any mix of directly-
// assigned roles and specific team-inherited roles) and compute exactly
// what the user loses vs. retains through every path NOT selected for
// revocation. This generalizes the single-role version: instead of diffing
// one role's grants against "everything else", it diffs the UNION of all
// selected sources' grants against the UNION of everything still standing.
//
// Params:
//   $userId
//   $revokedDirectRoleIds   — list of Role.id revoked via direct ASSIGNED_ROLE
//   $revokedTeamRolePairs   — list of {teamId, roleId} maps revoked via a
//                             specific team's HAS_DEFAULT_ROLE
// Either list may be empty (but must be passed, not null).

MATCH (u:User {id: $userId})

CALL {
  WITH u
  MATCH (u)-[:ASSIGNED_ROLE]->(baseRole:Role)-[:INHERITS_FROM*0..5]->(effectiveRole:Role)-[g:GRANTS]->(res:Resource)
  RETURN res.id AS resourceId, res.name AS resourceName, g.permission AS permission,
         (baseRole.id IN $revokedDirectRoleIds) AS isRevoked
}
WITH u, collect({resourceId: resourceId, resourceName: resourceName, permission: permission, isRevoked: isRevoked}) AS directRows

CALL {
  WITH u
  MATCH (u)-[:MEMBER_OF]->(t:Team)-[:HAS_DEFAULT_ROLE]->(baseRole:Role)-[:INHERITS_FROM*0..5]->(effectiveRole:Role)-[g:GRANTS]->(res:Resource)
  RETURN res.id AS resourceId, res.name AS resourceName, g.permission AS permission,
         any(pair IN $revokedTeamRolePairs WHERE pair.teamId = t.id AND pair.roleId = baseRole.id) AS isRevoked
}
WITH directRows, collect({resourceId: resourceId, resourceName: resourceName, permission: permission, isRevoked: isRevoked}) AS teamRows

WITH directRows + teamRows AS allRows
UNWIND allRows AS row
WITH row.resourceId AS resourceId, row.resourceName AS resourceName,
     collect(DISTINCT row.permission) AS permissions,
     collect(row.isRevoked) AS flags
WITH resourceId, resourceName, permissions,
     (true IN flags) AS wasRevokedSomewhere,
     (false IN flags) AS remainsSomewhere
WHERE wasRevokedSomewhere
WITH
  collect(CASE WHEN NOT remainsSomewhere THEN {id: resourceId, name: resourceName, permission: permissions[0]} END) AS lostWithNulls,
  collect(CASE WHEN remainsSomewhere THEN {id: resourceId, name: resourceName, permission: permissions[0]} END) AS retainedWithNulls
RETURN
  [x IN lostWithNulls WHERE x IS NOT NULL] AS actuallyLost,
  [x IN retainedWithNulls WHERE x IS NOT NULL] AS retainedAnyway;

// Query 5: List every access "source" a user has — each directly-assigned
// role, and each team-inherited default role — so the UI can offer BOTH
// as selectable targets for the revoke simulation (not just direct roles).
// Params: $userId

MATCH (u:User {id: $userId})

CALL {
  WITH u
  MATCH (u)-[:ASSIGNED_ROLE]->(r:Role)
  RETURN r.id AS roleId, r.name AS roleName, 'direct_role' AS pathType,
         null AS teamId, null AS teamName
}
WITH u, collect({roleId: roleId, roleName: roleName, pathType: pathType, teamId: teamId, teamName: teamName}) AS directSources

CALL {
  WITH u
  MATCH (u)-[:MEMBER_OF]->(t:Team)-[:HAS_DEFAULT_ROLE]->(r:Role)
  RETURN r.id AS roleId, r.name AS roleName, 'team_default_role' AS pathType,
         t.id AS teamId, t.name AS teamName
}
WITH directSources, collect({roleId: roleId, roleName: roleName, pathType: pathType, teamId: teamId, teamName: teamName}) AS teamSources

WITH directSources + teamSources AS allSources
UNWIND allSources AS s
RETURN s.pathType AS pathType, s.roleId AS roleId, s.roleName AS roleName,
       s.teamId AS teamId, s.teamName AS teamName
ORDER BY pathType, roleName;

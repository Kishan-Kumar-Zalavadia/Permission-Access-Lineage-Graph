// Query 4: A user's directly-assigned roles, for the "simulate revoke" selector.
// Params: $userId
MATCH (u:User {id: $userId})-[a:ASSIGNED_ROLE]->(r:Role)
RETURN r.id AS id, r.name AS name, r.level AS level, a.assignedAt AS assignedAt
ORDER BY r.level DESC;

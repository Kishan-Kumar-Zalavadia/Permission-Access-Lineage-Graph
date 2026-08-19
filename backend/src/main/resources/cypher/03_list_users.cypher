// Query 3: List all users, for the person-selector in the UI.
MATCH (u:User)
RETURN u.id AS id, u.name AS name, u.email AS email
ORDER BY u.name;

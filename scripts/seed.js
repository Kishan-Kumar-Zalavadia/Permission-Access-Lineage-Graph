/**
 * seed.js
 *
 * Loads a realistic, intentionally-overlapping enterprise access dataset into
 * CognoDB. The dataset is hand-crafted (not randomly generated) so that the
 * demo queries in queries/ have something meaningful to show — in particular
 * at least one user (Priya) who reaches the same resource through two
 * independent paths (direct role assignment vs. team-inherited role), which
 * is what makes the "what do they actually lose on revoke" query interesting.
 *
 * Usage:
 *   cp .env.example .env   # fill in your CognoDB credentials
 *   npm install
 *   node seed.js
 */

require('dotenv').config();
const neo4j = require('neo4j-driver');

const URI = process.env.COGNODB_URI;
const USER = process.env.COGNODB_USER;
const PASSWORD = process.env.COGNODB_PASSWORD;

if (!URI || !USER || !PASSWORD) {
  console.error('Missing COGNODB_URI / COGNODB_USER / COGNODB_PASSWORD env vars. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

// ---- Dataset ---------------------------------------------------------

const roles = [
  { id: 'role-viewer', name: 'Viewer', level: 1 },
  { id: 'role-editor', name: 'Editor', level: 2 },
  { id: 'role-admin', name: 'Admin', level: 3 },
  { id: 'role-security-lead', name: 'SecurityLead', level: 4 },
];

// Role -> Role it inherits from
const roleInheritance = [
  ['role-editor', 'role-viewer'],
  ['role-admin', 'role-editor'],
  ['role-security-lead', 'role-admin'],
];

const teams = [
  { id: 'team-finance', name: 'Finance' },
  { id: 'team-engineering', name: 'Engineering' },
  { id: 'team-security', name: 'Security' },
];

// Team -> default Role
const teamDefaultRoles = [
  ['team-finance', 'role-editor'],
  ['team-engineering', 'role-editor'],
  ['team-security', 'role-security-lead'],
];

const resources = [
  { id: 'res-q3-financials', name: 'Q3 Financials', type: 'Document' },
  { id: 'res-billing-repo', name: 'billing-repo', type: 'Repo' },
  { id: 'res-prod-db', name: 'prod-db', type: 'Database' },
  { id: 'res-audit-dashboard', name: 'Audit Dashboard', type: 'Dashboard' },
  { id: 'res-hr-records', name: 'HR Records', type: 'Document' },
];

// Role -[GRANTS {permission}]-> Resource
const grants = [
  ['role-viewer', 'res-q3-financials', 'read'],
  ['role-editor', 'res-billing-repo', 'write'],
  ['role-admin', 'res-prod-db', 'admin'],
  ['role-security-lead', 'res-audit-dashboard', 'admin'],
  ['role-viewer', 'res-hr-records', 'read'],
];

const users = [
  { id: 'user-priya', name: 'Priya Shah', email: 'priya@example.com' },
  { id: 'user-arjun', name: 'Arjun Mehta', email: 'arjun@example.com' },
  { id: 'user-lena', name: 'Lena Ortiz', email: 'lena@example.com' },
  { id: 'user-sam', name: 'Sam Okafor', email: 'sam@example.com' },
];

// User -[MEMBER_OF {since}]-> Team
const memberships = [
  ['user-priya', 'team-finance', '2023-01-10'],
  ['user-arjun', 'team-engineering', '2022-06-01'],
  ['user-lena', 'team-security', '2024-02-15'],
  ['user-sam', 'team-engineering', '2023-09-20'],
];

// User -[ASSIGNED_ROLE {assignedAt, assignedBy}]-> Role  (direct, on top of any team default)
const directAssignments = [
  // Priya is a finance lead: her team gives her Editor by default, but she
  // was ALSO given Admin directly — this is the overlapping-path scenario.
  ['user-priya', 'role-admin', '2024-05-01', 'user-lena'],
  // Sam picked up prod-db admin access for an on-call rotation, independent
  // of his team's default Editor role.
  ['user-sam', 'role-admin', '2024-08-12', 'user-lena'],
];

// ---- Load ---------------------------------------------------------

async function run() {
  const session = driver.session();
  try {
    console.log('Clearing existing data...');
    await session.run('MATCH (n) DETACH DELETE n');

    console.log('Creating constraints...');
    await session.run('CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT team_id IF NOT EXISTS FOR (t:Team) REQUIRE t.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT role_id IF NOT EXISTS FOR (r:Role) REQUIRE r.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT resource_id IF NOT EXISTS FOR (res:Resource) REQUIRE res.id IS UNIQUE');

    console.log('Creating roles...');
    for (const r of roles) {
      await session.run(
        'MERGE (r:Role {id: $id}) SET r.name = $name, r.level = $level',
        r
      );
    }

    console.log('Creating role inheritance...');
    for (const [childId, parentId] of roleInheritance) {
      await session.run(
        `MATCH (child:Role {id: $childId}), (parent:Role {id: $parentId})
         MERGE (child)-[:INHERITS_FROM]->(parent)`,
        { childId, parentId }
      );
    }

    console.log('Creating teams...');
    for (const t of teams) {
      await session.run('MERGE (t:Team {id: $id}) SET t.name = $name', t);
    }

    console.log('Linking team default roles...');
    for (const [teamId, roleId] of teamDefaultRoles) {
      await session.run(
        `MATCH (t:Team {id: $teamId}), (r:Role {id: $roleId})
         MERGE (t)-[:HAS_DEFAULT_ROLE]->(r)`,
        { teamId, roleId }
      );
    }

    console.log('Creating resources...');
    for (const res of resources) {
      await session.run(
        'MERGE (res:Resource {id: $id}) SET res.name = $name, res.type = $type',
        res
      );
    }

    console.log('Creating grants...');
    for (const [roleId, resourceId, permission] of grants) {
      await session.run(
        `MATCH (r:Role {id: $roleId}), (res:Resource {id: $resourceId})
         MERGE (r)-[g:GRANTS]->(res)
         SET g.permission = $permission`,
        { roleId, resourceId, permission }
      );
    }

    console.log('Creating users...');
    for (const u of users) {
      await session.run(
        'MERGE (u:User {id: $id}) SET u.name = $name, u.email = $email',
        u
      );
    }

    console.log('Creating team memberships...');
    for (const [userId, teamId, since] of memberships) {
      await session.run(
        `MATCH (u:User {id: $userId}), (t:Team {id: $teamId})
         MERGE (u)-[m:MEMBER_OF]->(t)
         SET m.since = $since`,
        { userId, teamId, since }
      );
    }

    console.log('Creating direct role assignments...');
    for (const [userId, roleId, assignedAt, assignedBy] of directAssignments) {
      await session.run(
        `MATCH (u:User {id: $userId}), (r:Role {id: $roleId})
         MERGE (u)-[a:ASSIGNED_ROLE]->(r)
         SET a.assignedAt = $assignedAt, a.assignedBy = $assignedBy`,
        { userId, roleId, assignedAt, assignedBy }
      );
    }

    console.log('Seed complete.');
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

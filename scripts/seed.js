/**
 * seed.js
 *
 * Loads a realistic, richly-varied enterprise access dataset into CognoDB.
 * The dataset is hand-crafted (not randomly generated) so every scenario in
 * it is meaningful and defensible — including deliberate edge cases:
 *   - a user with zero access anywhere (Dmitri)
 *   - a user with TWO directly-assigned roles at once (Tobias)
 *   - a user whose direct role exactly duplicates their team default (Ben)
 *   - lateral roles that sit OUTSIDE the main Viewer->...->SecurityLead
 *     inheritance chain (Auditor, LegalCounsel, OnCallResponder) — proving
 *     the model isn't just a straight ladder
 *   - a user on two teams at once, each granting a different role (Aisha)
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

// ---- Roles -----------------------------------------------------------
// Not a single ladder: Viewer -> Contributor -> Editor -> Admin -> SecurityLead
// is the main chain, but Auditor, LegalCounsel, and OnCallResponder branch
// laterally off Viewer — each unlocks a specific resource class without
// climbing the main privilege ladder.

const roles = [
  { id: 'role-viewer', name: 'Viewer', level: 1 },
  { id: 'role-contributor', name: 'Contributor', level: 2 },
  { id: 'role-editor', name: 'Editor', level: 3 },
  { id: 'role-admin', name: 'Admin', level: 4 },
  { id: 'role-security-lead', name: 'SecurityLead', level: 5 },
  { id: 'role-auditor', name: 'Auditor', level: 3 },
  { id: 'role-legal-counsel', name: 'LegalCounsel', level: 3 },
  { id: 'role-oncall', name: 'OnCallResponder', level: 3 },
];

const roleInheritance = [
  ['role-contributor', 'role-viewer'],
  ['role-editor', 'role-contributor'],
  ['role-admin', 'role-editor'],
  ['role-security-lead', 'role-admin'],
  ['role-auditor', 'role-viewer'],
  ['role-legal-counsel', 'role-viewer'],
  ['role-oncall', 'role-viewer'],
];

// ---- Teams -------------------------------------------------------------

const teams = [
  { id: 'team-finance', name: 'Finance' },
  { id: 'team-engineering', name: 'Engineering' },
  { id: 'team-security', name: 'Security' },
  { id: 'team-sales', name: 'Sales' },
  { id: 'team-legal', name: 'Legal' },
  { id: 'team-product', name: 'Product' },
  { id: 'team-devops', name: 'DevOps' },
  { id: 'team-data-science', name: 'Data Science' },
];

const teamDefaultRoles = [
  ['team-finance', 'role-editor'],
  ['team-engineering', 'role-contributor'],
  ['team-security', 'role-security-lead'],
  ['team-sales', 'role-viewer'],
  ['team-legal', 'role-legal-counsel'],
  ['team-product', 'role-editor'],
  ['team-devops', 'role-oncall'],
  ['team-data-science', 'role-contributor'],
];

// ---- Resources -----------------------------------------------------------
// Spread across 8 distinct types, each gated by a different role, so the
// graph shows real variety rather than one repeated shape.

const resources = [
  { id: 'res-q3-financials', name: 'Q3 Financials', type: 'Document' },
  { id: 'res-fy26-budget', name: 'FY26 Budget Model', type: 'Spreadsheet' },
  { id: 'res-hr-records', name: 'HR Records', type: 'Document' },
  { id: 'res-billing-repo', name: 'billing-repo', type: 'Repo' },
  { id: 'res-payments-repo', name: 'payments-service', type: 'Repo' },
  { id: 'res-deploy-pipeline', name: 'deployment-pipeline', type: 'Pipeline' },
  { id: 'res-ml-bucket', name: 'ml-training-bucket', type: 'Bucket' },
  { id: 'res-analytics-api', name: 'analytics-api', type: 'API' },
  { id: 'res-prod-db', name: 'prod-db', type: 'Database' },
  { id: 'res-customer-db', name: 'customer-db', type: 'Database' },
  { id: 'res-audit-dashboard', name: 'Audit Dashboard', type: 'Dashboard' },
  { id: 'res-compliance-reports', name: 'Compliance Reports', type: 'Document' },
  { id: 'res-incident-runbook', name: 'Incident Runbook', type: 'Document' },
  { id: 'res-legal-vault', name: 'Legal Contracts Vault', type: 'Document' },
  { id: 'res-sales-dashboard', name: 'Sales Pipeline Dashboard', type: 'Dashboard' },
];

const grants = [
  ['role-viewer', 'res-q3-financials', 'read'],
  ['role-editor', 'res-fy26-budget', 'write'],
  ['role-viewer', 'res-hr-records', 'read'],
  ['role-editor', 'res-billing-repo', 'write'],
  ['role-contributor', 'res-payments-repo', 'write'],
  ['role-contributor', 'res-deploy-pipeline', 'write'],
  ['role-contributor', 'res-ml-bucket', 'write'],
  ['role-editor', 'res-analytics-api', 'write'],
  ['role-admin', 'res-prod-db', 'admin'],
  ['role-admin', 'res-customer-db', 'admin'],
  ['role-security-lead', 'res-audit-dashboard', 'admin'],
  ['role-auditor', 'res-compliance-reports', 'read'],
  ['role-oncall', 'res-incident-runbook', 'read'],
  ['role-legal-counsel', 'res-legal-vault', 'read'],
  ['role-viewer', 'res-sales-dashboard', 'read'],
];

// ---- Users -----------------------------------------------------------
// 20 people covering a deliberately wide spread of scenarios.

const users = [
  { id: 'user-priya', name: 'Priya Shah', email: 'priya@example.com' },
  { id: 'user-arjun', name: 'Arjun Mehta', email: 'arjun@example.com' },
  { id: 'user-lena', name: 'Lena Ortiz', email: 'lena@example.com' },
  { id: 'user-sam', name: 'Sam Okafor', email: 'sam@example.com' },
  { id: 'user-wei', name: 'Wei Zhang', email: 'wei@example.com' },
  { id: 'user-fatima', name: 'Fatima Al-Sayed', email: 'fatima@example.com' },
  { id: 'user-carlos', name: 'Carlos Mendez', email: 'carlos@example.com' },
  { id: 'user-aisha', name: 'Aisha Rahman', email: 'aisha@example.com' },
  { id: 'user-noah', name: 'Noah Kim', email: 'noah@example.com' },
  { id: 'user-ingrid', name: 'Ingrid Larsson', email: 'ingrid@example.com' },
  { id: 'user-tobias', name: 'Tobias Reyes', email: 'tobias@example.com' },
  { id: 'user-grace', name: 'Grace Adeyemi', email: 'grace@example.com' },
  { id: 'user-marcus', name: 'Marcus Chen', email: 'marcus@example.com' },
  { id: 'user-yuki', name: 'Yuki Tanaka', email: 'yuki@example.com' },
  { id: 'user-elena', name: 'Elena Petrova', email: 'elena@example.com' },
  { id: 'user-dmitri', name: 'Dmitri Volkov', email: 'dmitri@example.com' },
  { id: 'user-priyanka', name: 'Priyanka Nair', email: 'priyanka@example.com' },
  { id: 'user-omar', name: 'Omar Farouk', email: 'omar@example.com' },
  { id: 'user-sofia', name: 'Sofia Rossi', email: 'sofia@example.com' },
  { id: 'user-ben', name: 'Ben Okoro', email: 'ben@example.com' },
];

const memberships = [
  ['user-priya', 'team-finance', '2023-01-10'],
  ['user-arjun', 'team-engineering', '2022-06-01'],
  ['user-lena', 'team-security', '2024-02-15'],
  ['user-sam', 'team-engineering', '2023-09-20'],
  ['user-wei', 'team-devops', '2023-03-11'],
  ['user-fatima', 'team-sales', '2022-11-05'],
  ['user-carlos', 'team-legal', '2021-08-19'],
  ['user-aisha', 'team-product', '2023-05-02'],
  ['user-aisha', 'team-data-science', '2024-01-15'], // dual-team membership
  ['user-noah', 'team-data-science', '2023-07-22'],
  // Ingrid: no team at all
  ['user-tobias', 'team-engineering', '2022-02-28'],
  ['user-grace', 'team-security', '2023-10-01'],
  ['user-marcus', 'team-product', '2024-03-18'],
  ['user-yuki', 'team-devops', '2023-12-09'],
  ['user-elena', 'team-finance', '2022-09-14'],
  // Dmitri: no team at all — zero-access edge case
  ['user-priyanka', 'team-engineering', '2023-04-06'],
  ['user-priyanka', 'team-security', '2024-06-01'], // dual-team membership
  ['user-omar', 'team-legal', '2022-01-20'],
  ['user-sofia', 'team-sales', '2023-08-30'],
  ['user-ben', 'team-data-science', '2023-02-14'],
];

const directAssignments = [
  // Priya: finance lead with elevated direct Admin on top of team Editor.
  ['user-priya', 'role-admin', '2024-05-01', 'user-lena'],
  // Sam: on-call rotation grants temporary direct Admin, independent of team role.
  ['user-sam', 'role-admin', '2024-08-12', 'user-lena'],
  // Noah: lateral Auditor role alongside his Data Science Contributor default.
  ['user-noah', 'role-auditor', '2024-04-03', 'user-lena'],
  // Ingrid: no team — Viewer is her ONLY access, granted directly.
  ['user-ingrid', 'role-viewer', '2023-06-01', 'user-lena'],
  // Tobias: TWO direct roles at once — Admin AND SecurityLead.
  ['user-tobias', 'role-admin', '2024-02-10', 'user-lena'],
  ['user-tobias', 'role-security-lead', '2024-07-01', 'user-lena'],
  // Grace: already SecurityLead via team; ALSO directly assigned Auditor
  // (a lower lateral role — fully redundant, since SecurityLead already
  // inherits everything Auditor would grant plus more).
  ['user-grace', 'role-auditor', '2024-01-11', 'user-lena'],
  // Omar: Legal team gives him LegalCounsel by default, but he's also
  // directly assigned Admin — a big escalation worth auditing.
  ['user-omar', 'role-admin', '2024-09-01', 'user-lena'],
  // Sofia: Sales team only gives Viewer, but she's directly assigned Editor.
  ['user-sofia', 'role-editor', '2024-03-22', 'user-lena'],
  // Ben: directly assigned Contributor — EXACTLY what his team already
  // grants by default. Fully redundant; a good "dedup" sanity check.
  ['user-ben', 'role-contributor', '2023-05-19', 'user-lena'],
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

    console.log(`Creating ${roles.length} roles...`);
    for (const r of roles) {
      await session.run('MERGE (r:Role {id: $id}) SET r.name = $name, r.level = $level', r);
    }

    console.log(`Creating ${roleInheritance.length} role inheritance edges...`);
    for (const [childId, parentId] of roleInheritance) {
      await session.run(
        `MATCH (child:Role {id: $childId}), (parent:Role {id: $parentId})
         MERGE (child)-[:INHERITS_FROM]->(parent)`,
        { childId, parentId }
      );
    }

    console.log(`Creating ${teams.length} teams...`);
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

    console.log(`Creating ${resources.length} resources...`);
    for (const res of resources) {
      await session.run('MERGE (res:Resource {id: $id}) SET res.name = $name, res.type = $type', res);
    }

    console.log(`Creating ${grants.length} grants...`);
    for (const [roleId, resourceId, permission] of grants) {
      await session.run(
        `MATCH (r:Role {id: $roleId}), (res:Resource {id: $resourceId})
         MERGE (r)-[g:GRANTS]->(res)
         SET g.permission = $permission`,
        { roleId, resourceId, permission }
      );
    }

    console.log(`Creating ${users.length} users...`);
    for (const u of users) {
      await session.run('MERGE (u:User {id: $id}) SET u.name = $name, u.email = $email', u);
    }

    console.log(`Creating ${memberships.length} team memberships...`);
    for (const [userId, teamId, since] of memberships) {
      await session.run(
        `MATCH (u:User {id: $userId}), (t:Team {id: $teamId})
         MERGE (u)-[m:MEMBER_OF]->(t)
         SET m.since = $since`,
        { userId, teamId, since }
      );
    }

    console.log(`Creating ${directAssignments.length} direct role assignments...`);
    for (const [userId, roleId, assignedAt, assignedBy] of directAssignments) {
      await session.run(
        `MATCH (u:User {id: $userId}), (r:Role {id: $roleId})
         MERGE (u)-[a:ASSIGNED_ROLE]->(r)
         SET a.assignedAt = $assignedAt, a.assignedBy = $assignedBy`,
        { userId, roleId, assignedAt, assignedBy }
      );
    }

    console.log('Seed complete.');
    console.log(`Totals: ${users.length} users, ${teams.length} teams, ${roles.length} roles, ${resources.length} resources.`);
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

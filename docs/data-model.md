# Data Model — Enterprise Access Lineage Graph

## Node labels

| Label | Properties |
|---|---|
| `User` | `id`, `name`, `email` |
| `Team` | `id`, `name` |
| `Role` | `id`, `name`, `level` (int, higher = more privileged) |
| `Resource` | `id`, `name`, `type` (`"Document"` \| `"Database"` \| `"Repo"` \| `"Dashboard"`) |

## Relationship types

| Relationship | Direction | Properties | Meaning |
|---|---|---|---|
| `MEMBER_OF` | `(User)->(Team)` | `since` | user belongs to a team |
| `HAS_DEFAULT_ROLE` | `(Team)->(Role)` | — | team members inherit this role by default |
| `ASSIGNED_ROLE` | `(User)->(Role)` | `assignedAt`, `assignedBy` | role given directly to a user |
| `INHERITS_FROM` | `(Role)->(Role)` | — | a role inherits all grants of the role it points to |
| `GRANTS` | `(Role)->(Resource)` | `permission` (`"read"` \| `"write"` \| `"admin"`) | a role grants a permission on a resource |

## Design notes

- **Two independent access paths per user**: direct `ASSIGNED_ROLE` and indirect `MEMBER_OF -> HAS_DEFAULT_ROLE`.
  This is intentional — it's what makes the "what do they actually lose" query non-trivial.
- **`INHERITS_FROM` chains are capped at depth 5** in queries (`*0..5`) to guard against
  accidental cycles blowing up traversal cost. Seed data has no cycles, but the cap is a
  defensive habit worth having (and worth mentioning in the interview).
- Every `GRANTS` edge carries a single `permission` — a resource can receive multiple `GRANTS`
  edges from different roles, potentially at different permission levels. When that happens,
  the *highest* permission the user can reach through any path wins (documented behavior,
  not just an accident of the query).

## Example scenario used in seed data (see scripts/seed.js)

- Roles: `Viewer -> Editor -> Admin` (each `INHERITS_FROM` the previous)
- Priya:
  - `MEMBER_OF` **Finance** team, which `HAS_DEFAULT_ROLE` **Editor**
  - Also has `ASSIGNED_ROLE` **Admin** directly (finance lead override)
- Resources: `Q3 Financials` (Viewer: read), `billing-repo` (Editor: write), `prod-db` (Admin: admin)
- Revoking Priya's direct Admin role does **not** remove her access to `Q3 Financials` or
  `billing-repo`, because her team membership already grants those transitively through Editor.
  She *only* loses `prod-db` admin access. That's the demo moment.

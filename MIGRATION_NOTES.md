# Migration Notes — Production Readiness Fixes (H1–H7)

## Schema changes requiring `drizzle-kit push`

After merging this branch, run `drizzle-kit push` against your Neon database.

### H4 — `transactionsTable.date`: `text` → `date`
PostgreSQL will cast existing `"YYYY-MM-DD"` strings automatically.
Check for non-ISO values first:
```sql
SELECT id, date FROM transactions WHERE date !~ '^\d{4}-\d{2}-\d{2}$';
```

### H5 — `contributionsTable.amount`: `integer` → `numeric(12,2)`
Widening integer → numeric is backward-compatible; no data loss.

### H2 — `role` columns: `text` → `pgEnum("role", [...])`
Adds a new PostgreSQL enum type. Rows with roles outside
`[admin, pastor, leadership, workforce, member]` will fail:
```sql
SELECT id, role FROM users   WHERE role NOT IN ('admin','pastor','leadership','workforce','member');
SELECT id, role FROM members WHERE role NOT IN ('admin','pastor','leadership','workforce','member');
```

### H1 — New indexes (14 tables)
Purely additive — no downtime risk.

### H7 — New columns on `usersTable`
- `emailVerified boolean NOT NULL DEFAULT true` — existing users auto-verified
- `emailVerificationToken text`
- `emailVerificationTokenExpiry timestamptz`

## New environment variable required

| Variable | Purpose |
|---|---|
| `FRONTEND_URL` | Base URL of the React app (e.g. `https://dcl-lugazi.web.app`) |

Set this on Render before deploying. The existing `EMAIL_USER`, `EMAIL_PASS`,
`EMAIL_HOST`, `EMAIL_PORT`, and `EMAIL_FROM` variables are also used for the
new verification emails (same transport as password reset).

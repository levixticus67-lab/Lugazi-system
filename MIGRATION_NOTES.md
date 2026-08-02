# Migration Notes

## Reports — File Attachment Support

The schema changes below are applied automatically by the GitHub Actions workflow (drizzle-kit push → Neon).

If you ever need to apply them manually:

```sql
-- Make content nullable (reports can now be file-only)
ALTER TABLE reports ALTER COLUMN content DROP NOT NULL;

-- Add file attachment columns
ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_size text;
```

These are all safe, additive changes — no existing data is affected.

## Session Whitelist — Token Invalidation on Logout

Applied automatically by the GitHub Actions workflow (drizzle-kit push → Neon).

If you ever need to apply manually:

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id         serial PRIMARY KEY,
  user_id    integer NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx   ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
```

Additive change — no existing data is affected. All current users will be signed out once on their next request (their token won't be in the whitelist yet) and will need to sign in again. This is expected and intentional.

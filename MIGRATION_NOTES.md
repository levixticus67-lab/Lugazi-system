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

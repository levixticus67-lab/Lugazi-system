# Migration Notes

## Reports — File Attachment Support

Run the following SQL on your production database (Render) to apply the schema changes for report file attachments:

```sql
-- Make content nullable (reports can now be file-only)
ALTER TABLE reports ALTER COLUMN content DROP NOT NULL;

-- Add file attachment columns
ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_size text;
```

These are all safe, additive changes — no existing data is affected.

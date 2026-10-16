-- Read-only deployment gate. Run with the target application's DB user and
-- search_path: psql -X --set=ON_ERROR_STOP=1 --file=... (see README.md).
-- A missing table/column, wrong type/default/nullability, or denied SELECT
-- must fail the gate, including when GuestMonitoring has no rows.
BEGIN READ ONLY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = to_regclass('"GuestMonitoring"')
      AND attname = 'role'
      AND NOT attisdropped
      AND atttypid = 'pg_catalog.text'::regtype
      AND NOT attnotnull
      AND NOT atthasdef
      AND attgenerated = ''
  ) THEN
    RAISE EXCEPTION 'Deployment blocked: GuestMonitoring.role must be nullable TEXT with no default. Apply the reviewed manual SQL first.';
  END IF;
END
$$;
SELECT "role" FROM "GuestMonitoring" LIMIT 0;
ROLLBACK;

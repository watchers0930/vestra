-- PDF-only guest monitoring: additive schema change, no default/backfill.
-- Apply to the isolated test DB first. Production application is manual.
-- Apply BEFORE deploying code that selects GuestMonitoring.role.
-- Mandatory deployment gates: README.md and verify-guest-monitoring-role.sql.
-- IF NOT EXISTS alone does not verify an existing column's compatibility.
-- Rollback: retain this nullable column and restore the prior application version.
ALTER TABLE "GuestMonitoring" ADD COLUMN IF NOT EXISTS "role" TEXT;

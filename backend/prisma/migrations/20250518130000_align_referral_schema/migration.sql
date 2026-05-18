-- Align Referral table when DB was created from an older schema.

ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "concern" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "triageNotes" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "submittedById" TEXT;

UPDATE "Referral"
SET "concern" = COALESCE("concern", 'General')
WHERE "concern" IS NULL;

-- Backfill submittedById from legacy "submittedBy" text column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Referral' AND column_name = 'submittedBy'
  ) THEN
    UPDATE "Referral" r
    SET "submittedById" = u.id
    FROM "User" u
    WHERE r."submittedById" IS NULL
      AND (r."submittedBy" = u.id OR r."submittedBy" = u.email);
  END IF;
END $$;

-- Fallback: assign first teacher when still null
UPDATE "Referral" r
SET "submittedById" = (
  SELECT id FROM "User" WHERE role = 'TEACHER' ORDER BY "createdAt" LIMIT 1
)
WHERE r."submittedById" IS NULL;

ALTER TABLE "Referral" ALTER COLUMN "concern" SET NOT NULL;

-- Add FK if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Referral_submittedById_fkey'
  ) THEN
    ALTER TABLE "Referral"
      ADD CONSTRAINT "Referral_submittedById_fkey"
      FOREIGN KEY ("submittedById") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

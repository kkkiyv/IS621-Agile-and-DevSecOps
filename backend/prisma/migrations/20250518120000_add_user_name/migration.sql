-- Align User table with schema when DB was created from an older init migration.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;

UPDATE "User"
SET "name" = INITCAP(SPLIT_PART("email", '@', 1))
WHERE "name" IS NULL;

ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

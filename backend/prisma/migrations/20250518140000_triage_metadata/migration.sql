-- CH-004: triage audit fields + case-opened status for queue filters
ALTER TYPE "ReferralStatus" ADD VALUE IF NOT EXISTS 'CASE_OPENED';

ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "triagedById" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "triagedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Referral_triagedById_fkey'
  ) THEN
    ALTER TABLE "Referral"
      ADD CONSTRAINT "Referral_triagedById_fkey"
      FOREIGN KEY ("triagedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

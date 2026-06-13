-- CreateEnum
CREATE TYPE "CaseOutcome" AS ENUM ('ONGOING', 'RESOLVED', 'REFERRED_EXTERNALLY', 'NO_FURTHER_ACTIONS');

-- AlterTable
ALTER TABLE "Case" ADD COLUMN "riskLevel" "RiskLevel",
                   ADD COLUMN "outcome" "CaseOutcome",
                   ADD COLUMN "outcomeNotes" TEXT;

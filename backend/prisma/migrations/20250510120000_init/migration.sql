-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TEACHER', 'COUNSELLOR', 'LEAD_ADMIN');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('SUBMITTED', 'IN_TRIAGE', 'CASE_OPENED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedById" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "nric" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "urgency" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'SUBMITTED',
    "triageRiskLevel" TEXT,
    "triageOutcome" TEXT,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

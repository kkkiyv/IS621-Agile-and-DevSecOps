-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('INDIVIDUAL', 'GROUP', 'FAMILY', 'CRISIS');

-- CreateTable
CREATE TABLE "SessionNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "duration" INTEGER NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "observations" TEXT NOT NULL,
    "nextSteps" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionNote" ADD CONSTRAINT "SessionNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

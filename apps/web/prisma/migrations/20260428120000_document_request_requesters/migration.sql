-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'TEACHER_EMPLOYMENT_CERT';
ALTER TYPE "DocumentType" ADD VALUE 'CANTEEN_EMPLOYMENT_CERT';

-- AlterTable
ALTER TABLE "DocumentRequest" ADD COLUMN "requesterUserId" TEXT;
ALTER TABLE "DocumentRequest" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "DocumentRequest" ADD COLUMN "reviewedByUserId" TEXT;

UPDATE "DocumentRequest" AS dr
SET "requesterUserId" = s."userId"
FROM "Student" AS s
WHERE dr."studentId" IS NOT NULL AND dr."studentId" = s."id" AND dr."requesterUserId" IS NULL;

ALTER TABLE "DocumentRequest" ALTER COLUMN "requesterUserId" SET NOT NULL;

ALTER TABLE "DocumentRequest" ALTER COLUMN "studentId" DROP NOT NULL;

ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DocumentRequest_requesterUserId_idx" ON "DocumentRequest"("requesterUserId");

CREATE INDEX "DocumentRequest_status_idx" ON "DocumentRequest"("status");

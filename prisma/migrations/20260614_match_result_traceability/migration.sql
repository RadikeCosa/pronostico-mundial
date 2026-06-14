-- AlterTable
ALTER TABLE "MatchResult"
ADD COLUMN "createdByParticipantId" TEXT,
ADD COLUMN "updatedByParticipantId" TEXT;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_createdByParticipantId_fkey" FOREIGN KEY ("createdByParticipantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_updatedByParticipantId_fkey" FOREIGN KEY ("updatedByParticipantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

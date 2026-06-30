-- CreateEnum
CREATE TYPE "ResolutionMethod" AS ENUM ('REGULAR', 'EXTRA_TIME', 'PENALTIES');

-- AlterTable
ALTER TABLE "Prediction"
ADD COLUMN "resolutionMethod" "ResolutionMethod";

-- AlterTable
ALTER TABLE "MatchResult"
ADD COLUMN "resolutionMethod" "ResolutionMethod";

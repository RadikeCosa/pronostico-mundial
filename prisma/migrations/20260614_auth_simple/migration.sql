-- AlterTable
ALTER TABLE "Participant"
ADD COLUMN "slug" TEXT,
ADD COLUMN "normalizedName" TEXT,
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Backfill identity fields for existing participants.
UPDATE "Participant"
SET
  "normalizedName" = lower(regexp_replace(trim("name"), '\s+', ' ', 'g')),
  "slug" = lower(
    regexp_replace(
      regexp_replace(trim("name"), '[^[:alnum:]]+', '-', 'g'),
      '(^-+|-+$)',
      '',
      'g'
    )
  )
WHERE "normalizedName" IS NULL OR "slug" IS NULL;

UPDATE "Participant"
SET "isAdmin" = true
WHERE lower(trim("name")) = 'ramiro';

ALTER TABLE "Participant"
ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "normalizedName" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Participant_slug_key" ON "Participant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_normalizedName_key" ON "Participant"("normalizedName");

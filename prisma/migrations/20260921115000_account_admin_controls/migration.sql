ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

UPDATE "User"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", NOW());

WITH first_user AS (
  SELECT "id" FROM "User" ORDER BY "createdAt", "id" LIMIT 1
)
UPDATE "User" SET "role"='ADMIN'
WHERE "id" IN (SELECT "id" FROM first_user);

CREATE TABLE "AppSetting" (
  "id" TEXT NOT NULL,
  "registrationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppSetting" ("id","registrationsEnabled","emailVerificationRequired","createdAt","updatedAt")
VALUES ('global',true,true,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "VerificationToken"
ADD CONSTRAINT "VerificationToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

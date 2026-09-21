ALTER TABLE "AppSetting"
  ADD COLUMN "appBaseUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "smtpHost" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "smtpPort" INTEGER NOT NULL DEFAULT 587,
  ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smtpUser" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "smtpPasswordEncrypted" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "smtpFrom" TEXT NOT NULL DEFAULT '';

CREATE TABLE "BackupDestination" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "folder" TEXT NOT NULL DEFAULT '/Sögur Forge',
  "accountLabel" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupDestination_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BackupDestination_userId_provider_key" ON "BackupDestination"("userId","provider");
CREATE INDEX "BackupDestination_userId_enabled_idx" ON "BackupDestination"("userId","enabled");
ALTER TABLE "BackupDestination" ADD CONSTRAINT "BackupDestination_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

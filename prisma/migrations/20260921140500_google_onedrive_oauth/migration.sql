ALTER TABLE "BackupDestination"
  ADD COLUMN "providerAccountId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "refreshTokenEncrypted" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "connectedAt" TIMESTAMP(3),
  ADD COLUMN "lastBackupAt" TIMESTAMP(3),
  ADD COLUMN "lastBackupError" TEXT NOT NULL DEFAULT '';

CREATE TABLE "BackupOAuthState" (
  "id" TEXT NOT NULL,
  "stateHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "verifierEncrypted" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BackupOAuthState_stateHash_key" ON "BackupOAuthState"("stateHash");
CREATE INDEX "BackupOAuthState_userId_provider_idx" ON "BackupOAuthState"("userId","provider");
CREATE INDEX "BackupOAuthState_expiresAt_idx" ON "BackupOAuthState"("expiresAt");

ALTER TABLE "BackupOAuthState" ADD CONSTRAINT "BackupOAuthState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

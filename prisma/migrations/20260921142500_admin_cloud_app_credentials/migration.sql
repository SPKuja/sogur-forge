ALTER TABLE "AppSetting"
  ADD COLUMN "googleDriveClientId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "googleDriveClientSecretEncrypted" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "oneDriveClientId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "oneDriveClientSecretEncrypted" TEXT NOT NULL DEFAULT '';

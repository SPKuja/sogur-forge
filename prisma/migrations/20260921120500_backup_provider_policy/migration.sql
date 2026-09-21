ALTER TABLE "AppSetting"
  ADD COLUMN "backupDownloadEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "backupDropboxEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "backupGoogleDriveEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "backupOneDriveEnabled" BOOLEAN NOT NULL DEFAULT false;

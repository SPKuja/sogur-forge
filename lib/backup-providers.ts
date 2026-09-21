import type {SiteSettings} from "@/lib/site-settings";
export type BackupProviderId="dropbox"|"googleDrive"|"oneDrive";
export type BackupProviderAvailability={
  download:{enabled:boolean};
  dropbox:{enabled:boolean;configured:false};
  googleDrive:{enabled:boolean;configured:boolean};
  oneDrive:{enabled:boolean;configured:boolean};
};
export function backupProviderConfiguration(){return {
  googleDrive:!!process.env.GOOGLE_DRIVE_CLIENT_ID?.trim()&&!!process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim(),
  oneDrive:!!process.env.ONEDRIVE_CLIENT_ID?.trim()&&!!process.env.ONEDRIVE_CLIENT_SECRET?.trim()
}}
export function backupProviderAvailability(settings:SiteSettings):BackupProviderAvailability{const configured=backupProviderConfiguration();return {
  download:{enabled:settings.backupDownloadEnabled},
  dropbox:{enabled:settings.backupDropboxEnabled,configured:false},
  googleDrive:{enabled:settings.backupGoogleDriveEnabled,configured:configured.googleDrive},
  oneDrive:{enabled:settings.backupOneDriveEnabled,configured:configured.oneDrive}
}}
export function providerAllowed(settings:SiteSettings,provider:BackupProviderId){return provider==="dropbox"?settings.backupDropboxEnabled:provider==="googleDrive"?settings.backupGoogleDriveEnabled:settings.backupOneDriveEnabled}

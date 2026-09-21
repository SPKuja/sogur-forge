import type {SiteSettings} from "@/lib/site-settings";
export type BackupProviderId="dropbox"|"googleDrive"|"oneDrive";
export type BackupProviderAvailability={download:{enabled:boolean};dropbox:{enabled:boolean};googleDrive:{enabled:boolean};oneDrive:{enabled:boolean}};
export function backupProviderAvailability(settings:SiteSettings):BackupProviderAvailability{return {download:{enabled:settings.backupDownloadEnabled},dropbox:{enabled:settings.backupDropboxEnabled},googleDrive:{enabled:settings.backupGoogleDriveEnabled},oneDrive:{enabled:settings.backupOneDriveEnabled}}}
export function providerAllowed(settings:SiteSettings,provider:BackupProviderId){return provider==="dropbox"?settings.backupDropboxEnabled:provider==="googleDrive"?settings.backupGoogleDriveEnabled:settings.backupOneDriveEnabled}

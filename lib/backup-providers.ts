import type {SiteSettings} from "@/lib/site-settings";
import {cloudProviderConfigured} from "@/lib/cloud-provider-settings";
export type BackupProviderId="dropbox"|"googleDrive"|"oneDrive";
export type BackupProviderAvailability={download:{enabled:boolean};dropbox:{enabled:boolean;configured:false};googleDrive:{enabled:boolean;configured:boolean};oneDrive:{enabled:boolean;configured:boolean}};
export async function backupProviderAvailability(settings:SiteSettings):Promise<BackupProviderAvailability>{
  const [googleDrive,oneDrive]=await Promise.all([cloudProviderConfigured("googleDrive"),cloudProviderConfigured("oneDrive")]);
  return {download:{enabled:settings.backupDownloadEnabled},dropbox:{enabled:settings.backupDropboxEnabled,configured:false},googleDrive:{enabled:settings.backupGoogleDriveEnabled,configured:googleDrive},oneDrive:{enabled:settings.backupOneDriveEnabled,configured:oneDrive}};
}
export function providerAllowed(settings:SiteSettings,provider:BackupProviderId){return provider==="dropbox"?settings.backupDropboxEnabled:provider==="googleDrive"?settings.backupGoogleDriveEnabled:settings.backupOneDriveEnabled}

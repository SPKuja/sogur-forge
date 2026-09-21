import type {SiteSettings} from "@/lib/site-settings";

export type BackupProviderId="download"|"dropbox"|"googleDrive"|"oneDrive";
export type BackupProviderAvailability={
  download:{enabled:boolean;configured:true};
  dropbox:{enabled:boolean;configured:boolean};
  googleDrive:{enabled:boolean;configured:boolean};
  oneDrive:{enabled:boolean;configured:boolean};
};

function pair(a:string,b:string){return !!process.env[a]?.trim()&&!!process.env[b]?.trim()}

export function backupProviderConfiguration(){
  return {
    download:true as const,
    dropbox:pair("DROPBOX_CLIENT_ID","DROPBOX_CLIENT_SECRET"),
    googleDrive:pair("GOOGLE_DRIVE_CLIENT_ID","GOOGLE_DRIVE_CLIENT_SECRET"),
    oneDrive:pair("ONEDRIVE_CLIENT_ID","ONEDRIVE_CLIENT_SECRET")
  };
}

export function backupProviderAvailability(settings:SiteSettings):BackupProviderAvailability{
  const configured=backupProviderConfiguration();
  return {
    download:{enabled:settings.backupDownloadEnabled,configured:true},
    dropbox:{enabled:settings.backupDropboxEnabled&&configured.dropbox,configured:configured.dropbox},
    googleDrive:{enabled:settings.backupGoogleDriveEnabled&&configured.googleDrive,configured:configured.googleDrive},
    oneDrive:{enabled:settings.backupOneDriveEnabled&&configured.oneDrive,configured:configured.oneDrive}
  };
}

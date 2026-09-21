import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {emailConfigured} from "@/lib/email";
import {backupProviderConfiguration} from "@/lib/backup-providers";
import {getSiteSettings,type SiteSettings} from "@/lib/site-settings";

export async function PATCH(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json(),current=await getSiteSettings(),configured=backupProviderConfiguration();
  const patch:Partial<SiteSettings>={};
  for(const key of ["registrationsEnabled","emailVerificationRequired","backupDownloadEnabled","backupDropboxEnabled","backupGoogleDriveEnabled","backupOneDriveEnabled"] as const)if(body[key]!==undefined)patch[key]=!!body[key];
  if(!Object.keys(patch).length)return NextResponse.json({error:"No settings supplied"},{status:400});
  if(patch.backupDropboxEnabled===true&&!configured.dropbox)return NextResponse.json({error:"Dropbox cannot be enabled until DROPBOX_CLIENT_ID and DROPBOX_CLIENT_SECRET are configured on the server."},{status:409});
  if(patch.backupGoogleDriveEnabled===true&&!configured.googleDrive)return NextResponse.json({error:"Google Drive cannot be enabled until GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET are configured on the server."},{status:409});
  if(patch.backupOneDriveEnabled===true&&!configured.oneDrive)return NextResponse.json({error:"OneDrive cannot be enabled until ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET are configured on the server."},{status:409});
  const next={...current,...patch};
  await query(`UPDATE "AppSetting" SET "registrationsEnabled"=$1,"emailVerificationRequired"=$2,"backupDownloadEnabled"=$3,"backupDropboxEnabled"=$4,"backupGoogleDriveEnabled"=$5,"backupOneDriveEnabled"=$6,"updatedAt"=NOW() WHERE "id"='global'`,[next.registrationsEnabled,next.emailVerificationRequired,next.backupDownloadEnabled,next.backupDropboxEnabled,next.backupGoogleDriveEnabled,next.backupOneDriveEnabled]);
  return NextResponse.json({...next,smtpConfigured:emailConfigured(),backupConfigured:configured});
}

import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {getSiteSettings,type SiteSettings} from "@/lib/site-settings";
import {cloudProviderConfigured} from "@/lib/cloud-provider-settings";
export async function PATCH(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json(),current=await getSiteSettings(),patch:Partial<SiteSettings>={};
  for(const key of ["registrationsEnabled","emailVerificationRequired","backupDownloadEnabled","backupDropboxEnabled","backupGoogleDriveEnabled","backupOneDriveEnabled"] as const)if(body[key]!==undefined)patch[key]=!!body[key];
  if(!Object.keys(patch).length)return NextResponse.json({error:"No settings supplied"},{status:400});
  if(patch.backupGoogleDriveEnabled===true&&!await cloudProviderConfigured("googleDrive"))return NextResponse.json({error:"Set up the Google Drive OAuth application before enabling it."},{status:409});
  if(patch.backupOneDriveEnabled===true&&!await cloudProviderConfigured("oneDrive"))return NextResponse.json({error:"Set up the OneDrive OAuth application before enabling it."},{status:409});
  const next={...current,...patch};
  await query(`UPDATE "AppSetting" SET "registrationsEnabled"=$1,"emailVerificationRequired"=$2,"backupDownloadEnabled"=$3,"backupDropboxEnabled"=$4,"backupGoogleDriveEnabled"=$5,"backupOneDriveEnabled"=$6,"updatedAt"=NOW() WHERE "id"='global'`,[next.registrationsEnabled,next.emailVerificationRequired,next.backupDownloadEnabled,next.backupDropboxEnabled,next.backupGoogleDriveEnabled,next.backupOneDriveEnabled]);
  return NextResponse.json(next);
}

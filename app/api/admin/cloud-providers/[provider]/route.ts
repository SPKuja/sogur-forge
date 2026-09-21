import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {encryptSetting} from "@/lib/secret-box";
import {getEmailAdminView} from "@/lib/email";
import {getCloudProviderAdminViews,type AdminCloudProvider} from "@/lib/cloud-provider-settings";

const supported=new Set<AdminCloudProvider>(["googleDrive","oneDrive"]);
export async function PATCH(request:NextRequest,{params}:{params:Promise<{provider:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});
  const provider=(await params).provider as AdminCloudProvider;if(!supported.has(provider))return NextResponse.json({error:"Unsupported provider"},{status:404});
  const body=await request.json(),clientId=String(body.clientId||"").trim().slice(0,500),clientSecret=String(body.clientSecret||"");
  const email=await getEmailAdminView();if(!email.appBaseUrl)return NextResponse.json({error:"Set the Public Sögur Forge URL under Email delivery before enabling cloud backups."},{status:409});
  const current=await getCloudProviderAdminViews(email.appBaseUrl),previous=current[provider];
  if(!clientId)return NextResponse.json({error:"Client ID is required."},{status:400});
  if(!clientSecret&&!previous.secretConfigured)return NextResponse.json({error:"Client secret is required."},{status:400});
  const idColumn=provider==="googleDrive"?"googleDriveClientId":"oneDriveClientId",secretColumn=provider==="googleDrive"?"googleDriveClientSecretEncrypted":"oneDriveClientSecretEncrypted",enabledColumn=provider==="googleDrive"?"backupGoogleDriveEnabled":"backupOneDriveEnabled";
  const existingSecret=(await query<{secret:string}>(`SELECT "${secretColumn}" AS secret FROM "AppSetting" WHERE "id"='global'`)).rows[0]?.secret||"";
  const encrypted=clientSecret?encryptSetting(clientSecret):existingSecret,credentialsChanged=previous.configured&&(previous.clientId!==clientId||!!clientSecret);
  await query(`UPDATE "AppSetting" SET "${idColumn}"=$1,"${secretColumn}"=$2,"${enabledColumn}"=true,"updatedAt"=NOW() WHERE "id"='global'`,[clientId,encrypted]);
  if(credentialsChanged)await query(`UPDATE "BackupDestination" SET "enabled"=false,"accountLabel"='',"providerAccountId"='',"refreshTokenEncrypted"='',"connectedAt"=NULL,"lastBackupError"='OAuth application settings changed. Reconnect this account.',"updatedAt"=NOW() WHERE "provider"=$1`,[provider]);
  const views=await getCloudProviderAdminViews(email.appBaseUrl);
  return NextResponse.json({provider,enabled:true,view:views[provider],connectionsReset:credentialsChanged});
}

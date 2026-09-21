import {query} from "@/lib/db";
import {decryptSetting} from "@/lib/secret-box";
export type AdminCloudProvider="googleDrive"|"oneDrive";
type Row={googleDriveClientId:string;googleDriveClientSecretEncrypted:string;oneDriveClientId:string;oneDriveClientSecretEncrypted:string};
export type CloudProviderAdminView={configured:boolean;clientId:string;secretConfigured:boolean;callbackUrl:string};

async function row(){return (await query<Row>(`SELECT "googleDriveClientId","googleDriveClientSecretEncrypted","oneDriveClientId","oneDriveClientSecretEncrypted" FROM "AppSetting" WHERE "id"='global'`)).rows[0]??{googleDriveClientId:"",googleDriveClientSecretEncrypted:"",oneDriveClientId:"",oneDriveClientSecretEncrypted:""}}
export async function getCloudProviderCredentials(provider:AdminCloudProvider){
  const value=await row(),clientId=(provider==="googleDrive"?value.googleDriveClientId:value.oneDriveClientId).trim(),encrypted=provider==="googleDrive"?value.googleDriveClientSecretEncrypted:value.oneDriveClientSecretEncrypted;
  let clientSecret="";if(encrypted){try{clientSecret=decryptSetting(encrypted)}catch{clientSecret=""}}
  if(!clientId||!clientSecret)throw new Error(`${provider==="googleDrive"?"Google Drive":"OneDrive"} OAuth application credentials are not configured.`);
  return {clientId,clientSecret};
}
export async function cloudProviderConfigured(provider:AdminCloudProvider){
  const value=await row();return provider==="googleDrive"?!!value.googleDriveClientId.trim()&&!!value.googleDriveClientSecretEncrypted:!!value.oneDriveClientId.trim()&&!!value.oneDriveClientSecretEncrypted;
}
export async function getCloudProviderAdminViews(baseUrl:string):Promise<Record<AdminCloudProvider,CloudProviderAdminView>>{
  const value=await row(),root=baseUrl.replace(/\/+$/,"");
  return {
    googleDrive:{configured:!!value.googleDriveClientId.trim()&&!!value.googleDriveClientSecretEncrypted,clientId:value.googleDriveClientId,secretConfigured:!!value.googleDriveClientSecretEncrypted,callbackUrl:root?`${root}/api/account/cloud-backups/googleDrive/callback`:""},
    oneDrive:{configured:!!value.oneDriveClientId.trim()&&!!value.oneDriveClientSecretEncrypted,clientId:value.oneDriveClientId,secretConfigured:!!value.oneDriveClientSecretEncrypted,callbackUrl:root?`${root}/api/account/cloud-backups/oneDrive/callback`:""}
  };
}

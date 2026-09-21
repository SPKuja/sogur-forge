import {query} from "@/lib/db";

export type SiteSettings={
  registrationsEnabled:boolean;
  emailVerificationRequired:boolean;
  backupDownloadEnabled:boolean;
  backupDropboxEnabled:boolean;
  backupGoogleDriveEnabled:boolean;
  backupOneDriveEnabled:boolean;
};

const defaults:SiteSettings={
  registrationsEnabled:true,
  emailVerificationRequired:true,
  backupDownloadEnabled:true,
  backupDropboxEnabled:false,
  backupGoogleDriveEnabled:false,
  backupOneDriveEnabled:false
};

export async function getSiteSettings():Promise<SiteSettings>{
  const fields=`"registrationsEnabled","emailVerificationRequired","backupDownloadEnabled","backupDropboxEnabled","backupGoogleDriveEnabled","backupOneDriveEnabled"`;
  const result=await query<SiteSettings>(`SELECT ${fields} FROM "AppSetting" WHERE "id"='global'`);
  if(result.rows[0])return result.rows[0];
  const created=await query<SiteSettings>(`INSERT INTO "AppSetting" ("id","registrationsEnabled","emailVerificationRequired","backupDownloadEnabled","backupDropboxEnabled","backupGoogleDriveEnabled","backupOneDriveEnabled","createdAt","updatedAt") VALUES ('global',true,true,true,false,false,false,NOW(),NOW()) ON CONFLICT ("id") DO UPDATE SET "id"=EXCLUDED."id" RETURNING ${fields}`);
  return created.rows[0]??defaults;
}

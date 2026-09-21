import {query} from "@/lib/db";

export type SiteSettings={registrationsEnabled:boolean;emailVerificationRequired:boolean};

export async function getSiteSettings():Promise<SiteSettings>{
  const result=await query<SiteSettings>(`SELECT "registrationsEnabled","emailVerificationRequired" FROM "AppSetting" WHERE "id"='global'`);
  if(result.rows[0])return result.rows[0];
  const created=await query<SiteSettings>(`INSERT INTO "AppSetting" ("id","registrationsEnabled","emailVerificationRequired","createdAt","updatedAt") VALUES ('global',true,true,NOW(),NOW()) ON CONFLICT ("id") DO UPDATE SET "id"=EXCLUDED."id" RETURNING "registrationsEnabled","emailVerificationRequired"`);
  return created.rows[0]??{registrationsEnabled:true,emailVerificationRequired:true};
}

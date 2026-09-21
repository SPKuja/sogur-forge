import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {emailConfigured} from "@/lib/email";

export async function PATCH(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json();
  const registrationsEnabled=body.registrationsEnabled===undefined?undefined:!!body.registrationsEnabled,emailVerificationRequired=body.emailVerificationRequired===undefined?undefined:!!body.emailVerificationRequired;
  if(registrationsEnabled===undefined&&emailVerificationRequired===undefined)return NextResponse.json({error:"No settings supplied"},{status:400});
  await query(`INSERT INTO "AppSetting" ("id","registrationsEnabled","emailVerificationRequired","createdAt","updatedAt") VALUES ('global',$1,$2,NOW(),NOW()) ON CONFLICT ("id") DO UPDATE SET "registrationsEnabled"=COALESCE($3,"AppSetting"."registrationsEnabled"),"emailVerificationRequired"=COALESCE($4,"AppSetting"."emailVerificationRequired"),"updatedAt"=NOW()`,[registrationsEnabled??true,emailVerificationRequired??true,registrationsEnabled??null,emailVerificationRequired??null]);
  const settings=(await query<{registrationsEnabled:boolean;emailVerificationRequired:boolean}>(`SELECT "registrationsEnabled","emailVerificationRequired" FROM "AppSetting" WHERE "id"='global'`)).rows[0];
  return NextResponse.json({...settings,smtpConfigured:emailConfigured()});
}

import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin,requestIpHash} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {hashPassword,validatePassword,verifyPassword} from "@/lib/auth/password";

export async function PATCH(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),currentPassword=String(body.currentPassword||""),newPassword=String(body.newPassword||"");
  const row=(await query<{passwordHash:string}>(`SELECT "passwordHash" FROM "User" WHERE "id"=$1`,[user.id])).rows[0];
  if(!row||!await verifyPassword(currentPassword,row.passwordHash))return NextResponse.json({error:"Current password is incorrect."},{status:400});
  try{validatePassword(newPassword)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid password."},{status:400})}
  const passwordHash=await hashPassword(newPassword);
  await query(`UPDATE "User" SET "passwordHash"=$2,"sessionGeneration"="sessionGeneration"+1,"updatedAt"=NOW() WHERE "id"=$1`,[user.id,passwordHash]);
  await query(`DELETE FROM "Session" WHERE "userId"=$1`,[user.id]);
  await query(`INSERT INTO "SecurityEvent" ("id","userId","type","ipHash","createdAt") VALUES ($1,$2,'password.changed',$3,NOW())`,[randomUUID(),user.id,requestIpHash(request)]);
  return NextResponse.json({ok:true});
}

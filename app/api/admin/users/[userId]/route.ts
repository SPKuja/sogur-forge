import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin,requestIpHash} from "@/lib/auth/request";
import {query} from "@/lib/db";

export async function PATCH(request:NextRequest,{params}:{params:Promise<{userId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const admin=await currentUser();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});
  const {userId}=await params,body=await request.json();
  if(body.verifyEmail===true){
    const updated=await query<{id:string;emailVerifiedAt:Date}>(`UPDATE "User" SET "emailVerifiedAt"=COALESCE("emailVerifiedAt",NOW()),"updatedAt"=NOW() WHERE "id"=$1 RETURNING "id","emailVerifiedAt"`,[userId]);
    if(!updated.rows[0])return NextResponse.json({error:"User not found"},{status:404});
    await query(`INSERT INTO "SecurityEvent" ("id","userId","type","metadata","createdAt") VALUES ($1,$2,'email.admin_verified',$3,NOW())`,[randomUUID(),userId,JSON.stringify({adminId:admin.id})]);
    return NextResponse.json({ok:true,emailVerifiedAt:updated.rows[0].emailVerifiedAt.toISOString()});
  }
  if(body.revokeSessions===true){
    const found=await query<{id:string}>(`UPDATE "User" SET "sessionGeneration"="sessionGeneration"+1,"updatedAt"=NOW() WHERE "id"=$1 RETURNING "id"`,[userId]);
    if(!found.rows[0])return NextResponse.json({error:"User not found"},{status:404});
    await query(`DELETE FROM "Session" WHERE "userId"=$1`,[userId]);
    await query(`INSERT INTO "SecurityEvent" ("id","userId","type","metadata","ipHash","createdAt") VALUES ($1,$2,'sessions.admin_revoked',$3,$4,NOW())`,[randomUUID(),userId,JSON.stringify({adminId:admin.id}),requestIpHash(request)]);
    return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:"Unsupported action"},{status:400});
}

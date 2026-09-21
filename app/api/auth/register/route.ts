import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {db,query} from "@/lib/db";
import {hashPassword,validatePassword} from "@/lib/auth/password";
import {createSession,type AuthUser} from "@/lib/auth/session";
import {requireSameOrigin,requestIpHash} from "@/lib/auth/request";
import {CURRENT_VERSION} from "@/lib/releases";
import {getSiteSettings} from "@/lib/site-settings";
import {emailConfigured,publicBaseUrl,sendVerificationEmail} from "@/lib/email";
import {issueEmailVerification} from "@/lib/auth/email-verification";

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  let body:{username?:string;email?:string;password?:string};
  try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
  const username=body.username?.trim().toLowerCase()??"",email=body.email?.trim().toLowerCase()??"",password=body.password??"";
  if(!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(username))return NextResponse.json({error:"Username must be 3–32 characters using letters, numbers, _ or -."},{status:400});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return NextResponse.json({error:"Enter a valid email address."},{status:400});
  try{validatePassword(password)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid password."},{status:400})}
  const passwordHash=await hashPassword(password),settings=await getSiteSettings();
  const connection=await db.connect();
  let user:AuthUser|undefined,bootstrap=false;
  try{
    await connection.query("BEGIN");
    await connection.query(`LOCK TABLE "User" IN SHARE ROW EXCLUSIVE MODE`);
    const count=Number((await connection.query<{count:string}>(`SELECT COUNT(*)::text AS count FROM "User"`)).rows[0]?.count||0);
    bootstrap=count===0;
    if(!bootstrap&&!settings.registrationsEnabled){await connection.query("ROLLBACK");return NextResponse.json({error:"New registrations are currently disabled."},{status:403})}
    if(!bootstrap&&settings.emailVerificationRequired&&!emailConfigured()){await connection.query("ROLLBACK");return NextResponse.json({error:"Registrations are temporarily unavailable because email verification has not been configured by the administrator."},{status:503})}
    user={id:randomUUID(),username,email,emailVerifiedAt:bootstrap||!settings.emailVerificationRequired?new Date():null,role:bootstrap?"ADMIN":"USER",sessionGeneration:1};
    await connection.query(`INSERT INTO "User" ("id","username","email","passwordHash","emailVerifiedAt","role","sessionGeneration","lastSeenVersion","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,1,$7,NOW(),NOW())`,[user.id,username,email,passwordHash,user.emailVerifiedAt,user.role,CURRENT_VERSION]);
    await connection.query("COMMIT");
  }catch(error:unknown){
    await connection.query("ROLLBACK").catch(()=>{});
    const code=typeof error==="object"&&error&&"code" in error?String((error as {code?:string}).code):"";
    if(code==="23505")return NextResponse.json({error:"That username or email is already in use."},{status:409});
    throw error;
  }finally{connection.release()}
  if(!user)return NextResponse.json({error:"Account could not be created."},{status:500});
  if(!bootstrap&&settings.emailVerificationRequired){
    try{
      const token=await issueEmailVerification(user.id);
      await sendVerificationEmail({to:user.email,username:user.username,token,baseUrl:publicBaseUrl(request)});
    }catch(error){
      await query(`DELETE FROM "User" WHERE "id"=$1`,[user.id]).catch(()=>{});
      console.error("Verification email failed",error);
      return NextResponse.json({error:"The verification email could not be sent, so the account was not created. Please try again later."},{status:503});
    }
    await query(`INSERT INTO "SecurityEvent" ("id","userId","type","ipHash","createdAt") VALUES ($1,$2,'account.created',$3,NOW())`,[randomUUID(),user.id,requestIpHash(request)]);
    return NextResponse.json({ok:true,username,verificationRequired:true});
  }
  await query(`INSERT INTO "SecurityEvent" ("id","userId","type","ipHash","createdAt") VALUES ($1,$2,'account.created',$3,NOW())`,[randomUUID(),user.id,requestIpHash(request)]);
  const response=NextResponse.json({ok:true,username,bootstrap});
  await createSession(user,request,response);
  return response;
}

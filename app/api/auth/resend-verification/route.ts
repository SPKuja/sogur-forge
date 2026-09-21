import {NextRequest,NextResponse} from "next/server";
import {query} from "@/lib/db";
import {requireSameOrigin,requestIpHash} from "@/lib/auth/request";
import {consumeLoginAttempt} from "@/lib/auth/rate-limit";
import {emailConfigured,publicBaseUrl,sendVerificationEmail} from "@/lib/email";
import {issueEmailVerification} from "@/lib/auth/email-verification";
import {getSiteSettings} from "@/lib/site-settings";

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  let body:{login?:string};try{body=await request.json()}catch{return NextResponse.json({ok:true})}
  const login=body.login?.trim().toLowerCase()??"",ipKey=requestIpHash(request)??"unknown";
  const limit=await consumeLoginAttempt(`verify:${ipKey}:${login}`);
  if(!limit.allowed)return NextResponse.json({error:"Please wait before requesting another verification email."},{status:429});
  const settings=await getSiteSettings();
  if(!settings.emailVerificationRequired)return NextResponse.json({ok:true});
  if(!emailConfigured())return NextResponse.json({error:"Email verification is not currently available. Contact the administrator."},{status:503});
  const user=(await query<{id:string;username:string;email:string;emailVerifiedAt:Date|null}>(`SELECT "id","username","email","emailVerifiedAt" FROM "User" WHERE "username"=$1 OR "email"=$1 LIMIT 1`,[login])).rows[0];
  if(user&&!user.emailVerifiedAt){
    try{
      const token=await issueEmailVerification(user.id);
      await sendVerificationEmail({to:user.email,username:user.username,token,baseUrl:publicBaseUrl(request)});
    }catch(error){console.error("Verification resend failed",error);return NextResponse.json({error:"The verification email could not be sent. Please try again later."},{status:503})}
  }
  return NextResponse.json({ok:true,message:"If that account needs verification, a new email has been sent."});
}

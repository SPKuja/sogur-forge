import {createTransport} from "nodemailer";
import type {NextRequest} from "next/server";

export function emailConfigured(){
  return !!process.env.SMTP_HOST?.trim()&&!!(process.env.SMTP_FROM?.trim()||process.env.SMTP_USER?.trim());
}

export function publicBaseUrl(request:NextRequest){
  const configured=process.env.APP_BASE_URL?.trim();
  if(configured)return configured.replace(/\/+$/,"");
  const host=(request.headers.get("x-forwarded-host")||request.headers.get("host")||request.nextUrl.host).split(",")[0].trim();
  const proto=(request.headers.get("x-forwarded-proto")||request.nextUrl.protocol.replace(":","")).split(",")[0].trim().toLowerCase();
  return `${proto==="https"?"https":"http"}://${host}`;
}

function transporter(){
  const port=Number(process.env.SMTP_PORT||587);
  const secure=(process.env.SMTP_SECURE||"").toLowerCase()==="true"||port===465;
  const user=process.env.SMTP_USER?.trim(),pass=process.env.SMTP_PASSWORD;
  return createTransport({host:process.env.SMTP_HOST?.trim(),port,secure,auth:user?{user,pass:pass||""}:undefined});
}

function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!))}

export async function sendVerificationEmail({to,username,token,baseUrl}:{to:string;username:string;token:string;baseUrl:string}){
  if(!emailConfigured())throw new Error("SMTP is not configured.");
  const verifyUrl=`${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const from=process.env.SMTP_FROM?.trim()||process.env.SMTP_USER!.trim();
  await transporter().sendMail({
    from,
    to,
    subject:"Verify your Sögur Forge account",
    text:`Hi ${username},\n\nVerify your Sögur Forge account:\n${verifyUrl}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.\n`,
    html:`<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#172033"><h2>Sögur Forge</h2><p>Hi <strong>${escapeHtml(username)}</strong>,</p><p>Verify your email address to finish setting up your account.</p><p><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#0284c7;color:#fff;text-decoration:none;font-weight:700">Verify email</a></p><p style="color:#69758a;font-size:13px">This link expires in 24 hours. If you did not create this account, you can ignore this email.</p></div>`
  });
}

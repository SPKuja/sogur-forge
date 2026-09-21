import {createTransport} from "nodemailer";
import type {NextRequest} from "next/server";
import {query} from "@/lib/db";
import {decryptSetting} from "@/lib/secret-box";

type EmailRow={appBaseUrl:string;smtpHost:string;smtpPort:number;smtpSecure:boolean;smtpUser:string;smtpPasswordEncrypted:string;smtpFrom:string};
export type EmailAdminView={appBaseUrl:string;smtpHost:string;smtpPort:number;smtpSecure:boolean;smtpUser:string;smtpFrom:string;passwordConfigured:boolean;source:"admin"|"environment"|"none"};

async function row(){return (await query<EmailRow>(`SELECT "appBaseUrl","smtpHost","smtpPort","smtpSecure","smtpUser","smtpPasswordEncrypted","smtpFrom" FROM "AppSetting" WHERE "id"='global'`)).rows[0]}
export async function getEmailSettings(){
  const saved=await row(),useSaved=!!saved?.smtpHost.trim();
  const smtpHost=useSaved?saved.smtpHost.trim():(process.env.SMTP_HOST?.trim()||"");
  const smtpPort=useSaved?saved.smtpPort:Number(process.env.SMTP_PORT||587);
  const smtpSecure=useSaved?saved.smtpSecure:((process.env.SMTP_SECURE||"").toLowerCase()==="true"||smtpPort===465);
  const smtpUser=useSaved?saved.smtpUser.trim():(process.env.SMTP_USER?.trim()||"");
  let smtpPassword="";
  if(useSaved&&saved.smtpPasswordEncrypted){try{smtpPassword=decryptSetting(saved.smtpPasswordEncrypted)}catch{smtpPassword=""}}else smtpPassword=process.env.SMTP_PASSWORD||"";
  const smtpFrom=useSaved?saved.smtpFrom.trim():(process.env.SMTP_FROM?.trim()||smtpUser);
  const appBaseUrl=(saved?.appBaseUrl.trim()||process.env.APP_BASE_URL?.trim()||"").replace(/\/+$/,"");
  return {appBaseUrl,smtpHost,smtpPort,smtpSecure,smtpUser,smtpPassword,smtpFrom,source:useSaved?"admin" as const:smtpHost?"environment" as const:"none" as const};
}
export async function getEmailAdminView():Promise<EmailAdminView>{
  const value=await getEmailSettings();
  return {appBaseUrl:value.appBaseUrl,smtpHost:value.smtpHost,smtpPort:value.smtpPort,smtpSecure:value.smtpSecure,smtpUser:value.smtpUser,smtpFrom:value.smtpFrom,passwordConfigured:!!value.smtpPassword,source:value.source};
}
export async function emailConfigured(){const s=await getEmailSettings();return !!s.smtpHost&&!!(s.smtpFrom||s.smtpUser)}
export async function publicBaseUrl(request:NextRequest){const config=await getEmailSettings();if(config.appBaseUrl)return config.appBaseUrl;const host=(request.headers.get("x-forwarded-host")||request.headers.get("host")||request.nextUrl.host).split(",")[0].trim(),proto=(request.headers.get("x-forwarded-proto")||request.nextUrl.protocol.replace(":","")).split(",")[0].trim().toLowerCase();return `${proto==="https"?"https":"http"}://${host}`}
async function transporter(){const s=await getEmailSettings();if(!s.smtpHost)throw new Error("SMTP is not configured.");return {mailer:createTransport({host:s.smtpHost,port:s.smtpPort,secure:s.smtpSecure,auth:s.smtpUser?{user:s.smtpUser,pass:s.smtpPassword}:undefined}),from:s.smtpFrom||s.smtpUser}}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!))}
export async function sendVerificationEmail({to,username,token,baseUrl}:{to:string;username:string;token:string;baseUrl:string}){const {mailer,from}=await transporter(),url=`${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;await mailer.sendMail({from,to,subject:"Verify your Sögur Forge account",text:`Hi ${username},\n\nVerify your Sögur Forge account:\n${url}\n\nThis link expires in 24 hours.\n`,html:`<div style="font-family:system-ui;line-height:1.6"><h2>Sögur Forge</h2><p>Hi <strong>${escapeHtml(username)}</strong>,</p><p>Verify your email address to finish setting up your account.</p><p><a href="${escapeHtml(url)}">Verify email</a></p><p>This link expires in 24 hours.</p></div>`})}
export async function sendPasswordResetEmail({to,username,token,baseUrl}:{to:string;username:string;token:string;baseUrl:string}){const {mailer,from}=await transporter(),url=`${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;await mailer.sendMail({from,to,subject:"Reset your Sögur Forge password",text:`Hi ${username},\n\nReset your password:\n${url}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.\n`,html:`<div style="font-family:system-ui;line-height:1.6"><h2>Sögur Forge</h2><p>Hi <strong>${escapeHtml(username)}</strong>,</p><p>Use the link below to reset your password.</p><p><a href="${escapeHtml(url)}">Reset password</a></p><p>This link expires in 1 hour. If you did not request it, you can ignore this email.</p></div>`})}
export async function sendTestEmail(to:string){const {mailer,from}=await transporter();await mailer.sendMail({from,to,subject:"Sögur Forge email test",text:"Your Sögur Forge email configuration is working.",html:"<p>Your <strong>Sögur Forge</strong> email configuration is working.</p>"})}

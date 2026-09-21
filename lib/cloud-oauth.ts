import {createHash,randomUUID} from "node:crypto";
import type {NextRequest} from "next/server";
import {query} from "@/lib/db";
import {createOpaqueToken,hashToken} from "@/lib/auth/tokens";
import {encryptSetting,decryptSetting} from "@/lib/secret-box";
import {publicBaseUrl} from "@/lib/email";
import type {BackupProviderId} from "@/lib/backup-providers";

export type CloudProvider=Extract<BackupProviderId,"googleDrive"|"oneDrive">;
type StateRow={id:string;userId:string;provider:string;verifierEncrypted:string;expiresAt:Date};

const GOOGLE_SCOPE="openid email profile https://www.googleapis.com/auth/drive.file";
const MICROSOFT_SCOPE="openid profile email offline_access Files.ReadWrite.AppFolder";

function pkceChallenge(verifier:string){return createHash("sha256").update(verifier).digest("base64url")}
export function providerConfigured(provider:CloudProvider){return provider==="googleDrive"?!!process.env.GOOGLE_DRIVE_CLIENT_ID?.trim()&&!!process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim():!!process.env.ONEDRIVE_CLIENT_ID?.trim()&&!!process.env.ONEDRIVE_CLIENT_SECRET?.trim()}
function credentials(provider:CloudProvider){
  const clientId=(provider==="googleDrive"?process.env.GOOGLE_DRIVE_CLIENT_ID:process.env.ONEDRIVE_CLIENT_ID)?.trim()||"";
  const clientSecret=(provider==="googleDrive"?process.env.GOOGLE_DRIVE_CLIENT_SECRET:process.env.ONEDRIVE_CLIENT_SECRET)?.trim()||"";
  if(!clientId||!clientSecret)throw new Error(`${provider} OAuth application credentials are not configured.`);
  return {clientId,clientSecret};
}
export async function callbackUrl(request:NextRequest,provider:CloudProvider){return `${await publicBaseUrl(request)}/api/account/cloud-backups/${provider}/callback`}

export async function beginCloudOAuth(userId:string,provider:CloudProvider,request:NextRequest){
  const {clientId}=credentials(provider),redirectUri=await callbackUrl(request,provider),state=createOpaqueToken(),verifier=createOpaqueToken(48),challenge=pkceChallenge(verifier);
  await query(`DELETE FROM "BackupOAuthState" WHERE "expiresAt"<NOW() OR ("userId"=$1 AND "provider"=$2)`,[userId,provider]);
  await query(`INSERT INTO "BackupOAuthState" ("id","stateHash","userId","provider","verifierEncrypted","expiresAt","createdAt") VALUES ($1,$2,$3,$4,$5,NOW()+INTERVAL '10 minutes',NOW())`,[randomUUID(),hashToken(state),userId,provider,encryptSetting(verifier)]);
  const url=new URL(provider==="googleDrive"?"https://accounts.google.com/o/oauth2/v2/auth":"https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id",clientId);url.searchParams.set("response_type","code");url.searchParams.set("redirect_uri",redirectUri);url.searchParams.set("state",state);url.searchParams.set("code_challenge",challenge);url.searchParams.set("code_challenge_method","S256");
  if(provider==="googleDrive"){url.searchParams.set("scope",GOOGLE_SCOPE);url.searchParams.set("access_type","offline");url.searchParams.set("include_granted_scopes","true");url.searchParams.set("prompt","consent")}
  else{url.searchParams.set("scope",MICROSOFT_SCOPE);url.searchParams.set("response_mode","query");url.searchParams.set("prompt","select_account")}
  return url.toString();
}

export async function consumeCloudOAuthState(state:string,provider:CloudProvider){
  const row=(await query<StateRow>(`SELECT "id","userId","provider","verifierEncrypted","expiresAt" FROM "BackupOAuthState" WHERE "stateHash"=$1 LIMIT 1`,[hashToken(state)])).rows[0];
  if(!row||row.provider!==provider||row.expiresAt<=new Date())return null;
  await query(`DELETE FROM "BackupOAuthState" WHERE "id"=$1`,[row.id]);
  return {userId:row.userId,verifier:decryptSetting(row.verifierEncrypted)};
}

async function tokenRequest(url:string,params:URLSearchParams){
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:params});
  const data=await response.json() as {access_token?:string;refresh_token?:string;expires_in?:number;id_token?:string;error?:string;error_description?:string};
  if(!response.ok||!data.access_token)throw new Error(data.error_description||data.error||"OAuth token exchange failed.");
  return data;
}
function jwtLabel(idToken:string|undefined){
  if(!idToken)return "";
  try{const payload=JSON.parse(Buffer.from(idToken.split(".")[1]||"","base64url").toString("utf8")) as Record<string,unknown>;return String(payload.email||payload.preferred_username||payload.name||"")}catch{return ""}
}

export async function exchangeCloudCode(provider:CloudProvider,request:NextRequest,code:string,verifier:string){
  const {clientId,clientSecret}=credentials(provider),redirectUri=await callbackUrl(request,provider);
  const params=new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,redirect_uri:redirectUri,grant_type:"authorization_code",code_verifier:verifier});
  if(provider==="googleDrive"){
    const token=await tokenRequest("https://oauth2.googleapis.com/token",params);
    let label="";
    try{const profile=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:`Bearer ${token.access_token}`}});if(profile.ok){const data=await profile.json() as {email?:string;name?:string;sub?:string};label=data.email||data.name||"";return {...token,accountLabel:label,providerAccountId:data.sub||""}}}catch{}
    return {...token,accountLabel:label,providerAccountId:""};
  }
  params.set("scope",MICROSOFT_SCOPE);
  const token=await tokenRequest("https://login.microsoftonline.com/common/oauth2/v2.0/token",params);
  return {...token,accountLabel:jwtLabel(token.id_token),providerAccountId:""};
}

export async function accessTokenFor(provider:CloudProvider,refreshToken:string){
  const {clientId,clientSecret}=credentials(provider);
  const params=new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"});
  if(provider==="googleDrive"){
    const token=await tokenRequest("https://oauth2.googleapis.com/token",params);
    return {accessToken:token.access_token!,refreshToken:token.refresh_token||refreshToken};
  }
  params.set("scope",MICROSOFT_SCOPE);
  const token=await tokenRequest("https://login.microsoftonline.com/common/oauth2/v2.0/token",params);
  return {accessToken:token.access_token!,refreshToken:token.refresh_token||refreshToken};
}

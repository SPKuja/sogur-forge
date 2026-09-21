import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {getSiteSettings} from "@/lib/site-settings";
import {providerAllowed} from "@/lib/backup-providers";
import {beginCloudOAuth,providerConfigured,type CloudProvider} from "@/lib/cloud-oauth";
const supported=new Set<CloudProvider>(["googleDrive","oneDrive"]);
export async function GET(request:NextRequest,{params}:{params:Promise<{provider:string}>}){const user=await currentUser();if(!user)return NextResponse.redirect(new URL("/",request.url));const {provider:raw}=await params,provider=raw as CloudProvider;if(!supported.has(provider))return NextResponse.json({error:"Unsupported provider"},{status:404});const settings=await getSiteSettings();if(!providerAllowed(settings,provider))return NextResponse.redirect(new URL("/settings?backupError=disabled",request.url));if(!providerConfigured(provider))return NextResponse.redirect(new URL(`/settings?backupError=${provider}-not-configured`,request.url));return NextResponse.redirect(await beginCloudOAuth(user.id,provider,request))}

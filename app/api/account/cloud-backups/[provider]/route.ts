import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {getSiteSettings} from "@/lib/site-settings";
import {providerAllowed} from "@/lib/backup-providers";
import {runCloudBackup} from "@/lib/cloud-backup";
import type {CloudProvider} from "@/lib/cloud-oauth";
const supported=new Set<CloudProvider>(["googleDrive","oneDrive"]);
async function providerFrom(params:Promise<{provider:string}>){const raw=(await params).provider as CloudProvider;return supported.has(raw)?raw:null}
export async function POST(request:NextRequest,{params}:{params:Promise<{provider:string}>}){if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const provider=await providerFrom(params);if(!provider)return NextResponse.json({error:"Unsupported provider"},{status:404});const settings=await getSiteSettings();if(!providerAllowed(settings,provider))return NextResponse.json({error:"This provider has been disabled by the administrator."},{status:403});try{return NextResponse.json({ok:true,file:await runCloudBackup(user.id,provider),backedUpAt:new Date().toISOString()})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Cloud backup failed."},{status:502})}}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{provider:string}>}){if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const provider=await providerFrom(params);if(!provider)return NextResponse.json({error:"Unsupported provider"},{status:404});await query(`UPDATE "BackupDestination" SET "enabled"=false,"accountLabel"='',"providerAccountId"='',"refreshTokenEncrypted"='',"connectedAt"=NULL,"lastBackupError"='',"updatedAt"=NOW() WHERE "userId"=$1 AND "provider"=$2`,[user.id,provider]);return NextResponse.json({ok:true})}

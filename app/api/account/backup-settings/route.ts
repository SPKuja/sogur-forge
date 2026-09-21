import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {getSiteSettings} from "@/lib/site-settings";
import {providerAllowed,type BackupProviderId} from "@/lib/backup-providers";
const providers=new Set<BackupProviderId>(["dropbox","googleDrive","oneDrive"]);
export async function PATCH(request:NextRequest){if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const body=await request.json(),provider=String(body.provider||"") as BackupProviderId;if(!providers.has(provider))return NextResponse.json({error:"Unknown provider"},{status:400});const settings=await getSiteSettings();if(!providerAllowed(settings,provider))return NextResponse.json({error:"This backup provider has been disabled by the administrator."},{status:403});const folder=String(body.folder??"/Sögur Forge").trim().slice(0,500)||"/Sögur Forge",enabled=!!body.enabled;const result=await query<{provider:string;enabled:boolean;folder:string;accountLabel:string}>(`INSERT INTO "BackupDestination" ("id","userId","provider","enabled","folder","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) ON CONFLICT ("userId","provider") DO UPDATE SET "enabled"=$4,"folder"=$5,"updatedAt"=NOW() RETURNING "provider","enabled","folder","accountLabel"`,[randomUUID(),user.id,provider,enabled,folder]);return NextResponse.json(result.rows[0])}

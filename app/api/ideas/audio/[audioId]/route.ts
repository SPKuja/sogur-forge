import {readFile,unlink} from "node:fs/promises";
import {join} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
const dir=process.env.IDEA_AUDIO_DIR||"/app/data/idea-audio";
async function owned(audioId:string,userId:string){return (await query<{storedName:string;mimeType:string}>(`SELECT ia."storedName",ia."mimeType" FROM "IdeaAudio" ia JOIN "StickyNote" s ON s."id"=ia."ideaId" JOIN "Novel" n ON n."id"=s."novelId" WHERE ia."id"=$1 AND n."userId"=$2`,[audioId,userId])).rows[0]}
export async function GET(_:NextRequest,{params}:{params:Promise<{audioId:string}>}){const user=await currentUser();if(!user)return new NextResponse(null,{status:401});const {audioId}=await params,audio=await owned(audioId,user.id);if(!audio)return new NextResponse(null,{status:404});try{const data=await readFile(join(dir,audio.storedName));return new NextResponse(new Uint8Array(data),{headers:{"Content-Type":audio.mimeType,"Cache-Control":"private, max-age=3600"}})}catch{return new NextResponse(null,{status:404})}}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{audioId:string}>}){if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const {audioId}=await params,audio=await owned(audioId,user.id);if(!audio)return NextResponse.json({error:"Not found"},{status:404});await query(`DELETE FROM "IdeaAudio" WHERE "id"=$1`,[audioId]);await unlink(join(dir,audio.storedName)).catch(()=>undefined);return NextResponse.json({ok:true})}

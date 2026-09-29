import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {extname,join} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
const dir=process.env.IDEA_AUDIO_DIR||"/app/data/idea-audio";
const allowed=new Map([["audio/webm",".webm"],["audio/ogg",".ogg"],["audio/mp4",".m4a"],["audio/x-m4a",".m4a"],["audio/aac",".aac"],["audio/mpeg",".mp3"],["audio/wav",".wav"],["audio/x-wav",".wav"]]);
export async function POST(request:NextRequest,{params}:{params:Promise<{ideaId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {ideaId}=await params,idea=await query(`SELECT s."id" FROM "StickyNote" s JOIN "Novel" n ON n."id"=s."novelId" WHERE s."id"=$1 AND s."kind"='IDEA' AND n."userId"=$2`,[ideaId,user.id]);if(!idea.rows[0])return NextResponse.json({error:"Idea not found"},{status:404});
  const form=await request.formData(),file=form.get("file"),durationMs=Math.max(0,Math.min(24*60*60*1000,Math.round(Number(form.get("durationMs"))||0)));
  if(!(file instanceof File)||!allowed.has(file.type)||file.size>25*1024*1024)return NextResponse.json({error:"Use a supported audio recording up to 25 MB."},{status:400});
  await mkdir(dir,{recursive:true});const id=randomUUID(),stored=id+(allowed.get(file.type)||extname(file.name)||".audio");await writeFile(join(dir,stored),Buffer.from(await file.arrayBuffer()));
  await query(`INSERT INTO "IdeaAudio" ("id","ideaId","originalName","storedName","mimeType","size","durationMs","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,[id,ideaId,String(file.name||"Voice note").slice(0,255),stored,file.type,file.size,durationMs]);
  return NextResponse.json({id,originalName:file.name||"Voice note",mimeType:file.type,size:file.size,durationMs,url:`/api/ideas/audio/${id}`,createdAt:new Date().toISOString()},{status:201});
}

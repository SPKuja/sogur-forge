import {NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";

export async function GET(_request:Request,{params}:{params:Promise<{chapterId:string}>}){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {chapterId}=await params;
  const owned=await query(`SELECT c."id" FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."id"=$1 AND n."userId"=$2`,[chapterId,user.id]);
  if(!owned.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const revisions=await query<{id:string;title:string;summary:string;status:string;createdAt:Date;characters:number}>(`SELECT "id","title","summary","status","createdAt",length("content") AS characters FROM "ChapterRevision" WHERE "chapterId"=$1 ORDER BY "createdAt" DESC LIMIT 100`,[chapterId]);
  return NextResponse.json({revisions:revisions.rows.map(r=>({...r,createdAt:r.createdAt.toISOString(),characters:Number(r.characters||0)}))});
}

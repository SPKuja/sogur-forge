import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";

type Revision={id:string;title:string;content:string;summary:string;status:string;createdAt:Date};

async function getRevision(userId:string,chapterId:string,revisionId:string){
  return (await query<Revision>(`SELECT r."id",r."title",r."content",r."summary",r."status",r."createdAt" FROM "ChapterRevision" r JOIN "Chapter" c ON c."id"=r."chapterId" JOIN "Novel" n ON n."id"=c."novelId" WHERE r."id"=$1 AND r."chapterId"=$2 AND n."userId"=$3`,[revisionId,chapterId,userId])).rows[0];
}

export async function GET(_request:Request,{params}:{params:Promise<{chapterId:string;revisionId:string}>}){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {chapterId,revisionId}=await params,revision=await getRevision(user.id,chapterId,revisionId);
  if(!revision)return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json({...revision,createdAt:revision.createdAt.toISOString()});
}

export async function POST(request:NextRequest,{params}:{params:Promise<{chapterId:string;revisionId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {chapterId,revisionId}=await params;
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const chapter=(await connection.query<{novelId:string;title:string;content:string;summary:string;status:string}>(`SELECT c."novelId",c."title",c."content",c."summary",c."status" FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."id"=$1 AND n."userId"=$2 FOR UPDATE`,[chapterId,user.id])).rows[0];
    if(!chapter){await connection.query("ROLLBACK");return NextResponse.json({error:"Not found"},{status:404})}
    const revision=(await connection.query<Revision>(`SELECT "id","title","content","summary","status","createdAt" FROM "ChapterRevision" WHERE "id"=$1 AND "chapterId"=$2`,[revisionId,chapterId])).rows[0];
    if(!revision){await connection.query("ROLLBACK");return NextResponse.json({error:"Revision not found"},{status:404})}
    await connection.query(`INSERT INTO "ChapterRevision" ("id","chapterId","title","content","summary","status","createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())`,[randomUUID(),chapterId,chapter.title,chapter.content,chapter.summary,chapter.status]);
    await connection.query(`UPDATE "Chapter" SET "title"=$2,"content"=$3,"summary"=$4,"status"=$5,"updatedAt"=NOW() WHERE "id"=$1`,[chapterId,revision.title,revision.content,revision.summary,revision.status]);
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[chapter.novelId]);
    await connection.query("COMMIT");
    return NextResponse.json({id:chapterId,title:revision.title,content:revision.content,summary:revision.summary,status:revision.status});
  }catch(error){
    await connection.query("ROLLBACK");
    throw error;
  }finally{connection.release()}
}

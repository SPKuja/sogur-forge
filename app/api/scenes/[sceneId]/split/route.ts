import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db} from "@/lib/db";
import {combineSceneContents} from "@/lib/scenes";

export async function POST(request:NextRequest,{params}:{params:Promise<{sceneId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {sceneId}=await params,body=await request.json(),beforeHtml=String(body.beforeHtml??""),afterHtml=String(body.afterHtml??""),connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const current=(await connection.query<{chapterId:string;novelId:string;position:number}>(`SELECT s."chapterId",c."novelId",s."position" FROM "Scene" s JOIN "Chapter" c ON c."id"=s."chapterId" JOIN "Novel" n ON n."id"=c."novelId" WHERE s."id"=$1 AND n."userId"=$2 FOR UPDATE`,[sceneId,user.id])).rows[0];
    if(!current){await connection.query("ROLLBACK");return NextResponse.json({error:"Not found"},{status:404})}
    await connection.query(`INSERT INTO "ChapterRevision" ("id","chapterId","title","content","summary","status","createdAt") SELECT $1,c."id",c."title",c."content",c."summary",c."status",NOW() FROM "Chapter" c WHERE c."id"=$2 AND NOT EXISTS (SELECT 1 FROM "ChapterRevision" r WHERE r."chapterId"=$2 AND r."createdAt">NOW()-INTERVAL '5 minutes')`,[randomUUID(),current.chapterId]);
    await connection.query(`UPDATE "Scene" SET "content"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[sceneId,beforeHtml]);
    const all=(await connection.query<{id:string;position:number}>(`SELECT "id","position" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position" FOR UPDATE`,[current.chapterId])).rows;
    const newId=randomUUID(),end=Math.max(...all.map(scene=>scene.position))+1;
    await connection.query(`INSERT INTO "Scene" ("id","chapterId","title","content","position","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,[newId,current.chapterId,`Scene ${all.length+1}`,afterHtml,end]);
    const ids=[...all.map(scene=>scene.id),newId],from=ids.indexOf(newId),target=ids.indexOf(sceneId)+1;ids.splice(from,1);ids.splice(target,0,newId);
    for(let index=0;index<ids.length;index++)await connection.query(`UPDATE "Scene" SET "position"=$2 WHERE "id"=$1`,[ids[index],-100000-index]);
    for(let index=0;index<ids.length;index++)await connection.query(`UPDATE "Scene" SET "position"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[ids[index],index]);
    const scenes=(await connection.query(`SELECT "id","chapterId","povCharacterId","title","content","summary","goal","conflict","outcome","location","status","position" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position"`,[current.chapterId])).rows;
    const aggregateContent=combineSceneContents(scenes.map((scene:{content:string})=>scene.content));
    await connection.query(`UPDATE "Chapter" SET "content"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[current.chapterId,aggregateContent]);
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[current.novelId]);
    await connection.query("COMMIT");
    return NextResponse.json({scenes,aggregateContent,createdId:newId});
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
}

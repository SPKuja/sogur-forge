import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db} from "@/lib/db";
import type {PoolClient} from "pg";
import {combineSceneContents,sceneStatus} from "@/lib/scenes";

type SceneRow={id:string;chapterId:string;povCharacterId:string|null;title:string;content:string;summary:string;goal:string;conflict:string;outcome:string;location:string;status:string;position:number};

async function snapshot(connection:PoolClient,chapterId:string){
  await connection.query(`INSERT INTO "ChapterRevision" ("id","chapterId","title","content","summary","status","createdAt")
    SELECT $1,c."id",c."title",c."content",c."summary",c."status",NOW() FROM "Chapter" c
    WHERE c."id"=$2 AND NOT EXISTS (SELECT 1 FROM "ChapterRevision" r WHERE r."chapterId"=$2 AND r."createdAt">NOW()-INTERVAL '5 minutes')`,[randomUUID(),chapterId]);
}
async function aggregate(connection:PoolClient,chapterId:string,novelId:string){
  const scenes=(await connection.query<SceneRow>(`SELECT "id","chapterId","povCharacterId","title","content","summary","goal","conflict","outcome","location","status","position" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position"`,[chapterId])).rows;
  const aggregateContent=combineSceneContents(scenes.map(scene=>scene.content));
  await connection.query(`UPDATE "Chapter" SET "content"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[chapterId,aggregateContent]);
  await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);
  return {scenes,aggregateContent};
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{sceneId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {sceneId}=await params,body=await request.json(),connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const current=(await connection.query<SceneRow&{novelId:string}>(`SELECT s."id",s."chapterId",s."povCharacterId",s."title",s."content",s."summary",s."goal",s."conflict",s."outcome",s."location",s."status",s."position",c."novelId" FROM "Scene" s JOIN "Chapter" c ON c."id"=s."chapterId" JOIN "Novel" n ON n."id"=c."novelId" WHERE s."id"=$1 AND n."userId"=$2 FOR UPDATE`,[sceneId,user.id])).rows[0];
    if(!current){await connection.query("ROLLBACK");return NextResponse.json({error:"Not found"},{status:404})}
    const povCharacterId=body.povCharacterId===undefined?current.povCharacterId:(body.povCharacterId?String(body.povCharacterId):null);
    if(povCharacterId){const valid=(await connection.query(`SELECT "id" FROM "Character" WHERE "id"=$1 AND "novelId"=$2`,[povCharacterId,current.novelId])).rows[0];if(!valid){await connection.query("ROLLBACK");return NextResponse.json({error:"POV character not found"},{status:400})}}
    const content=body.content===undefined?current.content:String(body.content),changedContent=content!==current.content;
    if(changedContent)await snapshot(connection,current.chapterId);
    const title=body.title===undefined?current.title:String(body.title).slice(0,160),summary=body.summary===undefined?current.summary:String(body.summary).slice(0,4000),goal=body.goal===undefined?current.goal:String(body.goal).slice(0,3000),conflict=body.conflict===undefined?current.conflict:String(body.conflict).slice(0,3000),outcome=body.outcome===undefined?current.outcome:String(body.outcome).slice(0,3000),location=body.location===undefined?current.location:String(body.location).slice(0,300),status=body.status===undefined?current.status:sceneStatus(body.status,current.status);
    await connection.query(`UPDATE "Scene" SET "title"=$2,"content"=$3,"summary"=$4,"goal"=$5,"conflict"=$6,"outcome"=$7,"location"=$8,"status"=$9,"povCharacterId"=$10,"updatedAt"=NOW() WHERE "id"=$1`,[sceneId,title,content,summary,goal,conflict,outcome,location,status,povCharacterId]);
    const result=await aggregate(connection,current.chapterId,current.novelId);
    await connection.query("COMMIT");
    return NextResponse.json({...result,scene:result.scenes.find(scene=>scene.id===sceneId)});
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{sceneId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {sceneId}=await params,connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const current=(await connection.query<{chapterId:string;novelId:string}>(`SELECT s."chapterId",c."novelId" FROM "Scene" s JOIN "Chapter" c ON c."id"=s."chapterId" JOIN "Novel" n ON n."id"=c."novelId" WHERE s."id"=$1 AND n."userId"=$2 FOR UPDATE`,[sceneId,user.id])).rows[0];
    if(!current){await connection.query("ROLLBACK");return NextResponse.json({error:"Not found"},{status:404})}
    const all=(await connection.query<{id:string}>(`SELECT "id" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position" FOR UPDATE`,[current.chapterId])).rows;
    if(all.length<=1){await connection.query("ROLLBACK");return NextResponse.json({error:"Use Remove scene structure to return this chapter to a single manuscript."},{status:409})}
    await snapshot(connection,current.chapterId);
    await connection.query(`DELETE FROM "Scene" WHERE "id"=$1`,[sceneId]);
    const remaining=(await connection.query<{id:string}>(`SELECT "id" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position" FOR UPDATE`,[current.chapterId])).rows;
    for(let index=0;index<remaining.length;index++)await connection.query(`UPDATE "Scene" SET "position"=$2 WHERE "id"=$1`,[remaining[index].id,-100000-index]);
    for(let index=0;index<remaining.length;index++)await connection.query(`UPDATE "Scene" SET "position"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[remaining[index].id,index]);
    const result=await aggregate(connection,current.chapterId,current.novelId);
    await connection.query("COMMIT");
    return NextResponse.json(result);
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
}

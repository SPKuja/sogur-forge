import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db} from "@/lib/db";
import {combineSceneContents} from "@/lib/scenes";

export async function PATCH(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),chapterId=String(body.chapterId||""),ids=Array.isArray(body.sceneIds)?body.sceneIds.map(String):[];
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const chapter=(await connection.query<{novelId:string}>(`SELECT c."novelId" FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."id"=$1 AND n."userId"=$2 FOR UPDATE`,[chapterId,user.id])).rows[0];
    if(!chapter){await connection.query("ROLLBACK");return NextResponse.json({error:"Not found"},{status:404})}
    const existing=(await connection.query<{id:string}>(`SELECT "id" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position" FOR UPDATE`,[chapterId])).rows.map(row=>row.id);
    if(existing.length!==ids.length||new Set(ids).size!==ids.length||!existing.every(id=>ids.includes(id))){await connection.query("ROLLBACK");return NextResponse.json({error:"Refresh and retry"},{status:409})}
    await connection.query(`INSERT INTO "ChapterRevision" ("id","chapterId","title","content","summary","status","createdAt") SELECT $1,c."id",c."title",c."content",c."summary",c."status",NOW() FROM "Chapter" c WHERE c."id"=$2 AND NOT EXISTS (SELECT 1 FROM "ChapterRevision" r WHERE r."chapterId"=$2 AND r."createdAt">NOW()-INTERVAL '5 minutes')`,[randomUUID(),chapterId]);
    for(let index=0;index<ids.length;index++)await connection.query(`UPDATE "Scene" SET "position"=$2 WHERE "id"=$1`,[ids[index],-100000-index]);
    for(let index=0;index<ids.length;index++)await connection.query(`UPDATE "Scene" SET "position"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[ids[index],index]);
    const scenes=(await connection.query(`SELECT "id","chapterId","povCharacterId","title","content","summary","goal","conflict","outcome","location","status","position" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position"`,[chapterId])).rows;
    const aggregateContent=combineSceneContents(scenes.map((scene:{content:string})=>scene.content));
    await connection.query(`UPDATE "Chapter" SET "content"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[chapterId,aggregateContent]);
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[chapter.novelId]);
    await connection.query("COMMIT");
    return NextResponse.json({scenes,aggregateContent});
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
}

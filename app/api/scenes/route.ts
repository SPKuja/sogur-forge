import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";
import {combineSceneContents} from "@/lib/scenes";

type SceneRow={id:string;chapterId:string;povCharacterId:string|null;title:string;content:string;summary:string;goal:string;conflict:string;outcome:string;location:string;status:string;position:number};

async function ownedChapter(userId:string,chapterId:string){
  return (await query<{id:string;novelId:string;kind:string;content:string}>(`SELECT c."id",c."novelId",c."kind",c."content" FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."id"=$1 AND n."userId"=$2`,[chapterId,userId])).rows[0];
}
async function rows(chapterId:string){return (await query<SceneRow>(`SELECT "id","chapterId","povCharacterId","title","content","summary","goal","conflict","outcome","location","status","position" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position","createdAt"`,[chapterId])).rows}

export async function GET(request:NextRequest){
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const chapterId=String(request.nextUrl.searchParams.get("chapterId")||""),chapter=await ownedChapter(user.id,chapterId);
  if(!chapter)return NextResponse.json({error:"Not found"},{status:404});
  const [scenes,characters]=await Promise.all([
    rows(chapterId),
    query<{id:string;name:string}>(`SELECT "id","name" FROM "Character" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[chapter.novelId])
  ]);
  return NextResponse.json({scenes,characters:characters.rows});
}

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),chapterId=String(body.chapterId||"");
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const chapter=(await connection.query<{novelId:string;kind:string;content:string}>(`SELECT c."novelId",c."kind",c."content" FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."id"=$1 AND n."userId"=$2 FOR UPDATE`,[chapterId,user.id])).rows[0];
    if(!chapter){await connection.query("ROLLBACK");return NextResponse.json({error:"Not found"},{status:404})}
    if(chapter.kind!=="CHAPTER"){await connection.query("ROLLBACK");return NextResponse.json({error:"Only chapters can contain scenes."},{status:409})}
    let existing=(await connection.query<SceneRow>(`SELECT "id","chapterId","povCharacterId","title","content","summary","goal","conflict","outcome","location","status","position" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position" FOR UPDATE`,[chapterId])).rows;
    if(body.initialize===true){
      if(!existing.length){
        const id=randomUUID();
        await connection.query(`INSERT INTO "Scene" ("id","chapterId","title","content","position","createdAt","updatedAt") VALUES ($1,$2,'Scene 1',$3,0,NOW(),NOW())`,[id,chapterId,chapter.content]);
      }
    }else{
      if(!existing.length){
        const firstId=randomUUID();
        await connection.query(`INSERT INTO "Scene" ("id","chapterId","title","content","position","createdAt","updatedAt") VALUES ($1,$2,'Scene 1',$3,0,NOW(),NOW())`,[firstId,chapterId,chapter.content]);
        existing=(await connection.query<SceneRow>(`SELECT "id","chapterId","povCharacterId","title","content","summary","goal","conflict","outcome","location","status","position" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position" FOR UPDATE`,[chapterId])).rows;
      }
      const id=randomUUID(),afterSceneId=body.afterSceneId?String(body.afterSceneId):existing[existing.length-1]?.id;
      const endPosition=Math.max(-1,...existing.map(scene=>scene.position))+1;
      await connection.query(`INSERT INTO "Scene" ("id","chapterId","title","position","createdAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())`,[id,chapterId,`Scene ${existing.length+1}`,endPosition]);
      const ids=[...existing.map(scene=>scene.id),id],from=ids.indexOf(id),target=afterSceneId?ids.indexOf(afterSceneId)+1:ids.length;
      ids.splice(from,1);ids.splice(Math.max(0,target>from?target-1:target),0,id);
      for(let index=0;index<ids.length;index++)await connection.query(`UPDATE "Scene" SET "position"=$2 WHERE "id"=$1`,[ids[index],-100000-index]);
      for(let index=0;index<ids.length;index++)await connection.query(`UPDATE "Scene" SET "position"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[ids[index],index]);
    }
    const scenes=(await connection.query<SceneRow>(`SELECT "id","chapterId","povCharacterId","title","content","summary","goal","conflict","outcome","location","status","position" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position"`,[chapterId])).rows;
    const aggregateContent=combineSceneContents(scenes.map(scene=>scene.content));
    await connection.query(`UPDATE "Chapter" SET "content"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[chapterId,aggregateContent]);
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[chapter.novelId]);
    await connection.query("COMMIT");
    return NextResponse.json({scenes,aggregateContent,createdId:body.initialize===true?scenes[0]?.id:scenes.find(scene=>scene.position===Math.min(scenes.length-1,(existing.findIndex(scene=>scene.id===body.afterSceneId)+1||scenes.length-1)))?.id??scenes.at(-1)?.id});
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
}

import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db} from "@/lib/db";
import {combineSceneContents} from "@/lib/scenes";

export async function POST(request:NextRequest,{params}:{params:Promise<{chapterId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {chapterId}=await params,connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const chapter=(await connection.query<{novelId:string}>(`SELECT c."novelId" FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."id"=$1 AND n."userId"=$2 FOR UPDATE`,[chapterId,user.id])).rows[0];
    if(!chapter){await connection.query("ROLLBACK");return NextResponse.json({error:"Not found"},{status:404})}
    const scenes=(await connection.query<{content:string}>(`SELECT "content" FROM "Scene" WHERE "chapterId"=$1 ORDER BY "position" FOR UPDATE`,[chapterId])).rows;
    const aggregateContent=scenes.length?combineSceneContents(scenes.map(scene=>scene.content)):(await connection.query<{content:string}>(`SELECT "content" FROM "Chapter" WHERE "id"=$1`,[chapterId])).rows[0]?.content||"";
    await connection.query(`DELETE FROM "Scene" WHERE "chapterId"=$1`,[chapterId]);
    await connection.query(`UPDATE "Chapter" SET "content"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[chapterId,aggregateContent]);
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[chapter.novelId]);
    await connection.query("COMMIT");
    return NextResponse.json({ok:true,aggregateContent});
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
}

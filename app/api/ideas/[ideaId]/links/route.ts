import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{ideaId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const {ideaId}=await params;
  const idea=await query<{novelId:string}>(`SELECT s."novelId" FROM "StickyNote" s JOIN "Novel" n ON n."id"=s."novelId" WHERE s."id"=$1 AND s."kind"='IDEA' AND n."userId"=$2`,[ideaId,user.id]);if(!idea.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json(),characterIds=[...new Set((Array.isArray(body.characterIds)?body.characterIds:[]).map(String))],locationIds=[...new Set((Array.isArray(body.locationIds)?body.locationIds:[]).map(String))],worldNoteIds=[...new Set((Array.isArray(body.worldNoteIds)?body.worldNoteIds:[]).map(String))];
  const [characters,locations,worldNotes]=await Promise.all([
    characterIds.length?query<{id:string}>(`SELECT "id" FROM "Character" WHERE "novelId"=$1 AND "id"=ANY($2::text[])`,[idea.rows[0].novelId,characterIds]):Promise.resolve({rows:[]} as any),
    locationIds.length?query<{id:string}>(`SELECT "id" FROM "Location" WHERE "novelId"=$1 AND "id"=ANY($2::text[])`,[idea.rows[0].novelId,locationIds]):Promise.resolve({rows:[]} as any),
    worldNoteIds.length?query<{id:string}>(`SELECT "id" FROM "WorldNote" WHERE "novelId"=$1 AND "id"=ANY($2::text[])`,[idea.rows[0].novelId,worldNoteIds]):Promise.resolve({rows:[]} as any)
  ]);
  if(characters.rows.length!==characterIds.length||locations.rows.length!==locationIds.length||worldNotes.rows.length!==worldNoteIds.length)return NextResponse.json({error:"One or more Story Bible links are invalid."},{status:400});
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    await connection.query(`DELETE FROM "IdeaCharacterLink" WHERE "ideaId"=$1`,[ideaId]);await connection.query(`DELETE FROM "IdeaLocationLink" WHERE "ideaId"=$1`,[ideaId]);await connection.query(`DELETE FROM "IdeaWorldNoteLink" WHERE "ideaId"=$1`,[ideaId]);
    for(const id of characterIds)await connection.query(`INSERT INTO "IdeaCharacterLink" ("id","ideaId","characterId","createdAt") VALUES ($1,$2,$3,NOW())`,[randomUUID(),ideaId,id]);
    for(const id of locationIds)await connection.query(`INSERT INTO "IdeaLocationLink" ("id","ideaId","locationId","createdAt") VALUES ($1,$2,$3,NOW())`,[randomUUID(),ideaId,id]);
    for(const id of worldNoteIds)await connection.query(`INSERT INTO "IdeaWorldNoteLink" ("id","ideaId","worldNoteId","createdAt") VALUES ($1,$2,$3,NOW())`,[randomUUID(),ideaId,id]);
    await connection.query("COMMIT");
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
  return NextResponse.json({ok:true,characterIds,locationIds,worldNoteIds});
}

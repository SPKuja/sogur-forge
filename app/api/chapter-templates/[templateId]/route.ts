import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db,query} from "@/lib/db";
import {normaliseChapterTemplate} from "@/lib/chapter-template";

export async function PATCH(request:NextRequest,{params}:{params:Promise<{templateId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});

  const {templateId}=await params;
  const body=await request.json();
  const current=await query<Record<string,unknown>&{id:string;novelId:string;name:string;isDefault:boolean}>(
    `SELECT t.* FROM "ChapterTemplate" t
     JOIN "Novel" n ON n."id"=t."novelId"
     WHERE t."id"=$1 AND n."userId"=$2`,
    [templateId,user.id]
  );
  if(!current.rows[0])return NextResponse.json({error:"Not found"},{status:404});

  const old=current.rows[0];
  const effective=normaliseChapterTemplate(old);
  const name=String(body.name??effective.name).trim().slice(0,120)||effective.name;
  const content=String(body.content??effective.content);

  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    if(body.makeDefault===true){
      await connection.query(
        `UPDATE "ChapterTemplate" SET "isDefault"=false,"updatedAt"=NOW() WHERE "novelId"=$1`,
        [old.novelId]
      );
    }
    await connection.query(
      `UPDATE "ChapterTemplate"
       SET "name"=$2,"content"=$3,
           "isDefault"=CASE WHEN $4 THEN true ELSE "isDefault" END,
           "updatedAt"=NOW()
       WHERE "id"=$1`,
      [templateId,name,content,body.makeDefault===true]
    );
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[old.novelId]);
    await connection.query("COMMIT");
  }catch(error){
    await connection.query("ROLLBACK");
    throw error;
  }finally{
    connection.release();
  }

  return NextResponse.json({
    id:templateId,
    name,
    content,
    isDefault:body.makeDefault===true||effective.isDefault
  });
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{templateId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});

  const {templateId}=await params;
  const connection=await db.connect();
  let nextDefaultId:string|null=null;
  try{
    await connection.query("BEGIN");
    const current=await connection.query<{novelId:string;isDefault:boolean}>(
      `SELECT t."novelId",t."isDefault"
       FROM "ChapterTemplate" t
       JOIN "Novel" n ON n."id"=t."novelId"
       WHERE t."id"=$1 AND n."userId"=$2
       FOR UPDATE`,
      [templateId,user.id]
    );
    if(!current.rows[0]){
      await connection.query("ROLLBACK");
      return NextResponse.json({error:"Not found"},{status:404});
    }

    const novelId=current.rows[0].novelId;
    await connection.query(`UPDATE "Chapter" SET "templateId"=NULL,"updatedAt"=NOW() WHERE "templateId"=$1`,[templateId]);
    await connection.query(`DELETE FROM "ChapterTemplate" WHERE "id"=$1`,[templateId]);

    if(current.rows[0].isDefault){
      const next=await connection.query<{id:string}>(
        `SELECT "id" FROM "ChapterTemplate" WHERE "novelId"=$1 ORDER BY "createdAt","id" LIMIT 1`,
        [novelId]
      );
      nextDefaultId=next.rows[0]?.id??null;
      if(nextDefaultId){
        await connection.query(`UPDATE "ChapterTemplate" SET "isDefault"=true,"updatedAt"=NOW() WHERE "id"=$1`,[nextDefaultId]);
      }
    }

    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);
    await connection.query("COMMIT");
  }catch(error){
    await connection.query("ROLLBACK");
    console.error("Chapter template deletion failed",error);
    return NextResponse.json({error:"Template could not be deleted."},{status:500});
  }finally{
    connection.release();
  }
  return NextResponse.json({ok:true,nextDefaultId});
}

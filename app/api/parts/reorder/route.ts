import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db} from "@/lib/db";

export async function PATCH(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json();
  if(!body.novelId||!Array.isArray(body.sections))return NextResponse.json({error:"Invalid request"},{status:400});
  const ids=body.sections.map((section:{id?:unknown})=>String(section.id||"")).filter(Boolean);
  if(new Set(ids).size!==ids.length)return NextResponse.json({error:"Duplicate sections"},{status:400});
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const novel=await connection.query(`SELECT "id" FROM "Novel" WHERE "id"=$1 AND "userId"=$2 FOR UPDATE`,[body.novelId,user.id]);
    if(!novel.rows[0]){await connection.query("ROLLBACK");return NextResponse.json({error:"Not found"},{status:404})}
    const existing=(await connection.query<{id:string}>(`SELECT "id" FROM "Part" WHERE "novelId"=$1 ORDER BY "position" FOR UPDATE`,[body.novelId])).rows.map(row=>row.id);
    if(existing.length!==ids.length||!existing.every(id=>ids.includes(id))){await connection.query("ROLLBACK");return NextResponse.json({error:"Refresh and retry"},{status:409})}
    for(let index=0;index<ids.length;index++)await connection.query(`UPDATE "Part" SET "position"=$2 WHERE "id"=$1`,[ids[index],-100000-index]);
    for(let index=0;index<ids.length;index++)await connection.query(`UPDATE "Part" SET "position"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[ids[index],index]);
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[body.novelId]);
    await connection.query("COMMIT");
    return NextResponse.json({ok:true});
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
}

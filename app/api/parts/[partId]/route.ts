import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

async function own(id:string,uid:string){
  return (await query<{novelId:string}>(`SELECT p."novelId" FROM "Part" p JOIN "Novel" n ON n."id"=p."novelId" WHERE p."id"=$1 AND n."userId"=$2`,[id,uid])).rows[0];
}

export async function PATCH(r:NextRequest,{params}:{params:Promise<{partId:string}>}){
  if(!requireSameOrigin(r))return NextResponse.json({error:"Invalid origin"},{status:403});
  const u=await currentUser();
  if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {partId}=await params;
  if(!await own(partId,u.id))return NextResponse.json({error:"Not found"},{status:404});
  const b=await r.json(),title=String(b.title||"").trim().slice(0,160);
  if(!title)return NextResponse.json({error:"Title required"},{status:400});
  await query(`UPDATE "Part" SET "title"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[partId,title]);
  const part=await own(partId,u.id);if(part)await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[part.novelId]);
  return NextResponse.json({ok:true,title});
}

export async function DELETE(r:NextRequest,{params}:{params:Promise<{partId:string}>}){
  if(!requireSameOrigin(r))return NextResponse.json({error:"Invalid origin"},{status:403});
  const u=await currentUser();
  if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {partId}=await params,part=await own(partId,u.id);
  if(!part)return NextResponse.json({error:"Not found"},{status:404});
  const count=await query<{count:string}>(`SELECT COUNT(*)::text AS count FROM "Chapter" WHERE "partId"=$1`,[partId]);
  const items=Number(count.rows[0]?.count||0);
  if(items>0)return NextResponse.json({error:`This section still contains ${items} manuscript ${items===1?"item":"items"}. Move them first.`},{status:409});
  await query(`DELETE FROM "Part" WHERE "id"=$1`,[partId]);
  await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[part.novelId]);
  return NextResponse.json({ok:true});
}

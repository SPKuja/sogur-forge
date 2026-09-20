import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

const symmetric=new Set(["SIBLING","PARTNER","FRIEND","ALLY","RIVAL","ENEMY","OTHER"]);
const allowed=new Set(["PARENT","CHILD","SIBLING","PARTNER","FRIEND","ALLY","RIVAL","ENEMY","MENTOR","STUDENT","OTHER"]);

function normalize(sourceId:string,targetId:string,type:string){
  if(type==="CHILD")return {sourceId:targetId,targetId:sourceId,type:"PARENT"};
  if(type==="STUDENT")return {sourceId:targetId,targetId:sourceId,type:"MENTOR"};
  if(symmetric.has(type)&&sourceId.localeCompare(targetId)>0)return {sourceId:targetId,targetId:sourceId,type};
  return {sourceId,targetId,type};
}

export async function POST(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(),novelId=String(body.novelId||""),rawSource=String(body.sourceId||""),rawTarget=String(body.targetId||""),rawType=String(body.type||"").toUpperCase();
  if(!rawSource||!rawTarget||rawSource===rawTarget||!allowed.has(rawType))return NextResponse.json({error:"Choose two different characters and a valid relationship."},{status:400});
  const owned=await query<{count:number}>(`SELECT COUNT(*)::int AS count FROM "Character" c JOIN "Novel" n ON n."id"=c."novelId" WHERE c."novelId"=$1 AND c."id" IN ($2,$3) AND n."userId"=$4`,[novelId,rawSource,rawTarget,user.id]);
  if(Number(owned.rows[0]?.count)!==2)return NextResponse.json({error:"Character not found"},{status:404});
  const {sourceId,targetId,type}=normalize(rawSource,rawTarget,rawType),label=String(body.label||"").trim().slice(0,120),notes=String(body.notes||"").slice(0,4000),id=randomUUID();
  try{
    const created=await query(`INSERT INTO "CharacterRelationship" ("id","novelId","sourceId","targetId","type","label","notes","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING "id","sourceId","targetId","type","label","notes"`,[id,novelId,sourceId,targetId,type,label,notes]);
    await query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);
    return NextResponse.json(created.rows[0],{status:201});
  }catch(error){
    if((error as {code?:string}).code==="23505")return NextResponse.json({error:"That relationship already exists."},{status:409});
    throw error;
  }
}

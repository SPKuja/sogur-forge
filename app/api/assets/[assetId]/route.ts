import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";

const dir=process.env.ASSET_DIR||"/app/data/assets";

export async function GET(_:Request,{params}:{params:Promise<{assetId:string}>}){
  const user=await currentUser();if(!user)return new NextResponse(null,{status:401});
  const {assetId}=await params;
  const asset=await query<{storedName:string;mimeType:string}>(`SELECT a."storedName",a."mimeType" FROM "Asset" a JOIN "Novel" n ON n."id"=a."novelId" WHERE a."id"=$1 AND n."userId"=$2`,[assetId,user.id]);
  if(!asset.rows[0])return new NextResponse(null,{status:404});
  try{
    const data=await readFile(join(dir,asset.rows[0].storedName));
    return new NextResponse(new Uint8Array(data),{headers:{"Content-Type":asset.rows[0].mimeType,"Cache-Control":"private, max-age=3600"}});
  }catch{return new NextResponse(null,{status:404})}
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{assetId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {assetId}=await params,body=await request.json().catch(()=>({})),name=String(body.name||"").trim().slice(0,255);
  if(!name)return NextResponse.json({error:"Enter an image name."},{status:400});
  const updated=await query<{id:string;originalName:string}>(`UPDATE "Asset" a SET "originalName"=$3 FROM "Novel" n WHERE a."id"=$1 AND a."novelId"=n."id" AND n."userId"=$2 RETURNING a."id",a."originalName"`,[assetId,user.id,name]);
  if(!updated.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json({ok:true,id:assetId,name:updated.rows[0].originalName});
}

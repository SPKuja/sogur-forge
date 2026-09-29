import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {deleteProjectAssets,loadAssetLibrary} from "@/lib/asset-library";

async function ownsNovel(novelId:string,userId:string){
  return Boolean((await query(`SELECT "id" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,userId])).rows[0]);
}

export async function GET(request:NextRequest){
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const novelId=String(request.nextUrl.searchParams.get("novelId")||"");
  if(!await ownsNovel(novelId,user.id))return NextResponse.json({error:"Not found"},{status:404});
  const assets=await loadAssetLibrary(novelId);
  return NextResponse.json({assets});
}

export async function DELETE(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>({})),novelId=String(body.novelId||""),assetIds=Array.isArray(body.assetIds)?body.assetIds.map((id:unknown)=>String(id)):[],force=body.force===true;
  if(!await ownsNovel(novelId,user.id))return NextResponse.json({error:"Not found"},{status:404});
  const result=await deleteProjectAssets(novelId,assetIds,force);
  if(result.blocked.length)return NextResponse.json({error:"One or more images are still in use.",blocked:result.blocked},{status:409});
  return NextResponse.json({ok:true,deletedIds:result.deletedIds});
}

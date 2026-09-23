import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {db} from "@/lib/db";
import {getManuscriptLayoutBundle} from "@/lib/manuscript-layout-server";
import {mergeManuscriptLayout,normaliseManuscriptDisplayMode} from "@/lib/manuscript-layout";

export async function GET(_:NextRequest,{params}:{params:Promise<{novelId:string}>}){
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {novelId}=await params,bundle=await getManuscriptLayoutBundle(user.id,novelId);
  if(!bundle)return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json(bundle);
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{novelId:string}>}){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {novelId}=await params,current=await getManuscriptLayoutBundle(user.id,novelId);
  if(!current)return NextResponse.json({error:"Not found"},{status:404});
  const body=await request.json().catch(()=>({}));
  const hasLayout=body.layout&&typeof body.layout==="object"&&!Array.isArray(body.layout),hasDisplayMode=body.displayMode!==undefined;
  const layout=hasLayout?mergeManuscriptLayout(current.layout,body.layout):current.layout;
  const displayMode=hasDisplayMode?normaliseManuscriptDisplayMode(body.displayMode):current.displayMode;
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    if(hasLayout){
      await connection.query(
        `INSERT INTO "NovelLayout" ("novelId","settings","createdAt","updatedAt")
         VALUES ($1,$2::jsonb,NOW(),NOW())
         ON CONFLICT ("novelId") DO UPDATE SET "settings"=EXCLUDED."settings","updatedAt"=NOW()`,
        [novelId,JSON.stringify(layout)]
      );
      await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);
    }
    if(hasDisplayMode){
      await connection.query(
        `INSERT INTO "ManuscriptViewPreference" ("userId","novelId","displayMode","createdAt","updatedAt")
         VALUES ($1,$2,$3,NOW(),NOW())
         ON CONFLICT ("userId","novelId") DO UPDATE SET "displayMode"=EXCLUDED."displayMode","updatedAt"=NOW()`,
        [user.id,novelId,displayMode]
      );
    }
    await connection.query("COMMIT");
  }catch(error){await connection.query("ROLLBACK");throw error}finally{connection.release()}
  return NextResponse.json({layout,displayMode});
}

import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {NextResponse} from "next/server";
import {query} from "@/lib/db";
import {hashManuscriptShareToken} from "@/lib/manuscript-share";

const dir=process.env.ASSET_DIR||"/app/data/assets";

export async function GET(_:Request,{params}:{params:Promise<{token:string;assetId:string}>}){
  const {token,assetId}=await params;
  const share=(await query<{id:string;novelId:string;scope:string}>(`
    SELECT "id","novelId","scope" FROM "ManuscriptShare"
    WHERE "tokenHash"=$1 AND "revokedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt">NOW())
  `,[hashManuscriptShareToken(token)])).rows[0];
  if(!share)return new NextResponse(null,{status:404});

  const asset=(await query<{storedName:string;mimeType:string}>(`
    SELECT "storedName","mimeType" FROM "Asset" WHERE "id"=$1 AND "novelId"=$2
  `,[assetId,share.novelId])).rows[0];
  if(!asset)return new NextResponse(null,{status:404});

  const allowed=share.scope==="ALL"
    ?(await query(`SELECT 1 FROM "Chapter" WHERE "novelId"=$1 AND ("headerImageAssetId"=$2 OR POSITION($2 IN "content")>0) LIMIT 1`,[share.novelId,assetId])).rowCount
    :(await query(`
      SELECT 1 FROM "ManuscriptShareChapter" sc
      JOIN "Chapter" c ON c."id"=sc."chapterId"
      WHERE sc."shareId"=$1 AND (c."headerImageAssetId"=$2 OR POSITION($2 IN c."content")>0)
      LIMIT 1
    `,[share.id,assetId])).rowCount;
  if(!allowed)return new NextResponse(null,{status:404});

  try{
    const data=await readFile(join(dir,asset.storedName));
    return new NextResponse(new Uint8Array(data),{headers:{"Content-Type":asset.mimeType,"Cache-Control":"private, max-age=3600"}});
  }catch{return new NextResponse(null,{status:404})}
}

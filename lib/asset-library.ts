import {unlink} from "node:fs/promises";
import {join} from "node:path";
import {db,query} from "@/lib/db";

const assetDir=process.env.ASSET_DIR||"/app/data/assets";

export type AssetUsage={
  kind:"MANUSCRIPT"|"REVISION"|"TEMPLATE_CONTENT"|"CHAPTER_HEADER"|"TEMPLATE_HEADER"|"CHARACTER"|"LOCATION"|"WORLD_NOTE"|"IDEA";
  label:string;
  detail:string;
  href:string|null;
  count:number;
};
export type ManagedAsset={
  id:string;
  name:string;
  mimeType:string;
  size:number;
  createdAt:string;
  url:string;
  usageCount:number;
  usageOccurrences:number;
  usages:AssetUsage[];
};

type AssetRow={id:string;originalName:string;storedName:string;mimeType:string;size:number;createdAt:Date};
type ContentRow={id:string;title:string;content:string;headerImageAssetId:string|null};
type RevisionRow={id:string;chapterId:string;chapterTitle:string;content:string};
type TemplateRow={id:string;name:string;content:string;headerImageAssetId:string|null};
type LinkRow={assetId:string;id:string;name:string};

function assetIdsInHtml(html:string,known:Set<string>){
  const counts=new Map<string,number>(),expression=/\/api\/assets\/([A-Za-z0-9_-]+)/g;
  let match:RegExpExecArray|null;
  while((match=expression.exec(html||""))){
    const id=match[1];
    if(known.has(id))counts.set(id,(counts.get(id)||0)+1);
  }
  return counts;
}

function removeAssetFromHtml(html:string,assetIds:Set<string>){
  if(!html||!assetIds.size)return html;
  const contains=(block:string)=>[...assetIds].some(id=>block.includes(`/api/assets/${id}`));
  let next=html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi,block=>contains(block)?"":block);
  next=next.replace(/<img\b[^>]*>/gi,tag=>contains(tag)?"":tag);
  return next;
}

export async function loadAssetLibrary(novelId:string){
  const [assets,chapters,revisions,templates,characterImages,locationImages,worldNoteImages,ideaImages]=await Promise.all([
    query<AssetRow>(`SELECT "id","originalName","storedName","mimeType","size","createdAt" FROM "Asset" WHERE "novelId"=$1 ORDER BY "createdAt" DESC`,[novelId]),
    query<ContentRow>(`SELECT "id","title","content","headerImageAssetId" FROM "Chapter" WHERE "novelId"=$1 ORDER BY "position"`,[novelId]),
    query<RevisionRow>(`SELECT r."id",r."chapterId",c."title" AS "chapterTitle",r."content" FROM "ChapterRevision" r JOIN "Chapter" c ON c."id"=r."chapterId" WHERE c."novelId"=$1 ORDER BY r."createdAt" DESC`,[novelId]),
    query<TemplateRow>(`SELECT "id","name","content","headerImageAssetId" FROM "ChapterTemplate" WHERE "novelId"=$1 ORDER BY "createdAt"`,[novelId]),
    query<LinkRow>(`SELECT ci."assetId",c."id",c."name" FROM "CharacterImage" ci JOIN "Character" c ON c."id"=ci."characterId" WHERE c."novelId"=$1`,[novelId]),
    query<LinkRow>(`SELECT li."assetId",l."id",l."name" FROM "LocationImage" li JOIN "Location" l ON l."id"=li."locationId" WHERE l."novelId"=$1`,[novelId]),
    query<LinkRow>(`SELECT wi."assetId",w."id",w."name" FROM "WorldNoteImage" wi JOIN "WorldNote" w ON w."id"=wi."worldNoteId" WHERE w."novelId"=$1`,[novelId]),
    query<LinkRow>(`SELECT ii."assetId",s."id",COALESCE(NULLIF(s."title",''),LEFT(s."body",80),'Untitled idea') AS "name" FROM "IdeaImage" ii JOIN "StickyNote" s ON s."id"=ii."ideaId" WHERE s."novelId"=$1 AND s."kind"='IDEA'`,[novelId])
  ]);
  const known=new Set(assets.rows.map(asset=>asset.id));
  const usageMaps=new Map<string,Map<string,AssetUsage>>(assets.rows.map(asset=>[asset.id,new Map()]));
  const add=(assetId:string,key:string,usage:Omit<AssetUsage,"count">,count=1)=>{
    const map=usageMaps.get(assetId);if(!map)return;
    const existing=map.get(key);
    if(existing)existing.count+=count;else map.set(key,{...usage,count});
  };
  for(const chapter of chapters.rows){
    for(const [assetId,count] of assetIdsInHtml(chapter.content,known))add(assetId,`manuscript:${chapter.id}`,{kind:"MANUSCRIPT",label:chapter.title,detail:"Manuscript image",href:`/workspace/${novelId}?chapter=${encodeURIComponent(chapter.id)}`},count);
    if(chapter.headerImageAssetId)add(chapter.headerImageAssetId,`chapter-header:${chapter.id}`,{kind:"CHAPTER_HEADER",label:chapter.title,detail:"Chapter header override",href:`/workspace/${novelId}?chapter=${encodeURIComponent(chapter.id)}`});
  }
  for(const revision of revisions.rows){
    for(const [assetId,count] of assetIdsInHtml(revision.content,known))add(assetId,`revision:${revision.chapterId}`,{kind:"REVISION",label:revision.chapterTitle,detail:"Revision history",href:`/workspace/${novelId}?chapter=${encodeURIComponent(revision.chapterId)}`},count);
  }
  for(const template of templates.rows){
    for(const [assetId,count] of assetIdsInHtml(template.content,known))add(assetId,`template-content:${template.id}`,{kind:"TEMPLATE_CONTENT",label:template.name,detail:"Chapter template content",href:`/workspace/${novelId}/chapters`},count);
    if(template.headerImageAssetId)add(template.headerImageAssetId,`template-header:${template.id}`,{kind:"TEMPLATE_HEADER",label:template.name,detail:"Chapter template header",href:`/workspace/${novelId}/chapters`});
  }
  for(const item of characterImages.rows)add(item.assetId,`character:${item.id}`,{kind:"CHARACTER",label:item.name,detail:"Character gallery",href:`/workspace/${novelId}/characters?character=${encodeURIComponent(item.id)}`});
  for(const item of locationImages.rows)add(item.assetId,`location:${item.id}`,{kind:"LOCATION",label:item.name,detail:"Location gallery",href:`/workspace/${novelId}/locations?location=${encodeURIComponent(item.id)}`});
  for(const item of worldNoteImages.rows)add(item.assetId,`world-note:${item.id}`,{kind:"WORLD_NOTE",label:item.name,detail:"World Note gallery",href:`/workspace/${novelId}/world-notes?note=${encodeURIComponent(item.id)}`});
  for(const item of ideaImages.rows)add(item.assetId,`idea:${item.id}`,{kind:"IDEA",label:item.name,detail:"Idea attachment",href:`/workspace/${novelId}/ideas?idea=${encodeURIComponent(item.id)}`});
  return assets.rows.map(asset=>{
    const usages=[...(usageMaps.get(asset.id)?.values()||[])];
    return {id:asset.id,name:asset.originalName,mimeType:asset.mimeType,size:asset.size,createdAt:asset.createdAt.toISOString(),url:`/api/assets/${asset.id}`,usageCount:usages.length,usageOccurrences:usages.reduce((sum,item)=>sum+item.count,0),usages} satisfies ManagedAsset;
  });
}

export async function deleteProjectAssets(novelId:string,assetIds:string[],force=false){
  const unique=[...new Set(assetIds)].filter(Boolean).slice(0,100);
  if(!unique.length)return {deletedIds:[],blocked:[] as ManagedAsset[]};
  const library=await loadAssetLibrary(novelId),selected=library.filter(asset=>unique.includes(asset.id)),blocked=selected.filter(asset=>asset.usageCount>0);
  if(blocked.length&&!force)return {deletedIds:[],blocked};
  const owned=await query<AssetRow>(`SELECT "id","originalName","storedName","mimeType","size","createdAt" FROM "Asset" WHERE "novelId"=$1 AND "id"=ANY($2::text[])`,[novelId,unique]);
  const ids=owned.rows.map(asset=>asset.id),idSet=new Set(ids);
  if(!ids.length)return {deletedIds:[],blocked:[] as ManagedAsset[]};
  const connection=await db.connect();
  try{
    await connection.query("BEGIN");
    const chapters=await connection.query<{id:string;content:string}>(`SELECT "id","content" FROM "Chapter" WHERE "novelId"=$1`,[novelId]);
    for(const chapter of chapters.rows){
      const content=removeAssetFromHtml(chapter.content,idSet);
      if(content!==chapter.content)await connection.query(`UPDATE "Chapter" SET "content"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[chapter.id,content]);
    }
    const revisions=await connection.query<{id:string;content:string}>(`SELECT r."id",r."content" FROM "ChapterRevision" r JOIN "Chapter" c ON c."id"=r."chapterId" WHERE c."novelId"=$1`,[novelId]);
    for(const revision of revisions.rows){
      const content=removeAssetFromHtml(revision.content,idSet);
      if(content!==revision.content)await connection.query(`UPDATE "ChapterRevision" SET "content"=$2 WHERE "id"=$1`,[revision.id,content]);
    }
    const templates=await connection.query<{id:string;content:string}>(`SELECT "id","content" FROM "ChapterTemplate" WHERE "novelId"=$1`,[novelId]);
    for(const template of templates.rows){
      const content=removeAssetFromHtml(template.content,idSet);
      if(content!==template.content)await connection.query(`UPDATE "ChapterTemplate" SET "content"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[template.id,content]);
    }
    await connection.query(`DELETE FROM "Asset" WHERE "novelId"=$1 AND "id"=ANY($2::text[])`,[novelId,ids]);
    await connection.query(`UPDATE "Novel" SET "updatedAt"=NOW() WHERE "id"=$1`,[novelId]);
    await connection.query("COMMIT");
  }catch(error){
    await connection.query("ROLLBACK");throw error;
  }finally{connection.release()}
  await Promise.all(owned.rows.map(asset=>unlink(join(assetDir,asset.storedName)).catch(()=>undefined)));
  return {deletedIds:ids,blocked:[] as ManagedAsset[]};
}

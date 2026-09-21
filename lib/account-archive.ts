import {ZipArchive} from "archiver";
import {PassThrough,Readable} from "node:stream";
import {existsSync} from "node:fs";
import {join} from "node:path";
import {query} from "@/lib/db";

function safeName(value:string){return value.normalize("NFKD").replace(/[^a-zA-Z0-9._ -]+/g,"").trim().replace(/\s+/g,"-").slice(0,100)||"untitled"}
function stripHtml(value:string){return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"").replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/p\s*>/gi,"\n\n").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\n{3,}/g,"\n\n").trim()}

export async function accountArchive(userId:string,mode:"export"|"backup"){
  const [account,novels,parts,chapters,scenes,revisions,assets,boards,notes,characters,images,relationships,templates,events,sessions]=await Promise.all([
    query<any>(`SELECT "id","username","email","emailVerifiedAt","role","totpEnabled","createdAt","updatedAt" FROM "User" WHERE "id"=$1`,[userId]),
    query<any>(`SELECT "id","title","description","createdAt","updatedAt" FROM "Novel" WHERE "userId"=$1 ORDER BY "updatedAt"`,[userId]),
    query<any>(`SELECT p.* FROM "Part" p JOIN "Novel" n ON n."id"=p."novelId" WHERE n."userId"=$1 ORDER BY p."novelId",p."position"`,[userId]),
    query<any>(`SELECT c.* FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE n."userId"=$1 ORDER BY c."novelId",c."position"`,[userId]),
    query<any>(`SELECT s.* FROM "Scene" s JOIN "Chapter" c ON c."id"=s."chapterId" JOIN "Novel" n ON n."id"=c."novelId" WHERE n."userId"=$1 ORDER BY s."chapterId",s."position"`,[userId]),
    query<any>(`SELECT r.* FROM "ChapterRevision" r JOIN "Chapter" c ON c."id"=r."chapterId" JOIN "Novel" n ON n."id"=c."novelId" WHERE n."userId"=$1 ORDER BY r."chapterId",r."createdAt"`,[userId]),
    query<any>(`SELECT a.* FROM "Asset" a JOIN "Novel" n ON n."id"=a."novelId" WHERE n."userId"=$1 ORDER BY a."novelId",a."createdAt"`,[userId]),
    query<any>(`SELECT b.* FROM "CorkBoard" b JOIN "Novel" n ON n."id"=b."novelId" WHERE n."userId"=$1 ORDER BY b."novelId",b."position"`,[userId]),
    query<any>(`SELECT s.* FROM "StickyNote" s JOIN "Novel" n ON n."id"=s."novelId" WHERE n."userId"=$1 ORDER BY s."novelId",s."createdAt"`,[userId]),
    query<any>(`SELECT c.* FROM "Character" c JOIN "Novel" n ON n."id"=c."novelId" WHERE n."userId"=$1 ORDER BY c."novelId",c."position"`,[userId]),
    query<any>(`SELECT ci.* FROM "CharacterImage" ci JOIN "Character" c ON c."id"=ci."characterId" JOIN "Novel" n ON n."id"=c."novelId" WHERE n."userId"=$1 ORDER BY ci."characterId",ci."position"`,[userId]),
    query<any>(`SELECT r.* FROM "CharacterRelationship" r JOIN "Novel" n ON n."id"=r."novelId" WHERE n."userId"=$1 ORDER BY r."novelId",r."createdAt"`,[userId]),
    query<any>(`SELECT t.* FROM "ChapterTemplate" t JOIN "Novel" n ON n."id"=t."novelId" WHERE n."userId"=$1 ORDER BY t."novelId",t."createdAt"`,[userId]),
    query<any>(`SELECT "id","type","metadata","createdAt" FROM "SecurityEvent" WHERE "userId"=$1 ORDER BY "createdAt"`,[userId]),
    query<any>(`SELECT "id","lastSeenAt","expiresAt","absoluteExpiresAt","userAgent","createdAt" FROM "Session" WHERE "userId"=$1 ORDER BY "createdAt"`,[userId])
  ]);
  const assetRows=assets.rows,generatedAt=new Date().toISOString();
  const data={
    format:"sogur-forge-account-data",formatVersion:1,generatedAt,
    account:account.rows[0],
    novels:novels.rows.map((novel:any)=>({
      ...novel,
      sections:parts.rows.filter((item:any)=>item.novelId===novel.id),
      manuscript:chapters.rows.filter((item:any)=>item.novelId===novel.id).map((item:any)=>({
        ...item,
        scenes:scenes.rows.filter((scene:any)=>scene.chapterId===item.id),
        revisions:revisions.rows.filter((revision:any)=>revision.chapterId===item.id),
        notes:notes.rows.filter((note:any)=>note.chapterId===item.id)
      })),
      chapterTemplates:templates.rows.filter((item:any)=>item.novelId===novel.id),
      characters:characters.rows.filter((item:any)=>item.novelId===novel.id).map((character:any)=>({...character,images:images.rows.filter((image:any)=>image.characterId===character.id)})),
      characterRelationships:relationships.rows.filter((item:any)=>item.novelId===novel.id),
      corkBoards:boards.rows.filter((item:any)=>item.novelId===novel.id).map((board:any)=>({...board,notes:notes.rows.filter((note:any)=>note.boardId===board.id)})),
      unboardedNotes:notes.rows.filter((note:any)=>note.novelId===novel.id&&!note.boardId&&!note.chapterId),
      assets:assetRows.filter((item:any)=>item.novelId===novel.id).map(({storedName,...asset}:any)=>asset)
    })),
    accountActivity:{securityEvents:events.rows,sessions:sessions.rows}
  };
  const pass=new PassThrough(),archive=new ZipArchive({zlib:{level:9}});archive.on("error",error=>pass.destroy(error));archive.pipe(pass);
  const root=mode==="backup"?"sogur-forge-backup":"sogur-forge-data";
  archive.append(JSON.stringify(data,null,2),{name:`${root}/${mode==="backup"?"backup.json":"data.json"}`});
  archive.append(mode==="backup"?"Sögur Forge backup archive. Keep this file private. It contains your writing data and uploaded assets. Authentication secrets are deliberately excluded.\n":"Sögur Forge data export. This archive contains your account profile, manuscripts, Story Bible data, planning data and uploaded assets in open, readable formats. Authentication secrets are deliberately excluded.\n",{name:`${root}/README.txt`});
  for(const novel of novels.rows){
    const novelChapters=chapters.rows.filter((item:any)=>item.novelId===novel.id),novelParts=parts.rows.filter((item:any)=>item.novelId===novel.id),partIds=new Set(novelParts.map((part:any)=>part.id));
    const ordered=[...novelChapters.filter((item:any)=>!item.partId),...novelParts.flatMap((part:any)=>novelChapters.filter((item:any)=>item.partId===part.id)),...novelChapters.filter((item:any)=>item.partId&&!partIds.has(item.partId))];
    let chapterNumber=0,text=`${novel.title}\n${"=".repeat(Math.min(80,Math.max(3,String(novel.title).length)))}\n\n${novel.description||""}\n\n`;
    let lastPart:string|null|undefined=undefined;
    for(const item of ordered){
      if(item.partId!==lastPart){const part=novelParts.find((p:any)=>p.id===item.partId);if(part)text+=`\n\n## ${part.title}\n\n`;lastPart=item.partId}
      if(item.kind==="PAGE")text+=`\n[${item.pageType||"PAGE"}] ${item.title}\n\n`;else{text+=`\nCHAPTER ${++chapterNumber}: ${item.title}\n\n`}
      text+=stripHtml(item.content||"")+"\n\n";
    }
    archive.append(text.trim()+"\n",{name:`${root}/novels/${safeName(novel.title)}/manuscript.txt`});
  }
  const assetDir=process.env.ASSET_DIR||"/app/data/assets";
  for(const asset of assetRows){
    const novel=novels.rows.find((item:any)=>item.id===asset.novelId),path=join(assetDir,asset.storedName);
    if(existsSync(path))archive.file(path,{name:`${root}/novels/${safeName(novel?.title||asset.novelId)}/assets/${asset.id}-${safeName(asset.originalName)}`});
  }
  void archive.finalize();
  const filename=`sogur-forge-${mode}-${new Date().toISOString().slice(0,10)}.zip`;
  return new Response(Readable.toWeb(pass) as ReadableStream,{headers:{"Content-Type":"application/zip","Content-Disposition":`attachment; filename="${filename}"`,"Cache-Control":"private, no-store"}});
}

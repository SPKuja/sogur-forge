import {query} from "@/lib/db";

export type ExportOptions={titlePage:boolean;tableOfContents:boolean;partHeadings:boolean;chapterTitles:boolean;images:boolean};
export type ExportChapter={id:string;title:string;kind:string;pageType:string|null;position:number;partId:string|null;partTitle:string|null;partPosition:number|null;contentHtml:string};
export type ManuscriptExport={novel:{id:string;title:string};options:ExportOptions;chapters:ExportChapter[]};

function cleanInternalMarkup(html:string){
  const anchor=/<span\b[^>]*data-note-anchor=(?:"[^"]*"|'[^']*')[^>]*>([\s\S]*?)<\/span>/gi;
  return html.replace(anchor,"$1");
}

export async function buildManuscriptExport(userId:string,novelId:string,chapterIds:string[],options:ExportOptions):Promise<ManuscriptExport|null>{
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,userId]);
  if(!novel.rows[0])return null;
  const unique=[...new Set(chapterIds)].filter(Boolean);
  if(!unique.length)return {novel:novel.rows[0],options,chapters:[]};
  const chapters=await query<{id:string;title:string;kind:string;pageType:string|null;content:string;position:number;partId:string|null;partTitle:string|null;partPosition:number|null}>(`SELECT c."id",c."title",c."kind",c."pageType",c."content",c."position",c."partId",p."title" AS "partTitle",p."position" AS "partPosition" FROM "Chapter" c LEFT JOIN "Part" p ON p."id"=c."partId" WHERE c."novelId"=$1 AND c."id"=ANY($2::text[]) ORDER BY c."position"`,[novelId,unique]);
  return {novel:novel.rows[0],options,chapters:chapters.rows.map(c=>({id:c.id,title:c.title,kind:c.kind,pageType:c.pageType,position:c.position,partId:c.partId,partTitle:c.partTitle,partPosition:c.partPosition,contentHtml:cleanInternalMarkup(c.content)}))};
}

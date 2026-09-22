import {query} from "@/lib/db";
import {manuscriptChapterOrder} from "@/lib/manuscript-order";
import {cleanManuscriptHtml} from "@/lib/manuscript-content";

export type ExportOptions={titlePage:boolean;tableOfContents:boolean;partHeadings:boolean;chapterTitles:boolean;images:boolean};
export type ExportChapter={id:string;title:string;kind:string;pageType:string|null;position:number;partId:string|null;partTitle:string|null;partPosition:number|null;contentHtml:string};
export type ManuscriptExport={novel:{id:string;title:string};options:ExportOptions;chapters:ExportChapter[]};

export async function buildManuscriptExport(userId:string,novelId:string,chapterIds:string[],options:ExportOptions):Promise<ManuscriptExport|null>{
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,userId]);
  if(!novel.rows[0])return null;
  const unique=[...new Set(chapterIds)].filter(Boolean);
  if(!unique.length)return {novel:novel.rows[0],options,chapters:[]};
  const [chapters,parts]=await Promise.all([
    query<{id:string;title:string;kind:string;pageType:string|null;content:string;position:number;partId:string|null;partTitle:string|null;partPosition:number|null}>(`SELECT c."id",c."title",c."kind",c."pageType",c."content",c."position",c."partId",p."title" AS "partTitle",p."position" AS "partPosition" FROM "Chapter" c LEFT JOIN "Part" p ON p."id"=c."partId" WHERE c."novelId"=$1 AND c."id"=ANY($2::text[])`,[novelId,unique]),
    query<{id:string;position:number}>(`SELECT "id","position" FROM "Part" WHERE "novelId"=$1 ORDER BY "position"`,[novelId])
  ]);
  const ordered=manuscriptChapterOrder(chapters.rows,parts.rows);
  return {novel:novel.rows[0],options,chapters:ordered.map(c=>({id:c.id,title:c.title,kind:c.kind,pageType:c.pageType,position:c.position,partId:c.partId,partTitle:c.partTitle,partPosition:c.partPosition,contentHtml:cleanManuscriptHtml(c.content)}))};
}

import {query} from "@/lib/db";
import {hashManuscriptShareToken} from "@/lib/manuscript-share";
import {chapterNumberMap,manuscriptChapterOrder} from "@/lib/manuscript-order";
import {cleanManuscriptHtml} from "@/lib/manuscript-content";
import {pageTypeLabel} from "@/lib/manuscript-item";
import {getManuscriptLayoutBundle} from "@/lib/manuscript-layout-server";
import ManuscriptLayoutProvider from "../../workspace/ManuscriptLayoutProvider";

export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};

type ShareRow={id:string;novelId:string;scope:string;expiresAt:Date|null;revokedAt:Date|null;novelTitle:string;userId:string;username:string};
type PartRow={id:string;title:string;position:number};
type ChapterRow={id:string;partId:string|null;partTitle:string|null;title:string;kind:string;pageType:string|null;content:string;position:number};

function sharedHtml(html:string,token:string){
  const prefix=`/api/share/${encodeURIComponent(token)}/assets/`;
  return cleanManuscriptHtml(html).replace(/\/api\/assets\/([A-Za-z0-9_-]+)/g,`${prefix}$1`);
}
function Unavailable(){return <main className="shared-unavailable"><div><span>S</span><small>SÖGUR FORGE</small><h1>This shared manuscript is no longer available.</h1><p>The author may have revoked the link or its access period may have ended.</p></div></main>}

export default async function SharedManuscriptPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const share=(await query<ShareRow>(`
    SELECT s."id",s."novelId",s."scope",s."expiresAt",s."revokedAt",n."title" AS "novelTitle",n."userId",u."username"
    FROM "ManuscriptShare" s
    JOIN "Novel" n ON n."id"=s."novelId"
    JOIN "User" u ON u."id"=n."userId"
    WHERE s."tokenHash"=$1
  `,[hashManuscriptShareToken(token)])).rows[0];

  if(!share||share.revokedAt||(share.expiresAt&&share.expiresAt.getTime()<=Date.now()))return <Unavailable/>;

  const [partsResult,chaptersResult,selectionResult,layoutBundle]=await Promise.all([
    query<PartRow>(`SELECT "id","title","position" FROM "Part" WHERE "novelId"=$1 ORDER BY "position"`,[share.novelId]),
    query<ChapterRow>(`
      SELECT c."id",c."partId",p."title" AS "partTitle",c."title",c."kind",c."pageType",c."content",c."position"
      FROM "Chapter" c LEFT JOIN "Part" p ON p."id"=c."partId"
      WHERE c."novelId"=$1 ORDER BY c."position"
    `,[share.novelId]),
    share.scope==="SELECTED"?query<{chapterId:string}>(`SELECT "chapterId" FROM "ManuscriptShareChapter" WHERE "shareId"=$1`,[share.id]):Promise.resolve({rows:[]} as {rows:{chapterId:string}[]}),
    getManuscriptLayoutBundle(share.userId,share.novelId)
  ]);

  if(!layoutBundle)return <Unavailable/>;
  const parts=partsResult.rows,allOrdered=manuscriptChapterOrder(chaptersResult.rows,parts),numbers=chapterNumberMap(chaptersResult.rows,parts);
  const allowed=share.scope==="SELECTED"?new Set(selectionResult.rows.map(item=>item.chapterId)):null;
  const ordered=allowed?allOrdered.filter(item=>allowed.has(item.id)):allOrdered;

  await query(`UPDATE "ManuscriptShare" SET "lastViewedAt"=NOW(),"viewCount"="viewCount"+1,"updatedAt"=NOW() WHERE "id"=$1`,[share.id]);

  return <ManuscriptLayoutProvider novelId={share.novelId} initialLayout={layoutBundle.layout} initialDisplayMode="CONTINUOUS">
    <div className="shared-reader-shell">
      <header className="shared-reader-top"><div className="shared-reader-brand"><span>S</span><div><small>SÖGUR FORGE · SHARED DRAFT</small><strong>{share.novelTitle}</strong></div></div><div className="shared-reader-by"><span>Shared by {share.username}</span><b>Read only</b></div></header>
      <div className="shared-reader-layout">
        <aside className="shared-reader-nav"><div><small>MANUSCRIPT</small><strong>{ordered.length} shared item{ordered.length===1?"":"s"}</strong></div><nav>{ordered.map((item,index)=>{const previous=ordered[index-1];return <div key={item.id}>{item.partId&&item.partId!==previous?.partId&&<a className="shared-reader-part" href={`#part-${item.partId}`}>{item.partTitle}</a>}<a href={`#item-${item.id}`}><small>{item.kind==="PAGE"?pageTypeLabel(item.pageType):`Chapter ${numbers.get(item.id)??""}`}</small><span>{item.title}</span></a></div>})}</nav></aside>
        <main className="shared-reader-main"><div className="shared-reader-paper">
          {ordered.map((item,index)=>{const previous=ordered[index-1],number=numbers.get(item.id);return <div key={item.id}>
            {item.partId&&item.partId!==previous?.partId&&<section id={`part-${item.partId}`} className="shared-section-boundary"><small>SECTION</small><strong>{item.partTitle}</strong></section>}
            <article id={`item-${item.id}`} className="shared-reader-item"><header><small>{item.kind==="PAGE"?pageTypeLabel(item.pageType).toUpperCase():`CHAPTER ${String(number??"").padStart(2,"0")}`}</small><h2>{item.title}</h2></header><div className="rich-editor shared-reader-prose" dangerouslySetInnerHTML={{__html:sharedHtml(item.content,token)}}/></article>
          </div>})}
          {!ordered.length&&<div className="shared-reader-empty"><strong>No manuscript items are currently included in this share.</strong></div>}
        </div></main>
      </div>
      <footer className="shared-reader-footer">Private work-in-progress shared through Sögur Forge. Access is controlled by the author.</footer>
    </div>
  </ManuscriptLayoutProvider>;
}

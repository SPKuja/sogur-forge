import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import {chapterNumberMap,manuscriptChapterOrder} from "@/lib/manuscript-order";
import {cleanManuscriptHtml} from "@/lib/manuscript-content";
import {pageTypeLabel} from "@/lib/manuscript-item";
import ManuscriptLayoutProvider from "../../ManuscriptLayoutProvider";
import PageSetupButton from "../../PageSetupButton";
import ManuscriptPageSurface from "../../ManuscriptPageSurface";
import ManuscriptViewToggle from "../../ManuscriptViewToggle";
import {getManuscriptLayoutBundle} from "@/lib/manuscript-layout-server";

export const dynamic="force-dynamic";

type PartRow={id:string;title:string;position:number};
type ChapterRow={id:string;partId:string|null;partTitle:string|null;title:string;kind:string;pageType:string|null;content:string;position:number};
type SceneRow={id:string;chapterId:string;title:string;content:string;position:number};

export default async function FullManuscriptPage({params}:{params:Promise<{novelId:string}>}){
  const user=await currentUser();
  if(!user)redirect("/");
  const {novelId}=await params;
  const novel=(await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id])).rows[0];
  if(!novel)notFound();
  const layoutBundle=await getManuscriptLayoutBundle(user.id,novelId);
  if(!layoutBundle)notFound();

  const [partsResult,chaptersResult,scenesResult]=await Promise.all([
    query<PartRow>(`SELECT "id","title","position" FROM "Part" WHERE "novelId"=$1 ORDER BY "position"`,[novelId]),
    query<ChapterRow>(`SELECT c."id",c."partId",p."title" AS "partTitle",c."title",c."kind",c."pageType",c."content",c."position" FROM "Chapter" c LEFT JOIN "Part" p ON p."id"=c."partId" WHERE c."novelId"=$1 ORDER BY c."position"`,[novelId]),
    query<SceneRow>(`SELECT s."id",s."chapterId",s."title",s."content",s."position" FROM "Scene" s JOIN "Chapter" c ON c."id"=s."chapterId" WHERE c."novelId"=$1 ORDER BY s."chapterId",s."position",s."createdAt"`,[novelId])
  ]);

  const parts=partsResult.rows,ordered=manuscriptChapterOrder(chaptersResult.rows,parts),numbers=chapterNumberMap(chaptersResult.rows,parts);
  const scenesByChapter=new Map<string,SceneRow[]>();
  for(const scene of scenesResult.rows){const list=scenesByChapter.get(scene.chapterId)??[];list.push(scene);scenesByChapter.set(scene.chapterId,list)}

  return <ManuscriptLayoutProvider novelId={novelId} initialLayout={layoutBundle.layout} initialDisplayMode={layoutBundle.displayMode}><div className="full-manuscript-shell">
    <header className="full-manuscript-top">
      <Link href={`/workspace/${novelId}`}>← Back to editing</Link>
      <div><small>FULL MANUSCRIPT</small><strong>{novel.title}</strong></div>
      <div className="full-manuscript-modes" aria-label="Manuscript display mode"><ManuscriptViewToggle compact/><PageSetupButton className="full-page-setup" label="Setup"/></div>
    </header>
    <div className="full-manuscript-layout">
      <aside className="full-manuscript-nav">
        <div><small>MANUSCRIPT</small><strong>{ordered.length} items</strong></div>
        <nav>
          {ordered.map((item,index)=>{
            const previous=ordered[index-1],scenes=scenesByChapter.get(item.id)??[];
            return <div key={item.id} className="full-nav-item">
              {item.partId&&item.partId!==previous?.partId&&<a className="full-nav-section" href={`#part-${item.partId}`}>{item.partTitle}</a>}
              <a href={`#item-${item.id}`}><small>{item.kind==="PAGE"?pageTypeLabel(item.pageType):`Chapter ${numbers.get(item.id)??""}`}</small><span>{item.title}</span></a>
              {scenes.length>1&&<div className="full-nav-scenes">{scenes.map((scene,sceneIndex)=><a key={scene.id} href={`#scene-${scene.id}`}>Scene {sceneIndex+1}{scene.title?` · ${scene.title}`:""}</a>)}</div>}
            </div>
          })}
        </nav>
      </aside>
      <main className="full-manuscript-main">
        <ManuscriptPageSurface className="full-book-page-stage"><div className="full-manuscript-paper">
          {ordered.map((item,index)=>{
            const previous=ordered[index-1],scenes=scenesByChapter.get(item.id)??[],number=numbers.get(item.id),editorHref=`/workspace/${novelId}?chapter=${item.id}`;
            return <div key={item.id}>
              {item.partId&&item.partId!==previous?.partId&&<section id={`part-${item.partId}`} className="full-section-boundary"><small>SECTION</small><strong>{item.partTitle}</strong></section>}
              <div className="manuscript-item-start" data-sogur-page-block="true" data-sogur-item-start="true"/>
              <article id={`item-${item.id}`} className="full-manuscript-item">
                <header className="full-item-boundary"><div><small>{item.kind==="PAGE"?pageTypeLabel(item.pageType).toUpperCase():`CHAPTER ${String(number??"").padStart(2,"0")}`}</small><strong>{item.title}</strong></div><Link href={editorHref}>Edit here ↗</Link></header>
                {scenes.length?scenes.map((scene,sceneIndex)=><div id={`scene-${scene.id}`} className="full-manuscript-scene" key={scene.id}>{sceneIndex>0&&<div className="full-scene-break" data-sogur-page-block="true" aria-label="Scene break">* * *</div>}{scenes.length>1&&<div className="full-scene-label"><span>Scene {sceneIndex+1}{scene.title?` · ${scene.title}`:""}</span><Link href={`${editorHref}&scene=${scene.id}`}>Edit scene ↗</Link></div>}<div className="rich-editor full-manuscript-prose" data-sogur-page-container="true" dangerouslySetInnerHTML={{__html:cleanManuscriptHtml(scene.content)}}/></div>):<div className="rich-editor full-manuscript-prose" data-sogur-page-container="true" dangerouslySetInnerHTML={{__html:cleanManuscriptHtml(item.content)}}/>}
              </article>
            </div>
          })}
        </div></ManuscriptPageSurface>
      </main>
    </div>
  </div></ManuscriptLayoutProvider>;
}

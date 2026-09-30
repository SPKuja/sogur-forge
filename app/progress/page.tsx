import Link from "next/link";
import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import {countManuscriptWords,dayKey,getWritingPreferences,shiftDay,startOfMonth,startOfWeek} from "@/lib/writing-progress";

export const dynamic="force-dynamic";

type WritingRow={novelId:string;chapterId:string;chapterTitle:string;day:string;startWords:number;endWords:number};
type ActivityRow={kind:string;label:string;novelId:string;novelTitle:string;createdAt:Date};
type NovelRow={id:string;title:string;updatedAt:Date};
type ChapterContentRow={novelId:string;content:string};

function formatNumber(value:number){return value.toLocaleString("en-GB")}
function percent(value:number,target:number){return target>0?Math.max(0,Math.min(100,Math.round(value/target*100))):0}
function niceDay(day:string){return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(day+"T12:00:00Z"))}
function rangeLabel(start:string,endExclusive:string){return \`\${niceDay(start)} – \${niceDay(shiftDay(endExclusive,-1))}\`}

export default async function ProgressPage(){
  const user=await currentUser();if(!user)redirect("/");
  const preferences=await getWritingPreferences(user.id);
  const today=dayKey(new Date(),preferences.timezone),weekStart=startOfWeek(today,preferences.weekStartsOn),monthStart=startOfMonth(today),earliest=shiftDay(weekStart,-56);

  const [writing,novels,chapterContent,activity]=await Promise.all([
    query<WritingRow>(\`
      SELECT "novelId","chapterId","chapterTitle","day","startWords","endWords"
      FROM "WritingDay" WHERE "userId"=$1 AND "day">=$2 ORDER BY "day"
    \`,[user.id,earliest]),
    query<NovelRow>(\`SELECT "id","title","updatedAt" FROM "Novel" WHERE "userId"=$1 ORDER BY "updatedAt" DESC\`,[user.id]),
    query<ChapterContentRow>(\`
      SELECT c."novelId",c."content" FROM "Chapter" c
      JOIN "Novel" n ON n."id"=c."novelId" WHERE n."userId"=$1
    \`,[user.id]),
    query<ActivityRow>(\`
      SELECT 'CHARACTER' AS "kind",c."name" AS "label",c."novelId",n."title" AS "novelTitle",c."createdAt"
      FROM "Character" c JOIN "Novel" n ON n."id"=c."novelId" WHERE n."userId"=$1 AND c."createdAt">NOW()-INTERVAL '70 days'
      UNION ALL
      SELECT 'LOCATION',l."name",l."novelId",n."title",l."createdAt"
      FROM "Location" l JOIN "Novel" n ON n."id"=l."novelId" WHERE n."userId"=$1 AND l."createdAt">NOW()-INTERVAL '70 days'
      UNION ALL
      SELECT 'WORLD_NOTE',w."name",w."novelId",n."title",w."createdAt"
      FROM "WorldNote" w JOIN "Novel" n ON n."id"=w."novelId" WHERE n."userId"=$1 AND w."createdAt">NOW()-INTERVAL '70 days'
      UNION ALL
      SELECT 'IDEA',COALESCE(NULLIF(s."title",''),'Untitled idea'),s."novelId",n."title",s."createdAt"
      FROM "StickyNote" s JOIN "Novel" n ON n."id"=s."novelId" WHERE n."userId"=$1 AND s."kind"='IDEA' AND s."createdAt">NOW()-INTERVAL '70 days'
      UNION ALL
      SELECT CASE WHEN c."kind"='PAGE' THEN 'PAGE' ELSE 'CHAPTER' END,c."title",c."novelId",n."title",c."createdAt"
      FROM "Chapter" c JOIN "Novel" n ON n."id"=c."novelId" WHERE n."userId"=$1 AND c."createdAt">NOW()-INTERVAL '70 days'
    \`,[user.id])
  ]);

  const rows=writing.rows.map(row=>({...row,startWords:Number(row.startWords),endWords:Number(row.endWords)}));
  const activityRows=activity.rows.map(row=>({...row,day:dayKey(row.createdAt,preferences.timezone)}));
  const sumBetween=(start:string,endExclusive:string)=>rows.filter(row=>row.day>=start&&row.day<endExclusive).reduce((sum,row)=>sum+(row.endWords-row.startWords),0);
  const todayWords=sumBetween(today,shiftDay(today,1)),weekWords=sumBetween(weekStart,shiftDay(weekStart,7)),monthWords=sumBetween(monthStart,shiftDay(today,1));

  const writtenDays=new Set(rows.map(row=>row.day));
  let streak=0,cursor=writtenDays.has(today)?today:shiftDay(today,-1);
  while(writtenDays.has(cursor)){streak++;cursor=shiftDay(cursor,-1)}

  const currentTotals=new Map<string,number>();
  for(const chapter of chapterContent.rows)currentTotals.set(chapter.novelId,(currentTotals.get(chapter.novelId)||0)+countManuscriptWords(chapter.content));
  const totalWords=[...currentTotals.values()].reduce((a,b)=>a+b,0);

  function summary(start:string,endExclusive:string){
    const period=rows.filter(row=>row.day>=start&&row.day<endExclusive);
    const words=period.reduce((sum,row)=>sum+(row.endWords-row.startWords),0);
    const days=new Set(period.map(row=>row.day)).size;
    const chapters=new Map<string,{title:string;words:number}>();
    for(const row of period){const current=chapters.get(row.chapterId)||{title:row.chapterTitle,words:0};current.words+=row.endWords-row.startWords;chapters.set(row.chapterId,current)}
    const newItems=activityRows.filter(row=>row.day>=start&&row.day<endExclusive);
    const counts=(kind:string)=>newItems.filter(item=>item.kind===kind).length;
    return {
      start,endExclusive,words,days,chapterCount:chapters.size,chapters:[...chapters.values()].sort((a,b)=>Math.abs(b.words)-Math.abs(a.words)).slice(0,4),
      characters:counts("CHARACTER"),locations:counts("LOCATION"),worldNotes:counts("WORLD_NOTE"),ideas:counts("IDEA"),chaptersCreated:counts("CHAPTER"),pagesCreated:counts("PAGE")
    };
  }

  const currentWeek=summary(weekStart,shiftDay(weekStart,7));
  const roundups=Array.from({length:6},(_,index)=>{const start=shiftDay(weekStart,-7*(index+1));return summary(start,shiftDay(start,7))});

  return <main className="progress-shell">
    <header className="progress-top"><div><Link href="/workspace">← Library</Link><div><small>WRITING</small><strong>Progress</strong></div></div><div><Link href="/settings">Writing settings</Link></div></header>
    <section className="progress-main">
      <div className="progress-heading"><div><small>YOUR WRITING</small><h1>Keep the story moving</h1><p>Net manuscript words are tracked from the first writing session after progress tracking was introduced. Cuts count as cuts; Story Bible activity is included in weekly roundups.</p></div><div className="progress-total"><span>Across your library</span><strong>{formatNumber(totalWords)}</strong><small>current manuscript words</small></div></div>

      <div className="progress-target-grid">
        <article><small>TODAY</small><strong>{todayWords>=0?"+":""}{formatNumber(todayWords)}</strong><span>{preferences.dailyWordTarget>0?\`of \${formatNumber(preferences.dailyWordTarget)} words\`:"No daily target"}</span>{preferences.dailyWordTarget>0&&<i><b style={{width:\`\${percent(todayWords,preferences.dailyWordTarget)}%\`}}/></i>}</article>
        <article><small>THIS WEEK</small><strong>{weekWords>=0?"+":""}{formatNumber(weekWords)}</strong><span>{preferences.weeklyWordTarget>0?\`of \${formatNumber(preferences.weeklyWordTarget)} words\`:"No weekly target"}</span>{preferences.weeklyWordTarget>0&&<i><b style={{width:\`\${percent(weekWords,preferences.weeklyWordTarget)}%\`}}/></i>}</article>
        <article><small>THIS MONTH</small><strong>{monthWords>=0?"+":""}{formatNumber(monthWords)}</strong><span>{preferences.monthlyWordTarget>0?\`of \${formatNumber(preferences.monthlyWordTarget)} words\`:"No monthly target"}</span>{preferences.monthlyWordTarget>0&&<i><b style={{width:\`\${percent(monthWords,preferences.monthlyWordTarget)}%\`}}/></i>}</article>
        <article><small>WRITING RHYTHM</small><strong>{streak}</strong><span>day{streak===1?"":"s"} in your current streak</span><small className="progress-subtle">{currentWeek.days} writing day{currentWeek.days===1?"":"s"} this week</small></article>
      </div>

      <div className="progress-layout">
        <section className="progress-card current-roundup"><div className="progress-card-head"><div><small>THIS WEEK SO FAR</small><h2>{rangeLabel(currentWeek.start,currentWeek.endExclusive)}</h2></div><b>{currentWeek.words>=0?"+":""}{formatNumber(currentWeek.words)} words</b></div><div className="roundup-facts"><span><strong>{currentWeek.days}</strong> writing days</span><span><strong>{currentWeek.chapterCount}</strong> chapters worked</span><span><strong>{currentWeek.ideas}</strong> ideas captured</span><span><strong>{currentWeek.characters+currentWeek.locations+currentWeek.worldNotes}</strong> Bible entries added</span></div>{currentWeek.chapters.length?<div className="roundup-chapters">{currentWeek.chapters.map((chapter,index)=><div key={index}><strong>{chapter.title||"Untitled chapter"}</strong><span>{chapter.words>=0?"+":""}{formatNumber(chapter.words)} words</span></div>)}</div>:<p className="progress-empty">No tracked manuscript changes yet this week.</p>}</section>

        <section className="progress-card"><div className="progress-card-head"><div><small>MANUSCRIPTS</small><h2>Current word counts</h2></div><b>{novels.rows.length}</b></div><div className="progress-novels">{novels.rows.map(novel=><Link href={\`/workspace/\${novel.id}\`} key={novel.id}><div><strong>{novel.title}</strong><span>Edited {novel.updatedAt.toLocaleDateString("en-GB")}</span></div><b>{formatNumber(currentTotals.get(novel.id)||0)} words</b></Link>)}{!novels.rows.length&&<p className="progress-empty">No manuscripts yet.</p>}</div></section>
      </div>

      {preferences.weeklyRoundupEnabled&&<section className="progress-history"><div className="progress-history-head"><div><small>WEEKLY ROUNDUPS</small><h2>What you’ve been building</h2><p>Completed weeks are kept here as a simple writing record.</p></div></div><div className="roundup-grid">{roundups.map(roundup=><article key={roundup.start}><div><small>{rangeLabel(roundup.start,roundup.endExclusive)}</small><strong>{roundup.words>=0?"+":""}{formatNumber(roundup.words)} words</strong></div><p>{roundup.days} writing day{roundup.days===1?"":"s"} · {roundup.chapterCount} chapter{roundup.chapterCount===1?"":"s"} worked</p><div className="roundup-mini"><span>{roundup.ideas} idea{roundup.ideas===1?"":"s"}</span><span>{roundup.characters} character{roundup.characters===1?"":"s"}</span><span>{roundup.locations} location{roundup.locations===1?"":"s"}</span><span>{roundup.worldNotes} world note{roundup.worldNotes===1?"":"s"}</span>{(roundup.chaptersCreated+roundup.pagesCreated)>0&&<span>{roundup.chaptersCreated+roundup.pagesCreated} manuscript item{roundup.chaptersCreated+roundup.pagesCreated===1?"":"s"} created</span>}</div>{roundup.chapters.length>0&&<footer>{roundup.chapters.slice(0,2).map((chapter,index)=><span key={index}>{chapter.title}: {chapter.words>=0?"+":""}{formatNumber(chapter.words)}</span>)}</footer>}</article>)}</div></section>}
    </section>
  </main>;
}

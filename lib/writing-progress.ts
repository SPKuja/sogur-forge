import {randomUUID} from "node:crypto";
import {query} from "@/lib/db";

export type WritingPreferences={
  dailyWordTarget:number;
  weeklyWordTarget:number;
  monthlyWordTarget:number;
  showEditorGoal:boolean;
  weeklyRoundupEnabled:boolean;
  weekStartsOn:number;
  timezone:string;
};

export const DEFAULT_WRITING_PREFERENCES:WritingPreferences={
  dailyWordTarget:1000,
  weeklyWordTarget:5000,
  monthlyWordTarget:20000,
  showEditorGoal:true,
  weeklyRoundupEnabled:true,
  weekStartsOn:1,
  timezone:"Europe/London"
};

export function validTimeZone(value:string){
  try{new Intl.DateTimeFormat("en-GB",{timeZone:value}).format(new Date());return true}catch{return false}
}

export async function getWritingPreferences(userId:string):Promise<WritingPreferences>{
  const result=await query<WritingPreferences>(`
    SELECT "dailyWordTarget","weeklyWordTarget","monthlyWordTarget","showEditorGoal","weeklyRoundupEnabled","weekStartsOn","timezone"
    FROM "WritingPreference" WHERE "userId"=$1
  `,[userId]);
  const row=result.rows[0];
  if(!row)return DEFAULT_WRITING_PREFERENCES;
  return {
    dailyWordTarget:Number(row.dailyWordTarget),
    weeklyWordTarget:Number(row.weeklyWordTarget),
    monthlyWordTarget:Number(row.monthlyWordTarget),
    showEditorGoal:Boolean(row.showEditorGoal),
    weeklyRoundupEnabled:Boolean(row.weeklyRoundupEnabled),
    weekStartsOn:Math.max(0,Math.min(6,Number(row.weekStartsOn))),
    timezone:validTimeZone(row.timezone)?row.timezone:DEFAULT_WRITING_PREFERENCES.timezone
  };
}

function decodeEntities(value:string){
  return value
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&quot;|&#34;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)||32))
    .replace(/&#x([0-9a-f]+);/gi,(_,code)=>String.fromCodePoint(parseInt(code,16)||32));
}

export function manuscriptText(value:string){
  return decodeEntities(String(value||"")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?>/gi," ")
    .replace(/<\/p>|<\/div>|<\/li>|<\/blockquote>|<\/h[1-6]>/gi," ")
    .replace(/<[^>]+>/g," "))
    .replace(/\s+/g," ")
    .trim();
}

export function countManuscriptWords(value:string){
  const text=manuscriptText(value);
  return text?text.split(/\s+/u).filter(Boolean).length:0;
}

export function dayKey(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const get=(type:string)=>parts.find(part=>part.type===type)?.value||"";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function shiftDay(day:string,delta:number){
  const date=new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate()+delta);
  return date.toISOString().slice(0,10);
}

export function startOfWeek(day:string,weekStartsOn:number){
  const date=new Date(`${day}T12:00:00Z`);
  const offset=(date.getUTCDay()-weekStartsOn+7)%7;
  return shiftDay(day,-offset);
}

export function startOfMonth(day:string){return day.slice(0,7)+"-01"}

export async function recordWritingDay(input:{
  userId:string;
  novelId:string;
  chapterId:string;
  chapterTitle:string;
  beforeContent:string;
  afterContent:string;
}){
  if(input.beforeContent===input.afterContent)return;
  const preferences=await getWritingPreferences(input.userId);
  const day=dayKey(new Date(),preferences.timezone);
  const startWords=countManuscriptWords(input.beforeContent),endWords=countManuscriptWords(input.afterContent);
  await query(`
    INSERT INTO "WritingDay" ("id","userId","novelId","chapterId","chapterTitle","day","startWords","endWords","firstActivityAt","lastActivityAt")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
    ON CONFLICT ("userId","chapterId","day")
    DO UPDATE SET "chapterTitle"=EXCLUDED."chapterTitle","endWords"=EXCLUDED."endWords","lastActivityAt"=NOW()
  `,[randomUUID(),input.userId,input.novelId,input.chapterId,input.chapterTitle.slice(0,200),day,startWords,endWords]);
  const total=await query<{words:string}>(`SELECT COALESCE(SUM("endWords"-"startWords"),0)::text AS "words" FROM "WritingDay" WHERE "userId"=$1 AND "day"=$2`,[input.userId,day]);
  return {day,todayWords:Number(total.rows[0]?.words||0)};
}

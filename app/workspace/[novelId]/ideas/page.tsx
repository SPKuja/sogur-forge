import {randomUUID} from "node:crypto";
import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import IdeasWorkspace from "./IdeasWorkspace";
export const dynamic="force-dynamic";

type Board={id:string;title:string;position:number};
type IdeaRow={id:string;title:string;body:string;category:string;tags:string;status:string;chapterId:string|null;anchorId:string|null;anchorQuote:string|null;createdAt:Date;updatedAt:Date};
type Placement={id:string;ideaId:string;boardId:string;color:string;positionX:number;positionY:number;width:number;height:number};
type ImageRow={id:string;ideaId:string;assetId:string;caption:string;position:number};
type AudioRow={id:string;ideaId:string;originalName:string;mimeType:string;size:number;durationMs:number;createdAt:Date};
type LinkRow={ideaId:string;targetId:string};

export default async function Page({params,searchParams}:{params:Promise<{novelId:string}>;searchParams:Promise<{idea?:string}>}){
  const user=await currentUser();if(!user)redirect("/");
  const {novelId}=await params,{idea:requestedIdea}=await searchParams;
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);if(!novel.rows[0])notFound();
  let boards=await query<Board>(`SELECT "id","title","position" FROM "CorkBoard" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]);
  if(!boards.rows.length){const id=randomUUID();await query(`INSERT INTO "CorkBoard" ("id","novelId","title","position","createdAt","updatedAt") VALUES ($1,$2,'Main Board',0,NOW(),NOW())`,[id,novelId]);boards=await query<Board>(`SELECT "id","title","position" FROM "CorkBoard" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId])}
  const [ideas,placements,images,audio,chapters,characters,locations,worldNotes,characterLinks,locationLinks,worldNoteLinks]=await Promise.all([
    query<IdeaRow>(`SELECT "id","title","body","category","tags","status","chapterId","anchorId","anchorQuote","createdAt","updatedAt" FROM "StickyNote" WHERE "novelId"=$1 AND "kind"='IDEA' ORDER BY "updatedAt" DESC`,[novelId]),
    query<Placement>(`SELECT p."id",p."ideaId",p."boardId",p."color",p."positionX",p."positionY",p."width",p."height" FROM "IdeaBoardPlacement" p JOIN "StickyNote" s ON s."id"=p."ideaId" WHERE s."novelId"=$1 ORDER BY p."createdAt"`,[novelId]),
    query<ImageRow>(`SELECT ii."id",ii."ideaId",ii."assetId",ii."caption",ii."position" FROM "IdeaImage" ii JOIN "StickyNote" s ON s."id"=ii."ideaId" WHERE s."novelId"=$1 ORDER BY ii."position",ii."createdAt"`,[novelId]),
    query<AudioRow>(`SELECT ia."id",ia."ideaId",ia."originalName",ia."mimeType",ia."size",ia."durationMs",ia."createdAt" FROM "IdeaAudio" ia JOIN "StickyNote" s ON s."id"=ia."ideaId" WHERE s."novelId"=$1 ORDER BY ia."createdAt"`,[novelId]),
    query<{id:string;title:string;kind:string;pageType:string|null}>(`SELECT "id","title","kind","pageType" FROM "Chapter" WHERE "novelId"=$1 ORDER BY "position"`,[novelId]),
    query<{id:string;name:string;role:string}>(`SELECT "id","name","role" FROM "Character" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<{id:string;name:string;type:string;region:string}>(`SELECT "id","name","type","region" FROM "Location" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<{id:string;name:string;category:string}>(`SELECT "id","name","category" FROM "WorldNote" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<LinkRow>(`SELECT "ideaId","characterId" AS "targetId" FROM "IdeaCharacterLink" link JOIN "StickyNote" s ON s."id"=link."ideaId" WHERE s."novelId"=$1`,[novelId]),
    query<LinkRow>(`SELECT "ideaId","locationId" AS "targetId" FROM "IdeaLocationLink" link JOIN "StickyNote" s ON s."id"=link."ideaId" WHERE s."novelId"=$1`,[novelId]),
    query<LinkRow>(`SELECT "ideaId","worldNoteId" AS "targetId" FROM "IdeaWorldNoteLink" link JOIN "StickyNote" s ON s."id"=link."ideaId" WHERE s."novelId"=$1`,[novelId])
  ]);
  const entries=ideas.rows.map(idea=>({
    ...idea,
    createdAt:idea.createdAt.toISOString(),updatedAt:idea.updatedAt.toISOString(),
    images:images.rows.filter(image=>image.ideaId===idea.id).map(image=>({...image,url:`/api/assets/${image.assetId}`})),
    audio:audio.rows.filter(item=>item.ideaId===idea.id).map(item=>({...item,createdAt:item.createdAt.toISOString(),url:`/api/ideas/audio/${item.id}`})),
    characterIds:characterLinks.rows.filter(link=>link.ideaId===idea.id).map(link=>link.targetId),
    locationIds:locationLinks.rows.filter(link=>link.ideaId===idea.id).map(link=>link.targetId),
    worldNoteIds:worldNoteLinks.rows.filter(link=>link.ideaId===idea.id).map(link=>link.targetId)
  }));
  const initialIdeaId=requestedIdea&&entries.some(idea=>idea.id===requestedIdea)?requestedIdea:undefined;
  return <IdeasWorkspace username={user.username} novel={novel.rows[0]} initialBoards={boards.rows} initialIdeas={entries} initialPlacements={placements.rows} chapters={chapters.rows} characters={characters.rows} locations={locations.rows} worldNotes={worldNotes.rows} initialIdeaId={initialIdeaId}/>;
}

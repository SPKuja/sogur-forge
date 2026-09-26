import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import WorldNotesBible from "./WorldNotesBible";
export const dynamic="force-dynamic";

type NoteRow={id:string;name:string;aliases:string;category:string;summary:string;details:string;significance:string;notes:string;position:number};
type ImageRow={id:string;worldNoteId:string;assetId:string;caption:string;position:number};
type CharacterRow={id:string;name:string;role:string};
type PortraitRow={characterId:string;assetId:string};
type LocationRow={id:string;name:string;type:string;region:string};
type LocationImageRow={locationId:string;assetId:string};
type CharacterLink={id:string;worldNoteId:string;characterId:string;label:string;notes:string};
type LocationLink={id:string;worldNoteId:string;locationId:string;label:string;notes:string};
type Relation={id:string;sourceId:string;targetId:string;label:string;notes:string};

export default async function Page({params}:{params:Promise<{novelId:string}>}){
  const user=await currentUser();if(!user)redirect("/");
  const {novelId}=await params;
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);if(!novel.rows[0])notFound();
  const [notes,images,characters,portraits,locations,locationImages,characterLinks,locationLinks,relations]=await Promise.all([
    query<NoteRow>(`SELECT "id","name","aliases","category","summary","details","significance","notes","position" FROM "WorldNote" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<ImageRow>(`SELECT wi."id",wi."worldNoteId",wi."assetId",wi."caption",wi."position" FROM "WorldNoteImage" wi JOIN "WorldNote" w ON w."id"=wi."worldNoteId" WHERE w."novelId"=$1 ORDER BY wi."position",wi."createdAt"`,[novelId]),
    query<CharacterRow>(`SELECT "id","name","role" FROM "Character" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<PortraitRow>(`SELECT DISTINCT ON (ci."characterId") ci."characterId",ci."assetId" FROM "CharacterImage" ci JOIN "Character" c ON c."id"=ci."characterId" WHERE c."novelId"=$1 ORDER BY ci."characterId",ci."position",ci."createdAt"`,[novelId]),
    query<LocationRow>(`SELECT "id","name","type","region" FROM "Location" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<LocationImageRow>(`SELECT DISTINCT ON (li."locationId") li."locationId",li."assetId" FROM "LocationImage" li JOIN "Location" l ON l."id"=li."locationId" WHERE l."novelId"=$1 ORDER BY li."locationId",li."position",li."createdAt"`,[novelId]),
    query<CharacterLink>(`SELECT link."id",link."worldNoteId",link."characterId",link."label",link."notes" FROM "WorldNoteCharacterLink" link JOIN "WorldNote" w ON w."id"=link."worldNoteId" WHERE w."novelId"=$1 ORDER BY link."createdAt"`,[novelId]),
    query<LocationLink>(`SELECT link."id",link."worldNoteId",link."locationId",link."label",link."notes" FROM "WorldNoteLocationLink" link JOIN "WorldNote" w ON w."id"=link."worldNoteId" WHERE w."novelId"=$1 ORDER BY link."createdAt"`,[novelId]),
    query<Relation>(`SELECT r."id",r."sourceId",r."targetId",r."label",r."notes" FROM "WorldNoteRelation" r JOIN "WorldNote" w ON w."id"=r."sourceId" WHERE w."novelId"=$1 ORDER BY r."createdAt"`,[novelId])
  ]);
  const portraitByCharacter=new Map(portraits.rows.map(row=>[row.characterId,row.assetId])),imageByLocation=new Map(locationImages.rows.map(row=>[row.locationId,row.assetId]));
  const entries=notes.rows.map(note=>({...note,images:images.rows.filter(image=>image.worldNoteId===note.id).map(image=>({...image,url:`/api/assets/${image.assetId}`}))}));
  const cast=characters.rows.map(character=>({...character,portraitUrl:portraitByCharacter.get(character.id)?`/api/assets/${portraitByCharacter.get(character.id)}`:null}));
  const places=locations.rows.map(location=>({...location,imageUrl:imageByLocation.get(location.id)?`/api/assets/${imageByLocation.get(location.id)}`:null}));
  return <WorldNotesBible username={user.username} novel={novel.rows[0]} initialNotes={entries} characters={cast} locations={places} initialCharacterLinks={characterLinks.rows} initialLocationLinks={locationLinks.rows} initialRelations={relations.rows}/>;
}

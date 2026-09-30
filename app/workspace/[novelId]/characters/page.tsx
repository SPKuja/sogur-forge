import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import CharacterBible from "./CharacterBible";
export const dynamic="force-dynamic";

type CharacterRow={id:string;name:string;aliases:string;role:string;pronouns:string;age:string;description:string;appearance:string;personality:string;background:string;goals:string;conflict:string;arc:string;notes:string;position:number};
type ImageRow={id:string;characterId:string;assetId:string;caption:string;position:number};
type RelationshipRow={id:string;sourceId:string;targetId:string;type:string;label:string;notes:string};
type LocationConnectionRow={id:string;characterId:string;locationId:string;type:string;notes:string;name:string;locationType:string;region:string;imageAssetId:string|null};
type WorldNoteConnectionRow={id:string;characterId:string;worldNoteId:string;label:string;notes:string;name:string;category:string;imageAssetId:string|null};

export default async function Page({params,searchParams}:{params:Promise<{novelId:string}>;searchParams:Promise<{character?:string}>}){
  const user=await currentUser();if(!user)redirect("/");
  const {novelId}=await params,{character:requestedCharacter}=await searchParams;
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);
  if(!novel.rows[0])notFound();
  const [characters,images,relationships,locationConnections,worldNoteConnections]=await Promise.all([
    query<CharacterRow>(`SELECT "id","name","aliases","role","pronouns","age","description","appearance","personality","background","goals","conflict","arc","notes","position" FROM "Character" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<ImageRow>(`SELECT ci."id",ci."characterId",ci."assetId",ci."caption",ci."position" FROM "CharacterImage" ci JOIN "Character" c ON c."id"=ci."characterId" WHERE c."novelId"=$1 ORDER BY ci."position",ci."createdAt"`,[novelId]),
    query<RelationshipRow>(`SELECT "id","sourceId","targetId","type","label","notes" FROM "CharacterRelationship" WHERE "novelId"=$1 ORDER BY "createdAt"`,[novelId]),
    query<LocationConnectionRow>(`SELECT link."id",link."characterId",link."locationId",link."type",link."notes",l."name",l."type" AS "locationType",l."region",
      (SELECT li."assetId" FROM "LocationImage" li WHERE li."locationId"=l."id" ORDER BY li."position",li."createdAt" LIMIT 1) AS "imageAssetId"
      FROM "LocationCharacterLink" link JOIN "Location" l ON l."id"=link."locationId"
      WHERE l."novelId"=$1 ORDER BY link."createdAt"`,[novelId]),
    query<WorldNoteConnectionRow>(`SELECT link."id",link."characterId",link."worldNoteId",link."label",link."notes",w."name",w."category",
      (SELECT wi."assetId" FROM "WorldNoteImage" wi WHERE wi."worldNoteId"=w."id" ORDER BY wi."position",wi."createdAt" LIMIT 1) AS "imageAssetId"
      FROM "WorldNoteCharacterLink" link JOIN "WorldNote" w ON w."id"=link."worldNoteId"
      WHERE w."novelId"=$1 ORDER BY link."createdAt"`,[novelId])
  ]);
  const cast=characters.rows.map(character=>({...character,images:images.rows.filter(image=>image.characterId===character.id).map(image=>({...image,url:`/api/assets/${image.assetId}`}))}));
  const initialActiveId=requestedCharacter&&characters.rows.some(character=>character.id===requestedCharacter)?requestedCharacter:undefined;
  return <CharacterBible
    username={user.username}
    novel={novel.rows[0]}
    initialCharacters={cast}
    initialRelationships={relationships.rows}
    initialActiveId={initialActiveId}
    locationConnections={locationConnections.rows.map(item=>({...item,imageUrl:item.imageAssetId?`/api/assets/${item.imageAssetId}`:null}))}
    worldNoteConnections={worldNoteConnections.rows.map(item=>({...item,imageUrl:item.imageAssetId?`/api/assets/${item.imageAssetId}`:null}))}
  />;
}

import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import LocationBible from "./LocationBible";
export const dynamic="force-dynamic";

type LocationRow={id:string;parentId:string|null;name:string;aliases:string;type:string;region:string;description:string;atmosphere:string;history:string;significance:string;notes:string;position:number};
type ImageRow={id:string;locationId:string;assetId:string;caption:string;position:number};
type CharacterRow={id:string;name:string;role:string};
type PortraitRow={characterId:string;assetId:string};
type LinkRow={id:string;locationId:string;characterId:string;type:string;notes:string};
type WorldNoteConnectionRow={id:string;locationId:string;worldNoteId:string;label:string;notes:string;name:string;category:string;imageAssetId:string|null};

export default async function Page({params,searchParams}:{params:Promise<{novelId:string}>;searchParams:Promise<{location?:string}>}){
  const user=await currentUser();if(!user)redirect("/");
  const {novelId}=await params,{location:requestedLocation}=await searchParams;
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);
  if(!novel.rows[0])notFound();
  const [locations,images,characters,portraits,links,worldNoteConnections]=await Promise.all([
    query<LocationRow>(`SELECT "id","parentId","name","aliases","type","region","description","atmosphere","history","significance","notes","position" FROM "Location" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<ImageRow>(`SELECT li."id",li."locationId",li."assetId",li."caption",li."position" FROM "LocationImage" li JOIN "Location" l ON l."id"=li."locationId" WHERE l."novelId"=$1 ORDER BY li."position",li."createdAt"`,[novelId]),
    query<CharacterRow>(`SELECT "id","name","role" FROM "Character" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<PortraitRow>(`SELECT DISTINCT ON (ci."characterId") ci."characterId",ci."assetId" FROM "CharacterImage" ci JOIN "Character" c ON c."id"=ci."characterId" WHERE c."novelId"=$1 ORDER BY ci."characterId",ci."position",ci."createdAt"`,[novelId]),
    query<LinkRow>(`SELECT link."id",link."locationId",link."characterId",link."type",link."notes" FROM "LocationCharacterLink" link JOIN "Location" l ON l."id"=link."locationId" WHERE l."novelId"=$1 ORDER BY link."createdAt"`,[novelId]),
    query<WorldNoteConnectionRow>(`SELECT link."id",link."locationId",link."worldNoteId",link."label",link."notes",w."name",w."category",
      (SELECT wi."assetId" FROM "WorldNoteImage" wi WHERE wi."worldNoteId"=w."id" ORDER BY wi."position",wi."createdAt" LIMIT 1) AS "imageAssetId"
      FROM "WorldNoteLocationLink" link JOIN "WorldNote" w ON w."id"=link."worldNoteId"
      WHERE w."novelId"=$1 ORDER BY link."createdAt"`,[novelId])
  ]);
  const portraitByCharacter=new Map(portraits.rows.map(row=>[row.characterId,row.assetId]));
  const places=locations.rows.map(place=>({...place,images:images.rows.filter(image=>image.locationId===place.id).map(image=>({...image,url:`/api/assets/${image.assetId}`}))}));
  const cast=characters.rows.map(character=>({...character,portraitUrl:portraitByCharacter.get(character.id)?`/api/assets/${portraitByCharacter.get(character.id)}`:null}));
  const initialActiveId=locations.rows.some(location=>location.id===requestedLocation)?requestedLocation:locations.rows[0]?.id;
  return <LocationBible username={user.username} novel={novel.rows[0]} initialLocations={places} characters={cast} initialCharacterLinks={links.rows} initialActiveId={initialActiveId} worldNoteConnections={worldNoteConnections.rows.map(item=>({...item,imageUrl:item.imageAssetId?`/api/assets/${item.imageAssetId}`:null}))}/>;
}

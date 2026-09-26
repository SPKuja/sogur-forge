import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import type {StoryReference} from "@/lib/story-reference";

type CharacterRow={id:string;name:string;aliases:string;role:string;pronouns:string;age:string;description:string};
type PortraitRow={characterId:string;assetId:string};
type LocationRow={id:string;name:string;aliases:string;type:string;region:string;description:string};
type LocationImageRow={locationId:string;assetId:string};
type WorldNoteRow={id:string;name:string;aliases:string;category:string;summary:string;details:string};
type WorldNoteImageRow={worldNoteId:string;assetId:string};

function aliases(value:string){
  return [...new Set(value.split(/[,;\n|]+/).map(item=>item.trim()).filter(Boolean))];
}

export async function GET(request:NextRequest){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const novelId=String(request.nextUrl.searchParams.get("novelId")||"");
  const novel=await query(`SELECT "id" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);
  if(!novel.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const [characters,portraits,locations,locationImages,worldNotes,worldNoteImages]=await Promise.all([
    query<CharacterRow>(`SELECT "id","name","aliases","role","pronouns","age","description" FROM "Character" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<PortraitRow>(`SELECT DISTINCT ON (ci."characterId") ci."characterId",ci."assetId" FROM "CharacterImage" ci JOIN "Character" c ON c."id"=ci."characterId" WHERE c."novelId"=$1 ORDER BY ci."characterId",ci."position",ci."createdAt"`,[novelId]),
    query<LocationRow>(`SELECT "id","name","aliases","type","region","description" FROM "Location" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<LocationImageRow>(`SELECT DISTINCT ON (li."locationId") li."locationId",li."assetId" FROM "LocationImage" li JOIN "Location" l ON l."id"=li."locationId" WHERE l."novelId"=$1 ORDER BY li."locationId",li."position",li."createdAt"`,[novelId]),
    query<WorldNoteRow>(`SELECT "id","name","aliases","category","summary","details" FROM "WorldNote" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<WorldNoteImageRow>(`SELECT DISTINCT ON (wi."worldNoteId") wi."worldNoteId",wi."assetId" FROM "WorldNoteImage" wi JOIN "WorldNote" w ON w."id"=wi."worldNoteId" WHERE w."novelId"=$1 ORDER BY wi."worldNoteId",wi."position",wi."createdAt"`,[novelId])
  ]);
  const portraitByCharacter=new Map(portraits.rows.map(row=>[row.characterId,row.assetId]));
  const imageByLocation=new Map(locationImages.rows.map(row=>[row.locationId,row.assetId]));
  const imageByWorldNote=new Map(worldNoteImages.rows.map(row=>[row.worldNoteId,row.assetId]));
  const characterReferences:StoryReference[]=characters.rows.filter(character=>character.name.trim()).map(character=>{
    const assetId=portraitByCharacter.get(character.id);
    return {id:character.id,kind:"CHARACTER",name:character.name.trim(),aliases:aliases(character.aliases),role:character.role,pronouns:character.pronouns,age:character.age,description:character.description,portraitUrl:assetId?`/api/assets/${assetId}`:null};
  });
  const locationReferences:StoryReference[]=locations.rows.filter(location=>location.name.trim()).map(location=>{
    const assetId=imageByLocation.get(location.id),role=[location.type,location.region].filter(Boolean).join(" · ");
    return {id:location.id,kind:"LOCATION",name:location.name.trim(),aliases:aliases(location.aliases),role,pronouns:"",age:"",description:location.description,portraitUrl:assetId?`/api/assets/${assetId}`:null};
  });
  const worldNoteReferences:StoryReference[]=worldNotes.rows.filter(note=>note.name.trim()).map(note=>{
    const assetId=imageByWorldNote.get(note.id);
    return {id:note.id,kind:"WORLD_NOTE",name:note.name.trim(),aliases:aliases(note.aliases),role:note.category,pronouns:"",age:"",description:note.summary||note.details,portraitUrl:assetId?`/api/assets/${assetId}`:null};
  });
  return NextResponse.json({references:[...characterReferences,...locationReferences,...worldNoteReferences]});
}

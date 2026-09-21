import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import type {StoryReference} from "@/lib/story-reference";

type CharacterRow={id:string;name:string;aliases:string;role:string;pronouns:string;age:string;description:string};
type PortraitRow={characterId:string;assetId:string};

function aliases(value:string){
  return [...new Set(value.split(/[,;\n|]+/).map(item=>item.trim()).filter(Boolean))];
}

export async function GET(request:NextRequest){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const novelId=String(request.nextUrl.searchParams.get("novelId")||"");
  const novel=await query(`SELECT "id" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);
  if(!novel.rows[0])return NextResponse.json({error:"Not found"},{status:404});
  const [characters,portraits]=await Promise.all([
    query<CharacterRow>(`SELECT "id","name","aliases","role","pronouns","age","description" FROM "Character" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<PortraitRow>(`SELECT DISTINCT ON (ci."characterId") ci."characterId",ci."assetId" FROM "CharacterImage" ci JOIN "Character" c ON c."id"=ci."characterId" WHERE c."novelId"=$1 ORDER BY ci."characterId",ci."position",ci."createdAt"`,[novelId])
  ]);
  const portraitByCharacter=new Map(portraits.rows.map(row=>[row.characterId,row.assetId]));
  const references:StoryReference[]=characters.rows.filter(character=>character.name.trim()).map(character=>{
    const assetId=portraitByCharacter.get(character.id);
    return {id:character.id,kind:"CHARACTER",name:character.name.trim(),aliases:aliases(character.aliases),role:character.role,pronouns:character.pronouns,age:character.age,description:character.description,portraitUrl:assetId?`/api/assets/${assetId}`:null};
  });
  return NextResponse.json({references});
}

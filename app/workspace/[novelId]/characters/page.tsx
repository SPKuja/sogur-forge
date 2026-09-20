import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import CharacterBible from "./CharacterBible";
export const dynamic="force-dynamic";

type CharacterRow={id:string;name:string;aliases:string;role:string;pronouns:string;age:string;description:string;appearance:string;personality:string;background:string;goals:string;conflict:string;arc:string;notes:string;position:number};
type ImageRow={id:string;characterId:string;assetId:string;caption:string;position:number};

export default async function Page({params}:{params:Promise<{novelId:string}>}){
  const user=await currentUser();
  if(!user)redirect("/");
  const {novelId}=await params;
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);
  if(!novel.rows[0])notFound();
  const [characters,images]=await Promise.all([
    query<CharacterRow>(`SELECT "id","name","aliases","role","pronouns","age","description","appearance","personality","background","goals","conflict","arc","notes","position" FROM "Character" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]),
    query<ImageRow>(`SELECT ci."id",ci."characterId",ci."assetId",ci."caption",ci."position" FROM "CharacterImage" ci JOIN "Character" c ON c."id"=ci."characterId" WHERE c."novelId"=$1 ORDER BY ci."position",ci."createdAt"`,[novelId])
  ]);
  const cast=characters.rows.map(character=>({...character,images:images.rows.filter(image=>image.characterId===character.id).map(image=>({...image,url:`/api/assets/${image.assetId}`}))}));
  return <CharacterBible username={user.username} novel={novel.rows[0]} initialCharacters={cast}/>;
}

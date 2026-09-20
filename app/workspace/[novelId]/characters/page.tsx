import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import CharacterBible from "./CharacterBible";
export const dynamic="force-dynamic";

export default async function Page({params}:{params:Promise<{novelId:string}>}){
  const user=await currentUser();
  if(!user)redirect("/");
  const {novelId}=await params;
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);
  if(!novel.rows[0])notFound();
  const characters=await query<{id:string;name:string;aliases:string;role:string;pronouns:string;age:string;description:string;appearance:string;personality:string;background:string;goals:string;conflict:string;arc:string;notes:string;position:number}>(`SELECT "id","name","aliases","role","pronouns","age","description","appearance","personality","background","goals","conflict","arc","notes","position" FROM "Character" WHERE "novelId"=$1 ORDER BY "position","createdAt"`,[novelId]);
  return <CharacterBible username={user.username} novel={novel.rows[0]} initialCharacters={characters.rows}/>;
}

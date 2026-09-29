import {notFound,redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import AssetLibrary from "./AssetLibrary";
export const dynamic="force-dynamic";

export default async function Page({params}:{params:Promise<{novelId:string}>}){
  const user=await currentUser();if(!user)redirect("/");
  const {novelId}=await params;
  const novel=await query<{id:string;title:string}>(`SELECT "id","title" FROM "Novel" WHERE "id"=$1 AND "userId"=$2`,[novelId,user.id]);
  if(!novel.rows[0])notFound();
  return <AssetLibrary username={user.username} novel={novel.rows[0]}/>;
}

import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import SettingsClient from "./SettingsClient";
import {getSiteSettings} from "@/lib/site-settings";
import {backupProviderAvailability} from "@/lib/backup-providers";
export const dynamic="force-dynamic";

export default async function SettingsPage(){
  const user=await currentUser();if(!user)redirect("/");
  const [profileResult,siteSettings]=await Promise.all([query<{username:string;email:string;role:string;emailVerifiedAt:Date|null;createdAt:Date}>(`SELECT "username","email","role","emailVerifiedAt","createdAt" FROM "User" WHERE "id"=$1`,[user.id]),getSiteSettings()]);
  const profile=profileResult.rows[0],backupMethods=backupProviderAvailability(siteSettings);
  return <SettingsClient profile={{...profile,emailVerifiedAt:profile.emailVerifiedAt?.toISOString()??null,createdAt:profile.createdAt.toISOString()}} backupMethods={backupMethods}/>;
}

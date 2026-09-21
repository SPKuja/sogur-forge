import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import SettingsClient from "./SettingsClient";
import {getSiteSettings} from "@/lib/site-settings";
import {backupProviderAvailability} from "@/lib/backup-providers";
import {getUserBackupDestinations} from "@/lib/user-backups";
export const dynamic="force-dynamic";
export default async function SettingsPage({searchParams}:{searchParams:Promise<{backupConnected?:string;backupError?:string}>}){const user=await currentUser();if(!user)redirect("/");const [profileResult,siteSettings,destinations]=await Promise.all([query<{username:string;email:string;role:string;emailVerifiedAt:Date|null;createdAt:Date}>(`SELECT "username","email","role","emailVerifiedAt","createdAt" FROM "User" WHERE "id"=$1`,[user.id]),getSiteSettings(),getUserBackupDestinations(user.id)]);const profile=profileResult.rows[0],params=await searchParams;return <SettingsClient cloudNotice={{connected:params.backupConnected||"",error:params.backupError||""}} profile={{...profile,emailVerifiedAt:profile.emailVerifiedAt?.toISOString()??null,createdAt:profile.createdAt.toISOString()}} backupMethods={backupProviderAvailability(siteSettings)} initialDestinations={destinations}/>}

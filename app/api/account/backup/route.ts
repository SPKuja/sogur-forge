import {currentUser} from "@/lib/auth/session";
import {accountArchive} from "@/lib/account-archive";
import {getSiteSettings} from "@/lib/site-settings";
export const dynamic="force-dynamic";
export async function GET(){const user=await currentUser();if(!user)return new Response("Unauthorized",{status:401});const settings=await getSiteSettings();if(!settings.backupDownloadEnabled)return new Response("Download backups are disabled by the administrator.",{status:403});return accountArchive(user.id,"backup")}

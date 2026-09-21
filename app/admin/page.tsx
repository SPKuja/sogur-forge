import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import {getSiteSettings} from "@/lib/site-settings";
import {emailConfigured} from "@/lib/email";
import {backupProviderConfiguration} from "@/lib/backup-providers";
import AdminPanel from "./AdminPanel";
export const dynamic="force-dynamic";

export default async function AdminPage(){
  const user=await currentUser();if(!user)redirect("/");if(user.role!=="ADMIN")redirect("/workspace");
  const [settings,users]=await Promise.all([
    getSiteSettings(),
    query<{id:string;username:string;email:string;role:string;emailVerifiedAt:Date|null;createdAt:Date}>(`SELECT "id","username","email","role","emailVerifiedAt","createdAt" FROM "User" ORDER BY "createdAt","username"`)
  ]);
  return <AdminPanel currentUserId={user.id} initialSettings={{...settings,smtpConfigured:emailConfigured(),backupConfigured:backupProviderConfiguration()}} initialUsers={users.rows.map(item=>({...item,emailVerifiedAt:item.emailVerifiedAt?.toISOString()??null,createdAt:item.createdAt.toISOString()}))}/>;
}

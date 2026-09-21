import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import {getSiteSettings} from "@/lib/site-settings";
import {getEmailAdminView} from "@/lib/email";
import AdminPanel from "./AdminPanel";
import {getCloudProviderAdminViews} from "@/lib/cloud-provider-settings";
export const dynamic="force-dynamic";
export default async function AdminPage(){const user=await currentUser();if(!user)redirect("/");if(user.role!=="ADMIN")redirect("/workspace");const [settings,emailSettings,users]=await Promise.all([getSiteSettings(),getEmailAdminView(),query<{id:string;username:string;email:string;role:string;emailVerifiedAt:Date|null;createdAt:Date}>(`SELECT "id","username","email","role","emailVerifiedAt","createdAt" FROM "User" ORDER BY "createdAt","username"`)]);const cloudProviders=await getCloudProviderAdminViews(emailSettings.appBaseUrl);return <AdminPanel currentUserId={user.id} initialSettings={settings} initialEmail={emailSettings} initialCloudProviders={cloudProviders} initialUsers={users.rows.map(item=>({...item,emailVerifiedAt:item.emailVerifiedAt?.toISOString()??null,createdAt:item.createdAt.toISOString()}))}/>}

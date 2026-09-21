import {redirect} from "next/navigation";
import AuthForm from "./auth-form";
import {currentUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import {getSiteSettings} from "@/lib/site-settings";

export const dynamic="force-dynamic";

export default async function Home({searchParams}:{searchParams:Promise<{verified?:string}>}){
  const user=await currentUser();
  if(user)redirect("/workspace");
  const [settings,count]=await Promise.all([getSiteSettings(),query<{count:string}>(`SELECT COUNT(*)::text AS count FROM "User"`)]);
  const bootstrap=Number(count.rows[0]?.count||0)===0;
  const params=await searchParams;
  return <main className="auth-shell"><AuthForm registrationEnabled={settings.registrationsEnabled||bootstrap} bootstrap={bootstrap} verificationRequired={settings.emailVerificationRequired&&!bootstrap} verified={params.verified||""}/></main>;
}

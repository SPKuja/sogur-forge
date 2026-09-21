"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";

export default function ResetPasswordClient({token}:{token:string}){
  const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError("");
    const f=new FormData(e.currentTarget),r=await fetch("/api/auth/reset-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password:f.get("password")})}),d=await r.json();
    if(r.ok)setDone(true);else setError(d.error||"Password could not be reset.");
    setBusy(false);
  }
  return <main className="auth-shell"><div className="auth-card"><div className="auth-brand"><span>S</span><div><strong>Sögur Forge</strong><small>Choose a new password</small></div></div>{done?<><p className="auth-notice">Password changed. You can sign in now.</p><button className="auth-submit" onClick={()=>router.push("/")}>Return to sign in</button></>:<form onSubmit={submit}><label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} required/></label><p className="auth-hint">Use at least 12 characters.</p>{!token&&<p className="auth-error">This reset link is missing its token.</p>}{error&&<p className="auth-error">{error}</p>}<button className="auth-submit" disabled={busy||!token}>{busy?"Changing…":"Reset password"}</button></form>}</div></main>;
}

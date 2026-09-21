"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";

export default function AuthForm({registrationEnabled,bootstrap,verificationRequired,verified}:{registrationEnabled:boolean;bootstrap:boolean;verificationRequired:boolean;verified:string}){
  const router=useRouter(),[mode,setMode]=useState<"login"|"register">(bootstrap?"register":"login"),[error,setError]=useState(""),[notice,setNotice]=useState(verified==="1"?"Email verified. You can sign in now.":verified==="invalid"?"That verification link is invalid or has expired.":""),[busy,setBusy]=useState(false),[verificationLogin,setVerificationLogin]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setNotice("");setBusy(true);
    const data=new FormData(event.currentTarget),login=String(data.get("login")||data.get("email")||data.get("username")||"");
    const payload=mode==="login"?{login:data.get("login"),password:data.get("password")}:{username:data.get("username"),email:data.get("email"),password:data.get("password")};
    try{
      const response=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),result=await response.json();
      if(!response.ok){setError(result.error??"Something went wrong.");if(result.code==="EMAIL_UNVERIFIED")setVerificationLogin(login);return}
      if(result.verificationRequired){setNotice("Account created. Check your email for a verification link before signing in.");setVerificationLogin(String(payload.email||""));setMode("login");return}
      router.push("/workspace");router.refresh();
    }catch{setError("Sögur Forge could not reach the server.")}finally{setBusy(false)}
  }
  async function resend(){
    if(!verificationLogin)return;setBusy(true);setError("");
    try{const r=await fetch("/api/auth/resend-verification",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login:verificationLogin})}),data=await r.json();if(!r.ok)setError(data.error||"Verification email could not be sent.");else setNotice(data.message||"Verification email sent.")}finally{setBusy(false)}
  }
  return <div className="auth-card">
    <div className="auth-brand"><span>S</span><div><strong>Sögur Forge</strong><small>Your stories. Forged here.</small></div></div>
    {registrationEnabled?<div className="auth-tabs"><button type="button" className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("");setNotice("")}}>Sign in</button><button type="button" className={mode==="register"?"active":""} onClick={()=>{setMode("register");setError("");setNotice("")}}>{bootstrap?"Create admin":"Create account"}</button></div>:<div className="auth-registration-closed">New registrations are currently closed.</div>}
    <form onSubmit={submit}>
      {mode==="register"&&registrationEnabled&&<><label>Username<input name="username" autoComplete="username" required minLength={3} maxLength={32}/></label><label>Email<input name="email" type="email" autoComplete="email" required/></label></>}
      {mode==="login"&&<label>Username or email<input name="login" autoComplete="username" required onChange={e=>setVerificationLogin(e.target.value)}/></label>}
      <label>Password<input name="password" type="password" autoComplete={mode==="login"?"current-password":"new-password"} required minLength={12}/></label>
      {mode==="register"&&<p className="auth-hint">{bootstrap?"The first account becomes the administrator and is trusted immediately.":verificationRequired?"Use at least 12 characters. We will email you a verification link.":"Use at least 12 characters."}</p>}
      {notice&&<p className={verified==="invalid"&&!notice.startsWith("Account")?"auth-error":"auth-notice"}>{notice}</p>}
      {error&&<p className="auth-error" role="alert">{error}</p>}
      {mode==="login"&&verificationLogin&&error.includes("Verify your email")&&<button type="button" className="auth-secondary" disabled={busy} onClick={resend}>Resend verification email</button>}
      <button className="auth-submit" disabled={busy||(!registrationEnabled&&mode==="register")}>{busy?"Please wait…":mode==="login"?"Sign in":bootstrap?"Create administrator":"Create account"}</button>
    </form>
    <p className="auth-foot">Private by design. Your manuscript stays tied to your account.</p>
  </div>;
}

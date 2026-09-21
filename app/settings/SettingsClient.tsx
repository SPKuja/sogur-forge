"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import type {BackupProviderAvailability} from "@/lib/backup-providers";

type Profile={username:string;email:string;role:string;emailVerifiedAt:string|null;createdAt:string};

export default function SettingsClient({profile,backupMethods}:{profile:Profile;backupMethods:BackupProviderAvailability}){
  const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  async function password(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");setError("");const data=new FormData(event.currentTarget);
    const r=await fetch("/api/account/password",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword:data.get("currentPassword"),newPassword:data.get("newPassword")})}),result=await r.json();
    if(!r.ok){setError(result.error||"Password could not be changed.");setBusy(false);return}
    setMessage("Password changed. All sessions have been signed out.");setTimeout(()=>{window.location.href="/"},900);
  }
  const cloud=[
    {name:"Dropbox",available:backupMethods.dropbox.enabled},
    {name:"Google Drive",available:backupMethods.googleDrive.enabled},
    {name:"OneDrive",available:backupMethods.oneDrive.enabled}
  ].filter(item=>item.available);
  return <main className="settings-shell"><header className="settings-top"><div><button onClick={()=>router.push("/workspace")}>← Library</button><div><small>ACCOUNT</small><strong>Settings</strong></div></div>{profile.role==="ADMIN"&&<button onClick={()=>router.push("/admin")}>Admin controls</button>}</header><section className="settings-main">
    <div className="settings-heading"><small>YOUR ACCOUNT</small><h1>Settings & data</h1><p>Manage account security and keep a copy of everything you create in Sögur Forge.</p></div>
    <div className="settings-grid">
      <section className="settings-card"><div className="settings-card-head"><div><small>PROFILE</small><h2>{profile.username}</h2></div><span className={profile.emailVerifiedAt?"status-good":"status-warn"}>{profile.emailVerifiedAt?"Verified":"Unverified"}</span></div><div className="settings-fact"><span>Email</span><strong>{profile.email}</strong></div><div className="settings-fact"><span>Account type</span><strong>{profile.role==="ADMIN"?"Administrator":"User"}</strong></div><div className="settings-fact"><span>Created</span><strong>{new Date(profile.createdAt).toLocaleDateString()}</strong></div></section>
      <section className="settings-card"><div className="settings-card-head"><div><small>SECURITY</small><h2>Change password</h2></div></div><form className="settings-form" onSubmit={password}><label><span>Current password</span><input type="password" name="currentPassword" autoComplete="current-password" required/></label><label><span>New password</span><input type="password" name="newPassword" autoComplete="new-password" minLength={12} required/></label>{error&&<p className="settings-warning">{error}</p>}{message&&<p className="settings-success">{message}</p>}<button className="primary" disabled={busy}>{busy?"Changing…":"Change password & sign out everywhere"}</button></form></section>
      <section className="settings-card settings-card-wide"><div className="settings-card-head"><div><small>YOUR DATA</small><h2>Export & backup</h2></div></div><p className="settings-copy">Your writing belongs to you. Data export remains available regardless of backup policy and never contains your password hash, active session tokens, verification tokens or other authentication secrets.</p><div className="data-actions"><a href="/api/account/export"><strong>Download all my data</strong><span>Readable ZIP with account details, manuscripts, scenes, characters, planning data and uploaded assets.</span><b>Export ZIP ↓</b></a>{backupMethods.download.enabled&&<a href="/api/account/backup"><strong>Download a backup</strong><span>Structured provider-neutral backup containing your writing data and assets.</span><b>Backup ZIP ↓</b></a>}</div></section>
      <section className="settings-card settings-card-wide"><div className="settings-card-head"><div><small>BACKUP DESTINATIONS</small><h2>Available on this server</h2></div></div>{cloud.length?<><p className="settings-copy">Your administrator has enabled the following cloud destinations. Each user will connect their own cloud account; the server's OAuth credentials only identify this Sögur Forge installation.</p><div className="cloud-backup-grid">{cloud.map(item=><div key={item.name}><strong>{item.name}</strong><span>Enabled by administrator</span><button disabled title="Cloud account connection is the next backup step">Connect account · coming next</button></div>)}</div></>:<p className="settings-muted">No cloud backup providers are currently enabled by the administrator.</p>}</section>
    </div>
  </section></main>;
}

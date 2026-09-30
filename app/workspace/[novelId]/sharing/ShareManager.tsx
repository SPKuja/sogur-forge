"use client";
import {useEffect,useMemo,useState} from "react";
import WorkspaceSectionSidebar from "../../WorkspaceSectionSidebar";
import {pageTypeLabel} from "@/lib/manuscript-item";

type Chapter={id:string;title:string;kind:string;pageType:string|null;partTitle:string|null;position:number};
type Share={
  id:string;label:string;recipientEmail:string;scope:string;expiresAt:string|null;revokedAt:string|null;
  lastViewedAt:string|null;viewCount:number;createdAt:string;updatedAt:string;chapterIds:string[];path:string|null;
};

function shareStatus(share:Share){
  if(share.revokedAt)return "Revoked";
  if(share.expiresAt&&new Date(share.expiresAt).getTime()<=Date.now())return "Expired";
  return "Active";
}
function displayDate(value:string|null){
  if(!value)return "Never";
  return new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
}

export default function ShareManager({username,novel,chapters,initialShares,emailEnabled}:{username:string;novel:{id:string;title:string};chapters:Chapter[];initialShares:Share[];emailEnabled:boolean}){
  const [navOpen,setNavOpen]=useState(false),[shares,setShares]=useState(initialShares),[scope,setScope]=useState<"ALL"|"SELECTED">("ALL"),[selected,setSelected]=useState<Set<string>>(new Set(chapters.map(item=>item.id))),[label,setLabel]=useState(""),[recipientEmail,setRecipientEmail]=useState(""),[expiresAt,setExpiresAt]=useState(""),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[latestPath,setLatestPath]=useState<string|null>(null),[copied,setCopied]=useState(""),[origin,setOrigin]=useState("");
  useEffect(()=>setOrigin(window.location.origin),[]);
  const selectedCount=selected.size;
  const activeShares=useMemo(()=>shares.filter(share=>shareStatus(share)==="Active").length,[shares]);

  function toggleChapter(id:string){setSelected(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}
  function shareUrl(path:string|null){return path&&origin?`${origin}${path}`:path||""}
  async function copy(path:string|null,id:string){
    const url=shareUrl(path);if(!url)return;
    try{await navigator.clipboard.writeText(url);setCopied(id);setTimeout(()=>setCopied(current=>current===id?"":current),1600)}
    catch{window.prompt("Copy this private share link:",url)}
  }
  async function create(sendEmail:boolean){
    setError("");setNotice("");setLatestPath(null);
    if(scope==="SELECTED"&&!selectedCount){setError("Choose at least one chapter or page.");return}
    if(sendEmail&&!recipientEmail.trim()){setError("Enter an email address first.");return}
    setSaving(true);
    try{
      const response=await fetch("/api/manuscript-shares",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        novelId:novel.id,label,recipientEmail,scope,chapterIds:scope==="SELECTED"?[...selected]:[],
        expiresAt:expiresAt?new Date(expiresAt).toISOString():null,sendEmail
      })});
      const data=await response.json().catch(()=>({error:"The share could not be created."}));
      if(!response.ok)throw new Error(data.error||"The share could not be created.");
      setShares(current=>[data.share,...current]);setLatestPath(data.share.path);
      setNotice(sendEmail?(data.emailSent?"Private link created and emailed.":`Private link created, but the email was not sent${data.emailError?": "+data.emailError:"."}`):"Private link created.");
      setLabel("");setExpiresAt("");
    }catch(err){setError(err instanceof Error?err.message:"The share could not be created.")}
    finally{setSaving(false)}
  }
  async function revoke(share:Share){
    if(!confirm(`Revoke access to “${share.label||novel.title}”? The link will stop working immediately.`))return;
    setError("");
    const response=await fetch(`/api/manuscript-shares/${share.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"revoke"})});
    const data=await response.json().catch(()=>({error:"The share could not be revoked."}));
    if(!response.ok){setError(data.error||"The share could not be revoked.");return}
    setShares(current=>current.map(item=>item.id===share.id?{...item,revokedAt:data.revokedAt}:item));
    setNotice("Access revoked. That private link no longer opens the manuscript.");
  }

  return <div className="app section-shell">
    <WorkspaceSectionSidebar username={username} novel={novel} active="sharing" open={navOpen} onClose={()=>setNavOpen(false)}/>
    {navOpen&&<button className="scrim" onClick={()=>setNavOpen(false)}/>}
    <main className="section-main share-page">
      <header className="share-top"><div className="section-top-left"><button className="menu-button" onClick={()=>setNavOpen(true)}>☰</button></div><div><small>{novel.title}</small><strong>Sharing</strong></div><div><span>{activeShares} active share{activeShares===1?"":"s"}</span></div></header>
      {error&&<div className="share-alert error">{error}<button onClick={()=>setError("")}>×</button></div>}
      {notice&&<div className="share-alert success">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
      <div className="share-layout">
        <section className="share-create-card">
          <div className="share-section-head"><div><small>NEW SHARE</small><h1>Share work in progress</h1><p>Create a private, read-only link. You decide exactly what it exposes and can revoke it at any time.</p></div></div>
          <label className="share-field"><span>Share name <i>optional</i></span><input value={label} onChange={event=>setLabel(event.target.value)} placeholder="e.g. First three chapters for Amy"/></label>
          <div className="share-field"><span>Access</span><div className="share-scope"><button className={scope==="ALL"?"active":""} onClick={()=>setScope("ALL")}><strong>Full manuscript</strong><small>The live manuscript, including later additions</small></button><button className={scope==="SELECTED"?"active":""} onClick={()=>setScope("SELECTED")}><strong>Selected items</strong><small>Only chapters/pages you choose</small></button></div></div>
          {scope==="SELECTED"&&<div className="share-chapter-picker"><div><strong>{selectedCount} selected</strong><span><button onClick={()=>setSelected(new Set(chapters.map(item=>item.id)))}>Select all</button><button onClick={()=>setSelected(new Set())}>Clear</button></span></div><div className="share-chapter-list">{chapters.map(chapter=><label key={chapter.id}><input type="checkbox" checked={selected.has(chapter.id)} onChange={()=>toggleChapter(chapter.id)}/><span><small>{chapter.partTitle||"Manuscript"} · {chapter.kind==="PAGE"?pageTypeLabel(chapter.pageType):"Chapter"}</small><strong>{chapter.title}</strong></span></label>)}</div></div>}
          <div className="share-form-grid">
            <label className="share-field"><span>Email recipient <i>optional</i></span><input type="email" value={recipientEmail} onChange={event=>setRecipientEmail(event.target.value)} placeholder="reader@example.com"/></label>
            <label className="share-field"><span>Expires <i>optional</i></span><input type="datetime-local" value={expiresAt} onChange={event=>setExpiresAt(event.target.value)}/></label>
          </div>
          <div className="share-security-note"><strong>Private read-only access</strong><p>Anyone who has the link can read the shared material, but cannot edit it. Readers see the latest saved text. Revoking the share or reaching its expiry stops access immediately.</p></div>
          <div className="share-create-actions"><button disabled={saving} onClick={()=>void create(false)}>🔗 {saving?"Creating…":"Create link"}</button><button className="primary" disabled={saving||!emailEnabled||!recipientEmail.trim()} onClick={()=>void create(true)}>✉ Create & email</button></div>
          {!emailEnabled&&<p className="share-email-note">Email delivery is not configured by the administrator. Private links can still be copied and shared manually.</p>}
          {latestPath&&<div className="share-created-link"><div><strong>Link ready</strong><small>Only people you give this link to can open it.</small></div><input readOnly value={shareUrl(latestPath)}/><button onClick={()=>void copy(latestPath,"latest")}>{copied==="latest"?"Copied ✓":"Copy link"}</button></div>}
        </section>

        <section className="share-list-card">
          <div className="share-section-head"><div><small>ACCESS</small><h2>Shared readers</h2><p>Every link is independent, so revoking one does not affect the others.</p></div><b>{shares.length}</b></div>
          <div className="share-list">{shares.map(share=>{const status=shareStatus(share),active=status==="Active";return <article key={share.id} className={active?"":"inactive"}>
            <div className="share-item-head"><div><span className={"share-status "+status.toLowerCase()}>{status}</span><strong>{share.label||novel.title}</strong><small>{share.scope==="ALL"?"Full manuscript":`${share.chapterIds.length} selected item${share.chapterIds.length===1?"":"s"}`}</small></div><div>{active&&share.path&&<button onClick={()=>void copy(share.path,share.id)}>{copied===share.id?"Copied ✓":"Copy link"}</button>}{active&&<button className="danger" onClick={()=>void revoke(share)}>Revoke</button>}</div></div>
            <dl><div><dt>Recipient</dt><dd>{share.recipientEmail||"Link only"}</dd></div><div><dt>Created</dt><dd>{displayDate(share.createdAt)}</dd></div><div><dt>Expires</dt><dd>{share.expiresAt?displayDate(share.expiresAt):"No expiry"}</dd></div><div><dt>Views</dt><dd>{share.viewCount.toLocaleString()}</dd></div><div><dt>Last viewed</dt><dd>{displayDate(share.lastViewedAt)}</dd></div>{share.revokedAt&&<div><dt>Revoked</dt><dd>{displayDate(share.revokedAt)}</dd></div>}</dl>
          </article>})}{!shares.length&&<div className="share-empty"><strong>Nothing shared yet</strong><span>Create a private reader link when you are ready for feedback.</span></div>}</div>
        </section>
      </div>
    </main>
  </div>;
}

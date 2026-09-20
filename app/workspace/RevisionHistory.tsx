"use client";
import {useEffect,useMemo,useState} from "react";

type RevisionSummary={id:string;title:string;summary:string;status:string;createdAt:string;characters:number};
type RevisionDetail=RevisionSummary&{content:string};
type RestoredChapter={id:string;title:string;content:string;summary:string;status:string};

function textOnly(html:string){
  if(typeof document==="undefined")return html.replace(/<[^>]*>/g," ");
  const el=document.createElement("div");el.innerHTML=html;return el.textContent||"";
}
function words(html:string){const value=textOnly(html).trim();return value?value.split(/\s+/).length:0}
function previewDocument(content:string){
  const safe=content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"").replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,"");
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:28px 34px;color:#202838;background:#fff;font:17px/1.75 Georgia,"Times New Roman",serif}p{margin:0 0 1em}p.paragraph-indent{text-indent:2em}h2{text-align:center;font:700 1.3em/1.4 system-ui,sans-serif;margin:1.5em 0 .8em}blockquote{margin:1.2em 2em;padding-left:1em;border-left:2px solid #d9dee7;color:#667085}img{max-width:100%;height:auto}figure{margin:24px auto;text-align:center}figcaption{font:12px/1.5 system-ui,sans-serif;color:#667085}</style></head><body>${safe}</body></html>`;
}

export default function RevisionHistory({chapterId,currentTitle,currentContent,onClose,onRestored}:{chapterId:string;currentTitle:string;currentContent:string;onClose:()=>void;onRestored:(chapter:RestoredChapter)=>void}){
  const [items,setItems]=useState<RevisionSummary[]>([]),[selected,setSelected]=useState<RevisionDetail|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[confirming,setConfirming]=useState(false),[error,setError]=useState("");
  async function loadList(){
    setLoading(true);setError("");
    const r=await fetch(`/api/chapters/${chapterId}/revisions`,{cache:"no-store"});
    if(!r.ok){setError("Revision history could not be loaded.");setLoading(false);return}
    const data=await r.json();setItems(data.revisions||[]);setLoading(false);
    if(data.revisions?.[0])loadRevision(data.revisions[0].id);
  }
  async function loadRevision(id:string){
    setConfirming(false);setError("");
    const r=await fetch(`/api/chapters/${chapterId}/revisions/${id}`,{cache:"no-store"});
    if(!r.ok){setError("That revision could not be opened.");return}
    setSelected(await r.json());
  }
  useEffect(()=>{loadList()},[chapterId]);
  const currentWords=useMemo(()=>words(currentContent),[currentContent]),revisionWords=useMemo(()=>selected?words(selected.content):0,[selected]);
  async function restore(){
    if(!selected)return;setBusy(true);setError("");
    const r=await fetch(`/api/chapters/${chapterId}/revisions/${selected.id}`,{method:"POST"});
    if(!r.ok){const data=await r.json().catch(()=>({}));setError(data.error||"This revision could not be restored.");setBusy(false);return}
    onRestored(await r.json());setBusy(false);onClose();
  }
  return <div className="modal-backdrop history-backdrop" onMouseDown={onClose}><section className="history-dialog" role="dialog" aria-modal="true" aria-labelledby="history-title" onMouseDown={e=>e.stopPropagation()}>
    <header><div><small>REVISION HISTORY</small><h2 id="history-title">{currentTitle}</h2><p>Automatic snapshots are kept while you write, normally no more than once every five minutes.</p></div><button aria-label="Close history" onClick={onClose}>×</button></header>
    <div className="history-body">
      <aside className="history-list">{loading?<p className="history-empty">Loading history…</p>:items.length?items.map(item=><button key={item.id} className={selected?.id===item.id?"active":""} onClick={()=>loadRevision(item.id)}><strong>{new Date(item.createdAt).toLocaleString()}</strong><span>{item.title}</span><small>{item.characters.toLocaleString()} characters</small></button>):<div className="history-empty"><strong>No snapshots yet</strong><span>Keep writing and Sögur Forge will begin creating revision points automatically.</span></div>}</aside>
      <main className="history-preview">{selected?<><div className="history-preview-head"><div><small>SNAPSHOT</small><strong>{new Date(selected.createdAt).toLocaleString()}</strong></div><div className="history-stats"><span>{revisionWords.toLocaleString()} words then</span><span>{currentWords.toLocaleString()} now</span><b>{revisionWords-currentWords>0?"+":""}{(revisionWords-currentWords).toLocaleString()} words</b></div></div>{selected.title!==currentTitle&&<div className="history-title-change"><small>Chapter title at this point</small><strong>{selected.title}</strong></div>}<iframe className="history-frame" title="Revision preview" sandbox="" srcDoc={previewDocument(selected.content)}/>{confirming?<div className="history-restore-confirm"><strong>Restore this version?</strong><span>Your current chapter will be saved as a new revision first, so you can come back to it.</span><div><button onClick={()=>setConfirming(false)}>Cancel</button><button className="primary" disabled={busy} onClick={restore}>{busy?"Restoring…":"Restore version"}</button></div></div>:<button className="history-restore" onClick={()=>setConfirming(true)}>Restore this version</button>}</>:<div className="history-empty"><strong>Select a snapshot</strong><span>Choose a revision from the list to preview it.</span></div>}{error&&<p className="history-error">{error}</p>}</main>
    </div>
  </section></div>
}

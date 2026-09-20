"use client";
import {useMemo,useState} from "react";
import {PAGE_TYPE_OPTIONS,pageTypeDefaultTitle,type PageType} from "@/lib/manuscript-item";

export type NewPageChoice={title:string;pageType:PageType;partId:string|null};

export default function NewPageDialog({parts,onClose,onCreate}:{parts:{id:string;title:string;position:number}[];onClose:()=>void;onCreate:(choice:NewPageChoice)=>Promise<void>|void}){
  const [pageType,setPageType]=useState<PageType>("FOREWORD"),[title,setTitle]=useState<string>(pageTypeDefaultTitle("FOREWORD")),[partId,setPartId]=useState<string|null>(null),[creating,setCreating]=useState(false),[titleEdited,setTitleEdited]=useState(false);
  const selected=useMemo(()=>PAGE_TYPE_OPTIONS.find(option=>option.value===pageType)??PAGE_TYPE_OPTIONS[PAGE_TYPE_OPTIONS.length-1],[pageType]);
  function choose(next:PageType){setPageType(next);if(!titleEdited)setTitle(pageTypeDefaultTitle(next))}
  async function submit(){if(creating)return;setCreating(true);try{await onCreate({title:title.trim()||pageTypeDefaultTitle(pageType),pageType,partId})}finally{setCreating(false)}}
  return <div className="modal-backdrop new-chapter-backdrop" onMouseDown={onClose}><section className="new-chapter-dialog new-page-dialog" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
    <header><div><small>NEW PAGE</small><h2>Add non-chapter content</h2><p>Front matter, back matter and other pages sit in the manuscript without affecting chapter numbering.</p></div><button aria-label="Close" onClick={onClose}>×</button></header>
    <div className="new-page-fields"><label><span>Page title</span><input autoFocus value={title} onChange={e=>{setTitle(e.target.value);setTitleEdited(true)}}/></label><label><span>Place in</span><select value={partId??""} onChange={e=>setPartId(e.target.value||null)}><option value="">No Part</option>{[...parts].sort((a,b)=>a.position-b.position).map(part=><option key={part.id} value={part.id}>{part.title}</option>)}</select></label></div>
    <div className="new-page-type-grid">{PAGE_TYPE_OPTIONS.map(option=><button key={option.value} className={pageType===option.value?"active":""} onClick={()=>choose(option.value)}><strong>{option.label}</strong><span>{option.hint}</span></button>)}</div>
    <div className="new-page-summary"><small>PAGE TYPE</small><strong>{selected.label}</strong><span>This page can be dragged anywhere in the manuscript later and will never consume a chapter number.</span></div>
    <footer><button onClick={onClose}>Cancel</button><button className="primary" disabled={creating} onClick={submit}>{creating?"Creating…":"Create page"}</button></footer>
  </section></div>;
}

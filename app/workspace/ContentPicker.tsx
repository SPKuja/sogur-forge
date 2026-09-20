"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {pageTypeLabel} from "@/lib/manuscript-item";

export type PickerPart={id:string;title:string;position:number};
export type PickerChapter={id:string;partId:string|null;title:string;position:number;kind?:string;pageType?:string|null};

function TriCheckbox({checked,mixed,onChange,label}:{checked:boolean;mixed:boolean;onChange:()=>void;label:string}){
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(ref.current)ref.current.indeterminate=mixed},[mixed]);
  return <input ref={ref} type="checkbox" checked={checked} aria-label={label} onChange={onChange}/>;
}

export default function ContentPicker({novelTitle,parts,chapters,selectedIds,onChange,onClose}:{novelTitle:string;parts:PickerPart[];chapters:PickerChapter[];selectedIds:string[];onChange:(ids:string[])=>void;onClose:()=>void}){
  const selected=useMemo(()=>new Set(selectedIds),[selectedIds]);
  const [collapsed,setCollapsed]=useState<Set<string>>(new Set());
  const groups=useMemo(()=>{
    const ordered=[...parts].sort((a,b)=>a.position-b.position).map(p=>({id:p.id,title:p.title,chapters:chapters.filter(c=>c.partId===p.id).sort((a,b)=>a.position-b.position)}));
    const loose=chapters.filter(c=>!c.partId).sort((a,b)=>a.position-b.position);
    return loose.length?[{id:"",title:"Unassigned",chapters:loose},...ordered]:ordered;
  },[parts,chapters]);
  const setSelection=(next:Set<string>)=>onChange(chapters.filter(c=>next.has(c.id)).sort((a,b)=>a.position-b.position).map(c=>c.id));
  const toggleAll=()=>setSelection(selected.size===chapters.length?new Set():new Set(chapters.map(c=>c.id)));
  const toggleGroup=(ids:string[])=>{const next=new Set(selected),all=ids.length>0&&ids.every(id=>next.has(id));ids.forEach(id=>all?next.delete(id):next.add(id));setSelection(next)};
  const toggleChapter=(id:string)=>{const next=new Set(selected);next.has(id)?next.delete(id):next.add(id);setSelection(next)};
  const toggleOpen=(id:string)=>setCollapsed(v=>{const next=new Set(v);next.has(id)?next.delete(id):next.add(id);return next});
  const allSelected=chapters.length>0&&selected.size===chapters.length;
  return <div className="modal-backdrop content-picker-backdrop" onMouseDown={onClose}><section className="content-picker" role="dialog" aria-modal="true" aria-labelledby="content-picker-title" onMouseDown={e=>e.stopPropagation()}>
    <header><div><small>EXPORT</small><h2 id="content-picker-title">Choose manuscript content</h2><p>Select the chapters and pages you want to include.</p></div><button aria-label="Close" onClick={onClose}>×</button></header>
    <div className="content-picker-actions"><span>{selected.size} of {chapters.length} manuscript items selected</span><button onClick={()=>setSelection(new Set(chapters.map(c=>c.id)))}>Select all</button><button onClick={()=>setSelection(new Set())}>Clear all</button></div>
    <div className="content-tree">
      <label className="content-root"><TriCheckbox checked={allSelected} mixed={selected.size>0&&!allSelected} onChange={toggleAll} label={`Select all of ${novelTitle}`}/><strong>{novelTitle}</strong><small>{chapters.length} items</small></label>
      {groups.filter(g=>g.chapters.length).map(g=>{const ids=g.chapters.map(c=>c.id),count=ids.filter(id=>selected.has(id)).length,all=count===ids.length,closed=collapsed.has(g.id||"__loose");return <section className="content-group" key={g.id||"loose"}>
        <div className="content-group-head"><button className="content-chevron" aria-label={closed?"Expand":"Collapse"} onClick={()=>toggleOpen(g.id||"__loose")}>{closed?"▸":"▾"}</button><TriCheckbox checked={all} mixed={count>0&&!all} onChange={()=>toggleGroup(ids)} label={`Select ${g.title}`}/><strong>{g.title}</strong><small>{count}/{ids.length}</small></div>
        {!closed&&<div className="content-children">{g.chapters.map(c=><label key={c.id}><input type="checkbox" checked={selected.has(c.id)} onChange={()=>toggleChapter(c.id)}/><span>{c.title}{c.kind==="PAGE"?<small className="content-page-kind">{pageTypeLabel(c.pageType)}</small>:null}</span></label>)}</div>}
      </section>})}
    </div>
    <div className="content-picker-next"><strong>Next: export format</strong><span>DOCX support is the next exporter we’re wiring into this selection.</span></div>
    <footer><button onClick={onClose}>Done</button></footer>
  </section></div>
}

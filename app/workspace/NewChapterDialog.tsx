"use client";
import {useState} from "react";
import ChapterTemplateHeader from "./ChapterTemplateHeader";
import type {ChapterTemplateDesign} from "@/lib/chapter-template";

export type NewChapterChoice={title:string;templateId:string|null};

export default function NewChapterDialog({novelTitle,templates,onClose,onCreate}:{novelTitle:string;templates:ChapterTemplateDesign[];onClose:()=>void;onCreate:(choice:NewChapterChoice)=>Promise<void>|void}){
  const suggested=templates.find(t=>t.isDefault)?.id??null;
  const [templateId,setTemplateId]=useState<string|null>(suggested),[title,setTitle]=useState(""),[creating,setCreating]=useState(false);
  const context={chapterNumber:1,chapterTitle:title.trim()||"Untitled Chapter",partTitle:null,novelTitle};
  async function submit(){if(creating)return;setCreating(true);try{await onCreate({title:title.trim()||"Untitled Chapter",templateId})}finally{setCreating(false)}}
  return <div className="modal-backdrop new-chapter-backdrop" onMouseDown={onClose}><section className="new-chapter-dialog" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
    <header><div><small>NEW CHAPTER</small><h2>Choose how this chapter starts</h2><p>Pick a template for this chapter only. Existing chapters are not changed.</p></div><button aria-label="Close" onClick={onClose}>×</button></header>
    <label className="new-chapter-title"><span>Chapter title</span><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Untitled Chapter"/></label>
    <div className="new-chapter-template-grid">
      <button className={templateId===null?"active":""} onClick={()=>setTemplateId(null)}><div className="new-chapter-no-template"><span>Plain chapter</span><strong>No template</strong></div><footer><strong>No template</strong><small>Start directly with the manuscript.</small></footer></button>
      {templates.map(template=><button key={template.id} className={templateId===template.id?"active":""} onClick={()=>setTemplateId(template.id)}><div className="new-chapter-mini-page"><ChapterTemplateHeader template={template} context={context} imageUrl={template.headerImageUrl}/></div><footer><strong>{template.name}</strong><small>{template.isDefault?"Suggested":"Chapter template"}</small></footer></button>)}
    </div>
    <footer><button onClick={onClose}>Cancel</button><button className="primary" disabled={creating} onClick={submit}>{creating?"Creating…":"Create chapter"}</button></footer>
  </section></div>;
}

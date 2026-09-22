"use client";
import {useMemo,useState} from "react";
import {renderChapterTemplateContent,templatePreviewText,type ChapterTemplateDesign} from "@/lib/chapter-template";

type SectionOption={id:string;title:string};
export type NewChapterChoice={title:string;templateId:string|null;partId:string|null};

export default function NewChapterDialog({
  novelTitle,
  nextChapterNumber,
  templates,
  parts,
  onClose,
  onCreate
}:{
  novelTitle:string;
  nextChapterNumber:number;
  templates:ChapterTemplateDesign[];
  parts:SectionOption[];
  onClose:()=>void;
  onCreate:(choice:NewChapterChoice)=>Promise<void>|void;
}){
  const suggested=templates.find(template=>template.isDefault)?.id??null;
  const [templateId,setTemplateId]=useState<string|null>(suggested);
  const [partId,setPartId]=useState<string|null>(null);
  const [title,setTitle]=useState("");
  const [creating,setCreating]=useState(false);

  const partTitle=parts.find(part=>part.id===partId)?.title??null;
  const context={
    chapterNumber:nextChapterNumber,
    chapterTitle:title.trim()||"Untitled Chapter",
    partTitle,
    novelTitle
  };
  const previews=useMemo(
    ()=>new Map(templates.map(template=>[
      template.id,
      templatePreviewText(renderChapterTemplateContent(template.content,context))
    ])),
    [templates,context.chapterNumber,context.chapterTitle,context.partTitle,context.novelTitle]
  );

  async function submit(){
    if(creating)return;
    setCreating(true);
    try{
      await onCreate({title:title.trim()||"Untitled Chapter",templateId,partId});
    }finally{
      setCreating(false);
    }
  }

  return <div className="modal-backdrop new-chapter-backdrop" onMouseDown={onClose}>
    <section className="new-chapter-dialog" role="dialog" aria-modal="true" onMouseDown={event=>event.stopPropagation()}>
      <header>
        <div>
          <small>NEW CHAPTER</small>
          <h2>Choose a starting point</h2>
          <p>A template copies its contents into the new chapter once. After creation, everything is ordinary editable manuscript.</p>
        </div>
        <button aria-label="Close" onClick={onClose}>×</button>
      </header>

      <div className="new-chapter-fields">
        <label className="new-chapter-title">
          <span>Chapter title</span>
          <input autoFocus value={title} onChange={event=>setTitle(event.target.value)} placeholder="Untitled Chapter"/>
        </label>
        <label className="new-chapter-section">
          <span>Section</span>
          <select value={partId??""} onChange={event=>setPartId(event.target.value||null)}>
            <option value="">No section</option>
            {parts.map(part=><option key={part.id} value={part.id}>{part.title}</option>)}
          </select>
        </label>
      </div>

      <div className="new-chapter-template-grid">
        <button className={templateId===null?"active":""} onClick={()=>setTemplateId(null)}>
          <div className="new-chapter-no-template">
            <span>Blank chapter</span>
            <strong>Start empty</strong>
          </div>
          <footer>
            <strong>Blank chapter</strong>
            <small>Open a clean writing area.</small>
          </footer>
        </button>

        {templates.map(template=><button key={template.id} className={templateId===template.id?"active":""} onClick={()=>setTemplateId(template.id)}>
          <div className="new-chapter-content-preview">
            <small>PREVIEW</small>
            <p>{(previews.get(template.id)||"Empty template").slice(0,220)}</p>
          </div>
          <footer>
            <strong>{template.name}</strong>
            <small>{template.isDefault?"Suggested · ":""}Copied into Chapter {nextChapterNumber}</small>
          </footer>
        </button>)}
      </div>

      <footer>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" disabled={creating} onClick={submit}>{creating?"Creating…":"Create chapter"}</button>
      </footer>
    </section>
  </div>;
}

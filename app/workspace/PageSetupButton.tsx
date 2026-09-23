"use client";
import {useEffect,useMemo,useState} from "react";
import {WRITING_FONTS,WRITING_FONT_SIZES} from "@/lib/editor-typography";
import {PAGE_PRESETS,pagePreset,type ManuscriptDisplayUnit,type ManuscriptLayoutSettings} from "@/lib/manuscript-layout";
import {useManuscriptLayout} from "./ManuscriptLayoutProvider";

const round=(value:number,places=2)=>Number(value.toFixed(places));

export default function PageSetupButton({className="",label="Page setup"}:{className?:string;label?:string}){
  const {layout,displayMode,saving,error,saveLayout,saveDisplayMode}=useManuscriptLayout();
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(layout);
  useEffect(()=>{if(open)setDraft(layout)},[open,layout]);
  const unit=draft.displayUnit,factor=unit==="IN"?25.4:1;
  const unitLabel=unit==="IN"?"in":"mm";
  const show=(mm:number)=>round(mm/factor,unit==="IN"?2:1);
  const read=(value:string)=>Number(value||0)*factor;
  const selectedPreset=useMemo(()=>pagePreset(draft.pagePreset),[draft.pagePreset]);
  function patch(patch:Partial<ManuscriptLayoutSettings>){setDraft(current=>({...current,...patch}))}
  function choosePreset(id:string){const preset=pagePreset(id);patch({pagePreset:id,pageWidthMm:preset.widthMm,pageHeightMm:preset.heightMm})}
  function switchUnit(next:ManuscriptDisplayUnit){patch({displayUnit:next})}
  async function save(){if(await saveLayout(draft))setOpen(false)}

  return <><button className={className} onClick={()=>setOpen(true)}>{label}</button>{open&&<div className="modal-backdrop page-setup-backdrop" onMouseDown={()=>setOpen(false)}><section className="page-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="page-setup-title" onMouseDown={event=>event.stopPropagation()}>
    <header><div><small>MANUSCRIPT LAYOUT</small><h2 id="page-setup-title">Page setup</h2><p>One layout for chapters, scenes, manuscript pages, templates and export.</p></div><button aria-label="Close" onClick={()=>setOpen(false)}>×</button></header>
    <div className="page-setup-body">
      <div className="page-setup-preview"><div style={{aspectRatio:`${draft.pageWidthMm}/${draft.pageHeightMm}`}}><span>Page</span><i/><i/><i/><i/></div><strong>{selectedPreset.label}</strong><small>{show(draft.pageWidthMm)} × {show(draft.pageHeightMm)} {unitLabel}</small></div>
      <div className="page-setup-fields">
        <section><div className="page-setup-section-head"><div><small>PAGE</small><strong>Size & margins</strong></div><div className="page-unit-toggle"><button className={unit==="MM"?"active":""} onClick={()=>switchUnit("MM")}>mm</button><button className={unit==="IN"?"active":""} onClick={()=>switchUnit("IN")}>in</button></div></div>
          <label><span>Preset</span><select value={draft.pagePreset} onChange={event=>choosePreset(event.target.value)}>{PAGE_PRESETS.map(item=><option key={item.id} value={item.id}>{item.label} · {item.detail}</option>)}</select></label>
          <div className="page-setup-grid two"><label><span>Width ({unitLabel})</span><input type="number" min="1" step={unit==="IN"?"0.01":"0.1"} value={show(draft.pageWidthMm)} disabled={draft.pagePreset!=="CUSTOM"} onChange={event=>patch({pageWidthMm:read(event.target.value)})}/></label><label><span>Height ({unitLabel})</span><input type="number" min="1" step={unit==="IN"?"0.01":"0.1"} value={show(draft.pageHeightMm)} disabled={draft.pagePreset!=="CUSTOM"} onChange={event=>patch({pageHeightMm:read(event.target.value)})}/></label></div>
          <div className="page-setup-grid four"><label><span>Top</span><input type="number" step={unit==="IN"?"0.01":"0.1"} value={show(draft.marginTopMm)} onChange={event=>patch({marginTopMm:read(event.target.value)})}/></label><label><span>Bottom</span><input type="number" step={unit==="IN"?"0.01":"0.1"} value={show(draft.marginBottomMm)} onChange={event=>patch({marginBottomMm:read(event.target.value)})}/></label><label><span>Inside</span><input type="number" step={unit==="IN"?"0.01":"0.1"} value={show(draft.marginInsideMm)} onChange={event=>patch({marginInsideMm:read(event.target.value)})}/></label><label><span>Outside</span><input type="number" step={unit==="IN"?"0.01":"0.1"} value={show(draft.marginOutsideMm)} onChange={event=>patch({marginOutsideMm:read(event.target.value)})}/></label></div>
          <div className="page-setup-grid two"><label><span>Binding gutter ({unitLabel})</span><input type="number" min="0" step={unit==="IN"?"0.01":"0.1"} value={show(draft.gutterMm)} onChange={event=>patch({gutterMm:read(event.target.value)})}/></label><label className="page-check"><input type="checkbox" checked={draft.mirroredMargins} onChange={event=>patch({mirroredMargins:event.target.checked})}/><span>Mirror inside/outside margins</span></label></div>
        </section>
        <section><div className="page-setup-section-head"><div><small>TYPE</small><strong>Default prose</strong></div></div>
          <div className="page-setup-grid two"><label><span>Font</span><select value={draft.bodyFontId} onChange={event=>patch({bodyFontId:event.target.value})}>{WRITING_FONTS.map(font=><option key={font.id} value={font.id}>{font.label}</option>)}</select></label><label><span>Size</span><select value={String(draft.bodyFontSizePt)} onChange={event=>patch({bodyFontSizePt:Number(event.target.value)})}>{WRITING_FONT_SIZES.map(size=><option key={size.value} value={size.points}>{size.label}</option>)}</select></label></div>
          <div className="page-setup-grid three"><label><span>Line height</span><select value={String(draft.lineHeight)} onChange={event=>patch({lineHeight:Number(event.target.value)})}>{[1.2,1.4,1.5,1.6,1.82,2].map(value=><option key={value} value={value}>{value}</option>)}</select></label><label><span>Paragraph space (pt)</span><input type="number" min="0" max="36" step="1" value={draft.paragraphSpacingPt} onChange={event=>patch({paragraphSpacingPt:Number(event.target.value)})}/></label><label><span>First-line indent ({unitLabel})</span><input type="number" min="0" step={unit==="IN"?"0.01":"0.1"} value={show(draft.firstLineIndentMm)} onChange={event=>patch({firstLineIndentMm:read(event.target.value)})}/></label></div>
        </section>
        <section><div className="page-setup-section-head"><div><small>FLOW</small><strong>Manuscript behaviour</strong></div></div>
          <label><span>Chapter starts</span><select value={draft.chapterStart} onChange={event=>patch({chapterStart:event.target.value as ManuscriptLayoutSettings["chapterStart"]})}><option value="FLOW">Continue naturally</option><option value="NEW_PAGE">Start on a new page</option><option value="RECTO">Start on a right-hand page</option></select></label>
          <div className="page-view-foundation"><div><span>Writing view</span><strong>{displayMode==="PAGES"?"Physical pages":"Continuous scroll"}</strong></div><div className="page-view-buttons"><button className={displayMode==="CONTINUOUS"?"active":""} disabled={saving} onClick={()=>saveDisplayMode("CONTINUOUS")}>Continuous</button><button className={displayMode==="PAGES"?"active":""} disabled={saving} onClick={()=>saveDisplayMode("PAGES")}>Pages</button></div></div>
        </section>
      </div>
    </div>
    {error&&<p className="page-setup-error">{error}</p>}
    <footer><button onClick={()=>setOpen(false)}>Cancel</button><button className="primary" disabled={saving} onClick={save}>{saving?"Saving…":"Save page setup"}</button></footer>
  </section></div>}</>;
}

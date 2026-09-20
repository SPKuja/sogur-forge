"use client";
import {useMemo,useState} from "react";

type CharacterImage={url:string;position:number};
type Character={id:string;name:string;role:string;images:CharacterImage[]};
export type Relationship={id:string;sourceId:string;targetId:string;type:string;label:string;notes:string};

function portrait(character:Character){return [...character.images].sort((a,b)=>a.position-b.position)[0]?.url}
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")||"?"}
function otherId(r:Relationship,id:string){return r.sourceId===id?r.targetId:r.sourceId}
function relationLabel(r:Relationship,id:string){
  if(r.label)return r.label;
  if(r.type==="PARENT")return r.sourceId===id?"Parent of":"Child of";
  if(r.type==="MENTOR")return r.sourceId===id?"Mentor of":"Student of";
  return ({SIBLING:"Sibling",PARTNER:"Partner",FRIEND:"Friend",ALLY:"Ally",RIVAL:"Rival",ENEMY:"Enemy",OTHER:"Connected"} as Record<string,string>)[r.type]||"Connected";
}

export default function RelationshipMap({characters,relationships,initialFocusId,onClose,onOpenProfile}:{characters:Character[];relationships:Relationship[];initialFocusId:string;onClose:()=>void;onOpenProfile:(id:string)=>void}){
  const [focusId,setFocusId]=useState(initialFocusId);
  const byId=useMemo(()=>new Map(characters.map(c=>[c.id,c])),[characters]),focus=byId.get(focusId)??characters[0];
  const family=relationships.filter(r=>["PARENT","SIBLING","PARTNER"].includes(r.type));
  const parents=focus?family.filter(r=>r.type==="PARENT"&&r.targetId===focus.id).map(r=>byId.get(r.sourceId)).filter(Boolean) as Character[]:[];
  const grandparents=parents.flatMap(parent=>family.filter(r=>r.type==="PARENT"&&r.targetId===parent.id).map(r=>byId.get(r.sourceId)).filter(Boolean) as Character[]);
  const children=focus?family.filter(r=>r.type==="PARENT"&&r.sourceId===focus.id).map(r=>byId.get(r.targetId)).filter(Boolean) as Character[]:[];
  const grandchildren=children.flatMap(child=>family.filter(r=>r.type==="PARENT"&&r.sourceId===child.id).map(r=>byId.get(r.targetId)).filter(Boolean) as Character[]);
  const siblings=focus?family.filter(r=>r.type==="SIBLING"&&(r.sourceId===focus.id||r.targetId===focus.id)).map(r=>byId.get(otherId(r,focus.id))).filter(Boolean) as Character[]:[];
  const partners=focus?family.filter(r=>r.type==="PARTNER"&&(r.sourceId===focus.id||r.targetId===focus.id)).map(r=>byId.get(otherId(r,focus.id))).filter(Boolean) as Character[]:[];
  const other=focus?relationships.filter(r=>!["PARENT","SIBLING","PARTNER"].includes(r.type)&&(r.sourceId===focus.id||r.targetId===focus.id)):[];
  const unique=(items:Character[])=>Array.from(new Map(items.map(c=>[c.id,c])).values());
  const Node=({character,featured=false}:{character:Character;featured?:boolean})=><button className={featured?"relationship-node featured":"relationship-node"} onClick={()=>setFocusId(character.id)}>{portrait(character)?<img src={portrait(character)} alt=""/>:<span>{initials(character.name)}</span>}<div><strong>{character.name}</strong><small>{character.role||"Character"}</small></div></button>;
  const Level=({label,items}:{label:string;items:Character[]})=>items.length?<section className="relationship-tree-level"><small>{label}</small><div>{unique(items).map(c=><Node key={c.id} character={c}/>)}</div></section>:null;
  if(!focus)return null;
  return <div className="modal-backdrop relationship-map-backdrop" onMouseDown={onClose}><section className="relationship-map" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
    <header><div><small>RELATIONSHIP MAP</small><h2>{focus.name}</h2><p>A family-tree-style view of the cast. Click any character to re-centre the map.</p></div><div className="relationship-map-actions"><select value={focus.id} onChange={e=>setFocusId(e.target.value)}>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={()=>{onOpenProfile(focus.id);onClose()}}>Open bio</button><button aria-label="Close relationship map" onClick={onClose}>×</button></div></header>
    <div className="relationship-map-body">
      <div className="relationship-family-tree">
        <Level label="Grandparents" items={grandparents}/>
        <Level label="Parents" items={parents}/>
        <section className="relationship-tree-level focus-level"><small>Generation</small><div>{unique(siblings).map(c=><Node key={c.id} character={c}/>) }<Node character={focus} featured/>{unique(partners).map(c=><Node key={c.id} character={c}/>)}</div></section>
        <Level label="Children" items={children}/>
        <Level label="Grandchildren" items={grandchildren}/>
        {!parents.length&&!children.length&&!siblings.length&&!partners.length&&<p className="relationship-tree-empty">No family relationships have been linked to {focus.name} yet.</p>}
      </div>
      <aside className="relationship-map-other"><small>OTHER CONNECTIONS</small>{other.length?other.map(r=>{const person=byId.get(otherId(r,focus.id));return person?<button key={r.id} onClick={()=>setFocusId(person.id)}><b>{relationLabel(r,focus.id)}</b><strong>{person.name}</strong>{r.notes&&<span>{r.notes}</span>}</button>:null}):<p>No other direct relationships yet.</p>}</aside>
    </div>
  </section></div>
}

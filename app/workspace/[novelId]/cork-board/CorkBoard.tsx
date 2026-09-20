"use client";
import {PointerEvent,useRef,useState} from "react";
import WorkspaceSectionSidebar from "../../../WorkspaceSectionSidebar";

type Board={id:string;title:string;position:number};
type Note={id:string;boardId:string;body:string;color:string;positionX:number;positionY:number;width:number;height:number};

export default function CorkBoard({username,novel,initialBoards,initialNotes}:{username:string;novel:{id:string;title:string};initialBoards:Board[];initialNotes:Note[]}){
  const [boards,setBoards]=useState(initialBoards),[active,setActive]=useState(initialBoards[0].id),[notes,setNotes]=useState(initialNotes),[navOpen,setNavOpen]=useState(false);
  const drag=useRef<{id:string;dx:number;dy:number}|null>(null);
  async function addNote(x=60,y=60){const r=await fetch("/api/sticky-notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({boardId:active,positionX:x,positionY:y})});if(r.ok){const n=await r.json();setNotes(v=>[...v,{...n,boardId:active}])}}
  async function save(n:Note){await fetch(`/api/sticky-notes/${n.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)})}
  function move(e:PointerEvent<HTMLDivElement>){if(!drag.current)return;const box=e.currentTarget.getBoundingClientRect(),d=drag.current;setNotes(v=>v.map(n=>n.id===d.id?{...n,positionX:Math.max(0,e.clientX-box.left-d.dx),positionY:Math.max(0,e.clientY-box.top-d.dy)}:n))}
  function up(){if(!drag.current)return;const n=notes.find(x=>x.id===drag.current!.id);drag.current=null;if(n)save(n)}
  async function addBoard(){const title=prompt("Board name","New Board");if(!title)return;const r=await fetch("/api/cork-boards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({novelId:novel.id,title})});if(r.ok){const b=await r.json();setBoards(v=>[...v,b]);setActive(b.id)}}
  return <div className="app section-shell"><WorkspaceSectionSidebar username={username} novel={novel} active="cork-board" open={navOpen} onClose={()=>setNavOpen(false)}/>{navOpen&&<button className="scrim" onClick={()=>setNavOpen(false)}/>}<main className="section-main cork-page">
    <header className="cork-top"><div className="section-top-left"><button className="menu-button" onClick={()=>setNavOpen(true)}>☰</button></div><div><small>{novel.title}</small><strong>The Cork Board</strong></div><button className="primary" onClick={()=>addNote()}>＋ Sticky</button></header>
    <div className="board-tabs">{boards.map(b=><button className={b.id===active?"active":""} onClick={()=>setActive(b.id)} key={b.id}>{b.title}</button>)}<button onClick={addBoard}>＋ Board</button></div>
    <div className="cork-canvas" onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={e=>{const r=e.currentTarget.getBoundingClientRect();addNote(e.clientX-r.left-110,e.clientY-r.top-40)}}>{notes.filter(n=>n.boardId===active).map(n=><article key={n.id} className={`sticky sticky-${n.color}`} style={{left:n.positionX,top:n.positionY,width:n.width,height:n.height}}><div className="sticky-pin" onPointerDown={e=>{const el=e.currentTarget.parentElement!,r=el.getBoundingClientRect();drag.current={id:n.id,dx:e.clientX-r.left,dy:e.clientY-r.top};e.currentTarget.setPointerCapture(e.pointerId)}}>● <span>drag</span><button onClick={async()=>{await fetch(`/api/sticky-notes/${n.id}`,{method:"DELETE"});setNotes(v=>v.filter(x=>x.id!==n.id))}}>×</button></div><textarea autoFocus={!n.body} placeholder="Write something…" value={n.body} onChange={e=>setNotes(v=>v.map(x=>x.id===n.id?{...x,body:e.target.value}:x))} onBlur={()=>save(notes.find(x=>x.id===n.id)!)} /><div className="sticky-colors">{["yellow","blue","pink","green"].map(c=><button aria-label={c} key={c} className={c} onClick={()=>{const nn={...n,color:c};setNotes(v=>v.map(x=>x.id===n.id?nn:x));save(nn)}} />)}</div></article>)}{!notes.some(n=>n.boardId===active)&&<div className="cork-empty"><strong>Your board is empty</strong><span>Double-click anywhere or add a sticky.</span></div>}</div>
  </main></div>
}

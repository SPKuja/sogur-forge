"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";

type Theme="system"|"light"|"dark";
export type WorkspaceSection="manuscript"|"characters"|"locations"|"cork-board"|"ideas"|"world-notes";

export default function WorkspaceSectionSidebar({username,novel,active,open,onClose,beforeNavigate}:{username:string;novel:{id:string;title:string};active:WorkspaceSection;open:boolean;onClose:()=>void;beforeNavigate?:()=>Promise<void>|void}){
  const router=useRouter(),[theme,setTheme]=useState<Theme>("system");
  useEffect(()=>{const saved=localStorage.getItem("sogur-theme") as Theme|null;if(saved==="light"||saved==="dark"||saved==="system")setTheme(saved)},[]);
  useEffect(()=>{localStorage.setItem("sogur-theme",theme);if(theme==="system")document.documentElement.removeAttribute("data-theme");else document.documentElement.dataset.theme=theme},[theme]);
  async function go(path:string){await beforeNavigate?.();onClose();router.push(path)}
  const item=(section:WorkspaceSection,icon:string,label:string,path?:string)=><button className={active===section?"active":""} disabled={!path&&active!==section} onClick={()=>path&&go(path)}>{icon} <span>{label}</span></button>;
  return <aside className={`sidebar section-sidebar ${open?"open":""}`}>
    <div className="brand"><span>S</span><div><strong>Sögur Forge</strong><small>{username}</small></div><button className="mobile-close" onClick={onClose}>×</button></div>
    <button className="project project-button" onClick={()=>go("/workspace")}><small>← LIBRARY</small><strong>{novel.title}</strong></button>
    <nav>
      {item("manuscript","✦","Manuscript",`/workspace/${novel.id}`)}
      {item("characters","♙","Characters",`/workspace/${novel.id}/characters`)}
      {item("locations","⌖","Locations",`/workspace/${novel.id}/locations`)}
      {item("cork-board","▣","Cork Board",`/workspace/${novel.id}/cork-board`)}
      {item("ideas","◌","Ideas")}
      {item("world-notes","◇","World notes")}
    </nav>
    <div className="sidebar-foot"><button className="sidebar-settings" onClick={()=>go("/settings")}>⚙ <span>Settings</span></button><div className="theme-switch">{(["system","light","dark"] as Theme[]).map(value=><button key={value} className={theme===value?"active":""} onClick={()=>setTheme(value)}>{value==="system"?"Auto":value[0].toUpperCase()+value.slice(1)}</button>)}</div></div>
  </aside>
}

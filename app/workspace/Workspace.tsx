"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Theme = "system" | "light" | "dark";
const chapters = [
  { title: "Ashes in the Rain", content: "Rain had been falling for nine days when the first tower went dark.\n\nMara watched from the tram shelter as the windows vanished floor by floor, a vertical eclipse swallowing the east side of the city." },
  { title: "The Mapmaker", content: "Elias kept his maps in drawers labelled with dates that had never happened.\n\nHe called it contingency planning. Mara called it a warning." },
  { title: "The Door Below", content: "The stairwell ended at a door that should not have existed.\n\nMara stood with one hand against the concrete wall, listening to the slow mechanical pulse behind it. The sound was too deliberate to be plumbing and too deep to be anything human.\n\n‘Tell me you found another way,’ Elias whispered.\n\nShe glanced back at him. Dust silvered his coat, and the old city map shook slightly between his fingers.\n\n‘There isn’t another way.’\n\nFor a moment neither of them moved.\n\nThen the lock clicked." },
];

export default function Workspace({ username }: { username: string }) {
  const router = useRouter();
  const [active, setActive] = useState(2);
  const [drafts, setDrafts] = useState(chapters);
  const [focus, setFocus] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const chapter = drafts[active];
  const words = useMemo(() => chapter.content.trim() ? chapter.content.trim().split(/\s+/).length : 0, [chapter.content]);

  useEffect(() => {
    const saved = localStorage.getItem("sogur-theme") as Theme | null;
    if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("sogur-theme", theme);
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme"); else root.dataset.theme = theme;
  }, [theme]);

  function update(patch: Partial<(typeof chapters)[number]>) { setDrafts(current => current.map((item,index) => index === active ? {...item,...patch} : item)); }
  function chooseChapter(index: number) { setActive(index); setNavOpen(false); }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }

  const sidebar = <aside className={`sidebar ${navOpen ? "open" : ""}`} aria-label="Novel navigation">
    <div className="brand"><span aria-hidden="true">S</span><div><strong>Sögur Forge</strong><small>{username}</small></div><button className="mobile-close" onClick={() => setNavOpen(false)} aria-label="Close navigation">×</button></div>
    <div className="project"><small>CURRENT NOVEL</small><strong>The Last City</strong></div>
    <nav><button className="active">✦ <span>Manuscript</span></button><button>♙ <span>Characters</span></button><button>⌖ <span>Locations</span></button><button>◌ <span>Ideas</span></button><button>◇ <span>World notes</span></button></nav>
    <div className="chapter-head"><small>CHAPTERS</small><button aria-label="Add chapter">＋</button></div>
    <div className="chapters">{drafts.map((item,index) => <button key={index} className={active === index ? "active" : ""} onClick={() => chooseChapter(index)}><small>CHAPTER {String(index+1).padStart(2,"0")}</small>{item.title}</button>)}</div>
    <div className="sidebar-foot"><div className="goal"><div><span>Daily goal</span><strong>1,000</strong></div><i><b style={{width:`${Math.min(100,words/10)}%`}} /></i><small>{words} words this chapter</small></div><div className="theme-switch" aria-label="Appearance">{(["system","light","dark"] as Theme[]).map(value => <button key={value} className={theme === value ? "active" : ""} onClick={() => setTheme(value)}>{value === "system" ? "Auto" : value[0].toUpperCase()+value.slice(1)}</button>)}</div></div>
  </aside>;

  return <div className={focus ? "app focus" : "app"}>
    {!focus && sidebar}
    {!focus && navOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <main>
      {!focus && <header><div className="header-left"><button className="menu-button" onClick={() => setNavOpen(true)} aria-label="Open navigation">☰</button><span>The Last City <b>/</b> <strong>{chapter.title}</strong></span></div><div className="header-actions"><span className="session-dot"><i />Saved</span><button onClick={() => setNotesOpen(true)} className="notes-button">Notes</button><button onClick={() => setFocus(true)}>Focus</button><button onClick={logout} className="signout">Sign out</button></div></header>}
      <section className="manuscript"><div className="editor">{focus && <button className="exit" onClick={() => setFocus(false)}>Exit focus</button>}<input aria-label="Chapter title" value={chapter.title} onChange={e => update({title:e.target.value})}/><p className="meta">Chapter {String(active+1).padStart(2,"0")} · {words} words · {Math.max(1,Math.ceil(words/220))} min read</p><textarea aria-label="Manuscript" spellCheck value={chapter.content} onChange={e => update({content:e.target.value})}/></div>{!focus && <aside className={`notes ${notesOpen ? "open" : ""}`}><div className="notes-title"><small>CHAPTER NOTES</small><button onClick={() => setNotesOpen(false)} aria-label="Close notes">×</button></div><label>Status</label><select><option>Draft</option><option>Revise</option><option>Done</option></select><label>POV character</label><select><option>Mara Venn</option><option>Elias Thorn</option></select><label>Summary</label><textarea defaultValue="Mara and Elias reach the sealed level beneath the old transit hub and discover that someone has been waiting for them." /></aside>}</section>
      {!focus && notesOpen && <button className="notes-scrim" aria-label="Close notes" onClick={() => setNotesOpen(false)} />}
    </main>
  </div>;
}

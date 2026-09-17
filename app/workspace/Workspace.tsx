"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const chapters = [
  { title: "Ashes in the Rain", content: "Rain had been falling for nine days when the first tower went dark.\n\nMara watched from the tram shelter as the windows vanished floor by floor, a vertical eclipse swallowing the east side of the city." },
  { title: "The Mapmaker", content: "Elias kept his maps in drawers labelled with dates that had never happened.\n\nHe called it contingency planning. Mara called it a warning." },
  { title: "The Door Below", content: "The stairwell ended at a door that should not have existed.\n\nMara stood with one hand against the concrete wall, listening to the slow mechanical pulse behind it. The sound was too deliberate to be plumbing and too deep to be anything human.\n\n‘Tell me you found another way,’ Elias whispered.\n\nShe glanced back at him. Dust silvered his coat, and the old city map shook slightly between his fingers.\n\n‘There isn’t another way.’\n\nFor a moment neither of them moved.\n\nThen the lock clicked." },
];

export default function Workspace({ username }: { username: string }) {
  const router = useRouter();
  const [active, setActive] = useState(2); const [drafts, setDrafts] = useState(chapters); const [focus, setFocus] = useState(false);
  const chapter = drafts[active]; const words = useMemo(() => chapter.content.trim() ? chapter.content.trim().split(/\s+/).length : 0, [chapter.content]);
  function update(patch: Partial<(typeof chapters)[number]>) { setDrafts(current => current.map((item,index) => index === active ? {...item,...patch} : item)); }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }
  return <div className={focus ? "app focus" : "app"}>
    {!focus && <aside className="sidebar"><div className="brand"><span>S</span><div><strong>Sögur Forge</strong><small>{username}</small></div></div><div className="project"><small>CURRENT NOVEL</small><strong>The Last City</strong></div><nav><button className="active">✦ Manuscript</button><button>♙ Characters</button><button>⌖ Locations</button><button>◌ Ideas</button><button>◇ World notes</button></nav><div className="chapter-head"><small>CHAPTERS</small><button>＋</button></div><div className="chapters">{drafts.map((item,index) => <button key={index} className={active === index ? "active" : ""} onClick={() => setActive(index)}><small>CHAPTER {String(index+1).padStart(2,"0")}</small>{item.title}</button>)}</div><div className="goal"><div><span>Daily goal</span><strong>1,000 words</strong></div><i><b style={{width:`${Math.min(100,words/10)}%`}} /></i><small>Current chapter: {words} words</small></div></aside>}
    <main>{!focus && <header><span>The Last City&nbsp;&nbsp;/&nbsp;&nbsp;<strong>{chapter.title}</strong></span><div><em>Secure session</em><button onClick={() => setFocus(true)}>Focus mode</button><button onClick={logout}>Sign out</button></div></header>}<section className="manuscript"><div className="editor">{focus && <button className="exit" onClick={() => setFocus(false)}>Exit focus</button>}<input aria-label="Chapter title" value={chapter.title} onChange={e => update({title:e.target.value})}/><p className="meta">{words} words · {Math.max(1,Math.ceil(words/220))} min read</p><textarea aria-label="Manuscript" spellCheck value={chapter.content} onChange={e => update({content:e.target.value})}/></div>{!focus && <aside className="notes"><small>CHAPTER NOTES</small><label>Status</label><select><option>Draft</option><option>Revise</option><option>Done</option></select><label>POV character</label><select><option>Mara Venn</option><option>Elias Thorn</option></select><label>Summary</label><textarea defaultValue="Mara and Elias reach the sealed level beneath the old transit hub and discover that someone has been waiting for them." /></aside>}</section></main>
  </div>;
}

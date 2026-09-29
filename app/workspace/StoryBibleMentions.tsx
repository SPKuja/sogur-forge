"use client";
import {useEffect,useState} from "react";

type Kind="CHARACTER"|"LOCATION"|"WORLD_NOTE";
type Mention={chapterId:string;title:string;kind:string;pageType:string|null;partTitle:string|null;occurrences:number;snippet:string};

export default function StoryBibleMentions({novelId,kind,entityId}:{novelId:string;kind:Kind;entityId:string}){
  const [mentions,setMentions]=useState<Mention[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError(false);
    fetch(`/api/story-bible/mentions?kind=\${encodeURIComponent(kind)}&id=\${encodeURIComponent(entityId)}`,{cache:"no-store",signal:controller.signal})
      .then(async response=>{if(!response.ok)throw new Error();return response.json()})
      .then(data=>{setMentions(data.mentions||[]);setTotal(Number(data.totalOccurrences||0));setLoading(false)})
      .catch(err=>{if(err?.name!=="AbortError"){setError(true);setLoading(false)}});
    return()=>controller.abort();
  },[kind,entityId]);
  return <section className="character-section bible-mentions"><div className="character-section-title"><div><h2>Mentioned in manuscript</h2><p>{loading?"Scanning manuscript…":error?"Could not scan the manuscript.":total?`\${total} mention\${total===1?"":"s"} across \${mentions.length} manuscript item\${mentions.length===1?"":"s"}.`:"No manuscript mentions found yet."}</p></div>{!loading&&!error&&total>0&&<b className="bible-mention-total">{total}</b>}</div>{!loading&&!error&&mentions.length>0&&<div className="bible-mention-list">{mentions.map(item=><a key={item.chapterId} href={`/workspace/\${novelId}?chapter=\${encodeURIComponent(item.chapterId)}`}><div><small>{item.partTitle||"MANUSCRIPT"}</small><strong>{item.title}</strong></div><p>{item.snippet}</p><span>{item.occurrences}×</span></a>)}</div>}{loading&&<div className="bible-mention-empty">Finding references…</div>}{error&&<div className="bible-mention-empty">Refresh the page to try again.</div>}</section>;
}

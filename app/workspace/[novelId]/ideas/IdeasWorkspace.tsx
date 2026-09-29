"use client";
import {PointerEvent,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import WorkspaceSectionSidebar from "../../WorkspaceSectionSidebar";
import AssetPicker,{type ProjectAsset} from "../../AssetPicker";

type Board={id:string;title:string;position:number};
type Placement={id:string;ideaId:string;boardId:string;color:string;positionX:number;positionY:number;width:number;height:number};
type IdeaImage={id:string;assetId:string;caption:string;position:number;url:string};
type IdeaAudio={id:string;originalName:string;mimeType:string;size:number;durationMs:number;createdAt:string;url:string};
type Idea={id:string;title:string;body:string;category:string;tags:string;status:string;chapterId:string|null;anchorId:string|null;anchorQuote:string|null;createdAt:string;updatedAt:string;images:IdeaImage[];audio:IdeaAudio[];characterIds:string[];locationIds:string[];worldNoteIds:string[]};
type Chapter={id:string;title:string;kind:string;pageType:string|null};
type Character={id:string;name:string;role:string};
type Location={id:string;name:string;type:string;region:string};
type WorldNote={id:string;name:string;category:string};
type View="library"|"boards";
const statuses=[["INBOX","Inbox"],["DEVELOPING","Developing"],["USED","Used"],["ARCHIVED","Archived"]] as const;
const categories=["Plot","Character","Dialogue","Scene idea","Research","Question","Worldbuilding","Theme","Idea"];
const colors=["yellow","blue","pink","green"];
const statusLabel=(value:string)=>statuses.find(([id])=>id===value)?.[1]||value;
const bytes=(value:number)=>value<1024?value+" B":value<1024*1024?Math.max(1,Math.round(value/1024))+" KB":(value/1024/1024).toFixed(1)+" MB";
const snap=(idea:Idea)=>JSON.stringify({title:idea.title,body:idea.body,category:idea.category,tags:idea.tags,status:idea.status,chapterId:idea.chapterId,anchorId:idea.anchorId,anchorQuote:idea.anchorQuote});

export default function IdeasWorkspace({username,novel,initialBoards,initialIdeas,initialPlacements,chapters,characters,locations,worldNotes,initialIdeaId}:{username:string;novel:{id:string;title:string};initialBoards:Board[];initialIdeas:Idea[];initialPlacements:Placement[];chapters:Chapter[];characters:Character[];locations:Location[];worldNotes:WorldNote[];initialIdeaId?:string}){
  const router=useRouter();
  const [boards,setBoards]=useState(initialBoards),[ideas,setIdeas]=useState(initialIdeas),[placements,setPlacements]=useState(initialPlacements),[view,setView]=useState<View>("library"),[activeIdeaId,setActiveIdeaId]=useState(initialIdeaId??initialIdeas[0]?.id??""),[activeBoardId,setActiveBoardId]=useState(initialBoards[0]?.id??""),[navOpen,setNavOpen]=useState(false),[search,setSearch]=useState(""),[assetPickerOpen,setAssetPickerOpen]=useState(false),[error,setError]=useState(""),[recording,setRecording]=useState(false),[uploadingAudio,setUploadingAudio]=useState(false);
  const timers=useRef(new Map<string,ReturnType<typeof setTimeout>>()),saved=useRef(new Map(initialIdeas.map(idea=>[idea.id,snap(idea)]))),drag=useRef<{id:string;dx:number;dy:number}|null>(null),recorderRef=useRef<MediaRecorder|null>(null),streamRef=useRef<MediaStream|null>(null),chunksRef=useRef<Blob[]>([]),recordingStart=useRef(0),audioInputRef=useRef<HTMLInputElement>(null);
  const active=ideas.find(idea=>idea.id===activeIdeaId)??ideas[0]??null;
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return ideas.filter(idea=>!q||[idea.title,idea.body,idea.category,idea.tags,statusLabel(idea.status)].some(value=>value.toLowerCase().includes(q)))},[ideas,search]);
  const boardPlacements=placements.filter(item=>item.boardId===activeBoardId);
  const boardIdeas=boardPlacements.map(item=>({placement:item,idea:ideas.find(idea=>idea.id===item.ideaId)})).filter(item=>item.idea) as Array<{placement:Placement;idea:Idea}>;
  useEffect(()=>()=>{for(const timer of timers.current.values())clearTimeout(timer);streamRef.current?.getTracks().forEach(track=>track.stop())},[]);

  async function persist(idea:Idea){
    const body=snap(idea);if(saved.current.get(idea.id)===body)return;
    try{const response=await fetch(`/api/ideas/${idea.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body});if(!response.ok)throw new Error();saved.current.set(idea.id,body)}catch{setError("An idea could not be saved.")}
  }
  function updateIdea(id:string,patch:Partial<Idea>){
    setIdeas(list=>list.map(idea=>{if(idea.id!==id)return idea;const next={...idea,...patch,updatedAt:new Date().toISOString()};const old=timers.current.get(id);if(old)clearTimeout(old);timers.current.set(id,setTimeout(()=>{timers.current.delete(id);void persist(next)},600));return next}))
  }
  async function createIdea(boardId?:string,positionX=60,positionY=60){
    setError("");const response=await fetch("/api/ideas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({novelId:novel.id,title:"",category:"Idea",status:"INBOX",boardId:boardId||null,positionX,positionY})});
    const data=await response.json().catch(()=>({error:"Idea could not be created."}));if(!response.ok){setError(data.error||"Idea could not be created.");return}
    const idea:Idea={id:data.id,title:"",body:"",category:"Idea",tags:"",status:"INBOX",chapterId:null,anchorId:null,anchorQuote:null,createdAt:data.createdAt,updatedAt:data.updatedAt,images:[],audio:[],characterIds:[],locationIds:[],worldNoteIds:[]};
    setIdeas(list=>[idea,...list]);saved.current.set(idea.id,snap(idea));if(data.placement)setPlacements(list=>[...list,data.placement]);setActiveIdeaId(idea.id);if(!boardId)setView("library");
  }
  async function deleteIdea(idea:Idea){
    if(!confirm(`Delete "${idea.title||"Untitled idea"}"? This removes it from every board and deletes its voice notes.`))return;
    const response=await fetch(`/api/ideas/${idea.id}`,{method:"DELETE"});if(!response.ok){setError("The idea could not be deleted.");return}
    setIdeas(list=>list.filter(item=>item.id!==idea.id));setPlacements(list=>list.filter(item=>item.ideaId!==idea.id));saved.current.delete(idea.id);if(activeIdeaId===idea.id)setActiveIdeaId(ideas.find(item=>item.id!==idea.id)?.id??"");
  }

  async function attachImage(asset:ProjectAsset){
    if(!active)return;setAssetPickerOpen(false);const response=await fetch(`/api/ideas/${active.id}/images`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({assetId:asset.id})});if(!response.ok){setError("Image could not be attached.");return}
    const image=await response.json() as IdeaImage;setIdeas(list=>list.map(idea=>idea.id===active.id?{...idea,images:idea.images.some(item=>item.id===image.id)?idea.images:[...idea.images,image]}:idea));
  }
  async function removeImage(image:IdeaImage){if(!active)return;const response=await fetch(`/api/ideas/${active.id}/images/${image.id}`,{method:"DELETE"});if(response.ok)setIdeas(list=>list.map(idea=>idea.id===active.id?{...idea,images:idea.images.filter(item=>item.id!==image.id)}:idea))}
  async function saveImageCaption(image:IdeaImage,caption:string){if(!active)return;setIdeas(list=>list.map(idea=>idea.id===active.id?{...idea,images:idea.images.map(item=>item.id===image.id?{...item,caption}:item)}:idea));await fetch(`/api/ideas/${active.id}/images/${image.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({caption})})}

  async function uploadAudio(file:File,durationMs=0){
    if(!active)return;setUploadingAudio(true);setError("");const form=new FormData();form.set("file",file);form.set("durationMs",String(durationMs));
    try{const response=await fetch(`/api/ideas/${active.id}/audio`,{method:"POST",body:form});const data=await response.json().catch(()=>({error:"Audio upload failed."}));if(!response.ok)throw new Error(data.error||"Audio upload failed.");setIdeas(list=>list.map(idea=>idea.id===active.id?{...idea,audio:[...idea.audio,data as IdeaAudio]}:idea))}catch(err){setError(err instanceof Error?err.message:"Audio upload failed.")}finally{setUploadingAudio(false)}
  }
  async function startRecording(){
    if(!active||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setError("Audio recording is not supported by this browser.");return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});streamRef.current=stream;chunksRef.current=[];
      const preferred=["audio/webm;codecs=opus","audio/mp4","audio/webm"].find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);recorderRef.current=recorder;recordingStart.current=Date.now();
      recorder.ondataavailable=event=>{if(event.data.size)chunksRef.current.push(event.data)};
      recorder.onstop=()=>{const duration=Date.now()-recordingStart.current,mime=recorder.mimeType.split(";")[0]||"audio/webm",blob=new Blob(chunksRef.current,{type:mime}),ext=mime.includes("mp4")?"m4a":mime.includes("ogg")?"ogg":"webm",file=new File([blob],`voice-note-${Date.now()}.${ext}`,{type:mime});stream.getTracks().forEach(track=>track.stop());streamRef.current=null;setRecording(false);void uploadAudio(file,duration)};
      recorder.start();setRecording(true);
    }catch{setError("Microphone access was not available.")}
  }
  function stopRecording(){if(recorderRef.current?.state==="recording")recorderRef.current.stop()}
  async function removeAudio(audio:IdeaAudio){if(!active||!confirm("Delete this voice note?"))return;const response=await fetch(`/api/ideas/audio/${audio.id}`,{method:"DELETE"});if(response.ok)setIdeas(list=>list.map(idea=>idea.id===active.id?{...idea,audio:idea.audio.filter(item=>item.id!==audio.id)}:idea))}

  async function saveLinks(idea:Idea,patch:Partial<Pick<Idea,"characterIds"|"locationIds"|"worldNoteIds">>){
    const next={...idea,...patch};setIdeas(list=>list.map(item=>item.id===idea.id?next:item));
    const response=await fetch(`/api/ideas/${idea.id}/links`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({characterIds:next.characterIds,locationIds:next.locationIds,worldNoteIds:next.worldNoteIds})});if(!response.ok)setError("Story Bible links could not be saved.");
  }
  function toggleLink(kind:"characterIds"|"locationIds"|"worldNoteIds",id:string){if(!active)return;const list=active[kind],next=list.includes(id)?list.filter(item=>item!==id):[...list,id];void saveLinks(active,{[kind]:next})}

  async function addToBoard(idea:Idea,boardId:string){
    const response=await fetch(`/api/ideas/${idea.id}/boards`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({boardId,positionX:70+placements.filter(item=>item.boardId===boardId).length*18,positionY:70+placements.filter(item=>item.boardId===boardId).length*14})});const data=await response.json().catch(()=>({}));if(response.ok)setPlacements(list=>[...list,data]);else setError(data.error||"Idea could not be added to that board.");
  }
  async function removePlacement(placement:Placement){const response=await fetch(`/api/idea-placements/${placement.id}`,{method:"DELETE"});if(response.ok)setPlacements(list=>list.filter(item=>item.id!==placement.id))}
  async function savePlacement(placement:Placement){await fetch(`/api/idea-placements/${placement.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(placement)})}
  function move(event:PointerEvent<HTMLDivElement>){if(!drag.current)return;const box=event.currentTarget.getBoundingClientRect(),d=drag.current;setPlacements(list=>list.map(item=>item.id===d.id?{...item,positionX:Math.max(0,event.clientX-box.left-d.dx),positionY:Math.max(0,event.clientY-box.top-d.dy)}:item))}
  function endDrag(){if(!drag.current)return;const placement=placements.find(item=>item.id===drag.current!.id);drag.current=null;if(placement)void savePlacement(placement)}
  async function setPlacementColor(placement:Placement,color:string){const next={...placement,color};setPlacements(list=>list.map(item=>item.id===placement.id?next:item));await savePlacement(next)}

  async function addBoard(){const title=prompt("Board name","New Board")?.trim();if(!title)return;const response=await fetch("/api/cork-boards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({novelId:novel.id,title})});if(response.ok){const board=await response.json();setBoards(list=>[...list,board]);setActiveBoardId(board.id)}}
  async function renameBoard(){const board=boards.find(item=>item.id===activeBoardId);if(!board)return;const title=prompt("Board name",board.title)?.trim();if(!title||title===board.title)return;const response=await fetch(`/api/cork-boards/${board.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title})});if(response.ok)setBoards(list=>list.map(item=>item.id===board.id?{...item,title}:item))}
  async function deleteBoard(){const board=boards.find(item=>item.id===activeBoardId);if(!board||boards.length<=1)return;if(!confirm(`Delete board "${board.title}"? Ideas remain in the Library and on any other boards.`))return;const response=await fetch(`/api/cork-boards/${board.id}`,{method:"DELETE"});if(response.ok){setBoards(list=>list.filter(item=>item.id!==board.id));setPlacements(list=>list.filter(item=>item.boardId!==board.id));setActiveBoardId(boards.find(item=>item.id!==board.id)?.id??"")}}

  async function createBibleEntry(kind:"CHARACTER"|"LOCATION"|"WORLD_NOTE"){
    if(!active)return;const name=(active.title.trim()||active.body.trim().split(/\n/)[0]||"New entry").slice(0,180),endpoint=kind==="CHARACTER"?"/api/characters":kind==="LOCATION"?"/api/locations":"/api/world-notes";
    const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({novelId:novel.id,name})});const data=await response.json().catch(()=>({}));if(!response.ok){setError(data.error||"Story Bible entry could not be created.");return}
    if(kind==="CHARACTER")await saveLinks(active,{characterIds:[...new Set([...active.characterIds,data.id])]});if(kind==="LOCATION")await saveLinks(active,{locationIds:[...new Set([...active.locationIds,data.id])]});if(kind==="WORLD_NOTE")await saveLinks(active,{worldNoteIds:[...new Set([...active.worldNoteIds,data.id])]});
    router.push(kind==="CHARACTER"?`/workspace/${novel.id}/characters?character=${data.id}`:kind==="LOCATION"?`/workspace/${novel.id}/locations?location=${data.id}`:`/workspace/${novel.id}/world-notes?note=${data.id}`);
  }

  function IdeaEditor(){
    if(!active)return <div className="ideas-editor-empty"><strong>No idea selected</strong><span>Create an idea or choose one from the list.</span></div>;
    const tags=active.tags.split(",").map(tag=>tag.trim()).filter(Boolean),chapter=chapters.find(item=>item.id===active.chapterId);
    return <div className="idea-editor-panel idea-editor-simple">
      <div className="idea-editor-head idea-editor-head-simple"><div><small>IDEA</small><input value={active.title} onChange={event=>updateIdea(active.id,{title:event.target.value})} placeholder="Give this idea a title…"/></div><button className="danger" onClick={()=>void deleteIdea(active)}>Delete</button></div>
      <label className="idea-field idea-main-field"><span>Notes</span><textarea autoFocus={!active.title&&!active.body} value={active.body} onChange={event=>updateIdea(active.id,{body:event.target.value})} placeholder="Write it down before it disappears…"/></label>
      <div className="idea-quick-actions">
        <button onClick={()=>setAssetPickerOpen(true)}>▧ Add image</button>
        <button className={recording?"recording":""} disabled={uploadingAudio} onClick={()=>recording?stopRecording():void startRecording()}>{recording?"■ Stop recording":"● Record voice note"}</button>
        <button disabled={uploadingAudio} onClick={()=>audioInputRef.current?.click()}>↑ Upload audio</button>
        <input ref={audioInputRef} hidden type="file" accept="audio/*" onChange={event=>{const file=event.target.files?.[0];if(file)void uploadAudio(file);event.currentTarget.value=""}}/>
        <span>Changes save automatically</span>
      </div>
      {(active.images.length>0||active.audio.length>0)&&<section className="idea-attachments">
        <div className="idea-attachments-head"><strong>Attachments</strong><small>{active.images.length} image{active.images.length===1?"":"s"} · {active.audio.length} voice note{active.audio.length===1?"":"s"}</small></div>
        {active.images.length>0&&<div className="idea-image-grid">{active.images.map(image=><article key={image.id}><img src={image.url} alt=""/><input defaultValue={image.caption} onBlur={event=>void saveImageCaption(image,event.target.value)} placeholder="Caption"/><button title="Remove image" onClick={()=>void removeImage(image)}>×</button></article>)}</div>}
        {active.audio.length>0&&<div className="idea-audio-list">{active.audio.map(audio=><article key={audio.id}><div><strong>{audio.originalName}</strong><small>{bytes(audio.size)}{audio.durationMs?" · "+Math.round(audio.durationMs/1000)+" sec":""}</small></div><audio controls preload="metadata" src={audio.url}/><button title="Delete voice note" onClick={()=>void removeAudio(audio)}>×</button></article>)}</div>}
      </section>}
      <details className="idea-more">
        <summary><span>More</span><small>{active.category||"Idea"} · {statusLabel(active.status)}{tags.length?" · "+tags.length+" tag"+(tags.length===1?"":"s"):""}</small></summary>
        <div className="idea-more-content">
          <div className="idea-meta-grid"><label><span>Status</span><select value={active.status} onChange={event=>updateIdea(active.id,{status:event.target.value})}>{statuses.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label><span>Category</span><input list="idea-categories" value={active.category} onChange={event=>updateIdea(active.id,{category:event.target.value})}/><datalist id="idea-categories">{categories.map(category=><option key={category} value={category}/>)}</datalist></label></div>
          <label className="idea-field"><span>Tags <i>comma separated</i></span><input value={active.tags} onChange={event=>updateIdea(active.id,{tags:event.target.value})} placeholder="mystery, act two, research…"/></label>{tags.length>0&&<div className="idea-tags">{tags.map(tag=><span key={tag}>#{tag}</span>)}</div>}
          <section className="idea-more-group"><div className="idea-section-title"><div><strong>Manuscript</strong><small>Optionally tie the idea to a chapter or captured passage.</small></div>{chapter&&<button onClick={()=>router.push(`/workspace/${novel.id}?chapter=${chapter.id}`)}>Open chapter →</button>}</div><select className="idea-wide-select" value={active.chapterId??""} onChange={event=>updateIdea(active.id,{chapterId:event.target.value||null,anchorId:null,anchorQuote:null})}><option value="">Not linked to a chapter</option>{chapters.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select>{active.anchorQuote&&<blockquote className="idea-anchor-quote">“{active.anchorQuote}”</blockquote>}</section>
          <section className="idea-more-group"><div className="idea-section-title"><div><strong>Corkboard</strong><small>Choose which visual boards should show this idea.</small></div></div><div className="idea-check-grid">{boards.map(board=>{const placement=placements.find(item=>item.ideaId===active.id&&item.boardId===board.id);return <label key={board.id}><input type="checkbox" checked={Boolean(placement)} onChange={()=>placement?void removePlacement(placement):void addToBoard(active,board.id)}/><span>{board.title}</span></label>})}</div></section>
          <section className="idea-more-group"><div className="idea-section-title"><div><strong>Story Bible</strong><small>Link the idea only when it becomes useful to the world or cast.</small></div></div>
            <details><summary>Characters <b>{active.characterIds.length}</b></summary><div className="idea-check-grid">{characters.map(item=><label key={item.id}><input type="checkbox" checked={active.characterIds.includes(item.id)} onChange={()=>toggleLink("characterIds",item.id)}/><span>{item.name}<small>{item.role}</small></span></label>)}</div></details>
            <details><summary>Locations <b>{active.locationIds.length}</b></summary><div className="idea-check-grid">{locations.map(item=><label key={item.id}><input type="checkbox" checked={active.locationIds.includes(item.id)} onChange={()=>toggleLink("locationIds",item.id)}/><span>{item.name}<small>{[item.type,item.region].filter(Boolean).join(" · ")}</small></span></label>)}</div></details>
            <details><summary>World Notes <b>{active.worldNoteIds.length}</b></summary><div className="idea-check-grid">{worldNotes.map(item=><label key={item.id}><input type="checkbox" checked={active.worldNoteIds.includes(item.id)} onChange={()=>toggleLink("worldNoteIds",item.id)}/><span>{item.name}<small>{item.category}</small></span></label>)}</div></details>
            <div className="idea-promote"><span>Turn this idea into…</span><button onClick={()=>void createBibleEntry("CHARACTER")}>♙ Character</button><button onClick={()=>void createBibleEntry("LOCATION")}>⌖ Location</button><button onClick={()=>void createBibleEntry("WORLD_NOTE")}>◇ World Note</button></div>
          </section>
        </div>
      </details>
    </div>;
  }

  return <div className="app section-shell"><WorkspaceSectionSidebar username={username} novel={novel} active="ideas" open={navOpen} onClose={()=>setNavOpen(false)}/>{navOpen&&<button className="scrim" onClick={()=>setNavOpen(false)}/>}<main className="section-main ideas-page">
    <header className="ideas-top"><div className="section-top-left"><button className="menu-button" onClick={()=>setNavOpen(true)}>☰</button></div><div><small>{novel.title}</small><strong>{view==="library"?"Ideas":"Corkboard"}</strong></div><div className="ideas-top-actions"><button className="secondary" onClick={()=>setView(view==="library"?"boards":"library")}>{view==="library"?"▣ Corkboard":"← Ideas"}</button><button className="primary" onClick={()=>void createIdea(view==="boards"?activeBoardId:undefined)}>＋ Idea</button></div></header>
    {error&&<p className="ideas-error">{error}<button onClick={()=>setError("")}>×</button></p>}
    {view==="library"?<div className="ideas-library-layout"><aside className="ideas-index"><div className="ideas-index-head"><strong>Ideas</strong><b>{ideas.length}</b></div><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search ideas…"/><div className="ideas-list">{filtered.map(idea=><button key={idea.id} className={active?.id===idea.id?"active":""} onClick={()=>setActiveIdeaId(idea.id)}>{idea.images[0]?<img src={idea.images[0].url} alt=""/>:<span>◌</span>}<div><strong>{idea.title||idea.body.trim().split(/\n/)[0]||"Untitled idea"}</strong><small>{[idea.category!=="Idea"?idea.category:null,statusLabel(idea.status)].filter(Boolean).join(" · ")}</small><p>{idea.body||"No notes yet"}</p></div>{idea.audio.length>0&&<b>♪</b>}</button>)}{!filtered.length&&<div className="ideas-list-empty"><strong>{ideas.length?"No ideas match that search.":"Capture your first idea"}</strong><span>{ideas.length?"Try a different word.":"Start with a title or just write the thought down."}</span></div>}</div></aside><section className="ideas-editor"><IdeaEditor/></section></div>:
      <div className="ideas-board-view"><div className="ideas-board-tabs">{boards.map(board=><button key={board.id} className={board.id===activeBoardId?"active":""} onClick={()=>setActiveBoardId(board.id)}>{board.title}<small>{placements.filter(item=>item.boardId===board.id).length}</small></button>)}<button onClick={()=>void addBoard()}>＋ Board</button><span/><button title="Rename current board" onClick={()=>void renameBoard()}>Rename</button><button className="danger" disabled={boards.length<=1} title="Delete current board" onClick={()=>void deleteBoard()}>Delete board</button></div>
        <div className="ideas-cork-canvas" onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag} onDoubleClick={event=>{if(event.target!==event.currentTarget)return;const box=event.currentTarget.getBoundingClientRect();void createIdea(activeBoardId,event.clientX-box.left-120,event.clientY-box.top-40)}}>{boardIdeas.map(({placement,idea})=><article key={placement.id} className={`idea-sticky sticky-${placement.color}`} style={{left:placement.positionX,top:placement.positionY,width:placement.width,height:placement.height}}><div className="idea-sticky-pin" onPointerDown={event=>{if((event.target as HTMLElement).closest("button"))return;const box=event.currentTarget.parentElement!.getBoundingClientRect();drag.current={id:placement.id,dx:event.clientX-box.left,dy:event.clientY-box.top};event.currentTarget.setPointerCapture(event.pointerId)}}>● <span>{idea.category}</span><button title="Edit idea" onPointerDown={event=>event.stopPropagation()} onClick={()=>{setActiveIdeaId(idea.id);setView("library")}}>↗</button><button title="Remove from this board" onPointerDown={event=>event.stopPropagation()} onClick={()=>void removePlacement(placement)}>×</button></div>{idea.images[0]&&<button className="idea-sticky-image" onClick={()=>{setActiveIdeaId(idea.id);setView("library")}}><img src={idea.images[0].url} alt=""/></button>}<button className="idea-sticky-content" onClick={()=>{setActiveIdeaId(idea.id);setView("library")}}><strong>{idea.title||"Untitled idea"}</strong><p>{idea.body||"No notes yet"}</p></button><footer><span>{statusLabel(idea.status)}</span>{idea.audio.length>0&&<b>♪ {idea.audio.length}</b>}<div>{colors.map(color=><button key={color} className={color===placement.color?"active "+color:color} aria-label={color} onClick={()=>void setPlacementColor(placement,color)}/>)}</div></footer></article>)}{!boardIdeas.length&&<div className="ideas-board-empty"><strong>This board is empty</strong><span>Double-click anywhere to capture an idea here, or add an existing idea from More → Corkboard.</span></div>}</div>
      </div>}
    {assetPickerOpen&&active&&<AssetPicker novelId={novel.id} title={`Add image to ${active.title||"idea"}`} onClose={()=>setAssetPickerOpen(false)} onSelect={attachImage}/>}
  </main></div>;
}

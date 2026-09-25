"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import WorkspaceSectionSidebar from "../../WorkspaceSectionSidebar";
import AssetPicker,{type ProjectAsset} from "../../AssetPicker";

type LocationImage={id:string;assetId:string;caption:string;position:number;url:string};
type Place={id:string;parentId:string|null;name:string;aliases:string;type:string;region:string;description:string;atmosphere:string;history:string;significance:string;notes:string;position:number;images:LocationImage[]};
type CharacterOption={id:string;name:string;role:string;portraitUrl:string|null};
type CharacterLink={id:string;locationId:string;characterId:string;type:string;notes:string};
type SaveState="saved"|"saving"|"error";
const editable=(place:Place)=>({parentId:place.parentId,name:place.name,aliases:place.aliases,type:place.type,region:place.region,description:place.description,atmosphere:place.atmosphere,history:place.history,significance:place.significance,notes:place.notes});
const snap=(place:Place)=>JSON.stringify(editable(place));
const linkOptions=[["LIVES_HERE","Lives here"],["BORN_HERE","Born here"],["RULES","Rules / governs"],["WORKS_HERE","Works here"],["VISITS","Visits"],["ASSOCIATED","Associated"]] as const;
const linkLabel=(type:string)=>linkOptions.find(([value])=>value===type)?.[1]??"Associated";
const ordered=(images:LocationImage[])=>[...images].sort((a,b)=>a.position-b.position);

function LocationField({label,value,onChange,placeholder,large=false}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string;large?:boolean}){
  return <label className={large?"character-field character-field-large":"character-field"}><span>{label}</span><textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;
}

function hierarchyRows(locations:Place[]){
  const byParent=new Map<string,Place[]>();
  for(const place of locations){
    const key=place.parentId??"";
    const list=byParent.get(key)??[];
    list.push(place);
    byParent.set(key,list);
  }
  for(const list of byParent.values())list.sort((a,b)=>a.position-b.position);
  const result:Array<{place:Place;depth:number}>=[],seen=new Set<string>();
  const walk=(parentId:string,depth:number)=>{
    for(const place of byParent.get(parentId)??[]){
      if(seen.has(place.id))continue;
      seen.add(place.id);result.push({place,depth});walk(place.id,depth+1);
    }
  };
  walk("",0);
  for(const place of [...locations].sort((a,b)=>a.position-b.position))if(!seen.has(place.id))result.push({place,depth:0});
  return result;
}

function descendantIds(locations:Place[],id:string){
  const result=new Set<string>(),queue=[id];
  while(queue.length){
    const parent=queue.shift()!;
    for(const child of locations.filter(place=>place.parentId===parent))if(!result.has(child.id)){result.add(child.id);queue.push(child.id)}
  }
  return result;
}

function pathLabel(place:Place,locations:Place[]){
  const names:string[]=[],seen=new Set<string>();let parentId=place.parentId;
  while(parentId&&!seen.has(parentId)){
    seen.add(parentId);const parent=locations.find(item=>item.id===parentId);if(!parent)break;names.unshift(parent.name);parentId=parent.parentId;
  }
  return names.join(" › ");
}

export default function LocationBible({username,novel,initialLocations,characters,initialCharacterLinks}:{username:string;novel:{id:string;title:string};initialLocations:Place[];characters:CharacterOption[];initialCharacterLinks:CharacterLink[]}){
  const [locations,setLocations]=useState(initialLocations),[activeId,setActiveId]=useState(initialLocations[0]?.id??""),[queryText,setQueryText]=useState(""),[save,setSave]=useState<SaveState>("saved"),[navOpen,setNavOpen]=useState(false),[deleting,setDeleting]=useState(false),[deletePhrase,setDeletePhrase]=useState(""),[assetPickerOpen,setAssetPickerOpen]=useState(false),[imageError,setImageError]=useState(""),[characterLinks,setCharacterLinks]=useState(initialCharacterLinks),[addingCharacter,setAddingCharacter]=useState(false),[characterTarget,setCharacterTarget]=useState(""),[characterType,setCharacterType]=useState("ASSOCIATED"),[characterNotes,setCharacterNotes]=useState(""),[characterError,setCharacterError]=useState("");
  const locationsRef=useRef(initialLocations),activeRef=useRef(activeId),timers=useRef(new Map<string,ReturnType<typeof setTimeout>>()),saved=useRef(new Map(initialLocations.map(place=>[place.id,snap(place)]))),seq=useRef(new Map<string,number>());
  const active=locations.find(place=>place.id===activeId)??locations[0],activeImages=ordered(active?.images??[]),primaryImage=activeImages[0],activeLinks=active?characterLinks.filter(link=>link.locationId===active.id):[];
  useEffect(()=>{locationsRef.current=locations},[locations]);useEffect(()=>{activeRef.current=activeId},[activeId]);

  async function persist(place:Place,keepalive=false){
    const body=snap(place);if(saved.current.get(place.id)===body)return true;
    const n=(seq.current.get(place.id)??0)+1;seq.current.set(place.id,n);setSave("saving");
    try{
      const response=await fetch(`/api/locations/${place.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(editable(place)),keepalive});
      if(!response.ok)throw new Error();
      if(seq.current.get(place.id)===n){saved.current.set(place.id,body);setSave("saved")}return true;
    }catch{if(seq.current.get(place.id)===n)setSave("error");return false}
  }
  function schedule(place:Place){const old=timers.current.get(place.id);if(old)clearTimeout(old);setSave("saving");timers.current.set(place.id,setTimeout(()=>{timers.current.delete(place.id);void persist(place)},650))}
  function update(patch:Partial<Place>){setLocations(list=>list.map(place=>{if(place.id!==activeRef.current)return place;const next={...place,...patch};schedule(next);return next}))}
  function updateImages(locationId:string,fn:(images:LocationImage[])=>LocationImage[]){setLocations(list=>list.map(place=>place.id===locationId?{...place,images:fn(place.images)}:place))}
  async function select(id:string){const current=locationsRef.current.find(place=>place.id===activeRef.current);if(current&&current.id!==id){const timer=timers.current.get(current.id);if(timer){clearTimeout(timer);timers.current.delete(current.id)}await persist(current)}setActiveId(id);setImageError("");setAddingCharacter(false);setCharacterError("")}
  async function addLocation(parentId:string|null=null){
    const current=locationsRef.current.find(place=>place.id===activeRef.current);if(current)await persist(current);
    const response=await fetch("/api/locations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({novelId:novel.id,parentId})});
    if(!response.ok)return;
    const raw=await response.json();const place={...raw,images:[]} as Place;saved.current.set(place.id,snap(place));setLocations(value=>[...value,place]);setActiveId(place.id);setQueryText("");
    setTimeout(()=>document.querySelector<HTMLInputElement>(".location-name")?.select(),30);
  }
  async function deleteLocation(){
    if(!active||deletePhrase!=="DELETE")return;
    const timer=timers.current.get(active.id);if(timer){clearTimeout(timer);timers.current.delete(active.id)}
    const doomedId=active.id,response=await fetch(`/api/locations/${doomedId}`,{method:"DELETE"});if(!response.ok)return;
    const index=locations.findIndex(place=>place.id===doomedId),next=locations.filter(place=>place.id!==doomedId).map(place=>place.parentId===doomedId?{...place,parentId:null}:place);
    saved.current.delete(doomedId);seq.current.delete(doomedId);setLocations(next);locationsRef.current=next;setCharacterLinks(links=>links.filter(link=>link.locationId!==doomedId));setActiveId(next[Math.max(0,index-1)]?.id??next[0]?.id??"");setDeleting(false);setDeletePhrase("");
  }
  async function saveBeforeNavigate(){const current=locationsRef.current.find(place=>place.id===activeRef.current);if(current){const timer=timers.current.get(current.id);if(timer){clearTimeout(timer);timers.current.delete(current.id)}await persist(current)}}
  useEffect(()=>{const flush=()=>{for(const timer of timers.current.values())clearTimeout(timer);timers.current.clear();for(const place of locationsRef.current)if(saved.current.get(place.id)!==snap(place))void persist(place,true)};const visibility=()=>{if(document.visibilityState==="hidden")flush()};window.addEventListener("pagehide",flush);document.addEventListener("visibilitychange",visibility);return()=>{window.removeEventListener("pagehide",flush);document.removeEventListener("visibilitychange",visibility)}},[]);

  async function attachAsset(asset:ProjectAsset){
    if(!active)return;setAssetPickerOpen(false);setImageError("");
    const response=await fetch(`/api/locations/${active.id}/images`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({assetId:asset.id})});
    if(!response.ok){setImageError("The image could not be attached to this location.");return}
    const image=await response.json() as LocationImage;updateImages(active.id,images=>images.some(item=>item.id===image.id)?images:[...images,image]);
  }
  async function saveCaption(image:LocationImage,caption:string){if(!active)return;updateImages(active.id,images=>images.map(item=>item.id===image.id?{...item,caption}:item));await fetch(`/api/locations/${active.id}/images/${image.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({caption})})}
  async function makePrimary(image:LocationImage){if(!active)return;const response=await fetch(`/api/locations/${active.id}/images/${image.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({caption:image.caption,makePrimary:true})});if(!response.ok)return;updateImages(active.id,images=>{const rest=images.filter(item=>item.id!==image.id).sort((a,b)=>a.position-b.position).map((item,index)=>({...item,position:index+1}));return [{...image,position:0},...rest]})}
  async function removeImage(image:LocationImage){if(!active||!confirm("Remove this image from the location? The project asset itself will be kept."))return;const response=await fetch(`/api/locations/${active.id}/images/${image.id}`,{method:"DELETE"});if(response.ok)updateImages(active.id,images=>images.filter(item=>item.id!==image.id).map((item,index)=>({...item,position:index})))}

  function startCharacterLink(){
    if(!active)return;const first=characters.find(character=>!activeLinks.some(link=>link.characterId===character.id));
    setCharacterTarget(first?.id??"");setCharacterType("ASSOCIATED");setCharacterNotes("");setCharacterError("");setAddingCharacter(true);
  }
  async function addCharacterLink(){
    if(!active||!characterTarget)return;setCharacterError("");
    const response=await fetch(`/api/locations/${active.id}/characters`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({characterId:characterTarget,type:characterType,notes:characterNotes})});
    const data=await response.json().catch(()=>({error:"Character link could not be added."}));
    if(!response.ok){setCharacterError(data.error||"Character link could not be added.");return}
    setCharacterLinks(links=>[...links,data as CharacterLink]);setAddingCharacter(false);
  }
  async function saveCharacterLink(link:CharacterLink,patch:Partial<Pick<CharacterLink,"type"|"notes">>){
    const next={...link,...patch};setCharacterLinks(links=>links.map(item=>item.id===link.id?next:item));
    await fetch(`/api/locations/${link.locationId}/characters/${link.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:next.type,notes:next.notes})});
  }
  async function removeCharacterLink(link:CharacterLink){if(!confirm("Remove this character from the location? Both profiles will be kept."))return;const response=await fetch(`/api/locations/${link.locationId}/characters/${link.id}`,{method:"DELETE"});if(response.ok)setCharacterLinks(links=>links.filter(item=>item.id!==link.id))}

  const rows=useMemo(()=>hierarchyRows(locations),[locations]),filteredRows=useMemo(()=>{const q=queryText.trim().toLowerCase();if(!q)return rows;return rows.filter(({place})=>[place.name,place.aliases,place.type,place.region].some(value=>value.toLowerCase().includes(q)))},[rows,queryText]);
  const blockedParents=active?descendantIds(locations,active.id):new Set<string>(),parentOptions=active?locations.filter(place=>place.id!==active.id&&!blockedParents.has(place.id)):locations;
  const unlinkedCharacters=characters.filter(character=>!activeLinks.some(link=>link.characterId===character.id));
  return <div className="app section-shell"><WorkspaceSectionSidebar username={username} novel={novel} active="locations" open={navOpen} onClose={()=>setNavOpen(false)} beforeNavigate={saveBeforeNavigate}/>{navOpen&&<button className="scrim" onClick={()=>setNavOpen(false)}/>}<main className="section-main character-page location-page">
    <header className="character-top location-top"><div className="section-top-left"><button className="menu-button" onClick={()=>setNavOpen(true)}>☰</button></div><div><small>{novel.title}</small><strong>Locations</strong></div><div className="character-top-actions"><span className={save==="error"?"save-error":""} onClick={()=>save==="error"&&active&&persist(active)}>{save==="saving"?"Saving…":save==="error"?"Save failed · Retry":"Saved"}</span><button className="primary" onClick={()=>addLocation(null)}>＋ Location</button></div></header>
    <section className="character-layout">
      <aside className="character-index"><div className="character-index-title"><div><small>WORLD BIBLE</small><strong>Places</strong></div><b>{locations.length}</b></div><input className="character-search" value={queryText} onChange={e=>setQueryText(e.target.value)} placeholder="Search locations…"/><div className="character-list location-list">{filteredRows.map(({place,depth})=>{const image=ordered(place.images)[0];return <button key={place.id} className={place.id===active?.id?"active":""} style={{paddingLeft:9+Math.min(depth,4)*13}} onClick={()=>select(place.id)}>{image?<img className="location-list-photo" src={image.url} alt=""/>:<span className="location-list-marker">⌖</span>}<div><strong>{place.name||"Unnamed Location"}</strong><small>{[place.type,place.region].filter(Boolean).join(" · ")||pathLabel(place,locations)||"No details yet"}</small></div></button>})}{locations.length>0&&!filteredRows.length&&<p>No locations match that search.</p>}</div></aside>
      <main className="character-editor location-editor">{active?<><div className="character-hero location-hero"><button className="location-cover-drop" onClick={()=>setAssetPickerOpen(true)}>{primaryImage?<img src={primaryImage.url} alt={active.name}/>:<span>⌖</span>}<i>{primaryImage?"Change / add":"Add image"}</i></button><div><small>LOCATION PROFILE</small><input className="character-name location-name" value={active.name} onChange={e=>update({name:e.target.value})} placeholder="Location name"/><p className="location-subtitle">{[active.type,active.region,pathLabel(active,locations)].filter(Boolean).join(" · ")||"Add a type, region or parent location"}</p></div><button className="character-delete" onClick={()=>{setDeletePhrase("");setDeleting(true)}}>Delete</button></div>
        {imageError&&<p className="character-upload-error">{imageError}</p>}
        <section className="character-section"><div className="character-section-title"><div><h2>Place in the world</h2><p>Names and hierarchy also feed manuscript reference highlighting.</p></div><button onClick={()=>addLocation(active.id)}>＋ Child location</button></div><div className="location-meta-grid"><label><span>Aliases / alternate names</span><input value={active.aliases} onChange={e=>update({aliases:e.target.value})} placeholder="The Citadel, Old Keep…"/></label><label><span>Type</span><input value={active.type} onChange={e=>update({type:e.target.value})} placeholder="City, kingdom, building, room…"/></label><label><span>Region</span><input value={active.region} onChange={e=>update({region:e.target.value})} placeholder="Country, district, continent…"/></label><label><span>Inside / parent location</span><select value={active.parentId??""} onChange={e=>update({parentId:e.target.value||null})}><option value="">No parent location</option>{parentOptions.map(place=><option key={place.id} value={place.id}>{pathLabel(place,locations)?pathLabel(place,locations)+" › ":""}{place.name}</option>)}</select></label></div></section>
        <section className="character-section character-images-section"><div className="character-section-title"><div><h2>Visual reference</h2><p>Reuse project images for maps, buildings, interiors, landscapes and mood reference.</p></div><button onClick={()=>setAssetPickerOpen(true)}>＋ Add image</button></div>{activeImages.length?<div className="character-gallery">{activeImages.map((image,index)=><article key={image.id} className={index===0?"primary-image":""}><div className="character-gallery-image"><img src={image.url} alt={image.caption||active.name}/>{index===0&&<b>Primary</b>}</div><input defaultValue={image.caption} onBlur={e=>saveCaption(image,e.target.value)} placeholder="Caption or reference note"/><footer>{index!==0&&<button onClick={()=>makePrimary(image)}>Use as primary</button>}<button className="danger" onClick={()=>removeImage(image)}>Remove</button></footer></article>)}</div>:<button className="character-image-empty" onClick={()=>setAssetPickerOpen(true)}><strong>Add visual reference</strong><span>Choose an existing project image or upload a new one.</span></button>}</section>
        <section className="character-section location-people-section"><div className="character-section-title"><div><h2>People connected to this place</h2><p>Link existing character profiles without duplicating their information.</p></div><button disabled={!unlinkedCharacters.length} onClick={startCharacterLink}>＋ Character</button></div>
          {addingCharacter&&<div className="location-character-form"><label><span>Character</span><select value={characterTarget} onChange={e=>setCharacterTarget(e.target.value)}>{unlinkedCharacters.map(character=><option key={character.id} value={character.id}>{character.name}</option>)}</select></label><label><span>Connection</span><select value={characterType} onChange={e=>setCharacterType(e.target.value)}>{linkOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="location-character-notes"><span>Notes <i>optional</i></span><textarea value={characterNotes} onChange={e=>setCharacterNotes(e.target.value)} placeholder="Why does this place matter to them?"/></label>{characterError&&<p>{characterError}</p>}<footer><button onClick={()=>setAddingCharacter(false)}>Cancel</button><button className="primary" disabled={!characterTarget} onClick={addCharacterLink}>Link character</button></footer></div>}
          {activeLinks.length?<div className="location-character-list">{activeLinks.map(link=>{const character=characters.find(item=>item.id===link.characterId);if(!character)return null;return <article key={link.id}><div className="location-character-person">{character.portraitUrl?<img src={character.portraitUrl} alt=""/>:<span>{character.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join("")||"?"}</span>}<div><strong>{character.name}</strong><small>{character.role||"Character"}</small></div></div><select value={link.type} onChange={e=>saveCharacterLink(link,{type:e.target.value})}>{linkOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><textarea defaultValue={link.notes} onBlur={e=>saveCharacterLink(link,{notes:e.target.value})} placeholder={linkLabel(link.type)+" notes…"}/><button onClick={()=>removeCharacterLink(link)}>Remove</button></article>})}</div>:!addingCharacter&&<div className="relationship-empty"><strong>No characters linked yet</strong><span>{characters.length?"Connect residents, rulers, workers or anyone else tied to this place.":"Create characters first, then link them to locations here."}</span></div>}
        </section>
        <section className="character-section"><h2>On the page</h2><div className="character-grid"><LocationField label="Description" value={active.description} onChange={value=>update({description:value})} placeholder="What does the reader need to picture?"/><LocationField label="Atmosphere" value={active.atmosphere} onChange={value=>update({atmosphere:value})} placeholder="Mood, sounds, smells, weather, texture…"/><LocationField label="Story significance" value={active.significance} onChange={value=>update({significance:value})} placeholder="Why does this place matter to the story?"/><LocationField label="History" value={active.history} onChange={value=>update({history:value})} placeholder="Origins, changes, conflicts and important events…" large/></div></section>
        <section className="character-section"><h2>Private notes</h2><div className="character-grid"><LocationField label="Notes" value={active.notes} onChange={value=>update({notes:value})} placeholder="Continuity details, research, secrets and anything else to remember…" large/></div></section>
      </>:<div className="character-empty location-empty"><div className="location-empty-marker">⌖</div><h1>Build your world</h1><p>Create your first location and keep its hierarchy, people, images and story details beside the manuscript.</p><button className="primary" onClick={()=>addLocation(null)}>＋ Create location</button></div>}</main>
    </section>
    {assetPickerOpen&&active&&<AssetPicker novelId={novel.id} title={`Add image to ${active.name||"location"}`} onClose={()=>setAssetPickerOpen(false)} onSelect={attachAsset}/>}
    {deleting&&active&&<div className="modal-backdrop delete-backdrop" onMouseDown={()=>setDeleting(false)}><form className="delete-dialog" onSubmit={e=>{e.preventDefault();deleteLocation()}} onMouseDown={e=>e.stopPropagation()}><small>PERMANENT DELETION</small><h2>Delete location?</h2><div className="delete-name">{active.name}</div><p>This removes the location profile, image links and character links. Child locations will become top-level locations. <strong>This cannot be undone.</strong></p><label>Type <b>DELETE</b> to confirm<input autoFocus value={deletePhrase} onChange={e=>setDeletePhrase(e.target.value)} autoComplete="off"/></label><footer><button type="button" onClick={()=>setDeleting(false)}>Cancel</button><button className="delete-confirm" disabled={deletePhrase!=="DELETE"}>Delete permanently</button></footer></form></div>}
  </main></div>;
}

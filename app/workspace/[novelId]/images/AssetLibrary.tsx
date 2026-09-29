"use client";
import {DragEvent,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import WorkspaceSectionSidebar from "../../WorkspaceSectionSidebar";

type AssetUsage={kind:string;label:string;detail:string;href:string|null;count:number};
type ManagedAsset={id:string;name:string;mimeType:string;size:number;createdAt:string;url:string;usageCount:number;usageOccurrences:number;usages:AssetUsage[]};
type Filter="all"|"used"|"unused";
type Sort="newest"|"oldest"|"name"|"size";

function bytes(value:number){
  if(value<1024)return value+" B";
  if(value<1024*1024)return Math.max(1,Math.round(value/1024)).toLocaleString()+" KB";
  return (value/(1024*1024)).toFixed(value>=10*1024*1024?0:1)+" MB";
}
function kindLabel(kind:string){
  return ({MANUSCRIPT:"Manuscript",REVISION:"Revision history",TEMPLATE_CONTENT:"Template",CHAPTER_HEADER:"Chapter header",TEMPLATE_HEADER:"Template header",CHARACTER:"Character",LOCATION:"Location",WORLD_NOTE:"World Note",IDEA:"Idea"} as Record<string,string>)[kind]||kind;
}

export default function AssetLibrary({username,novel}:{username:string;novel:{id:string;title:string}}){
  const router=useRouter(),fileRef=useRef<HTMLInputElement>(null);
  const [assets,setAssets]=useState<ManagedAsset[]>([]),[loading,setLoading]=useState(true),[uploading,setUploading]=useState(false),[error,setError]=useState(""),[search,setSearch]=useState(""),[filter,setFilter]=useState<Filter>("all"),[sort,setSort]=useState<Sort>("newest"),[selected,setSelected]=useState<Set<string>>(new Set()),[detailId,setDetailId]=useState<string|null>(null),[navOpen,setNavOpen]=useState(false),[renameId,setRenameId]=useState<string|null>(null),[renameValue,setRenameValue]=useState(""),[renaming,setRenaming]=useState(false),[deleteIds,setDeleteIds]=useState<string[]>([]),[deleting,setDeleting]=useState(false);

  async function load(){
    setLoading(true);setError("");
    try{
      const response=await fetch(`/api/assets/manage?novelId=${encodeURIComponent(novel.id)}`,{cache:"no-store"});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"Image library could not be loaded.");
      setAssets(data.assets||[]);
      setSelected(current=>new Set([...current].filter(id=>(data.assets||[]).some((asset:ManagedAsset)=>asset.id===id))));
    }catch(err){setError(err instanceof Error?err.message:"Image library could not be loaded.")}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[novel.id]);

  const visible=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const result=assets.filter(asset=>(filter==="all"||(filter==="used"?asset.usageCount>0:asset.usageCount===0))&&(!q||asset.name.toLowerCase().includes(q)||asset.usages.some(usage=>usage.label.toLowerCase().includes(q))));
    result.sort((a,b)=>sort==="newest"?+new Date(b.createdAt)-+new Date(a.createdAt):sort==="oldest"?+new Date(a.createdAt)-+new Date(b.createdAt):sort==="size"?b.size-a.size:a.name.localeCompare(b.name));
    return result;
  },[assets,search,filter,sort]);
  const detail=assets.find(asset=>asset.id===detailId)??null,deleteAssets=assets.filter(asset=>deleteIds.includes(asset.id)),deleteUsageCount=deleteAssets.reduce((sum,asset)=>sum+asset.usageCount,0);
  const totalBytes=assets.reduce((sum,asset)=>sum+asset.size,0),usedCount=assets.filter(asset=>asset.usageCount>0).length,unusedCount=assets.length-usedCount;
  const visibleSelected=visible.length>0&&visible.every(asset=>selected.has(asset.id));

  function toggle(id:string){setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next})}
  function toggleVisible(){setSelected(current=>{const next=new Set(current);if(visibleSelected)for(const asset of visible)next.delete(asset.id);else for(const asset of visible)next.add(asset.id);return next})}
  async function upload(files:File[]){
    const images=files.filter(file=>file.type.startsWith("image/"));if(!images.length)return;
    setUploading(true);setError("");
    try{
      for(const file of images){
        const data=new FormData();data.set("novelId",novel.id);data.set("file",file);
        const response=await fetch("/api/assets",{method:"POST",body:data});
        const body=await response.json().catch(()=>({error:"Upload failed."}));
        if(!response.ok)throw new Error(body.error||`Could not upload ${file.name}.`);
      }
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Upload failed.")}
    finally{setUploading(false);if(fileRef.current)fileRef.current.value=""}
  }
  function drop(event:DragEvent<HTMLDivElement>){event.preventDefault();void upload(Array.from(event.dataTransfer.files))}
  function beginRename(asset:ManagedAsset){setRenameId(asset.id);setRenameValue(asset.name)}
  async function rename(){
    if(!renameId||!renameValue.trim())return;setRenaming(true);setError("");
    try{
      const response=await fetch(`/api/assets/${renameId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:renameValue})});
      const data=await response.json().catch(()=>({error:"Rename failed."}));if(!response.ok)throw new Error(data.error||"Rename failed.");
      setAssets(list=>list.map(asset=>asset.id===renameId?{...asset,name:data.name}:asset));setRenameId(null);
    }catch(err){setError(err instanceof Error?err.message:"Rename failed.")}
    finally{setRenaming(false)}
  }
  function askDelete(ids:string[]){const unique=[...new Set(ids)].filter(id=>assets.some(asset=>asset.id===id));if(unique.length)setDeleteIds(unique)}
  async function confirmDelete(){
    if(!deleteIds.length)return;setDeleting(true);setError("");
    const force=deleteAssets.some(asset=>asset.usageCount>0);
    try{
      const response=await fetch("/api/assets/manage",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({novelId:novel.id,assetIds:deleteIds,force})});
      const data=await response.json().catch(()=>({error:"Images could not be deleted."}));
      if(response.status===409&&Array.isArray(data.blocked)){
        setAssets(list=>list.map(asset=>data.blocked.find((blocked:ManagedAsset)=>blocked.id===asset.id)||asset));
        throw new Error("Usage changed while you were reviewing these images. Check the updated usage list and try again.");
      }
      if(!response.ok)throw new Error(data.error||"Images could not be deleted.");
      const deleted=new Set<string>(data.deletedIds||[]);
      setAssets(list=>list.filter(asset=>!deleted.has(asset.id)));setSelected(current=>new Set([...current].filter(id=>!deleted.has(id))));
      if(detailId&&deleted.has(detailId))setDetailId(null);setDeleteIds([]);
    }catch(err){setError(err instanceof Error?err.message:"Images could not be deleted.")}
    finally{setDeleting(false)}
  }

  return <div className="app section-shell"><WorkspaceSectionSidebar username={username} novel={novel} active="images" open={navOpen} onClose={()=>setNavOpen(false)}/>{navOpen&&<button className="scrim" onClick={()=>setNavOpen(false)}/>}<main className="section-main asset-library-page">
    <header className="asset-library-top"><div className="section-top-left"><button className="menu-button" onClick={()=>setNavOpen(true)}>☰</button></div><div><small>{novel.title}</small><strong>Images</strong></div><div className="asset-library-top-actions"><button disabled={!unusedCount} onClick={()=>askDelete(assets.filter(asset=>asset.usageCount===0).map(asset=>asset.id))}>Delete unused</button><button className="primary" disabled={uploading} onClick={()=>fileRef.current?.click()}>{uploading?"Uploading…":"＋ Upload images"}</button><input ref={fileRef} hidden multiple type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event=>void upload(Array.from(event.target.files??[]))}/></div></header>
    <section className="asset-library-stats"><div><small>IMAGES</small><strong>{assets.length}</strong></div><div><small>IN USE</small><strong>{usedCount}</strong></div><div><small>UNUSED</small><strong>{unusedCount}</strong></div><div><small>STORAGE</small><strong>{bytes(totalBytes)}</strong></div></section>
    <section className="asset-library-toolbar"><label className="asset-select-all"><input type="checkbox" checked={visibleSelected} onChange={toggleVisible}/><span>{selected.size?selected.size+" selected":"Select visible"}</span></label><input className="asset-library-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search images or where they are used…"/><select value={filter} onChange={event=>setFilter(event.target.value as Filter)}><option value="all">All images</option><option value="used">In use</option><option value="unused">Unused</option></select><select value={sort} onChange={event=>setSort(event.target.value as Sort)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name</option><option value="size">Largest first</option></select>{selected.size>0&&<button className="asset-bulk-delete" onClick={()=>askDelete([...selected])}>Delete selected</button>}</section>
    {error&&<p className="asset-library-error">{error}</p>}
    <div className="asset-library-drop" onDragOver={event=>event.preventDefault()} onDrop={drop}>
      {loading?<div className="asset-library-empty"><strong>Loading project images…</strong></div>:visible.length?<div className="asset-library-grid">{visible.map(asset=><article key={asset.id} className={selected.has(asset.id)?"selected":""}>
        <label className="asset-card-check"><input type="checkbox" checked={selected.has(asset.id)} onChange={()=>toggle(asset.id)}/></label>
        <button className="asset-card-preview" onClick={()=>setDetailId(asset.id)}><img src={asset.url} alt=""/></button>
        <div className="asset-card-body"><strong title={asset.name}>{asset.name}</strong><small>{bytes(asset.size)} · {new Date(asset.createdAt).toLocaleDateString()}</small><button className={asset.usageCount?"used":"unused"} onClick={()=>setDetailId(asset.id)}>{asset.usageCount?`Used in ${asset.usageCount} place${asset.usageCount===1?"":"s"}`:"Unused"}</button></div>
        <footer><button onClick={()=>beginRename(asset)}>Rename</button><button className="danger" onClick={()=>askDelete([asset.id])}>Delete</button></footer>
      </article>)}</div>:<div className="asset-library-empty"><strong>{assets.length?"No images match those filters.":"No project images yet"}</strong><span>{assets.length?"Try another search or filter.":"Upload or drop images here to start the project library."}</span>{!assets.length&&<button className="primary" onClick={()=>fileRef.current?.click()}>Upload first images</button>}</div>}
    </div>
    {detail&&<aside className="asset-detail-panel"><header><div><small>IMAGE DETAILS</small><strong>{detail.name}</strong></div><button onClick={()=>setDetailId(null)}>×</button></header><img src={detail.url} alt=""/><dl><div><dt>Type</dt><dd>{detail.mimeType.replace("image/","").toUpperCase()}</dd></div><div><dt>Size</dt><dd>{bytes(detail.size)}</dd></div><div><dt>Uploaded</dt><dd>{new Date(detail.createdAt).toLocaleString()}</dd></div><div><dt>Usage</dt><dd>{detail.usageCount?detail.usageCount+" places":"Unused"}</dd></div></dl><div className="asset-detail-actions"><button onClick={()=>beginRename(detail)}>Rename</button><button className="danger" onClick={()=>askDelete([detail.id])}>Delete image</button></div><section><h3>Used in…</h3>{detail.usages.length?<div className="asset-usage-list">{detail.usages.map((usage,index)=><button key={usage.kind+usage.label+index} disabled={!usage.href} onClick={()=>usage.href&&router.push(usage.href)}><span>{kindLabel(usage.kind)}</span><div><strong>{usage.label}</strong><small>{usage.detail}{usage.count>1?` · ${usage.count} occurrences`:""}</small></div>{usage.href&&<b>Open →</b>}</button>)}</div>:<p className="asset-unused-note">This image is not currently referenced anywhere in the project and can be deleted safely.</p>}</section></aside>}
    {renameId&&<div className="modal-backdrop" onMouseDown={()=>!renaming&&setRenameId(null)}><form className="asset-rename-dialog" onMouseDown={event=>event.stopPropagation()} onSubmit={event=>{event.preventDefault();void rename()}}><small>IMAGE LIBRARY</small><h2>Rename image</h2><label>Display name<input autoFocus value={renameValue} onChange={event=>setRenameValue(event.target.value)} maxLength={255}/></label><p>This changes the name shown in Sögur Forge, not the stored image file or any existing captions.</p><footer><button type="button" disabled={renaming} onClick={()=>setRenameId(null)}>Cancel</button><button className="primary" disabled={renaming||!renameValue.trim()}>{renaming?"Saving…":"Save name"}</button></footer></form></div>}
    {deleteAssets.length>0&&<div className="modal-backdrop delete-backdrop" onMouseDown={()=>!deleting&&setDeleteIds([])}><section className="asset-delete-dialog" onMouseDown={event=>event.stopPropagation()}><small>{deleteUsageCount?"IMAGE IS IN USE":"DELETE IMAGES"}</small><h2>{deleteAssets.length===1?"Delete this image?":`Delete ${deleteAssets.length} images?`}</h2>{deleteUsageCount?<><p><strong>{deleteUsageCount} active use{deleteUsageCount===1?"":"s"} will be removed.</strong> This includes manuscript/template images, Story Bible galleries, headers and revision history references shown below.</p><div className="asset-delete-usage">{deleteAssets.filter(asset=>asset.usageCount>0).map(asset=><article key={asset.id}><img src={asset.url} alt=""/><div><strong>{asset.name}</strong><small>{asset.usageCount} place{asset.usageCount===1?"":"s"}</small></div></article>)}</div><p className="asset-delete-warning">Removing an image from manuscript or revision content cannot be undone by restoring that image later.</p></>:<p>These images are unused, so deleting them will not change any manuscript or Story Bible content.</p>}<footer><button disabled={deleting} onClick={()=>setDeleteIds([])}>Cancel</button><button className="delete-confirm" disabled={deleting} onClick={()=>void confirmDelete()}>{deleting?"Deleting…":deleteUsageCount?"Remove uses & delete":"Delete permanently"}</button></footer></section></div>}
  </main></div>;
}

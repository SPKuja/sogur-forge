"use client";
import {DragEvent,useEffect,useMemo,useRef,useState} from "react";

export type ProjectAsset={id:string;name:string;mimeType:string;size:number;createdAt:string;url:string};

export default function AssetPicker({novelId,title="Choose an image",onClose,onSelect}:{novelId:string;title?:string;onClose:()=>void;onSelect:(asset:ProjectAsset)=>void}){
  const [assets,setAssets]=useState<ProjectAsset[]>([]),[loading,setLoading]=useState(true),[uploading,setUploading]=useState(false),[error,setError]=useState(""),[search,setSearch]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{let cancelled=false;(async()=>{setLoading(true);setError("");try{const r=await fetch(`/api/assets?novelId=${encodeURIComponent(novelId)}`);if(!r.ok)throw new Error();const data=await r.json();if(!cancelled)setAssets(data.assets||[])}catch{if(!cancelled)setError("Your image library could not be loaded.")}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[novelId]);
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return q?assets.filter(a=>a.name.toLowerCase().includes(q)):assets},[assets,search]);
  async function upload(file?:File){if(!file)return;setUploading(true);setError("");const data=new FormData();data.set("novelId",novelId);data.set("file",file);try{const r=await fetch("/api/assets",{method:"POST",body:data});const body=await r.json().catch(()=>({error:"Upload failed."}));if(!r.ok)throw new Error(body.error||"Upload failed.");const asset={id:body.id,name:body.name,mimeType:body.mimeType||file.type,size:body.size||file.size,createdAt:body.createdAt||new Date().toISOString(),url:body.url} as ProjectAsset;setAssets(v=>[asset,...v.filter(a=>a.id!==asset.id)]);onSelect(asset)}catch(e){setError(e instanceof Error?e.message:"Upload failed.")}finally{setUploading(false);if(fileRef.current)fileRef.current.value=""}}
  function drop(e:DragEvent<HTMLDivElement>){e.preventDefault();const file=Array.from(e.dataTransfer.files).find(f=>f.type.startsWith("image/"));if(file)upload(file)}
  return <div className="modal-backdrop asset-picker-backdrop" onMouseDown={onClose}><section className="asset-picker" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e=>e.stopPropagation()}>
    <header><div><small>PROJECT IMAGE LIBRARY</small><h2>{title}</h2><p>Reuse an image already uploaded to this novel, or add a new one.</p></div><button aria-label="Close image library" onClick={onClose}>×</button></header>
    <div className="asset-picker-tools"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search uploaded images…"/><button className="primary" disabled={uploading} onClick={()=>fileRef.current?.click()}>{uploading?"Uploading…":"＋ Upload new"}</button><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>upload(e.target.files?.[0])}/></div>
    {error&&<p className="asset-picker-error">{error}</p>}
    <div className="asset-picker-grid" onDragOver={e=>e.preventDefault()} onDrop={drop}>{loading?<div className="asset-picker-empty"><strong>Loading images…</strong></div>:filtered.length?filtered.map(asset=><button key={asset.id} onClick={()=>onSelect(asset)}><img src={asset.url} alt=""/><span title={asset.name}>{asset.name}</span><small>{Math.max(1,Math.round(asset.size/1024)).toLocaleString()} KB</small></button>):<div className="asset-picker-empty"><strong>{assets.length?"No images match your search.":"No uploaded images yet"}</strong><span>{assets.length?"Try another filename.":"Upload or drop an image here to start your project library."}</span>{!assets.length&&<button className="primary" onClick={()=>fileRef.current?.click()}>Upload first image</button>}</div>}</div>
  </section></div>
}

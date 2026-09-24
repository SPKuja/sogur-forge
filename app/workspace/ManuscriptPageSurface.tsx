"use client";
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from "react";
import {useManuscriptLayout} from "./ManuscriptLayoutProvider";
import {currentPagedPage,paginateDocument} from "./page-document";

function previewHtml(source:HTMLElement,chapterStart:"FLOW"|"NEW_PAGE"|"RECTO"){
  const output=document.createElement("div");
  let pendingBreak=false;

  const nodes=Array.from(source.querySelectorAll<HTMLElement>(
    '[data-sogur-item-start],.full-scene-break,[data-sogur-page-container]'
  ));

  if(!nodes.length)return source.innerHTML;

  for(const node of nodes){
    if(node.hasAttribute("data-sogur-item-start")){
      pendingBreak=chapterStart!=="FLOW";
      continue;
    }

    if(node.classList.contains("full-scene-break")){
      const ornament=document.createElement("div");
      ornament.className="scene-manuscript-break";
      ornament.setAttribute("data-sogur-scene-break","true");
      ornament.setAttribute("aria-label","Scene break");
      ornament.textContent="* * *";
      output.append(ornament);
      continue;
    }

    if(!node.hasAttribute("data-sogur-page-container"))continue;

    const holder=document.createElement("div");
    holder.innerHTML=node.innerHTML;
    let blocks=Array.from(holder.children) as HTMLElement[];
    if(!blocks.length){
      const p=document.createElement("p");
      p.append(document.createElement("br"));
      blocks=[p];
    }

    const anchor=node.closest<HTMLElement>(".full-manuscript-scene")?.id
      ??node.closest<HTMLElement>(".full-manuscript-item")?.id
      ??"";

    if(anchor&&!blocks[0].id)blocks[0].id=anchor;
    if(pendingBreak&&blocks.length){
      blocks[0].setAttribute("data-sogur-page-break-before",chapterStart==="RECTO"?"recto":"page");
      pendingBreak=false;
    }

    for(const block of blocks)output.append(block);
  }

  return output.innerHTML;
}

export default function ManuscriptPageSurface({children,className=""}:{children:ReactNode;className?:string}){
  const {layout,displayMode}=useManuscriptLayout();
  const sourceRef=useRef<HTMLDivElement>(null),pageRootRef=useRef<HTMLDivElement>(null);
  const [pageCount,setPageCount]=useState(1),[currentPage,setCurrentPage]=useState(1);

  useLayoutEffect(()=>{
    if(displayMode!=="PAGES")return;
    const source=sourceRef.current,root=pageRootRef.current;
    if(!source||!root)return;

    const render=()=>{
      const html=previewHtml(source,layout.chapterStart);
      const result=paginateDocument(root,layout,html,null);
      setPageCount(result.pageCount);
      setCurrentPage(currentPagedPage(root));
    };

    render();
    const observer=new MutationObserver(render);
    observer.observe(source,{subtree:true,childList:true,characterData:true,attributes:true});
    return()=>observer.disconnect();
  },[displayMode,layout,children]);

  useEffect(()=>{
    if(displayMode!=="PAGES")return;
    const update=()=>{if(pageRootRef.current)setCurrentPage(currentPagedPage(pageRootRef.current))};
    window.addEventListener("scroll",update,{passive:true});
    window.addEventListener("resize",update);
    return()=>{window.removeEventListener("scroll",update);window.removeEventListener("resize",update)};
  },[displayMode,pageCount]);

  if(displayMode!=="PAGES")return <>{children}</>;

  return <div className={`manuscript-page-stage pages-v2-preview ${className}`}>
    <div ref={sourceRef} className="sogur-pagination-source" aria-hidden="true">{children}</div>
    <div ref={pageRootRef} className="rich-editor sogur-paged-editor sogur-paged-preview" aria-label="Paginated manuscript preview"/>
    <div className="manuscript-page-status" aria-live="polite">Page {currentPage} of {pageCount}</div>
  </div>;
}

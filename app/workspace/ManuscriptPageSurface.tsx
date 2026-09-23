"use client";
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from "react";
import {useManuscriptLayout} from "./ManuscriptLayoutProvider";

const MM_TO_PX=96/25.4;
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

function restoreShift(element:HTMLElement){
  if(!element.hasAttribute("data-sogur-page-shift"))return;
  const original=element.getAttribute("data-sogur-page-original-margin-top")??"";
  if(original)element.style.marginTop=original;
  else element.style.removeProperty("margin-top");
  element.removeAttribute("data-sogur-page-shift");
  element.removeAttribute("data-sogur-page-original-margin-top");
  if(!element.getAttribute("style")?.trim())element.removeAttribute("style");
}

function applyShift(element:HTMLElement,pixels:number){
  if(pixels<=0.5)return;
  if(!element.hasAttribute("data-sogur-page-shift")){
    element.setAttribute("data-sogur-page-original-margin-top",element.style.marginTop||"");
  }
  const base=parseFloat(getComputedStyle(element).marginTop)||0;
  element.style.marginTop=`${base+pixels}px`;
  element.setAttribute("data-sogur-page-shift",String(Math.round(pixels*100)/100));
}

function pageBlocks(flow:HTMLElement){
  return Array.from(flow.querySelectorAll<HTMLElement>('[data-sogur-page-block],[data-sogur-page-container] > *'))
    .filter((element,index,array)=>array.indexOf(element)===index)
    .filter(element=>{
      if(element.hasAttribute("data-sogur-item-start"))return true;
      const style=getComputedStyle(element);
      return style.display!=="none"&&style.visibility!=="hidden";
    });
}

export default function ManuscriptPageSurface({children,className=""}:{children:ReactNode;className?:string}){
  const {layout,displayMode}=useManuscriptLayout();
  const surfaceRef=useRef<HTMLDivElement>(null),flowRef=useRef<HTMLDivElement>(null),frameRef=useRef<number|null>(null);
  const [pageCount,setPageCount]=useState(1),[currentPage,setCurrentPage]=useState(1),[canvasHeight,setCanvasHeight]=useState(0),[pageStride,setPageStride]=useState(layout.pageHeightMm*MM_TO_PX+28);

  const restoreAll=useCallback(()=>{
    const flow=flowRef.current;if(!flow)return;
    flow.querySelectorAll<HTMLElement>("[data-sogur-page-shift]").forEach(restoreShift);
  },[]);

  const recalc=useCallback(()=>{
    const surface=surfaceRef.current,flow=flowRef.current;
    if(displayMode!=="PAGES"||!surface||!flow)return;
    const blocks=pageBlocks(flow);
    restoreAll();

    const pageHeight=layout.pageHeightMm*MM_TO_PX;
    const topMargin=layout.marginTopMm*MM_TO_PX;
    const bottomMargin=layout.marginBottomMm*MM_TO_PX;
    const bodyHeight=Math.max(40,pageHeight-topMargin-bottomMargin);
    const gap=parseFloat(getComputedStyle(surface).getPropertyValue("--sogur-page-gap"))||28;
    const stride=pageHeight+gap;
    const surfaceTop=surface.getBoundingClientRect().top;
    let itemStartsSeen=0;

    const metrics=(element:HTMLElement)=>{
      const rect=element.getBoundingClientRect();
      return {top:rect.top-surfaceTop,bottom:rect.bottom-surfaceTop,height:rect.height};
    };

    for(const block of blocks){
      let box=metrics(block);
      let pageIndex=Math.max(0,Math.floor(Math.max(0,box.top)/stride));
      let bodyStart=pageIndex*stride+topMargin;
      let bodyEnd=pageIndex*stride+pageHeight-bottomMargin;

      if(block.hasAttribute("data-sogur-item-start")){
        if(itemStartsSeen>0&&layout.chapterStart!=="FLOW"){
          let targetPage=box.top<=bodyStart+1?pageIndex:pageIndex+1;
          if(targetPage===pageIndex&&box.top>bodyStart+1)targetPage++;
          if(layout.chapterStart==="RECTO"&&targetPage%2===1)targetPage++;
          const targetTop=targetPage*stride+topMargin;
          applyShift(block,Math.max(0,targetTop-box.top));
        }
        itemStartsSeen++;
        continue;
      }

      if(box.top<bodyStart-1){
        applyShift(block,bodyStart-box.top);
        box=metrics(block);
        pageIndex=Math.max(0,Math.floor(Math.max(0,box.top)/stride));
        bodyStart=pageIndex*stride+topMargin;
        bodyEnd=pageIndex*stride+pageHeight-bottomMargin;
      }

      const inBottomMarginOrGap=box.top>bodyEnd-1;
      const crossesBottom=box.bottom>bodyEnd+0.5;
      const canMoveWhole=box.height<=bodyHeight-1;
      const alreadyAtPageTop=box.top<=bodyStart+1;

      if(inBottomMarginOrGap||(crossesBottom&&canMoveWhole&&!alreadyAtPageTop)){
        const nextPage=pageIndex+1;
        const targetTop=nextPage*stride+topMargin;
        applyShift(block,Math.max(0,targetTop-box.top));
      }
    }

    let maxBottom=topMargin;
    for(const block of blocks){
      const rect=block.getBoundingClientRect();
      maxBottom=Math.max(maxBottom,rect.bottom-surfaceTop);
    }
    const count=Math.max(1,Math.floor(Math.max(0,maxBottom-1)/stride)+1);
    setPageCount(count);
    setPageStride(stride);
    setCanvasHeight(count*pageHeight+(count-1)*gap);
  },[displayMode,layout,restoreAll]);

  useLayoutEffect(()=>{
    if(displayMode!=="PAGES")return;
    recalc();
    const flow=flowRef.current;if(!flow)return;
    const schedule=()=>{
      if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);
      frameRef.current=requestAnimationFrame(()=>{frameRef.current=null;recalc()});
    };
    const observer=new MutationObserver(mutations=>{
      if(mutations.some(mutation=>mutation.type==="childList"||mutation.type==="characterData"))schedule();
    });
    observer.observe(flow,{subtree:true,childList:true,characterData:true});
    flow.addEventListener("sogur:content-change",schedule);
    flow.addEventListener("load",schedule,true);
    window.addEventListener("resize",schedule);
    return()=>{
      observer.disconnect();
      flow.removeEventListener("sogur:content-change",schedule);
      flow.removeEventListener("load",schedule,true);
      window.removeEventListener("resize",schedule);
      if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);
      restoreAll();
    };
  },[displayMode,recalc,restoreAll]);

  useEffect(()=>{
    if(displayMode!=="PAGES")return;
    const update=()=>{
      const surface=surfaceRef.current;if(!surface)return;
      const rect=surface.getBoundingClientRect();
      const localY=window.innerHeight*.48-rect.top;
      setCurrentPage(clamp(Math.floor(Math.max(0,localY)/pageStride)+1,1,pageCount));
    };
    update();
    window.addEventListener("scroll",update,{passive:true});
    window.addEventListener("resize",update);
    return()=>{window.removeEventListener("scroll",update);window.removeEventListener("resize",update)};
  },[displayMode,pageCount,pageStride]);

  if(displayMode!=="PAGES")return <>{children}</>;

  return <div className={`manuscript-page-stage ${className}`}>
    <div ref={surfaceRef} className="manuscript-page-surface pages" style={{minHeight:canvasHeight||undefined}}>
      {Array.from({length:pageCount},(_,index)=><div key={index} className="manuscript-page-sheet" style={{top:`${index*pageStride}px`}} aria-hidden="true"><span>{index+1}</span></div>)}
      <div ref={flowRef} className="manuscript-page-flow">{children}</div>
    </div>
    <div className="manuscript-page-status" aria-live="polite">Page {currentPage} of {pageCount}</div>
  </div>;
}

"use client";
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from "react";
import {useManuscriptLayout} from "./ManuscriptLayoutProvider";

const MM_TO_PX=96/25.4;
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

function supportsNativePageFlow(){
  return typeof CSS!=="undefined"
    &&CSS.supports("column-height","100px")
    &&CSS.supports("column-wrap","wrap");
}

function pageForY(y:number,stride:number){
  return Math.max(0,Math.floor(Math.max(0,y)/stride));
}

function resetSceneBreaks(flow:HTMLElement){
  flow.querySelectorAll<HTMLElement>("[data-sogur-scene-break]").forEach(element=>element.removeAttribute("data-sogur-scene-break-hidden"));
}

function suppressRedundantSceneBreaks(flow:HTMLElement,surfaceTop:number,stride:number){
  const breaks=Array.from(flow.querySelectorAll<HTMLElement>("[data-sogur-scene-break]"));
  resetSceneBreaks(flow);
  if(!breaks.length)return;

  // Read after all ornaments are visible so we can tell whether an ornament
  // itself caused the following scene to fragment onto a fresh page.
  void flow.offsetHeight;

  for(const ornament of breaks){
    const current=ornament.closest<HTMLElement>(".scene-continuous-item");
    const previous=current?.previousElementSibling as HTMLElement|null;
    const previousEditor=previous?.querySelector<HTMLElement>("[data-sogur-page-container]")??null;
    const nextEditor=current?.querySelector<HTMLElement>("[data-sogur-page-container]")??null;
    if(!previousEditor||!nextEditor)continue;

    const previousRects=Array.from(previousEditor.getClientRects());
    const nextRects=Array.from(nextEditor.getClientRects());
    const previousRect=previousRects.at(-1)??previousEditor.getBoundingClientRect();
    const nextRect=nextRects[0]??nextEditor.getBoundingClientRect();
    const previousPage=pageForY(previousRect.bottom-surfaceTop-1,stride);
    const nextPage=pageForY(nextRect.top-surfaceTop,stride);

    if(previousPage!==nextPage)ornament.setAttribute("data-sogur-scene-break-hidden","true");
  }
}

function measuredPageCount(flow:HTMLElement,surfaceTop:number,stride:number,contentHeight:number,rowGap:number){
  let maxPage=0;
  const candidates=[
    ...Array.from(flow.querySelectorAll<HTMLElement>("[data-sogur-page-container]")),
    ...Array.from(flow.querySelectorAll<HTMLElement>("[data-sogur-scene-break]:not([data-sogur-scene-break-hidden='true'])")),
    ...Array.from(flow.querySelectorAll<HTMLElement>(".full-manuscript-item")),
  ];

  for(const element of candidates){
    const rects=Array.from(element.getClientRects());
    for(const rect of rects){
      if(rect.width<.5&&rect.height<.5)continue;
      maxPage=Math.max(maxPage,pageForY(rect.bottom-surfaceTop-1,stride));
    }
  }

  const flowHeight=Math.max(flow.getBoundingClientRect().height,flow.scrollHeight);
  const byRows=Math.max(1,Math.ceil(Math.max(1,flowHeight+rowGap-.5)/(contentHeight+rowGap)));
  return Math.max(maxPage+1,byRows);
}

export default function ManuscriptPageSurface({children,className=""}:{children:ReactNode;className?:string}){
  const {layout,displayMode}=useManuscriptLayout();
  const surfaceRef=useRef<HTMLDivElement>(null),flowRef=useRef<HTMLDivElement>(null),frameRef=useRef<number|null>(null);
  const [pageCount,setPageCount]=useState(1),[currentPage,setCurrentPage]=useState(1),[canvasHeight,setCanvasHeight]=useState(0),[pageStride,setPageStride]=useState(layout.pageHeightMm*MM_TO_PX+28),[nativeSupported,setNativeSupported]=useState<boolean|null>(null);

  const recalc=useCallback(()=>{
    const surface=surfaceRef.current,flow=flowRef.current;
    if(displayMode!=="PAGES"||!surface||!flow)return;

    const supported=supportsNativePageFlow();
    setNativeSupported(supported);

    const pageHeight=layout.pageHeightMm*MM_TO_PX;
    const topMargin=layout.marginTopMm*MM_TO_PX;
    const bottomMargin=layout.marginBottomMm*MM_TO_PX;
    const contentHeight=Math.max(40,pageHeight-topMargin-bottomMargin);
    const gap=parseFloat(getComputedStyle(surface).getPropertyValue("--sogur-page-gap"))||28;
    const stride=pageHeight+gap;
    const rowGap=topMargin+bottomMargin+gap;
    const surfaceTop=surface.getBoundingClientRect().top;

    if(!supported){
      resetSceneBreaks(flow);
      const flowRect=flow.getBoundingClientRect();
      const height=Math.max(pageHeight,flowRect.bottom-surfaceTop+bottomMargin,flow.scrollHeight+topMargin+bottomMargin);
      setPageCount(1);
      setPageStride(stride);
      setCanvasHeight(height);
      return;
    }

    suppressRedundantSceneBreaks(flow,surfaceTop,stride);
    // Hiding a redundant scene ornament can change native fragmentation.
    void flow.offsetHeight;

    const count=measuredPageCount(flow,surfaceTop,stride,contentHeight,rowGap);
    setPageCount(count);
    setPageStride(stride);
    setCanvasHeight(count*pageHeight+(count-1)*gap);
  },[displayMode,layout]);

  useLayoutEffect(()=>{
    if(displayMode!=="PAGES")return;
    const flow=flowRef.current;if(!flow)return;
    const schedule=()=>{
      if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);
      frameRef.current=requestAnimationFrame(()=>{frameRef.current=null;recalc()});
    };

    schedule();
    const observer=new MutationObserver(mutations=>{
      if(mutations.some(mutation=>mutation.type==="childList"||mutation.type==="characterData"))schedule();
    });
    observer.observe(flow,{subtree:true,childList:true,characterData:true});

    const resizeObserver=typeof ResizeObserver!=="undefined"?new ResizeObserver(schedule):null;
    resizeObserver?.observe(flow);

    let disposed=false;
    if(typeof document!=="undefined"&&"fonts" in document)document.fonts.ready.then(()=>{if(!disposed)schedule()});
    flow.addEventListener("sogur:content-change",schedule);
    flow.addEventListener("load",schedule,true);
    window.addEventListener("resize",schedule);

    return()=>{
      disposed=true;
      observer.disconnect();
      resizeObserver?.disconnect();
      flow.removeEventListener("sogur:content-change",schedule);
      flow.removeEventListener("load",schedule,true);
      window.removeEventListener("resize",schedule);
      if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);
      resetSceneBreaks(flow);
    };
  },[displayMode,recalc]);

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

  const unsupported=nativeSupported===false;
  const visiblePages=unsupported?1:pageCount;
  const chapterStartClass=layout.chapterStart.toLowerCase().replace("_","-");

  return <div className={`manuscript-page-stage ${className}`}>
    <div ref={surfaceRef} className={`manuscript-page-surface pages native-page-flow chapter-start-${chapterStartClass}${unsupported?" native-pages-unsupported":""}`} style={{minHeight:canvasHeight||undefined}}>
      <div className="manuscript-page-sheets" aria-hidden="true">
        {Array.from({length:visiblePages},(_,index)=><div key={index} className="manuscript-page-sheet" style={unsupported&&index===0&&canvasHeight?{height:canvasHeight,flexBasis:canvasHeight}:undefined}><span>{index+1}</span></div>)}
      </div>
      <div ref={flowRef} className="manuscript-page-flow">{children}</div>
    </div>
    <div className="manuscript-page-status" aria-live="polite">{unsupported?"Pages preview is not supported by this browser · showing continuous layout":`Page ${currentPage} of ${pageCount}`}</div>
  </div>;
}

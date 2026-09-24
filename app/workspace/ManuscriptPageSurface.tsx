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

function insertLineSpacer(block:HTMLElement,boundaryY:number,nextBodyY:number){
  try{
    const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
    let node=walker.nextNode() as Text|null;
    while(node){
      if(!node.isConnected)return false;
      if((node.parentElement?.closest("[data-sogur-page-spacer]"))||!node.data.length){node=walker.nextNode() as Text|null;continue}
      const range=document.createRange();range.selectNodeContents(node);
      const rects=Array.from(range.getClientRects()).filter(rect=>rect.height>.5);
      const target=rects.find(rect=>rect.bottom>boundaryY+.5);
      if(!target){node=walker.nextNode() as Text|null;continue}

      const rectAt=(offset:number)=>{
        if(!node||!node.isConnected||!node.data.length)return null;
        const at=Math.max(0,Math.min(offset,node.data.length-1));
        const probe=document.createRange();probe.setStart(node,at);probe.setEnd(node,Math.min(node.data.length,at+1));
        return Array.from(probe.getClientRects()).find(rect=>rect.height>.5)??probe.getBoundingClientRect();
      };

      let low=0,high=Math.max(0,node.data.length-1);
      while(low<high){
        const mid=Math.floor((low+high)/2),rect=rectAt(mid);
        if(rect&&rect.top>=target.top-.75)high=mid;else low=mid+1;
      }
      let offset=low;
      while(offset>0){
        const previous=rectAt(offset-1);
        if(!previous||previous.top<target.top-.75)break;
        offset--;
      }
      if(!node.isConnected)return false;

      const lineBreak=document.createElement("br");
      lineBreak.setAttribute("data-sogur-page-break","true");
      lineBreak.setAttribute("aria-hidden","true");

      const spacer=document.createElement("span");
      spacer.setAttribute("data-sogur-page-spacer","true");
      spacer.setAttribute("contenteditable","false");
      spacer.setAttribute("aria-hidden","true");
      spacer.style.cssText="display:inline-block;width:100%;height:1px;box-sizing:border-box;margin:0;padding:0;border:0;font-size:0;line-height:0;vertical-align:top;overflow:hidden;pointer-events:none;user-select:none";

      const fragment=document.createDocumentFragment();
      fragment.append(lineBreak,spacer);
      const insertion=document.createRange();
      insertion.setStart(node,Math.min(offset,node.data.length));
      insertion.collapse(true);
      insertion.insertNode(fragment);
      void spacer.offsetHeight;
      if(!spacer.isConnected)return false;
      const spacerTop=spacer.getBoundingClientRect().top;
      const height=Math.max(1,nextBodyY-spacerTop);
      spacer.style.height=`${height}px`;
      return true;
    }
    return false;
  }catch{
    return false;
  }
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

function orderedPageTokens(flow:HTMLElement){
  return Array.from(flow.querySelectorAll<HTMLElement>('[data-sogur-scene-break],[data-sogur-page-block],[data-sogur-page-container] > *'))
    .filter((element,index,array)=>array.indexOf(element)===index);
}

function sceneBreakNeighbours(flow:HTMLElement,sceneBreak:HTMLElement){
  const tokens=orderedPageTokens(flow),index=tokens.indexOf(sceneBreak);
  let previous:HTMLElement|null=null,next:HTMLElement|null=null;
  for(let i=index-1;i>=0;i--){if(!tokens[i].hasAttribute("data-sogur-scene-break")){previous=tokens[i];break}}
  for(let i=index+1;i<tokens.length;i++){if(!tokens[i].hasAttribute("data-sogur-scene-break")){next=tokens[i];break}}
  return {previous,next};
}


type CaretSnapshot={root:HTMLElement;offset:number;viewportTop:number;scrollHost:HTMLElement|null};

function focusedEditable(flow:HTMLElement){
  const active=document.activeElement;
  return active instanceof HTMLElement&&flow.contains(active)&&active.matches('[data-sogur-page-container][contenteditable="true"]')?active:null;
}

function scrollHostFor(element:HTMLElement){
  let parent=element.parentElement;
  while(parent){
    const style=getComputedStyle(parent),overflowY=style.overflowY;
    if((overflowY==="auto"||overflowY==="scroll")&&parent.scrollHeight>parent.clientHeight+1)return parent;
    parent=parent.parentElement;
  }
  return null;
}

function captureCaret(flow:HTMLElement):CaretSnapshot|null{
  const root=focusedEditable(flow),selection=window.getSelection();
  if(!root||!selection?.rangeCount||!selection.isCollapsed)return null;
  const node=selection.focusNode;
  if(!node||node.nodeType!==Node.TEXT_NODE||!root.contains(node))return null;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let current=walker.nextNode() as Text|null,total=0;
  while(current){
    if(current===node){
      const range=selection.getRangeAt(0).cloneRange(),rect=range.getBoundingClientRect();
      const viewportTop=rect.height||rect.top?rect.top:(node.parentElement?.getBoundingClientRect().top??0);
      return {root,offset:total+selection.focusOffset,viewportTop,scrollHost:scrollHostFor(root)};
    }
    total+=current.data.length;
    current=walker.nextNode() as Text|null;
  }
  return null;
}

function restoreCaret(snapshot:CaretSnapshot|null){
  if(!snapshot||!snapshot.root.isConnected)return;
  const walker=document.createTreeWalker(snapshot.root,NodeFilter.SHOW_TEXT);
  let current=walker.nextNode() as Text|null,total=0,target:Text|null=null,targetOffset=0,last:Text|null=null;
  while(current){
    last=current;
    if(snapshot.offset<=total+current.data.length){target=current;targetOffset=Math.max(0,snapshot.offset-total);break}
    total+=current.data.length;
    current=walker.nextNode() as Text|null;
  }
  if(!target&&last){target=last;targetOffset=last.data.length}
  if(!target)return;
  try{
    snapshot.root.focus({preventScroll:true});
    const range=document.createRange();range.setStart(target,Math.min(targetOffset,target.data.length));range.collapse(true);
    const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
    const rect=range.getBoundingClientRect(),nextTop=rect.height||rect.top?rect.top:(target.parentElement?.getBoundingClientRect().top??snapshot.viewportTop);
    const delta=nextTop-snapshot.viewportTop;
    if(Math.abs(delta)>.5){
      if(snapshot.scrollHost?.isConnected)snapshot.scrollHost.scrollTop+=delta;
      else window.scrollBy(0,delta);
    }
  }catch{}
}

export default function ManuscriptPageSurface({children,className=""}:{children:ReactNode;className?:string}){
  const {layout,displayMode}=useManuscriptLayout();
  const surfaceRef=useRef<HTMLDivElement>(null),flowRef=useRef<HTMLDivElement>(null),frameRef=useRef<number|null>(null),idleTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null),runtimeLayoutRef=useRef(false),lastFlowHeightRef=useRef(0);
  const [pageCount,setPageCount]=useState(1),[currentPage,setCurrentPage]=useState(1),[canvasHeight,setCanvasHeight]=useState(0),[pageStride,setPageStride]=useState(layout.pageHeightMm*MM_TO_PX+28);

  const restoreAll=useCallback(()=>{
    const flow=flowRef.current;if(!flow)return;
    flow.querySelectorAll<HTMLElement>("[data-sogur-page-break],[data-sogur-page-spacer]").forEach(element=>element.remove());
    flow.querySelectorAll<HTMLElement>("[data-sogur-page-shift]").forEach(restoreShift);
  },[]);

  const recalc=useCallback(()=>{
    const surface=surfaceRef.current,flow=flowRef.current;
    if(displayMode!=="PAGES"||!surface||!flow)return;
    const caretSnapshot=captureCaret(flow);
    runtimeLayoutRef.current=true;
    try{
    restoreAll();
    const sceneBreaks=Array.from(flow.querySelectorAll<HTMLElement>("[data-sogur-scene-break]"));
    sceneBreaks.forEach(element=>element.setAttribute("data-sogur-scene-break-hidden","true"));

    const pageHeight=layout.pageHeightMm*MM_TO_PX;
    const topMargin=layout.marginTopMm*MM_TO_PX;
    const bottomMargin=layout.marginBottomMm*MM_TO_PX;
    const bodyHeight=Math.max(40,pageHeight-topMargin-bottomMargin);
    const gap=parseFloat(getComputedStyle(surface).getPropertyValue("--sogur-page-gap"))||28;
    const stride=pageHeight+gap;
    const surfaceTop=surface.getBoundingClientRect().top;

    const metrics=(element:HTMLElement)=>{
      const rect=element.getBoundingClientRect();
      return {top:rect.top-surfaceTop,bottom:rect.bottom-surfaceTop,height:rect.height};
    };

    const paginate=()=>{
      let itemStartsSeen=0;
      const blocks=pageBlocks(flow);
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

      const naturalHeight=box.height;
      const inBottomMarginOrGap=box.top>bodyEnd-1;
      const crossesBottom=box.bottom>bodyEnd+0.5;
      const canMoveWhole=naturalHeight<=bodyHeight-1;
      const alreadyAtPageTop=box.top<=bodyStart+1;
      const tag=block.tagName.toUpperCase();
      const splitByLine=(tag==="P"||tag==="BLOCKQUOTE")&&Boolean(block.textContent?.trim());

      if(inBottomMarginOrGap||(crossesBottom&&canMoveWhole&&!alreadyAtPageTop&&!splitByLine)){
        const nextPage=pageIndex+1;
        const targetTop=nextPage*stride+topMargin;
        applyShift(block,Math.max(0,targetTop-box.top));
        box=metrics(block);
        pageIndex=Math.max(0,Math.floor(Math.max(0,box.top)/stride));
      }

      if(naturalHeight>bodyHeight-1||(splitByLine&&crossesBottom)||metrics(block).bottom>pageIndex*stride+pageHeight-bottomMargin+.5){
        let boundaryPage=pageIndex,safety=0;
        while(safety++<80){
          box=metrics(block);
          const boundary=boundaryPage*stride+pageHeight-bottomMargin;
          if(box.bottom<=boundary+.5)break;
          const nextBody=(boundaryPage+1)*stride+topMargin;
          if(!insertLineSpacer(block,surfaceTop+boundary,surfaceTop+nextBody))break;
          boundaryPage++;
        }
      }
    }
    };

    paginate();

    for(const sceneBreak of sceneBreaks){
      const {previous,next}=sceneBreakNeighbours(flow,sceneBreak);
      if(!previous||!next)continue;
      const previousBox=metrics(previous),nextBox=metrics(next);
      const previousPage=Math.max(0,Math.floor(Math.max(0,previousBox.bottom-1)/stride));
      const nextPage=Math.max(0,Math.floor(Math.max(0,nextBox.top)/stride));
      if(previousPage!==nextPage)continue;

      sceneBreak.removeAttribute("data-sogur-scene-break-hidden");
      const breakBox=metrics(sceneBreak),updatedNext=metrics(next);
      const bodyStart=previousPage*stride+topMargin;
      const bodyEnd=previousPage*stride+pageHeight-bottomMargin;
      const fitsBreak=breakBox.top>=bodyStart-1&&breakBox.bottom<=bodyEnd+1;
      const keepsNextOnPage=updatedNext.top<bodyEnd-1;
      if(!fitsBreak||!keepsNextOnPage)sceneBreak.setAttribute("data-sogur-scene-break-hidden","true");
    }

    restoreAll();
    paginate();

    let breakVisibilityChanged=false;
    for(const sceneBreak of sceneBreaks){
      if(sceneBreak.hasAttribute("data-sogur-scene-break-hidden"))continue;
      const {previous,next}=sceneBreakNeighbours(flow,sceneBreak);
      if(!previous||!next)continue;
      const previousBox=metrics(previous),nextBox=metrics(next),breakBox=metrics(sceneBreak);
      const previousPage=Math.max(0,Math.floor(Math.max(0,previousBox.bottom-1)/stride));
      const nextPage=Math.max(0,Math.floor(Math.max(0,nextBox.top)/stride));
      const bodyStart=previousPage*stride+topMargin;
      const bodyEnd=previousPage*stride+pageHeight-bottomMargin;
      if(previousPage!==nextPage||breakBox.top<bodyStart-1||breakBox.bottom>bodyEnd+1){
        sceneBreak.setAttribute("data-sogur-scene-break-hidden","true");
        breakVisibilityChanged=true;
      }
    }
    if(breakVisibilityChanged){
      restoreAll();
      paginate();
    }

    let maxBottom=topMargin;
    for(const block of pageBlocks(flow)){
      const rect=block.getBoundingClientRect();
      maxBottom=Math.max(maxBottom,rect.bottom-surfaceTop);
    }
    const flowRect=flow.getBoundingClientRect();
    maxBottom=Math.max(maxBottom,flowRect.bottom-surfaceTop,(flowRect.top-surfaceTop)+flow.scrollHeight);
    const count=Math.max(1,Math.floor(Math.max(0,maxBottom-1)/stride)+1);
    setPageCount(count);
    setPageStride(stride);
    setCanvasHeight(count*pageHeight+(count-1)*gap);
    lastFlowHeightRef.current=flowRect.height;
    }catch{
      const fallbackPageHeight=layout.pageHeightMm*MM_TO_PX;
      const fallbackGap=parseFloat(getComputedStyle(surface).getPropertyValue("--sogur-page-gap"))||28;
      const fallbackStride=fallbackPageHeight+fallbackGap;
      const fallbackSurfaceTop=surface.getBoundingClientRect().top;
      const flowRect=flow.getBoundingClientRect();
      const extent=Math.max(fallbackPageHeight,flowRect.bottom-fallbackSurfaceTop,(flowRect.top-fallbackSurfaceTop)+flow.scrollHeight);
      const count=Math.max(1,Math.floor(Math.max(0,extent-1)/fallbackStride)+1);
      setPageCount(count);
      setPageStride(fallbackStride);
      setCanvasHeight(count*fallbackPageHeight+(count-1)*fallbackGap);
      lastFlowHeightRef.current=flowRect.height;
    }finally{
      runtimeLayoutRef.current=false;
      restoreCaret(caretSnapshot);
    }
  },[displayMode,layout,restoreAll]);

  useLayoutEffect(()=>{
    if(displayMode!=="PAGES")return;
    recalc();
    const flow=flowRef.current;if(!flow)return;
    const isEditing=()=>Boolean(focusedEditable(flow));
    const schedule=(delay=isEditing()?160:24)=>{
      if(idleTimerRef.current!==null)clearTimeout(idleTimerRef.current);
      if(frameRef.current!==null){cancelAnimationFrame(frameRef.current);frameRef.current=null}
      idleTimerRef.current=setTimeout(()=>{
        idleTimerRef.current=null;
        frameRef.current=requestAnimationFrame(()=>{frameRef.current=null;recalc()});
      },delay);
    };
    const observer=new MutationObserver(mutations=>{
      if(runtimeLayoutRef.current)return;
      if(mutations.some(mutation=>mutation.type==="childList"||mutation.type==="characterData"))schedule(isEditing()?180:32);
    });
    observer.observe(flow,{subtree:true,childList:true,characterData:true});
    const resizeObserver=typeof ResizeObserver!=="undefined"?new ResizeObserver(entries=>{
      if(runtimeLayoutRef.current)return;
      const observed=entries[0]?.contentRect.height??flow.getBoundingClientRect().height;
      if(Math.abs(observed-lastFlowHeightRef.current)>1){
        lastFlowHeightRef.current=observed;
        schedule(isEditing()?180:32);
      }
    }):null;
    resizeObserver?.observe(flow);
    const contentChanged=()=>schedule(180);
    const focusIn=()=>schedule(180);
    const focusOut=()=>schedule(0);
    const resized=()=>schedule(0);
    const loaded=()=>schedule(isEditing()?120:0);
    let disposed=false;
    if(typeof document!=="undefined"&&"fonts" in document)document.fonts.ready.then(()=>{if(!disposed)schedule(0)});
    flow.addEventListener("sogur:content-change",contentChanged);
    flow.addEventListener("focusin",focusIn);
    flow.addEventListener("focusout",focusOut);
    flow.addEventListener("load",loaded,true);
    window.addEventListener("resize",resized);
    return()=>{
      disposed=true;
      observer.disconnect();
      resizeObserver?.disconnect();
      flow.removeEventListener("sogur:content-change",contentChanged);
      flow.removeEventListener("focusin",focusIn);
      flow.removeEventListener("focusout",focusOut);
      flow.removeEventListener("load",loaded,true);
      window.removeEventListener("resize",resized);
      if(idleTimerRef.current!==null)clearTimeout(idleTimerRef.current);
      if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);
      runtimeLayoutRef.current=false;
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

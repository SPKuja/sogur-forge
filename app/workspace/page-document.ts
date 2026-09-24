import type {ManuscriptLayoutSettings} from "@/lib/manuscript-layout";

const PAGE_ATTR="data-sogur-physical-page";
const BODY_ATTR="data-sogur-page-body";
const BLOCK_ATTR="data-sogur-block-id";
const FRAGMENT_ATTR="data-sogur-fragment";
const CONTINUATION_ATTR="data-sogur-page-continuation";
const RUNTIME_ATTRS=[BLOCK_ATTR,FRAGMENT_ATTR,CONTINUATION_ATTR,"data-sogur-page-index"];

export type PagedCaret={
  blockId:string;
  textOffset:number;
  viewportTop:number|null;
};

export type PaginateResult={
  pageCount:number;
};

let blockSequence=0;
function nextBlockId(){
  blockSequence+=1;
  return `b-${Date.now().toString(36)}-${blockSequence.toString(36)}`;
}

export function resetPagedBlockIdentity(element:HTMLElement){
  element.setAttribute(BLOCK_ATTR,nextBlockId());
  element.removeAttribute(FRAGMENT_ATTR);
  element.removeAttribute(CONTINUATION_ATTR);
}

function logicalBlockForNode(root:HTMLElement,node:Node){
  const element=node.nodeType===Node.ELEMENT_NODE?node as HTMLElement:node.parentElement;
  if(!element||!root.contains(element))return null;
  const identified=element.closest<HTMLElement>(`[${BLOCK_ATTR}]`);
  if(identified&&root.contains(identified))return identified;

  let candidate:HTMLElement|null=element;
  while(candidate&&candidate!==root){
    const parentElement:HTMLElement|null=candidate.parentElement;
    if(parentElement?.hasAttribute(BODY_ATTR))return candidate;
    candidate=parentElement;
  }
  return null;
}

export function ensurePagedCaretIdentity(root:HTMLElement){
  const selection=window.getSelection();
  const node=selection?.focusNode;
  if(!node||!root.contains(node))return null;
  const block=logicalBlockForNode(root,node);
  if(!block)return null;
  if(!block.hasAttribute(BLOCK_ATTR))resetPagedBlockIdentity(block);
  return block;
}

export function finalisePagedParagraphBreak(root:HTMLElement,paragraph:HTMLElement){
  if(!root.contains(paragraph))return;
  const blocks=directBlocks(root);
  const index=blocks.indexOf(paragraph);
  if(index<0){
    resetPagedBlockIdentity(paragraph);
    return;
  }

  const inheritedId=paragraph.getAttribute(BLOCK_ATTR);
  const freshId=nextBlockId();
  const segmentId=paragraph.dataset.sogurSegmentId??"";

  for(let i=index;i<blocks.length;i++){
    const block=blocks[i];
    if(i>index&&(!inheritedId||block.getAttribute(BLOCK_ATTR)!==inheritedId))break;
    block.setAttribute(BLOCK_ATTR,freshId);
    block.removeAttribute(FRAGMENT_ATTR);
    block.removeAttribute(CONTINUATION_ATTR);
    if(segmentId&&!block.dataset.sogurSegmentId)block.dataset.sogurSegmentId=segmentId;
  }
}

function isElement(node:Node):node is HTMLElement{
  return node.nodeType===Node.ELEMENT_NODE;
}

function hasRenderableContent(element:HTMLElement){
  if((element.textContent??"").length>0)return true;
  return Boolean(element.querySelector("br,img,figure,hr,svg,video,audio"));
}

function cleanRuntimeAttributes(element:HTMLElement){
  for(const attr of RUNTIME_ATTRS)element.removeAttribute(attr);
  element.querySelectorAll<HTMLElement>(`[${BLOCK_ATTR}],[${FRAGMENT_ATTR}],[${CONTINUATION_ATTR}]`).forEach(child=>{
    for(const attr of RUNTIME_ATTRS)child.removeAttribute(attr);
  });
}

function normaliseTopLevelNodes(source:HTMLElement){
  const result:HTMLElement[]=[];
  const appendNode=(node:Node,segmentId="")=>{
    if(node.nodeType===Node.TEXT_NODE){
      if(!(node.textContent??"").trim())return;
      const p=document.createElement("p");
      p.textContent=node.textContent;
      if(segmentId)p.dataset.sogurSegmentId=segmentId;
      result.push(p);
      return;
    }
    if(!isElement(node))return;
    const containerSegment=node.getAttribute("data-sogur-segment-container");
    if(containerSegment){
      for(const child of Array.from(node.childNodes))appendNode(child,containerSegment);
      return;
    }
    if(segmentId&&!node.dataset.sogurSegmentId)node.dataset.sogurSegmentId=segmentId;
    result.push(node);
  };
  for(const node of Array.from(source.childNodes))appendNode(node);
  if(!result.length){
    const p=document.createElement("p");
    p.append(document.createElement("br"));
    result.push(p);
  }
  return result;
}

function assignMissingSegmentIds(blocks:HTMLElement[]){
  let current="";
  for(const block of blocks){
    const explicit=block.dataset.sogurSegmentId;
    if(explicit)current=explicit;
    else if(current)block.dataset.sogurSegmentId=current;
  }
  let next="";
  for(let index=blocks.length-1;index>=0;index--){
    const block=blocks[index];
    const explicit=block.dataset.sogurSegmentId;
    if(explicit)next=explicit;
    else if(next)block.dataset.sogurSegmentId=next;
  }
}

function pageBodies(root:HTMLElement){
  return Array.from(root.querySelectorAll<HTMLElement>(`:scope > [${PAGE_ATTR}] > [${BODY_ATTR}]`));
}

function directBlocks(root:HTMLElement){
  const bodies=pageBodies(root);
  const blocks=bodies.length
    ? bodies.flatMap(body=>Array.from(body.children).filter((node):node is HTMLElement=>node instanceof HTMLElement))
    : Array.from(root.children).filter((node):node is HTMLElement=>node instanceof HTMLElement);
  assignMissingSegmentIds(blocks);
  return blocks;
}

function cloneForLogicalHtml(element:HTMLElement){
  const clone=element.cloneNode(true) as HTMLElement;
  cleanRuntimeAttributes(clone);
  clone.removeAttribute("contenteditable");
  if(clone.matches("figure.manuscript-image")){
    clone.removeAttribute("draggable");
    clone.querySelectorAll<HTMLElement>("[draggable],[contenteditable]").forEach(child=>{
      child.removeAttribute("draggable");
      child.removeAttribute("contenteditable");
    });
  }
  clone.querySelectorAll<HTMLElement>("figure.manuscript-image").forEach(figure=>{
    figure.removeAttribute("contenteditable");
    figure.removeAttribute("draggable");
    figure.querySelectorAll<HTMLElement>("[draggable],[contenteditable]").forEach(child=>{
      child.removeAttribute("draggable");
      child.removeAttribute("contenteditable");
    });
  });
  return clone;
}

export function serialisePagedDocument(root:HTMLElement){
  const blocks=directBlocks(root);
  const output:HTMLElement[]=[];
  let previousId="",previousOutput:HTMLElement|null=null;

  for(const block of blocks){
    const id=block.getAttribute(BLOCK_ATTR)??"";
    const clone=cloneForLogicalHtml(block);
    if(id&&id===previousId&&previousOutput){
      while(clone.firstChild)previousOutput.append(clone.firstChild);
      continue;
    }
    output.push(clone);
    previousId=id;
    previousOutput=clone;
  }

  const box=document.createElement("div");
  const hasSegments=output.some(block=>Boolean(block.dataset.sogurSegmentId));
  if(!hasSegments){
    for(const block of output)box.append(block);
    return box.innerHTML;
  }

  let container:HTMLElement|null=null,currentSegment="";
  for(const block of output){
    if(block.hasAttribute("data-sogur-scene-break")){
      block.removeAttribute(BLOCK_ATTR);
      block.removeAttribute(FRAGMENT_ATTR);
      block.removeAttribute(CONTINUATION_ATTR);
      box.append(block);
      container=null;
      currentSegment="";
      continue;
    }
    const segmentId=block.dataset.sogurSegmentId??currentSegment;
    if(!segmentId){
      box.append(block);
      continue;
    }
    if(!container||segmentId!==currentSegment){
      container=document.createElement("div");
      container.setAttribute("data-sogur-segment-container",segmentId);
      box.append(container);
      currentSegment=segmentId;
    }
    block.removeAttribute("data-sogur-segment-id");
    container.append(block);
  }
  return box.innerHTML;
}

export function splitHtmlBySegment(html:string,segmentIds:string[]){
  const source=document.createElement("div");
  source.innerHTML=html;
  const buckets=new Map(segmentIds.map(id=>[id,[] as string[]]));
  let current=segmentIds[0]??"";
  for(const node of Array.from(source.children) as HTMLElement[]){
    if(node.hasAttribute("data-sogur-scene-break"))continue;
    const containerId=node.getAttribute("data-sogur-segment-container");
    if(containerId&&buckets.has(containerId)){
      const clone=node.cloneNode(true) as HTMLElement;
      cleanRuntimeAttributes(clone);
      for(const child of Array.from(clone.children) as HTMLElement[]){
        child.removeAttribute("data-sogur-segment-id");
        child.removeAttribute("data-sogur-segment-container");
        cleanRuntimeAttributes(child);
        buckets.get(containerId)?.push(child.outerHTML);
      }
      current=containerId;
      continue;
    }
    const explicit=node.dataset.sogurSegmentId;
    if(explicit&&buckets.has(explicit))current=explicit;
    if(!current)continue;
    const clone=node.cloneNode(true) as HTMLElement;
    clone.removeAttribute("data-sogur-segment-id");
    clone.removeAttribute("data-sogur-segment-container");
    cleanRuntimeAttributes(clone);
    buckets.get(current)?.push(clone.outerHTML);
  }
  return new Map(Array.from(buckets.entries()).map(([id,parts])=>[id,parts.join("")]));
}

export function canonicalBlocksFromHtml(html:string){
  const source=document.createElement("div");
  source.innerHTML=html;
  const blocks=normaliseTopLevelNodes(source);
  assignMissingSegmentIds(blocks);
  return blocks.map(block=>{
    if(!block.getAttribute(BLOCK_ATTR))block.setAttribute(BLOCK_ATTR,nextBlockId());
    return block;
  });
}

function canonicalBlocksFromRoot(root:HTMLElement){
  const blocks=directBlocks(root);
  const merged:HTMLElement[]=[];
  let previousId="",previousOutput:HTMLElement|null=null;

  for(const block of blocks){
    const id=block.getAttribute(BLOCK_ATTR)||nextBlockId();
    const clone=block.cloneNode(true) as HTMLElement;
    clone.setAttribute(BLOCK_ATTR,id);
    clone.removeAttribute(FRAGMENT_ATTR);
    clone.removeAttribute(CONTINUATION_ATTR);
    if(id===previousId&&previousOutput){
      while(clone.firstChild)previousOutput.append(clone.firstChild);
      continue;
    }
    merged.push(clone);
    previousId=id;
    previousOutput=clone;
  }
  assignMissingSegmentIds(merged);
  return merged;
}

function pagePadding(layout:ManuscriptLayoutSettings,pageIndex:number){
  const odd=pageIndex%2===0;
  const inside=layout.marginInsideMm+layout.gutterMm;
  const outside=layout.marginOutsideMm;
  if(!layout.mirroredMargins||odd){
    return {left:inside,right:outside};
  }
  return {left:outside,right:inside};
}

function createPage(root:HTMLElement,layout:ManuscriptLayoutSettings,pageIndex:number){
  const page=document.createElement("div");
  page.className="sogur-physical-page";
  page.setAttribute(PAGE_ATTR,"true");
  page.dataset.sogurPageIndex=String(pageIndex);
  page.style.width=`${layout.pageWidthMm}mm`;
  page.style.height=`${layout.pageHeightMm}mm`;
  page.style.paddingTop=`${layout.marginTopMm}mm`;
  page.style.paddingBottom=`${layout.marginBottomMm}mm`;
  const horizontal=pagePadding(layout,pageIndex);
  page.style.paddingLeft=`${horizontal.left}mm`;
  page.style.paddingRight=`${horizontal.right}mm`;

  const body=document.createElement("div");
  body.className="sogur-physical-page-body";
  body.setAttribute(BODY_ATTR,"true");
  page.append(body);
  root.append(page);
  return body;
}

function bodyFits(body:HTMLElement){
  return body.scrollHeight<=body.clientHeight+1;
}

function allTextNodes(element:HTMLElement){
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
  const nodes:Text[]=[];
  let node=walker.nextNode();
  while(node){
    nodes.push(node as Text);
    node=walker.nextNode();
  }
  return nodes;
}

function textLength(element:HTMLElement){
  return allTextNodes(element).reduce((sum,node)=>sum+node.data.length,0);
}

function pointAtTextOffset(element:HTMLElement,offset:number){
  const nodes=allTextNodes(element);
  let remaining=Math.max(0,offset);
  for(const node of nodes){
    if(remaining<=node.data.length)return {node,offset:remaining};
    remaining-=node.data.length;
  }
  const last=nodes.at(-1);
  if(last)return {node:last,offset:last.data.length};
  return null;
}

function prefixFits(element:HTMLElement,body:HTMLElement,offset:number){
  const point=pointAtTextOffset(element,offset);
  if(!point)return false;
  const range=document.createRange();
  range.selectNodeContents(element);
  range.setEnd(point.node,point.offset);
  const rects=Array.from(range.getClientRects()).filter(rect=>rect.width>.1||rect.height>.1);
  const last=rects.length?rects[rects.length-1]:range.getBoundingClientRect();
  const bodyRect=body.getBoundingClientRect();
  return last.bottom<=bodyRect.bottom+.75;
}

function visibleContentFits(element:HTMLElement,body:HTMLElement){
  const total=textLength(element);
  if(total>0)return prefixFits(element,body,total);
  const rect=element.getBoundingClientRect(),bodyRect=body.getBoundingClientRect();
  return rect.bottom<=bodyRect.bottom+.75;
}

function splittable(element:HTMLElement){
  const tag=element.tagName.toUpperCase();
  // Lists need item-aware fragmentation so their semantic structure and
  // numbering survive recombination. Until that paginator exists, keep a
  // list together rather than split it at an arbitrary text offset.
  return tag==="P"||tag==="BLOCKQUOTE";
}

function splitElementForBody(element:HTMLElement,body:HTMLElement){
  const total=textLength(element);
  if(total<2)return null;

  let low=1,high=total-1,best=0;
  while(low<=high){
    const mid=Math.floor((low+high)/2);
    if(prefixFits(element,body,mid)){best=mid;low=mid+1}
    else high=mid-1;
  }
  if(best<=0||best>=total)return null;

  const point=pointAtTextOffset(element,best);
  if(!point)return null;

  const beforeRange=document.createRange();
  beforeRange.selectNodeContents(element);
  beforeRange.setEnd(point.node,point.offset);
  const afterRange=document.createRange();
  afterRange.selectNodeContents(element);
  afterRange.setStart(point.node,point.offset);

  const first=element.cloneNode(false) as HTMLElement;
  const second=element.cloneNode(false) as HTMLElement;
  first.append(beforeRange.cloneContents());
  second.append(afterRange.cloneContents());
  if(!hasRenderableContent(first)||!hasRenderableContent(second))return null;

  const id=element.getAttribute(BLOCK_ATTR)||nextBlockId();
  first.setAttribute(BLOCK_ATTR,id);
  second.setAttribute(BLOCK_ATTR,id);
  first.setAttribute(FRAGMENT_ATTR,"start");
  second.setAttribute(FRAGMENT_ATTR,"end");
  second.setAttribute(CONTINUATION_ATTR,"true");
  return {first,second};
}

function markFragmentRoles(root:HTMLElement){
  const groups=new Map<string,HTMLElement[]>();
  for(const block of directBlocks(root)){
    const id=block.getAttribute(BLOCK_ATTR);
    if(!id)continue;
    const group=groups.get(id)??[];
    group.push(block);
    groups.set(id,group);
  }
  for(const group of groups.values()){
    if(group.length===1){
      group[0].removeAttribute(FRAGMENT_ATTR);
      group[0].removeAttribute(CONTINUATION_ATTR);
      continue;
    }
    group.forEach((element,index)=>{
      element.setAttribute(FRAGMENT_ATTR,index===0?"start":index===group.length-1?"end":"middle");
      if(index===0)element.removeAttribute(CONTINUATION_ATTR);
      else element.setAttribute(CONTINUATION_ATTR,"true");
    });
  }
}

function pageLastMeaningfulBlock(body:HTMLElement){
  const children=Array.from(body.children).filter((node):node is HTMLElement=>node instanceof HTMLElement);
  return children.at(-1)??null;
}

function trailingSceneOrnamentIds(root:HTMLElement){
  const ids=new Set<string>();
  for(const body of pageBodies(root)){
    const last=pageLastMeaningfulBlock(body);
    if(!last?.hasAttribute("data-sogur-scene-break"))continue;
    const id=last.getAttribute(BLOCK_ATTR);
    if(id)ids.add(id);
  }
  return ids;
}

function appendLogicalBlock(
  root:HTMLElement,
  layout:ManuscriptLayoutSettings,
  state:{body:HTMLElement;pageIndex:number},
  logical:HTMLElement
){
  let block=logical.cloneNode(true) as HTMLElement;
  if(!block.getAttribute(BLOCK_ATTR))block.setAttribute(BLOCK_ATTR,nextBlockId());
  if(block.hasAttribute("data-sogur-scene-break"))block.contentEditable="false";

  const forceBefore=block.getAttribute("data-sogur-page-break-before");
  if(forceBefore){
    if(state.body.children.length){
      state.pageIndex+=1;
      state.body=createPage(root,layout,state.pageIndex);
    }
    if(forceBefore==="recto"&&state.pageIndex%2===1){
      state.pageIndex+=1;
      state.body=createPage(root,layout,state.pageIndex);
    }
  }

  while(true){
    state.body.append(block);
    if(bodyFits(state.body))return;

    // A block's trailing margin may extend beyond the printable body even
    // when its final rendered line is completely inside the page. Page
    // boundaries collapse that trailing whitespace; never orphan the final
    // character merely to make paragraph spacing fit.
    if(splittable(block)&&visibleContentFits(block,state.body))return;

    state.body.removeChild(block);

    if(block.hasAttribute("data-sogur-scene-break")){
      if(state.body.children.length){
        state.pageIndex+=1;
        state.body=createPage(root,layout,state.pageIndex);
      }
      return;
    }

    if(splittable(block)){
      state.body.append(block);
      const split=splitElementForBody(block,state.body);
      state.body.removeChild(block);
      if(split){
        state.body.append(split.first);
        state.pageIndex+=1;
        state.body=createPage(root,layout,state.pageIndex);
        block=split.second;
        continue;
      }
    }

    if(state.body.children.length){
      state.pageIndex+=1;
      state.body=createPage(root,layout,state.pageIndex);
      continue;
    }

    // A single unsplittable object is taller than the printable body.
    // Keep it on this page; CSS constrains manuscript media where possible.
    state.body.append(block);
    return;
  }
}

export function capturePagedCaret(root:HTMLElement):PagedCaret|null{
  const selection=window.getSelection();
  if(!selection?.rangeCount||!selection.isCollapsed)return null;
  const node=selection.focusNode;
  if(!node||!root.contains(node))return null;
  const block=ensurePagedCaretIdentity(root);
  if(!block)return null;
  const blockId=block.getAttribute(BLOCK_ATTR);
  if(!blockId)return null;

  const fragments=Array.from(root.querySelectorAll<HTMLElement>(`[${BLOCK_ATTR}="${CSS.escape(blockId)}"]`));
  let offset=0;
  for(const fragment of fragments){
    if(fragment===block)break;
    offset+=textLength(fragment);
  }

  try{
    const range=document.createRange();
    range.selectNodeContents(block);
    range.setEnd(selection.focusNode!,selection.focusOffset);
    offset+=range.toString().length;
    const caretRange=selection.getRangeAt(0).cloneRange();
    const rect=caretRange.getBoundingClientRect();
    return {blockId,textOffset:offset,viewportTop:Number.isFinite(rect.top)?rect.top:null};
  }catch{
    return {blockId,textOffset:offset,viewportTop:null};
  }
}

export function restorePagedCaret(root:HTMLElement,caret:PagedCaret|null){
  if(!caret)return;
  const fragments=Array.from(root.querySelectorAll<HTMLElement>(`[${BLOCK_ATTR}="${CSS.escape(caret.blockId)}"]`));
  if(!fragments.length)return;

  let remaining=caret.textOffset,target=fragments.at(-1)!;
  for(const fragment of fragments){
    const length=textLength(fragment);
    if(remaining<=length){target=fragment;break}
    remaining-=length;
  }
  const point=pointAtTextOffset(target,remaining);
  if(!point)return;

  try{
    root.focus({preventScroll:true});
    const range=document.createRange();
    range.setStart(point.node,Math.min(point.offset,point.node.data.length));
    range.collapse(true);
    const selection=window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const rect=range.getBoundingClientRect();
    const toolbar=document.querySelector<HTMLElement>(".paged-formatbar");
    const toolbarRect=toolbar?.getBoundingClientRect();
    const safeTop=toolbarRect&&toolbarRect.bottom>0&&toolbarRect.top<window.innerHeight?toolbarRect.bottom+12:16;
    const safeBottom=window.innerHeight-24;
    let delta=0;
    if(rect.bottom>safeBottom)delta=rect.bottom-safeBottom;
    else if(rect.top<safeTop)delta=rect.top-safeTop;
    if(Number.isFinite(delta)&&Math.abs(delta)>.5)window.scrollBy(0,delta);
  }catch{}
}

export function paginateDocument(
  root:HTMLElement,
  layout:ManuscriptLayoutSettings,
  html?:string,
  caret?:PagedCaret|null
):PaginateResult{
  const captured=caret===undefined?capturePagedCaret(root):caret;
  const viewport=typeof window!=="undefined"?{x:window.scrollX,y:window.scrollY}:null;
  const blocks=html===undefined?canonicalBlocksFromRoot(root):canonicalBlocksFromHtml(html);

  root.classList.add("sogur-paged-document");
  root.dataset.sogurPagination="v2";

  const suppressedSceneBreaks=new Set<string>();
  for(let pass=0;pass<4;pass++){
    root.innerHTML="";
    const state={body:createPage(root,layout,0),pageIndex:0};
    for(const block of blocks){
      const id=block.getAttribute(BLOCK_ATTR)??"";
      if(id&&suppressedSceneBreaks.has(id))continue;
      appendLogicalBlock(root,layout,state,block);
    }
    markFragmentRoles(root);
    const trailing=trailingSceneOrnamentIds(root);
    const fresh=[...trailing].filter(id=>!suppressedSceneBreaks.has(id));
    if(!fresh.length)break;
    fresh.forEach(id=>suppressedSceneBreaks.add(id));
  }

  const pageCount=pageBodies(root).length||1;
  if(viewport)window.scrollTo(viewport.x,viewport.y);
  restorePagedCaret(root,captured);
  return {pageCount};
}

function cleanLogicalBlockForOutput(block:HTMLElement){
  const clone=block.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-sogur-segment-id");
  clone.removeAttribute("data-sogur-segment-container");
  cleanRuntimeAttributes(clone);
  return clone;
}

export function splitPagedSegmentAtCaret(root:HTMLElement,segmentId:string){
  const caret=capturePagedCaret(root);
  if(!caret)return null;
  const blocks=canonicalBlocksFromRoot(root).filter(block=>block.dataset.sogurSegmentId===segmentId&&!block.hasAttribute("data-sogur-scene-break"));
  const index=blocks.findIndex(block=>block.getAttribute(BLOCK_ATTR)===caret.blockId);
  if(index<0)return null;

  const current=blocks[index];
  const point=pointAtTextOffset(current,caret.textOffset);
  if(!point)return null;

  const beforeRange=document.createRange();
  beforeRange.selectNodeContents(current);
  beforeRange.setEnd(point.node,point.offset);
  const afterRange=document.createRange();
  afterRange.selectNodeContents(current);
  afterRange.setStart(point.node,point.offset);

  const first=current.cloneNode(false) as HTMLElement;
  first.append(beforeRange.cloneContents());
  const second=current.cloneNode(false) as HTMLElement;
  second.append(afterRange.cloneContents());

  const beforeBlocks=[...blocks.slice(0,index).map(cleanLogicalBlockForOutput)];
  const afterBlocks=[...blocks.slice(index+1).map(cleanLogicalBlockForOutput)];
  if(hasRenderableContent(first))beforeBlocks.push(cleanLogicalBlockForOutput(first));
  if(hasRenderableContent(second))afterBlocks.unshift(cleanLogicalBlockForOutput(second));

  return {
    beforeHtml:beforeBlocks.map(block=>block.outerHTML).join(""),
    afterHtml:afterBlocks.map(block=>block.outerHTML).join("")
  };
}

export function flattenPagedDocument(root:HTMLElement,html:string){
  root.classList.remove("sogur-paged-document");
  delete root.dataset.sogurPagination;
  root.innerHTML=html;
}

export function currentPagedPage(root:HTMLElement){
  const pages=Array.from(root.querySelectorAll<HTMLElement>(`:scope > [${PAGE_ATTR}]`));
  const middle=window.innerHeight*.5;
  let nearest=1,distance=Number.POSITIVE_INFINITY;
  pages.forEach((page,index)=>{
    const rect=page.getBoundingClientRect();
    const d=Math.abs((rect.top+rect.bottom)/2-middle);
    if(d<distance){distance=d;nearest=index+1}
  });
  return nearest;
}

export function deletePagedFragmentCharacter(root:HTMLElement,direction:"backward"|"forward"){
  const selection=window.getSelection();
  if(!selection?.rangeCount||!selection.isCollapsed)return false;
  const node=selection.focusNode;
  if(!node||!root.contains(node))return false;
  const element=node.nodeType===Node.ELEMENT_NODE?node as HTMLElement:node.parentElement;
  const block=element?.closest<HTMLElement>(`[${BLOCK_ATTR}]`);
  const blockId=block?.getAttribute(BLOCK_ATTR);
  if(!block||!blockId)return false;

  const fragments=Array.from(root.querySelectorAll<HTMLElement>(`[${BLOCK_ATTR}="${CSS.escape(blockId)}"]`));
  const caret=capturePagedCaret(root);
  if(!caret||caret.blockId!==blockId)return false;

  if(fragments.length>=2){
    const total=fragments.reduce((sum,fragment)=>sum+textLength(fragment),0);
    const targetOffset=direction==="backward"?caret.textOffset-1:caret.textOffset;
    if(targetOffset<0||targetOffset>=total)return false;

    let remaining=targetOffset,targetNode:Text|null=null,targetNodeOffset=0;
    outer:for(const fragment of fragments){
      for(const text of allTextNodes(fragment)){
        if(remaining<text.data.length){
          targetNode=text;
          targetNodeOffset=remaining;
          break outer;
        }
        remaining-=text.data.length;
      }
    }
    if(!targetNode)return false;

    targetNode.deleteData(targetNodeOffset,1);
    restorePagedCaret(root,{
      blockId,
      textOffset:direction==="backward"?Math.max(0,caret.textOffset-1):caret.textOffset,
      viewportTop:null
    });
    return true;
  }

  // Recovery for punctuation that an earlier paginator may already have
  // persisted as a tiny standalone block at the top of the next page.
  const text=block.textContent??"";
  const punctuationOnly=text.length>0&&text.length<=4&&/^[\p{P}\p{S}\s]+$/u.test(text);
  const body=block.closest<HTMLElement>(`[${BODY_ATTR}]`);
  const isFirstBlock=body?.firstElementChild===block;
  if(!punctuationOnly||!isFirstBlock)return false;

  const localRange=document.createRange();
  localRange.selectNodeContents(block);
  try{localRange.setEnd(selection.focusNode!,selection.focusOffset)}catch{return false}
  const localOffset=localRange.toString().length;
  const targetOffset=direction==="backward"?localOffset-1:localOffset;
  if(targetOffset<0||targetOffset>=textLength(block))return false;

  const point=pointAtTextOffset(block,targetOffset);
  if(!point)return false;
  point.node.deleteData(point.offset,1);

  if(textLength(block)>0){
    restorePagedCaret(root,{
      blockId,
      textOffset:direction==="backward"?Math.max(0,localOffset-1):localOffset,
      viewportTop:null
    });
    return true;
  }

  const blocks=directBlocks(root),index=blocks.indexOf(block);
  const previous=[...blocks.slice(0,index)].reverse().find(candidate=>!candidate.hasAttribute("data-sogur-scene-break"));
  block.remove();
  if(previous){
    const previousId=previous.getAttribute(BLOCK_ATTR);
    if(previousId)restorePagedCaret(root,{blockId:previousId,textOffset:textLength(previous),viewportTop:null});
  }
  return true;
}

export function pageBodyForNode(node:Node|null){
  const element=node?.nodeType===Node.ELEMENT_NODE?node as HTMLElement:node?.parentElement;
  return element?.closest<HTMLElement>(`[${BODY_ATTR}]`)??null;
}

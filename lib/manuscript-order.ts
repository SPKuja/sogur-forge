export function manuscriptChapterOrder<T extends {partId:string|null}>(
  chapters:T[],
  parts:{id:string;position:number}[]
):T[]{
  const orderedParts=[...parts].sort((a,b)=>a.position-b.position);
  const known=new Set(orderedParts.map(part=>part.id));
  const result:T[]=[];
  result.push(...chapters.filter(chapter=>!chapter.partId));
  for(const part of orderedParts)result.push(...chapters.filter(chapter=>chapter.partId===part.id));
  result.push(...chapters.filter(chapter=>chapter.partId&&!known.has(chapter.partId)));
  return result;
}

export function chapterNumberMap<T extends {id:string;partId:string|null}>(
  chapters:T[],
  parts:{id:string;position:number}[]
){
  return new Map(manuscriptChapterOrder(chapters,parts).map((chapter,index)=>[chapter.id,index+1]));
}


export function reorderChapterForDrop<T extends {id:string;partId:string|null;position:number}>(
  chapters:T[],
  parts:{id:string;position:number}[],
  dragId:string,
  targetId:string|null,
  targetPartId:string|null,
  after=false
):T[]|null{
  if(dragId===targetId)return null;
  const visible=manuscriptChapterOrder(chapters,parts);
  const moving=visible.find(chapter=>chapter.id===dragId);
  if(!moving)return null;
  const rest=visible.filter(chapter=>chapter.id!==dragId);
  let resolvedPartId=targetPartId;
  let at=rest.length;
  if(targetId){
    const targetIndex=rest.findIndex(chapter=>chapter.id===targetId);
    if(targetIndex<0)return null;
    resolvedPartId=rest[targetIndex].partId;
    at=targetIndex+(after?1:0);
  }else{
    const samePart=rest.map((chapter,index)=>({chapter,index})).filter(item=>(item.chapter.partId??"")===(resolvedPartId??""));
    if(samePart.length)at=samePart[samePart.length-1].index+1;
    else{
      const orderedKeys=["",...[...parts].sort((a,b)=>a.position-b.position).map(part=>part.id)];
      const targetGroup=orderedKeys.indexOf(resolvedPartId??"");
      const firstLater=rest.findIndex(chapter=>orderedKeys.indexOf(chapter.partId??"")>targetGroup);
      at=firstLater<0?rest.length:firstLater;
    }
  }
  const moved={...moving,partId:resolvedPartId} as T;
  rest.splice(at,0,moved);
  return rest.map((chapter,index)=>({...chapter,position:index}));
}

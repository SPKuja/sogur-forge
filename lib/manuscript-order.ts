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

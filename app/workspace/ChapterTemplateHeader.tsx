"use client";
import {renderChapterTemplateText,type ChapterTemplateContext,type ChapterTemplateDesign} from "@/lib/chapter-template";

function align(value:string):"left"|"center"|"right"{return value==="LEFT"?"left":value==="RIGHT"?"right":"center"}
function font(value:string){return value==="SANS"?"var(--font-ui)":"var(--font-writing)"}

export default function ChapterTemplateHeader({template,context,imageUrl,className=""}:{template:ChapterTemplateDesign;context:ChapterTemplateContext;imageUrl?:string|null;className?:string}){
  const image=template.showImage&&imageUrl?<div key="image" className={`chapter-template-image align-${template.imageAlign.toLowerCase()}`} style={{width:`${template.imageWidth}%`,marginBottom:template.imageSpacing}}><img src={imageUrl} alt=""/></div>:null;
  const label=template.eyebrowPattern.trim()?<div key="label" className="chapter-template-label" style={{textAlign:align(template.labelAlign),fontSize:template.labelSize,fontWeight:template.labelWeight,fontFamily:font(template.labelFont),marginBottom:template.labelSpacing}}>{renderChapterTemplateText(template.eyebrowPattern,context)}</div>:null;
  const title=template.titlePattern.trim()?<div key="title" className="chapter-template-title" style={{textAlign:align(template.titleAlign),fontSize:template.titleSize,fontWeight:template.titleWeight,fontFamily:font(template.titleFont),marginBottom:template.titleSpacing}}>{renderChapterTemplateText(template.titlePattern,context)}</div>:null;
  const divider=template.showDivider?<div key="divider" className="chapter-template-divider" style={{width:`${template.dividerWidth}%`,height:template.dividerThickness}}/>:null;
  const blocks:React.ReactNode[]=[];
  if(template.imagePosition==="BEFORE_LABEL"&&image)blocks.push(image);
  if(label)blocks.push(label);
  if(template.imagePosition==="BETWEEN_LABEL_TITLE"&&image)blocks.push(image);
  if(title)blocks.push(title);
  if(template.imagePosition==="AFTER_TITLE"&&image)blocks.push(image);
  if(divider)blocks.push(divider);
  if(template.imagePosition==="AFTER_DIVIDER"&&image)blocks.push(image);
  return <div className={`chapter-template-header-render ${className}`} style={{paddingTop:template.headerPaddingTop,paddingBottom:template.headerPaddingBottom}}>{blocks}</div>;
}

export type ChapterTemplateContext={
  chapterNumber:number;
  chapterTitle:string;
  partTitle?:string|null;
  novelTitle:string;
};

export type ChapterTemplateDesign={
  id:string;
  name:string;
  isDefault:boolean;
  content:string;
};

export const DEFAULT_CHAPTER_TEMPLATE_CONTENT='<p style="text-align:center"><strong>CHAPTER {{chapter_number}}</strong></p><h2 style="text-align:center">{{chapter_title}}</h2><p><br></p>';

export function toRoman(value:number){
  if(!Number.isFinite(value)||value<=0)return String(value||"");
  const table:[number,string][]=[[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let n=Math.floor(value),out="";
  for(const [amount,symbol] of table)while(n>=amount){out+=symbol;n-=amount}
  return out;
}

export function numberToWords(value:number){
  const n=Math.max(0,Math.floor(value));
  if(n===0)return "Zero";
  const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const underThousand=(input:number)=>{
    let v=input;
    const bits:string[]=[];
    if(v>=100){bits.push(ones[Math.floor(v/100)]+" Hundred");v%=100;if(v)bits.push("and")}
    if(v>=20){bits.push(tens[Math.floor(v/10)]);v%=10;if(v)bits.push(ones[v])}
    else if(v>0)bits.push(ones[v]);
    return bits.join(" ");
  };
  if(n<1000)return underThousand(n);
  if(n<1000000){
    const thousands=Math.floor(n/1000),rest=n%1000;
    return underThousand(thousands)+" Thousand"+(rest?(rest<100?" and ":" ")+underThousand(rest):"");
  }
  return String(n);
}

function values(context:ChapterTemplateContext){
  return {
    chapter_number:String(context.chapterNumber),
    chapter_number_padded:String(context.chapterNumber).padStart(2,"0"),
    chapter_number_roman:toRoman(context.chapterNumber),
    chapter_number_word:numberToWords(context.chapterNumber),
    chapter_title:context.chapterTitle,
    part_title:context.partTitle||"",
    section_title:context.partTitle||"",
    novel_title:context.novelTitle
  };
}

function escapeHtml(value:string){
  return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
}

export function renderChapterTemplateText(pattern:string,context:ChapterTemplateContext){
  const v=values(context);
  return pattern.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi,(whole,key)=>v[String(key).toLowerCase() as keyof typeof v]??whole);
}

export function renderChapterTemplateContent(content:string,context:ChapterTemplateContext){
  const v=values(context);
  return content.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi,(whole,key)=>{
    const value=v[String(key).toLowerCase() as keyof typeof v];
    return value===undefined?whole:escapeHtml(value);
  });
}

export const CHAPTER_TEMPLATE_TAGS=[
  "{{chapter_number}}",
  "{{chapter_number_padded}}",
  "{{chapter_number_roman}}",
  "{{chapter_number_word}}",
  "{{chapter_title}}",
  "{{section_title}}",
  "{{novel_title}}"
] as const;

type LegacyTemplate=Record<string,unknown>&{
  id:string;
  name:string;
  isDefault:boolean;
  content?:string|null;
};

function textStyle(row:LegacyTemplate,prefix:"label"|"title"){
  const align=String(row[prefix+"Align"]||"CENTER").toLowerCase();
  const size=Number(row[prefix+"Size"]||(prefix==="title"?42:10));
  const weight=Number(row[prefix+"Weight"]||(prefix==="title"?700:800));
  const colour=String(row[prefix+"Color"]||"");
  const font=String(row[prefix+"Font"]||"SERIF")==="SANS"?"system-ui,-apple-system,sans-serif":"Georgia,serif";
  const caseValue=String(row[prefix+"Case"]||"NORMAL");
  const transform=caseValue==="UPPER"?"uppercase":caseValue==="LOWER"?"lowercase":"none";
  return "text-align:"+align+";font-size:"+size+"px;font-weight:"+weight+";font-family:"+font+";text-transform:"+transform+(colour?";color:"+colour:"");
}

function legacyTemplateContent(row:LegacyTemplate){
  const blocks:string[]=[];
  const imageId=String(row.headerImageAssetId||"");
  const showImage=Boolean(row.showImage)&&!!imageId;
  const imagePosition=String(row.imagePosition||"BEFORE_LABEL");
  const image=showImage?'<figure class="manuscript-image" data-align="'+String(row.imageAlign||"CENTER").toLowerCase()+'" style="width:'+Math.max(20,Math.min(100,Number(row.imageWidth)||100))+'%"><img src="/api/assets/'+encodeURIComponent(imageId)+'" alt="" draggable="false"><figcaption></figcaption></figure>':"";
  const labelPattern=String(row.eyebrowPattern||"CHAPTER {{chapter_number}}");
  const titlePattern=String(row.titlePattern||"{{chapter_title}}");
  const label=labelPattern.trim()?'<p style="'+textStyle(row,"label")+'">'+escapeHtml(labelPattern)+"</p>":"";
  const title=titlePattern.trim()?'<h2 style="'+textStyle(row,"title")+'">'+escapeHtml(titlePattern)+"</h2>":"";
  const divider=Boolean(row.showDivider)?'<p style="text-align:center">* * *</p>':"";
  if(imagePosition==="BEFORE_LABEL"&&image)blocks.push(image);
  if(label)blocks.push(label);
  if(imagePosition==="BETWEEN_LABEL_TITLE"&&image)blocks.push(image);
  if(title)blocks.push(title);
  if(imagePosition==="AFTER_TITLE"&&image)blocks.push(image);
  if(divider)blocks.push(divider);
  if(imagePosition==="AFTER_DIVIDER"&&image)blocks.push(image);
  blocks.push("<p><br></p>");
  return blocks.join("");
}

export function normaliseChapterTemplate(row:LegacyTemplate):ChapterTemplateDesign{
  const saved=String(row.content||"");
  return {
    id:String(row.id),
    name:String(row.name||"Chapter Template"),
    isDefault:Boolean(row.isDefault),
    content:saved.trim()?saved:legacyTemplateContent(row)
  };
}

export function templatePreviewText(html:string){
  return html
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi," ")
    .replace(/<br\s*\/?>/gi," ")
    .replace(/<[^>]*>/g," ")
    .replace(/&nbsp;/g," ")
    .replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<")
    .replace(/&gt;/g,">")
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/\s+/g," ")
    .trim();
}

export function cleanChapterContentForTemplate(content:string){
  return content
    .replace(/\sdata-note-anchor=(?:"[^"]*"|'[^']*')/gi,"")
    .replace(/\bnote-anchor-active\b/g,"")
    .replace(/\bnote-anchor\b/g,"");
}

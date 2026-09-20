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
  eyebrowPattern:string;
  titlePattern:string;
  showImage:boolean;
  headerImageAssetId:string|null;
  headerImageUrl?:string|null;
  imageWidth:number;
  imageAlign:string;
  imagePosition:string;
  imageSpacing:number;
  labelAlign:string;
  labelSize:number;
  labelWeight:number;
  labelFont:string;
  labelSpacing:number;
  labelColor:string;
  labelCase:string;
  titleAlign:string;
  titleSize:number;
  titleWeight:number;
  titleFont:string;
  titleSpacing:number;
  titleColor:string;
  titleCase:string;
  showDivider:boolean;
  dividerWidth:number;
  dividerThickness:number;
  headerPaddingTop:number;
  headerPaddingBottom:number;
};

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

export function renderChapterTemplateText(pattern:string,context:ChapterTemplateContext){
  const values:Record<string,string>={
    chapter_number:String(context.chapterNumber),
    chapter_number_padded:String(context.chapterNumber).padStart(2,"0"),
    chapter_number_roman:toRoman(context.chapterNumber),
    chapter_number_word:numberToWords(context.chapterNumber),
    chapter_title:context.chapterTitle,
    part_title:context.partTitle||"",
    novel_title:context.novelTitle
  };
  return pattern.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi,(whole,key)=>values[String(key).toLowerCase()]??whole);
}

export const CHAPTER_TEMPLATE_TAGS=[
  "{{chapter_number}}",
  "{{chapter_number_padded}}",
  "{{chapter_number_roman}}",
  "{{chapter_number_word}}",
  "{{chapter_title}}",
  "{{part_title}}",
  "{{novel_title}}"
] as const;

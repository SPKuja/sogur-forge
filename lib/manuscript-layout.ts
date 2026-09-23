import {WRITING_FONTS} from "@/lib/editor-typography";

export type ManuscriptDisplayMode="CONTINUOUS"|"PAGES";
export type ManuscriptDisplayUnit="MM"|"IN";
export type ChapterStartRule="FLOW"|"NEW_PAGE"|"RECTO";

export type ManuscriptLayoutSettings={
  version:number;
  pagePreset:string;
  pageWidthMm:number;
  pageHeightMm:number;
  marginTopMm:number;
  marginBottomMm:number;
  marginInsideMm:number;
  marginOutsideMm:number;
  gutterMm:number;
  mirroredMargins:boolean;
  bodyFontId:string;
  bodyFontSizePt:number;
  lineHeight:number;
  paragraphSpacingPt:number;
  firstLineIndentMm:number;
  chapterStart:ChapterStartRule;
  displayUnit:ManuscriptDisplayUnit;
};

export type ManuscriptLayoutBundle={
  layout:ManuscriptLayoutSettings;
  displayMode:ManuscriptDisplayMode;
};

export const PAGE_PRESETS=[
  {id:"UK_B",label:"UK B-format",widthMm:129,heightMm:198,detail:"129 × 198 mm"},
  {id:"A4",label:"A4",widthMm:210,heightMm:297,detail:"210 × 297 mm"},
  {id:"A5",label:"A5",widthMm:148,heightMm:210,detail:"148 × 210 mm"},
  {id:"LETTER",label:"US Letter",widthMm:215.9,heightMm:279.4,detail:"8.5 × 11 in"},
  {id:"BOOK_5X8",label:"Book · 5 × 8",widthMm:127,heightMm:203.2,detail:"5 × 8 in"},
  {id:"BOOK_5_5X8_5",label:"Book · 5.5 × 8.5",widthMm:139.7,heightMm:215.9,detail:"5.5 × 8.5 in"},
  {id:"BOOK_6X9",label:"Book · 6 × 9",widthMm:152.4,heightMm:228.6,detail:"6 × 9 in"},
  {id:"CUSTOM",label:"Custom",widthMm:148,heightMm:210,detail:"Custom size"}
] as const;

export const DEFAULT_MANUSCRIPT_LAYOUT:ManuscriptLayoutSettings={
  version:1,
  pagePreset:"UK_B",
  pageWidthMm:129,
  pageHeightMm:198,
  marginTopMm:20,
  marginBottomMm:20,
  marginInsideMm:20,
  marginOutsideMm:16,
  gutterMm:3,
  mirroredMargins:true,
  bodyFontId:"georgia",
  bodyFontSizePt:11,
  lineHeight:1.5,
  paragraphSpacingPt:0,
  firstLineIndentMm:5.5,
  chapterStart:"NEW_PAGE",
  displayUnit:"MM"
};

const objectValue=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const num=(value:unknown,fallback:number,min:number,max:number)=>{const parsed=Number(value);return Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):fallback};
const bool=(value:unknown,fallback:boolean)=>typeof value==="boolean"?value:fallback;

export function normaliseManuscriptDisplayMode(value:unknown):ManuscriptDisplayMode{
  return value==="PAGES"?"PAGES":"CONTINUOUS";
}

export function normaliseManuscriptLayout(value:unknown):ManuscriptLayoutSettings{
  const raw=objectValue(value),base=DEFAULT_MANUSCRIPT_LAYOUT;
  const preset=PAGE_PRESETS.some(item=>item.id===raw.pagePreset)?String(raw.pagePreset):base.pagePreset;
  const fontId=WRITING_FONTS.some(font=>font.id===raw.bodyFontId)?String(raw.bodyFontId):base.bodyFontId;
  const chapterStart:ChapterStartRule=raw.chapterStart==="FLOW"||raw.chapterStart==="RECTO"||raw.chapterStart==="NEW_PAGE"?raw.chapterStart:base.chapterStart;
  const displayUnit:ManuscriptDisplayUnit=raw.displayUnit==="IN"?"IN":"MM";
  return {
    version:1,
    pagePreset:preset,
    pageWidthMm:num(raw.pageWidthMm,base.pageWidthMm,80,500),
    pageHeightMm:num(raw.pageHeightMm,base.pageHeightMm,100,600),
    marginTopMm:num(raw.marginTopMm,base.marginTopMm,0,80),
    marginBottomMm:num(raw.marginBottomMm,base.marginBottomMm,0,80),
    marginInsideMm:num(raw.marginInsideMm,base.marginInsideMm,0,80),
    marginOutsideMm:num(raw.marginOutsideMm,base.marginOutsideMm,0,80),
    gutterMm:num(raw.gutterMm,base.gutterMm,0,40),
    mirroredMargins:bool(raw.mirroredMargins,base.mirroredMargins),
    bodyFontId:fontId,
    bodyFontSizePt:num(raw.bodyFontSizePt,base.bodyFontSizePt,8,36),
    lineHeight:num(raw.lineHeight,base.lineHeight,1,3),
    paragraphSpacingPt:num(raw.paragraphSpacingPt,base.paragraphSpacingPt,0,36),
    firstLineIndentMm:num(raw.firstLineIndentMm,base.firstLineIndentMm,0,30),
    chapterStart,
    displayUnit
  };
}

export function mergeManuscriptLayout(current:ManuscriptLayoutSettings,patch:unknown){
  return normaliseManuscriptLayout({...current,...objectValue(patch)});
}

export function manuscriptLayoutCssVariables(layout:ManuscriptLayoutSettings){
  const font=WRITING_FONTS.find(item=>item.id===layout.bodyFontId)??WRITING_FONTS[0];
  const contentWidth=Math.max(40,layout.pageWidthMm-layout.marginInsideMm-layout.marginOutsideMm-layout.gutterMm);
  const contentHeight=Math.max(50,layout.pageHeightMm-layout.marginTopMm-layout.marginBottomMm);
  return {
    "--manuscript-page-width":`${layout.pageWidthMm}mm`,
    "--manuscript-page-height":`${layout.pageHeightMm}mm`,
    "--manuscript-content-width":`${contentWidth}mm`,
    "--manuscript-content-height":`${contentHeight}mm`,
    "--manuscript-margin-top":`${layout.marginTopMm}mm`,
    "--manuscript-margin-bottom":`${layout.marginBottomMm}mm`,
    "--manuscript-margin-inside":`${layout.marginInsideMm}mm`,
    "--manuscript-margin-outside":`${layout.marginOutsideMm}mm`,
    "--manuscript-gutter":`${layout.gutterMm}mm`,
    "--manuscript-font-family":font.css,
    "--manuscript-font-size":`${layout.bodyFontSizePt}pt`,
    "--manuscript-line-height":String(layout.lineHeight),
    "--manuscript-paragraph-spacing":`${layout.paragraphSpacingPt}pt`,
    "--manuscript-first-line-indent":`${layout.firstLineIndentMm}mm`
  } as Record<string,string>;
}

export function pagePreset(id:string){
  return PAGE_PRESETS.find(item=>item.id===id)??PAGE_PRESETS[0];
}

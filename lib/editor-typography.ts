export type WritingFont={
  id:string;
  label:string;
  command:string;
  css:string;
  match:string[];
};

export type WritingFontSize={
  value:string;
  points:number;
  label:string;
};

export const WRITING_FONTS:WritingFont[]=[
  {id:"georgia",label:"Georgia",command:"Georgia",css:'Georgia, "Times New Roman", serif',match:["georgia"]},
  {id:"garamond",label:"Garamond",command:"Garamond",css:'Garamond, Georgia, serif',match:["garamond"]},
  {id:"times",label:"Times New Roman",command:"Times New Roman",css:'"Times New Roman", Times, serif',match:["times new roman"]},
  {id:"palatino",label:"Palatino",command:"Palatino",css:'Palatino, "Palatino Linotype", "Book Antiqua", serif',match:["palatino","book antiqua"]},
  {id:"arial",label:"Arial",command:"Arial",css:'Arial, Helvetica, sans-serif',match:["arial"]},
  {id:"verdana",label:"Verdana",command:"Verdana",css:'Verdana, Geneva, sans-serif',match:["verdana"]},
  {id:"trebuchet",label:"Trebuchet MS",command:"Trebuchet MS",css:'"Trebuchet MS", Arial, sans-serif',match:["trebuchet"]},
  {id:"courier",label:"Courier New",command:"Courier New",css:'"Courier New", Courier, monospace',match:["courier new"]}
];

export const WRITING_FONT_SIZES:WritingFontSize[]=[
  {value:"1",points:10,label:"10 pt"},
  {value:"2",points:11,label:"11 pt"},
  {value:"3",points:12,label:"12 pt"},
  {value:"4",points:14,label:"14 pt"},
  {value:"5",points:16,label:"16 pt"},
  {value:"6",points:18,label:"18 pt"},
  {value:"7",points:24,label:"24 pt"}
];

export function writingFontIdFromComputed(fontFamily:string){
  const value=fontFamily.toLocaleLowerCase();
  return WRITING_FONTS.find(font=>font.match.some(token=>value.includes(token)))?.id??"";
}

export function writingFontSizeValueFromComputed(fontSize:string){
  const px=Number.parseFloat(fontSize);
  if(!Number.isFinite(px))return "";
  const points=px*.75;
  let best=WRITING_FONT_SIZES[0],distance=Math.abs(points-best.points);
  for(const option of WRITING_FONT_SIZES.slice(1)){
    const next=Math.abs(points-option.points);
    if(next<distance){best=option;distance=next}
  }
  return distance<=1.6?best.value:"";
}

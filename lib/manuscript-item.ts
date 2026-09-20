export type ManuscriptKind="CHAPTER"|"PAGE";

export const PAGE_TYPE_OPTIONS=[
  {value:"TITLE_PAGE",label:"Title Page",defaultTitle:"Title Page",hint:"A dedicated title or half-title page."},
  {value:"COPYRIGHT",label:"Copyright",defaultTitle:"Copyright",hint:"Copyright, edition and publishing information."},
  {value:"DEDICATION",label:"Dedication",defaultTitle:"Dedication",hint:"A short dedication before the story begins."},
  {value:"EPIGRAPH",label:"Epigraph",defaultTitle:"Epigraph",hint:"A quotation or short opening text."},
  {value:"FOREWORD",label:"Foreword",defaultTitle:"Foreword",hint:"An introduction, often written by someone other than the author."},
  {value:"PREFACE",label:"Preface",defaultTitle:"Preface",hint:"Author context before the main manuscript."},
  {value:"AFTERWORD",label:"Afterword",defaultTitle:"Afterword",hint:"Closing commentary after the main story."},
  {value:"ACKNOWLEDGEMENTS",label:"Acknowledgements",defaultTitle:"Acknowledgements",hint:"Recognise people who helped create the book."},
  {value:"THANK_YOU",label:"Thank You",defaultTitle:"Thank You",hint:"A less formal thank-you page."},
  {value:"ABOUT_AUTHOR",label:"About the Author",defaultTitle:"About the Author",hint:"Author biography and information."},
  {value:"CUSTOM",label:"Custom Page",defaultTitle:"Untitled Page",hint:"Any other non-chapter page."}
] as const;

export type PageType=typeof PAGE_TYPE_OPTIONS[number]["value"];
export const PAGE_TYPE_VALUES=new Set<string>(PAGE_TYPE_OPTIONS.map(option=>option.value));

export function normalisePageType(value:unknown):PageType{
  const key=String(value||"CUSTOM").toUpperCase();
  return (PAGE_TYPE_VALUES.has(key)?key:"CUSTOM") as PageType;
}

export function pageTypeLabel(value:string|null|undefined){
  return PAGE_TYPE_OPTIONS.find(option=>option.value===value)?.label||"Page";
}

export function pageTypeDefaultTitle(value:string|null|undefined){
  return PAGE_TYPE_OPTIONS.find(option=>option.value===value)?.defaultTitle||"Untitled Page";
}

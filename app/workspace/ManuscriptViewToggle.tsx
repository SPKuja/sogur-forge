"use client";
import {useManuscriptLayout} from "./ManuscriptLayoutProvider";

export default function ManuscriptViewToggle({compact=false}:{compact?:boolean}){
  const {displayMode,saveDisplayMode,saving}=useManuscriptLayout();
  return <div className={`manuscript-view-toggle${compact?" compact":""}`} aria-label="Writing view">
    <button className={displayMode==="CONTINUOUS"?"active":""} disabled={saving} onClick={()=>displayMode!=="CONTINUOUS"&&saveDisplayMode("CONTINUOUS")}>Continuous</button>
    <button className={displayMode==="PAGES"?"active":""} disabled={saving} onClick={()=>displayMode!=="PAGES"&&saveDisplayMode("PAGES")}>Pages</button>
  </div>;
}

"use client";
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from "react";
import {manuscriptLayoutCssVariables,type ManuscriptDisplayMode,type ManuscriptLayoutBundle,type ManuscriptLayoutSettings} from "@/lib/manuscript-layout";

type LayoutContextValue=ManuscriptLayoutBundle&{
  novelId:string;
  saving:boolean;
  error:string;
  saveLayout:(layout:ManuscriptLayoutSettings)=>Promise<boolean>;
  saveDisplayMode:(mode:ManuscriptDisplayMode)=>Promise<boolean>;
};

const LayoutContext=createContext<LayoutContextValue|null>(null);

export default function ManuscriptLayoutProvider({novelId,initialLayout,initialDisplayMode,children}:{novelId:string;initialLayout:ManuscriptLayoutSettings;initialDisplayMode:ManuscriptDisplayMode;children:ReactNode}){
  const [layout,setLayout]=useState(initialLayout),[displayMode,setDisplayMode]=useState<ManuscriptDisplayMode>(initialDisplayMode),[saving,setSaving]=useState(false),[error,setError]=useState("");

  useEffect(()=>{
    const root=document.documentElement,vars=manuscriptLayoutCssVariables(layout),previous=new Map<string,string>();
    for(const [name,value] of Object.entries(vars)){previous.set(name,root.style.getPropertyValue(name));root.style.setProperty(name,value)}
    const previousMode=root.dataset.manuscriptDisplay;
    root.dataset.manuscriptDisplay=displayMode.toLowerCase();
    return()=>{for(const [name,value] of previous)value?root.style.setProperty(name,value):root.style.removeProperty(name);if(previousMode)root.dataset.manuscriptDisplay=previousMode;else delete root.dataset.manuscriptDisplay};
  },[layout,displayMode]);

  async function patch(body:Record<string,unknown>){
    setSaving(true);setError("");
    try{
      const response=await fetch(`/api/novels/${novelId}/layout`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await response.json().catch(()=>({error:"Page setup could not be saved."}));
      if(!response.ok)throw new Error(data.error||"Page setup could not be saved.");
      setLayout(data.layout);setDisplayMode(data.displayMode);return true;
    }catch(error){setError(error instanceof Error?error.message:"Page setup could not be saved.");return false}
    finally{setSaving(false)}
  }

  const value=useMemo<LayoutContextValue>(()=>({novelId,layout,displayMode,saving,error,saveLayout:async next=>patch({layout:next}),saveDisplayMode:async mode=>patch({displayMode:mode})}),[novelId,layout,displayMode,saving,error]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useManuscriptLayout(){
  const value=useContext(LayoutContext);
  if(!value)throw new Error("Manuscript layout controls must be used inside ManuscriptLayoutProvider.");
  return value;
}

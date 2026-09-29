import {redirect} from "next/navigation";
export default async function Page({params}:{params:Promise<{novelId:string}>}){const {novelId}=await params;redirect(`/workspace/${novelId}/ideas`)}

import {accountArchive} from "@/lib/account-archive";
import {query} from "@/lib/db";
import {decryptSetting,encryptSetting} from "@/lib/secret-box";
import {accessTokenFor,type CloudProvider} from "@/lib/cloud-oauth";

type Destination={id:string;folder:string;refreshTokenEncrypted:string};

function backupFilename(){return `sogur-forge-backup-${new Date().toISOString().replace(/[:.]/g,"-")}.zip`}
function segments(folder:string){const parts=folder.split(/[\\/]+/).map(item=>item.trim()).filter(Boolean);if(parts[0]?.toLocaleLowerCase().replace(/ö/g,"o")==="sogur forge")parts.shift();return parts}
function googleEscape(value:string){return value.replace(/\\/g,"\\\\").replace(/'/g,"\\'")}

async function googleJson(url:string,accessToken:string,init:RequestInit={}){
  const response=await fetch(url,{...init,headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json",...(init.headers||{})}});
  const text=await response.text();const data=text?JSON.parse(text):{};
  if(!response.ok)throw new Error(data?.error?.message||`Google Drive request failed (${response.status}).`);
  return data;
}
async function googleFolder(accessToken:string,name:string,parentId?:string){
  const clauses=[`name='${googleEscape(name)}'`,`mimeType='application/vnd.google-apps.folder'`,"trashed=false"];if(parentId)clauses.push(`'${googleEscape(parentId)}' in parents`);
  const queryText=encodeURIComponent(clauses.join(" and ")),listed=await googleJson(`https://www.googleapis.com/drive/v3/files?q=${queryText}&spaces=drive&fields=files(id,name)&pageSize=10`,accessToken);
  if(listed.files?.[0]?.id)return String(listed.files[0].id);
  const body:{name:string;mimeType:string;parents?:string[]}={name,mimeType:"application/vnd.google-apps.folder"};if(parentId)body.parents=[parentId];
  const created=await googleJson("https://www.googleapis.com/drive/v3/files?fields=id,name",accessToken,{method:"POST",body:JSON.stringify(body)});
  return String(created.id);
}
async function googleTargetFolder(accessToken:string,folder:string){
  let parent=await googleFolder(accessToken,"Sögur Forge");
  for(const part of segments(folder))parent=await googleFolder(accessToken,part,parent);
  return parent;
}
async function uploadGoogle(accessToken:string,folder:string,filename:string,bytes:Buffer){
  const parent=await googleTargetFolder(accessToken,folder),session=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink",{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":"application/zip","X-Upload-Content-Length":String(bytes.length)},body:JSON.stringify({name:filename,mimeType:"application/zip",parents:[parent]})});
  if(!session.ok)throw new Error(`Google Drive could not start the upload (${session.status}).`);
  const location=session.headers.get("location");if(!location)throw new Error("Google Drive did not return an upload URL.");
  const upload=await fetch(location,{method:"PUT",headers:{"Content-Type":"application/zip","Content-Length":String(bytes.length)},body:new Uint8Array(bytes)});
  const data=await upload.json() as {id?:string;name?:string;webViewLink?:string;error?:{message?:string}};
  if(!upload.ok)throw new Error(data.error?.message||`Google Drive upload failed (${upload.status}).`);
  return {id:data.id||"",name:data.name||filename,webUrl:data.webViewLink||""};
}

async function graph(url:string,accessToken:string,init:RequestInit={}){
  const response=await fetch(url,{...init,headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json",...(init.headers||{})}});
  const text=await response.text();const data=text?JSON.parse(text):{};
  if(!response.ok)throw new Error(data?.error?.message||`OneDrive request failed (${response.status}).`);
  return data;
}
async function oneDriveChild(accessToken:string,parentId:string,name:string){
  const children=await graph(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(parentId)}/children?$select=id,name,folder`,accessToken);
  const found=(children.value||[]).find((item:{name?:string;folder?:unknown})=>item.folder&&item.name?.toLocaleLowerCase()===name.toLocaleLowerCase());
  if(found?.id)return String(found.id);
  const created=await graph(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(parentId)}/children`,accessToken,{method:"POST",body:JSON.stringify({name,folder:{},["@microsoft.graph.conflictBehavior"]:"rename"})});
  return String(created.id);
}
async function oneDriveTargetFolder(accessToken:string,folder:string){
  const appRoot=await graph("https://graph.microsoft.com/v1.0/me/drive/special/approot?$select=id,name",accessToken);let parent=String(appRoot.id);
  for(const part of segments(folder))parent=await oneDriveChild(accessToken,parent,part);
  return parent;
}
async function uploadOneDrive(accessToken:string,folder:string,filename:string,bytes:Buffer){
  const parent=await oneDriveTargetFolder(accessToken,folder),encoded=encodeURIComponent(filename);
  if(bytes.length<=250*1024*1024){
    const response=await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(parent)}:/${encoded}:/content`,{method:"PUT",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/zip","Content-Length":String(bytes.length)},body:new Uint8Array(bytes)});
    const data=await response.json() as {id?:string;name?:string;webUrl?:string;error?:{message?:string}};if(!response.ok)throw new Error(data.error?.message||`OneDrive upload failed (${response.status}).`);return {id:data.id||"",name:data.name||filename,webUrl:data.webUrl||""};
  }
  const session=await graph(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(parent)}:/${encoded}:/createUploadSession`,accessToken,{method:"POST",body:JSON.stringify({item:{["@microsoft.graph.conflictBehavior"]:"rename",name:filename}})});
  const uploadUrl=String(session.uploadUrl||"");if(!uploadUrl)throw new Error("OneDrive did not return an upload session.");
  const chunkSize=10*1024*1024;let final:{id?:string;name?:string;webUrl?:string}|undefined;
  for(let start=0;start<bytes.length;start+=chunkSize){const end=Math.min(bytes.length,start+chunkSize),chunk=bytes.subarray(start,end),response=await fetch(uploadUrl,{method:"PUT",headers:{"Content-Length":String(chunk.length),"Content-Range":`bytes ${start}-${end-1}/${bytes.length}`},body:new Uint8Array(chunk)}),data=await response.json() as {id?:string;name?:string;webUrl?:string;error?:{message?:string}};if(!response.ok&&response.status!==202)throw new Error(data.error?.message||`OneDrive upload failed (${response.status}).`);if(response.status!==202)final=data}
  return {id:final?.id||"",name:final?.name||filename,webUrl:final?.webUrl||""};
}

export async function runCloudBackup(userId:string,provider:CloudProvider){
  const destination=(await query<Destination>(`SELECT "id","folder","refreshTokenEncrypted" FROM "BackupDestination" WHERE "userId"=$1 AND "provider"=$2 AND "enabled"=true LIMIT 1`,[userId,provider])).rows[0];
  if(!destination?.refreshTokenEncrypted)throw new Error("Connect this cloud account before backing up.");
  try{
    const refreshed=await accessTokenFor(provider,decryptSetting(destination.refreshTokenEncrypted));
    if(refreshed.refreshToken)await query(`UPDATE "BackupDestination" SET "refreshTokenEncrypted"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[destination.id,encryptSetting(refreshed.refreshToken)]);
    const response=await accountArchive(userId,"backup"),bytes=Buffer.from(await response.arrayBuffer()),filename=backupFilename();
    const result=provider==="googleDrive"?await uploadGoogle(refreshed.accessToken,destination.folder,filename,bytes):await uploadOneDrive(refreshed.accessToken,destination.folder,filename,bytes);
    await query(`UPDATE "BackupDestination" SET "lastBackupAt"=NOW(),"lastBackupError"='',"updatedAt"=NOW() WHERE "id"=$1`,[destination.id]);
    return result;
  }catch(error){
    const message=error instanceof Error?error.message:"Cloud backup failed.";
    await query(`UPDATE "BackupDestination" SET "lastBackupError"=$2,"updatedAt"=NOW() WHERE "id"=$1`,[destination.id,message.slice(0,1000)]).catch(()=>{});
    throw error;
  }
}

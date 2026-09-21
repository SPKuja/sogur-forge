import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";

function key(){
  const secret=process.env.AUTH_SECRET;
  if(!secret||secret.length<32)throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return createHash("sha256").update(`sogur-forge:settings:${secret}`).digest();
}
export function encryptSetting(value:string){
  if(!value)return "";
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv),encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]),tag=cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}
export function decryptSetting(value:string){
  if(!value)return "";
  const [version,ivText,tagText,dataText]=value.split(".");
  if(version!=="v1"||!ivText||!tagText||!dataText)throw new Error("Unsupported encrypted setting.");
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(ivText,"base64url"));decipher.setAuthTag(Buffer.from(tagText,"base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataText,"base64url")),decipher.final()]).toString("utf8");
}

import {randomBytes} from "node:crypto";
import {hashPrivateValue} from "@/lib/auth/request";
import {decryptSetting,encryptSetting} from "@/lib/secret-box";

export function createManuscriptShareToken(){
  const token=randomBytes(32).toString("base64url");
  return {token,tokenHash:hashManuscriptShareToken(token),tokenEncrypted:encryptSetting(token)};
}

export function hashManuscriptShareToken(token:string){
  return hashPrivateValue(`manuscript-share:${token}`);
}

export function decryptManuscriptShareToken(value:string){
  return decryptSetting(value);
}

export function manuscriptSharePath(token:string){
  return `/share/${encodeURIComponent(token)}`;
}

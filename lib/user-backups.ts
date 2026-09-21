import {query} from "@/lib/db";
import type {BackupProviderId} from "@/lib/backup-providers";
export type UserBackupDestination={provider:BackupProviderId;enabled:boolean;folder:string;accountLabel:string;connected:boolean;connectedAt:string|null;lastBackupAt:string|null;lastBackupError:string};
const providers:BackupProviderId[]=["dropbox","googleDrive","oneDrive"];
export async function getUserBackupDestinations(userId:string){
  const rows=(await query<{provider:string;enabled:boolean;folder:string;accountLabel:string;refreshTokenEncrypted:string;connectedAt:Date|null;lastBackupAt:Date|null;lastBackupError:string}>(`SELECT "provider","enabled","folder","accountLabel","refreshTokenEncrypted","connectedAt","lastBackupAt","lastBackupError" FROM "BackupDestination" WHERE "userId"=$1`,[userId])).rows;
  return providers.map(provider=>{const found=rows.find(row=>row.provider===provider);return {provider,enabled:found?.enabled??false,folder:found?.folder||"/Sögur Forge",accountLabel:found?.accountLabel||"",connected:!!found?.refreshTokenEncrypted,connectedAt:found?.connectedAt?.toISOString()??null,lastBackupAt:found?.lastBackupAt?.toISOString()??null,lastBackupError:found?.lastBackupError||""}})
}

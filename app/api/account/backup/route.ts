import {currentUser} from "@/lib/auth/session";
import {accountArchive} from "@/lib/account-archive";
export const dynamic="force-dynamic";
export async function GET(){const user=await currentUser();if(!user)return new Response("Unauthorized",{status:401});return accountArchive(user.id,"backup")}

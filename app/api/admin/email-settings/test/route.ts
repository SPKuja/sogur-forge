import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {sendTestEmail} from "@/lib/email";
export async function POST(request:NextRequest){if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});const user=await currentUser();if(!user||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});try{await sendTestEmail(user.email);return NextResponse.json({ok:true,message:`Test email sent to ${user.email}.`})}catch(error){console.error("SMTP test failed",error);return NextResponse.json({error:"The test email could not be sent. Check the SMTP settings."},{status:503})}}

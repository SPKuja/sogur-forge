import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/auth/session";
import {requireSameOrigin} from "@/lib/auth/request";
import {query} from "@/lib/db";
import {DEFAULT_WRITING_PREFERENCES,getWritingPreferences,validTimeZone} from "@/lib/writing-progress";

function target(value:unknown,fallback:number){
  const number=Number(value);
  return Number.isFinite(number)?Math.max(0,Math.min(1000000,Math.round(number))):fallback;
}

export async function GET(){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  return NextResponse.json(await getWritingPreferences(user.id));
}

export async function PATCH(request:NextRequest){
  if(!requireSameOrigin(request))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const current=await getWritingPreferences(user.id),body=await request.json().catch(()=>({}));
  const timezone=String(body.timezone??current.timezone).trim();
  if(!validTimeZone(timezone))return NextResponse.json({error:"Choose a valid time zone."},{status:400});
  const weekStartsOn=Math.max(0,Math.min(6,Math.round(Number(body.weekStartsOn??current.weekStartsOn))));
  const next={
    dailyWordTarget:target(body.dailyWordTarget,current.dailyWordTarget),
    weeklyWordTarget:target(body.weeklyWordTarget,current.weeklyWordTarget),
    monthlyWordTarget:target(body.monthlyWordTarget,current.monthlyWordTarget),
    showEditorGoal:body.showEditorGoal===undefined?current.showEditorGoal:Boolean(body.showEditorGoal),
    weeklyRoundupEnabled:body.weeklyRoundupEnabled===undefined?current.weeklyRoundupEnabled:Boolean(body.weeklyRoundupEnabled),
    weekStartsOn:Number.isFinite(weekStartsOn)?weekStartsOn:DEFAULT_WRITING_PREFERENCES.weekStartsOn,
    timezone
  };
  await query(`
    INSERT INTO "WritingPreference" ("userId","dailyWordTarget","weeklyWordTarget","monthlyWordTarget","showEditorGoal","weeklyRoundupEnabled","weekStartsOn","timezone","createdAt","updatedAt")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
    ON CONFLICT ("userId") DO UPDATE SET
      "dailyWordTarget"=EXCLUDED."dailyWordTarget",
      "weeklyWordTarget"=EXCLUDED."weeklyWordTarget",
      "monthlyWordTarget"=EXCLUDED."monthlyWordTarget",
      "showEditorGoal"=EXCLUDED."showEditorGoal",
      "weeklyRoundupEnabled"=EXCLUDED."weeklyRoundupEnabled",
      "weekStartsOn"=EXCLUDED."weekStartsOn",
      "timezone"=EXCLUDED."timezone",
      "updatedAt"=NOW()
  `,[user.id,next.dailyWordTarget,next.weeklyWordTarget,next.monthlyWordTarget,next.showEditorGoal,next.weeklyRoundupEnabled,next.weekStartsOn,next.timezone]);
  return NextResponse.json(next);
}

import Link from "next/link";
import {redirect} from "next/navigation";
import {currentUser} from "@/lib/auth/session";
import {CURRENT_VERSION,RELEASES} from "@/lib/releases";

export const dynamic="force-dynamic";
export default async function ChangelogPage(){
  const user=await currentUser();
  if(!user)redirect("/");
  return <main className="changelog-shell"><header className="changelog-top"><Link href="/workspace">← Back to library</Link><div><strong>Sögur Forge</strong><small>Version history</small></div><span>v{CURRENT_VERSION}</span></header><section className="changelog-main"><div className="changelog-heading"><small>CHANGELOG</small><h1>What’s new in the forge</h1><p>Every Sögur Forge release, with the changes that came with it.</p></div><div className="release-list">{RELEASES.map((release,index)=><article className="release-card" key={release.version}><div className="release-version"><span>v{release.version}</span>{index===0&&<b>Current</b>}<small>{release.date}</small></div><div className="release-body"><h2>{release.title}</h2>{release.added.length>0&&<section><h3>Added</h3><ul>{release.added.map(x=><li key={x}>{x}</li>)}</ul></section>}{release.changed.length>0&&<section><h3>Changed</h3><ul>{release.changed.map(x=><li key={x}>{x}</li>)}</ul></section>}{release.fixed.length>0&&<section><h3>Fixed</h3><ul>{release.fixed.map(x=><li key={x}>{x}</li>)}</ul></section>}</div></article>)}</div></section></main>
}

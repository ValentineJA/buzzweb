"use client";
import { useState } from "react";
import Link from "next/link";
import { Composer, Feed } from "@/app/components/social/posts";
import { ErrorNote, mutate, useAction, useData } from "@/app/components/social/common";
export default function Home(){
 const [compose,setCompose]=useState(false),[filter,setFilter]=useState("all"),[revision,setRevision]=useState(0),[activity,setActivity]=useState(false);
 const n=useData<{notifications:{_id:string;text:string;href:string;read:boolean}[]}>("notifications",{},20000);
 const activityAction=useAction(n.refresh);
 return <main className="real-page"><div className="real-heading"><div><p className="real-eyebrow">GOOD PEOPLE. REAL PLANS.</p><h1>Your next story.</h1></div><button className="real-primary" onClick={()=>setCompose(!compose)}>＋ Create</button></div>
 <button onClick={()=>setActivity(!activity)}>Activity · {n.data?.notifications.filter(x=>!x.read).length||0} unread</button>
 {activity&&<section className="real-card"><h2>Your activity</h2><ErrorNote text={n.error||activityAction.error}/>{n.data?.notifications.length===0&&<p>No activity yet.</p>}{n.data?.notifications.map(x=><p key={x._id}><Link href={x.href}>{x.text}</Link>{!x.read&&" •"}</p>)}<button disabled={activityAction.busy} onClick={()=>void activityAction.run(()=>mutate("notifications-read"))}>Mark all read</button></section>}
 {compose&&<Composer onDone={async()=>setRevision(v=>v+1)} onCancel={()=>setCompose(false)}/>}
 <div className="real-tabs">{["all","following","saved"].map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}</div><Feed key={`${revision}:${filter}`} params={filter==="all"?{}:{[filter]:"1"}}/>
 </main>;
}
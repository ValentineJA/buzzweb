"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Person } from "@/app/lib/social/types";
import { ErrorNote, mutate, useAction, useData } from "./common";
import { Feed } from "./posts";
import { useAccount } from "../auth/account-provider";
export function PersonCard({person:p,refresh,onOpen}:{person:Person;refresh:()=>Promise<void>;onOpen?:(id:string)=>void}) {
 const a=useAction(refresh);return <div className="real-person"><span className="real-avatar" aria-hidden="true">{p.name.slice(0,1)}</span><a className="real-person-name" href={`/explore?person=${encodeURIComponent(p.id)}`} onClick={e=>{if(onOpen){e.preventDefault();onOpen(p.id);}}}><strong>{p.name}</strong><small>@{p.handle}{p.private?" - Private":""}</small></a><button disabled={a.busy} aria-pressed={p.following} onClick={()=>void a.run(()=>mutate("follow",{id:p.id,enabled:!p.following&&!p.requested}))}>{p.following?"Following":p.requested?"Requested":"Follow"}</button><ErrorNote text={a.error}/></div>;
}
export function PublicProfile({id}:{id:string}) {
 const d=useData<{person:Person;followers:number;following:number;locked:boolean;people:Person[]}>("profile",{id});const a=useAction(d.refresh);const account=useAccount();const router=useRouter();const [connections,setConnections]=useState(false);
 const p=d.data?.person;
 return <><ErrorNote text={d.error||a.error}/>{p&&<><section className="real-passport"><p className="real-eyebrow">THE PEOPLE BEHIND THE NIGHT</p><h1>{p.name}</h1><p>@{p.handle} · {p.city}</p><p>{p.bio}</p><div className="real-actions"><span>{p.mood}</span>{p.interests.map(i=><span className="real-tag" key={i}>{i}</span>)}</div><button onClick={()=>setConnections(!connections)}>{d.data?.followers} followers · {d.data?.following} following</button>{p.id!==account.uid&&<><PersonCard person={p} refresh={d.refresh}/><div className="real-actions"><button disabled={a.busy} onClick={()=>void a.run(async()=>{const result=await mutate<{id:string}>("room-create",{kind:"direct",members:[p.id],hours:0});router.push(`/message?room=${encodeURIComponent(result.id)}`);})}>Message</button><button disabled={a.busy} onClick={()=>{if(confirm(`Block ${p.name}? You will no longer see or interact with one another.`))void a.run(async()=>{await mutate("block",{id:p.id,enabled:true});router.push("/explore");});}}>Block</button><button disabled={a.busy} onClick={()=>{const reason=prompt("Why are you reporting this account?");if(reason)void a.run(()=>mutate("report",{id:p.id,kind:"user",reason}));}}>Report</button></div></>}</section>{connections&&<section className="real-card"><h2>Connections</h2>{d.data?.people.length===0&&<p>No visible connections.</p>}{d.data?.people.map((p,i)=><p key={`${p.id}:${i}`}><a href={`/explore?person=${p.id}`}>@{p.handle}</a></p>)}</section>}{d.data?.locked?<div className="real-empty">Follow this private account to see their posts after approval.</div>:<Feed key={id} params={{id}}/>}</>}</>;
}

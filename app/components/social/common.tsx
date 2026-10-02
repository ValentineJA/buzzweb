"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { requestJson } from "@/app/lib/auth/flow";
export function query<T>(resource:string,params:Record<string,string>={}) {return requestJson<T>(`/api/social?${new URLSearchParams({resource,...params})}`);}
export function mutate<T={ok:boolean}>(action:string,data:Record<string,unknown>={}) {return requestJson<T>("/api/social",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...data})});}
export function useData<T>(resource:string,params:Record<string,string>={},poll=0) {
 const key=JSON.stringify(params),tag=resource+key;
 const [result,setResult]=useState<{tag:string;data:T|null;error:string}|null>(null);
 const [revision,setRevision]=useState(0);
 const refresh=useCallback(async()=>{setRevision(v=>v+1);},[]);
 useEffect(()=>{
   const abort=new AbortController();
   requestJson<T>("/api/social?"+new URLSearchParams({resource,...JSON.parse(key)}),{signal:abort.signal})
    .then(data=>{if(!abort.signal.aborted)setResult({tag,data,error:""});})
    .catch(error=>{if(!abort.signal.aborted)setResult({tag,data:null,error:error instanceof Error?error.message:"Could not load this page."});});
   return()=>abort.abort();
 },[resource,key,tag,revision]);
 useEffect(()=>{if(!poll)return;const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},poll);return()=>clearInterval(timer);},[poll,refresh]);
 const current=result?.tag===tag?result:null;
 return {data:current?.data||null,error:current?.error||"",loading:!current,refresh};
}
export function useAction(refresh?:()=>Promise<void>) {
 const [busy,setBusy]=useState(false),[error,setError]=useState("");const lock=useRef(false);
 const run=async(fn:()=>Promise<unknown>)=>{if(lock.current)return false;lock.current=true;setBusy(true);setError("");try{await fn();await refresh?.();return true;}catch(e){setError(e instanceof Error?e.message:"Please try again.");return false;}finally{lock.current=false;setBusy(false);}};
 return {busy,error,run};
}
export function ErrorNote({text}:{text:string}) {return text?<p className="real-error" role="alert">{text}</p>:null;}
export function Empty({children}:{children:React.ReactNode}) {return <div className="real-empty">{children}</div>;}
export function PersonLink({id,name}:{id:string;name:string}) {return <Link href={`/explore?person=${encodeURIComponent(id)}`}>{name}</Link>;}
export function time(value:string) {return new Date(value).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}

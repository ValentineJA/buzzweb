import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
export async function mobileSmoke({base,cookie,executable}) {
 const profile=await mkdtemp(path.join(tmpdir(),"buzz-browser-"));const port=9237;
 const browser=spawn(executable,["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check",`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,"about:blank"],{windowsHide:true,stdio:"ignore"});
 let socket;
 try{
  let page;for(let i=0;i<30;i++){try{const response=await fetch(`http://127.0.0.1:${port}/json/list`);const pages=await response.json();page=pages.find(p=>p.type==="page");if(page)break;}catch{}await new Promise(r=>setTimeout(r,500));}assert(page,"Browser debugging connection unavailable");
  socket=new WebSocket(page.webSocketDebuggerUrl);await once(socket,"open");let serial=0;const pending=new Map();
  socket.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {resolve,reject,timer}=pending.get(m.id);clearTimeout(timer);pending.delete(m.id);if(m.error)reject(Error("Browser command failed"));else resolve(m.result);}});
  const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(Error("Browser command timed out"));},20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  await command("Page.enable");await command("Network.enable");await command("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const separator=cookie.indexOf("=");await command("Network.setCookie",{name:cookie.slice(0,separator),value:cookie.slice(separator+1),url:base,path:"/",secure:true,httpOnly:true,sameSite:"Lax"});
  await mkdir("test-results",{recursive:true});
  for(const [route,label] of [["/","home"],["/explore","explore"],["/message","messages"],["/profile","profile"],["/settings","settings"]]){
   await command("Page.navigate",{url:base+route});
   for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,300));const state=await command("Runtime.evaluate",{expression:'document.readyState === "complete" && !!document.querySelector(".real-page")',returnByValue:true});if(state.result.value)break;}
   await new Promise(r=>setTimeout(r,1800));
   const metrics=await command("Runtime.evaluate",{expression:'JSON.stringify({path:location.pathname,width:document.documentElement.scrollWidth,viewport:innerWidth,main:!!document.querySelector(".real-page"),errors:[...document.querySelectorAll(".real-error")].map(e=>e.textContent)})',returnByValue:true});
   const result=JSON.parse(metrics.result.value);assert.equal(result.path,route,"Browser session must remain signed in");assert(result.main,"Live screen must render");assert(result.width<=result.viewport+1,`${label} overflows the mobile viewport`);assert.equal(result.errors.length,0,`${label} displays an API error`);
   const shot=await command("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await writeFile(`test-results/${label}-mobile.png`,Buffer.from(shot.data,"base64"));console.log(`PASS mobile ${label}: signed in, no overflow or API errors`);
  }
 } finally {
  socket?.close();if(browser.exitCode===null){const done=once(browser,"exit");browser.kill();await Promise.race([done,new Promise(r=>setTimeout(r,3000))]);}
  // Remove only the random temporary profile this function created.
  const resolved=path.resolve(profile),root=path.resolve(tmpdir())+path.sep;
  if(resolved.startsWith(root)&&path.basename(resolved).startsWith("buzz-browser-"))await rm(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:500}).catch(()=>{});
 }
}

/** Run after npm run build. Uses an isolated database, never the application's data. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { initializeApp, cert, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { mobileSmoke } from "./social-mobile-smoke.mjs";
import { MongoClient } from "mongodb";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const passwords=[process.env.BUZZ_TEST_PASSWORD_1,process.env.BUZZ_TEST_PASSWORD_2];
if(passwords.some(p=>!p))throw Error("Set BUZZ_TEST_PASSWORD_1 and BUZZ_TEST_PASSWORD_2 for the existing Firebase test accounts.");
const name=`buzz_verify_${randomUUID().replaceAll('-','').slice(0,20)}`;
const dbClient=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:8000});
let server,adminApp,disposableUid;let fixtureCreated=false;const port=3197,base=`http://127.0.0.1:${port}`,origin="https://buzz.integration.test";
const accounts=[];let checks=0;
const check=(label,fn)=>{fn();checks++;console.log(`PASS ${label}`);};
const call=async(index,action,data={},expected=200)=>{
 const r=await fetch(`${base}/api/social`,{method:"POST",headers:{Cookie:accounts[index].cookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({action,...data})});
 const b=await r.json();assert.equal(r.status,expected,`${action}: ${b.code||'unexpected response'}`);return b;
};
const get=async(index,resource,params={},expected=200)=>{
 const r=await fetch(`${base}/api/social?${new URLSearchParams({resource,...params})}`,{headers:{Cookie:accounts[index].cookie}});const b=await r.json();assert.equal(r.status,expected,`${resource}: ${b.code||'unexpected response'}`);return b;
};
try {
 await dbClient.connect();const source=dbClient.db(process.env.MONGODB_DB),db=dbClient.db(name);
 assert.equal((await db.listCollections().toArray()).length,0,"Fixture database must be new");
 await db.collection("_fixture").insertOne({_id:name});fixtureCreated=true;
 for(let i=0;i<2;i++){
  const email=`user${i+1}@buzz.test`;
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:passwords[i],returnSecureToken:true})});
  const auth=await response.json();assert.equal(response.status,200,`Firebase test account ${i+1} sign-in failed`);
  const user=await source.collection("users").findOne({_id:auth.localId});assert(user,"Seed the existing test accounts first");await db.collection("users").insertOne(user);accounts.push({uid:auth.localId,token:auth.idToken,cookie:""});
 }
 adminApp=initializeApp({credential:cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,"\n")})},"buzz-verification");
 const disposablePassword=randomUUID()+"Aa1!";
 const disposable=await getAuth(adminApp).createUser({uid:"verify-"+randomUUID(),email:"verify-"+randomUUID()+"@buzz.test",password:disposablePassword,emailVerified:true});disposableUid=disposable.uid;
 await db.collection("users").insertOne({_id:disposable.uid,email:disposable.email,handle:"verification_member",profile:{name:"Verification Member",handle:"verification_member",bio:"",city:"",mood:"",interests:[]},birthDate:"2000-01-01",role:"member",isTestAccount:true,createdAt:new Date(),updatedAt:new Date()});
 const disposableLogin=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key="+process.env.NEXT_PUBLIC_FIREBASE_API_KEY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:disposable.email,password:disposablePassword,returnSecureToken:true})});
 assert.equal(disposableLogin.status,200);accounts.push({uid:disposableUid,token:(await disposableLogin.json()).idToken,cookie:""});
 server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--port",String(port),"--hostname","127.0.0.1"],{env:{...process.env,MONGODB_DB:name,APP_URL:origin,ENABLE_TEST_ACCOUNTS:"true",NODE_ENV:"production"},windowsHide:true,stdio:["ignore","pipe","pipe"]});
 // Drain logs without printing raw SDK errors or configuration.
 server.stdout.on("data",()=>{});server.stderr.on("data",()=>{});
 let ready=false;for(let i=0;i<90;i++){try{const r=await fetch(`${base}/login`,{signal:AbortSignal.timeout(1500)});if(r.ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw Error("Verification server stopped");await new Promise(r=>setTimeout(r,1000));}assert(ready,"Verification server did not start");
 for(let i=0;i<accounts.length;i++){
  const r=await fetch(`${base}/api/auth/session`,{method:"POST",headers:{Origin:origin,Authorization:`Bearer ${accounts[i].token}`,"Content-Type":"application/json"},body:JSON.stringify({remember:false})});assert.equal(r.status,200,`Session creation failed for account ${i+1}`);accounts[i].cookie=r.headers.get("set-cookie").split(";")[0];
 }
 check("both accounts establish real server sessions",()=>assert(accounts.every(a=>a.cookie)));
 const anon=await fetch(`${base}/api/social?resource=users`);check("anonymous requests rejected",()=>assert.equal(anon.status,401));
 const badOrigin=await fetch(`${base}/api/social`,{method:"POST",headers:{Cookie:accounts[0].cookie,Origin:"https://evil.example","Content-Type":"application/json"},body:JSON.stringify({action:"follow",id:accounts[1].uid})});check("cross-site mutations rejected",()=>assert.equal(badOrigin.status,403));
 const people=await get(0,"users");check("search returns actual users without private account fields",()=>{assert(people.people.some(p=>p.id===accounts[1].uid));assert(people.people.every(p=>!('email' in p)&&!('role' in p)&&!('birthDate' in p)));});
 const settings=(await get(1,"settings")).settings;
 await call(0,"settings",{settings:{...settings,groupInvites:"everyone"}});
 await call(1,"settings",{settings:{...settings,privateProfile:true}});
 await call(0,"follow",{id:accounts[1].uid,enabled:true});await call(0,"follow",{id:accounts[1].uid,enabled:true});
 const requests=await get(1,"settings");check("private follows are pending and idempotent",()=>assert.equal(requests.requests.length,1));
 const make={kind:"post",title:"Fixture post",text:"Only real database records",mediaId:"",location:"",category:"",audience:"public",price:0,latitude:null,longitude:null,startsAt:null,endsAt:null};
 const created=await call(1,"post-save",make);
 check("private post hidden before approval",()=>{});assert.equal((await get(0,"feed")).posts.length,0);
 await call(1,"follow-request",{id:accounts[0].uid,accept:true});
 check("approved follower can see posts",()=>assert.equal((0),0));assert.equal((await get(0,"feed")).posts.length,1);
 await call(0,"post-save",{...make,id:created.id,title:"Forbidden change"},403);await call(0,"post-delete",{id:created.id},403);check("non-owner cannot edit or delete even with an admin role",()=>{});
 await call(1,"post-save",{...make,id:created.id,title:"Updated by owner"});
 await call(0,"reaction",{id:created.id,kind:"like",enabled:true});await call(0,"reaction",{id:created.id,kind:"like",enabled:true});
 check("like counts are idempotent",()=>{});assert.equal((await get(1,"feed")).posts[0].likes,1);
 await call(0,"comment",{id:created.id,text:"Hello"});assert.equal((await get(1,"comments",{id:created.id})).comments.length,1);check("comments persist across accounts",()=>{});
 const image=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE4sAAAAASUVORK5CYII=","base64");
 const upload=await fetch(`${base}/api/media`,{method:"POST",headers:{Cookie:accounts[1].cookie,Origin:origin,"Content-Type":"image/png"},body:image});assert.equal(upload.status,200);const media=await upload.json();
 await call(1,"post-save",{...make,id:created.id,mediaId:media.id});
 const imageRead=await fetch(`${base}/api/media/${media.id}`,{headers:{Cookie:accounts[0].cookie}});assert.equal(imageRead.status,200);check("uploaded image is accessible to approved viewers",()=>{});
 await call(0,"follow",{id:accounts[1].uid,enabled:false});const forbiddenImage=await fetch(`${base}/api/media/${media.id}`,{headers:{Cookie:accounts[0].cookie}});assert.equal(forbiddenImage.status,404);check("private image access revoked after unfollow",()=>{});
 await call(1,"settings",{settings:{...settings,groupInvites:"everyone"}});
 const direct=await call(0,"room-create",{kind:"direct",members:[accounts[1].uid],hours:0});
 const again=await call(1,"room-create",{kind:"direct",members:[accounts[0].uid],hours:0});assert.equal(again.id,direct.id);check("direct conversations deduplicate in both directions",()=>{});
 await call(0,"message-send",{id:direct.id,text:"Test message"});const message=(await get(1,"messages",{id:direct.id})).messages[0];assert.equal(message.text,"Test message");
 await call(1,"message-edit",{id:message._id,text:"Unauthorized"},403);await call(1,"message-delete",{id:message._id},403);await call(0,"message-edit",{id:message._id,text:"Edited"});check("only the sender can edit or delete a message",()=>{});
 await call(1,"read",{id:direct.id});assert((await get(0,"messages",{id:direct.id})).messages[0].readBy.includes(accounts[1].uid));check("read receipts persist",()=>{});
 const event=await call(0,"post-save",{...make,kind:"event",title:"Fixture event",latitude:53.5,longitude:-113.5,startsAt:new Date(Date.now()-3600000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString()});
 await call(1,"reaction",{id:event.id,kind:"here",enabled:true});const live=(await get(0,"feed",{events:"1"})).posts[0];assert.equal(live.here,1);check("event attendance counts real check-ins",()=>{});
 const near=await get(0,"feed",{events:"1",lat:"53.5",lng:"-113.5",radius:"5"});assert.equal(near.posts.length,1);const far=await get(0,"feed",{events:"1",lat:"0",lng:"0",radius:"5"});assert.equal(far.posts.length,0);check("radius filters events by coordinates",()=>{});
 await call(1,"room-create",{kind:"party",members:[accounts[0].uid],eventId:event.id,name:"Forbidden",hours:1},403);
 const party=await call(0,"room-create",{kind:"party",members:[accounts[1].uid],eventId:event.id,name:"Test party",hours:1});
 await call(1,"room-update",{id:party.id,name:"Forbidden",hours:2},403);
 await db.collection("rooms").updateOne({_id:party.id},{$set:{expiresAt:new Date(Date.now()-1000).toISOString()}});
 await call(0,"message-send",{id:party.id,text:"Too late"},403);assert.equal((await get(1,"messages",{id:party.id})).closed,true);check("organiser-only party controls and server-enforced expiry",()=>{});
 const story=await call(0,"post-save",{...make,kind:"story",title:"Short-lived story"});await db.collection("posts").updateOne({_id:story.id},{$set:{expiresAt:new Date(Date.now()-1000).toISOString()}});assert(!(await get(1,"feed")).posts.some(p=>p._id===story.id));check("expired stories are excluded",()=>{});
 await call(1,"block",{id:accounts[0].uid,enabled:true});assert(!(await get(0,"users")).people.some(p=>p.id===accounts[1].uid));await get(0,"messages",{id:direct.id},404);await call(0,"message-send",{id:direct.id,text:"Blocked"},404);check("blocking prevents discovery and conversation access in both directions",()=>{});
 const ex=await get(0,"export");assert(ex.posts.every(p=>p.ownerId===accounts[0].uid));assert(ex.messages.every(p=>p.ownerId===accounts[0].uid));check("data export contains only own authored content",()=>{});
 await get(2,"messages",{id:direct.id},404);check("non-members cannot read conversations",()=>{});
 await call(1,"block",{id:accounts[0].uid,enabled:false});
 await call(2,"report",{kind:"post",id:event.id,reason:"Integration verification report"});
 const report=(await get(0,"reports")).reports[0];assert(report.snapshot.includes("Fixture event"));
 await call(2,"report-review",{id:report._id},403);await call(0,"report-review",{id:report._id});check("reports preserve evidence and restrict review to moderators",()=>{});
 const deletionPost=await call(2,"post-save",{...make,title:"Disposable account content"});
 const rejectDelete=await fetch(base+"/api/account/delete",{method:"POST",headers:{Origin:origin,Cookie:accounts[2].cookie,Authorization:"Bearer "+accounts[0].token,"Content-Type":"application/json"},body:JSON.stringify({confirm:"DELETE"})});assert.equal(rejectDelete.status,403);check("account deletion rejects mismatched identities",()=>{});
 const deleted=await fetch(base+"/api/account/delete",{method:"POST",headers:{Origin:origin,Cookie:accounts[2].cookie,Authorization:"Bearer "+accounts[2].token,"Content-Type":"application/json"},body:JSON.stringify({confirm:"DELETE"})});assert.equal(deleted.status,200);
 assert.equal(await db.collection("users").findOne({_id:disposableUid}),null);assert.equal(await db.collection("posts").findOne({_id:deletionPost.id}),null);
 let removed=false;try{await getAuth(adminApp).getUser(disposableUid);}catch(e){removed=e.code==="auth/user-not-found";}assert(removed);disposableUid=null;check("deletion removes the disposable identity and authored data",()=>{});
 console.log(checks+" integration checks passed.");
 if(process.env.BUZZ_BROWSER)await mobileSmoke({base,cookie:accounts[0].cookie,executable:process.env.BUZZ_BROWSER});
} catch (error) {
 console.error(error?.name === "AssertionError" ? error.message : `Verification failed (${error?.name || "Error"}, code ${typeof error?.code === "number" ? error.code : "unavailable"}).`);
 process.exitCode=1;
} finally {
 if(server&&server.exitCode===null){const stopped=once(server,"exit");server.kill();await Promise.race([stopped,new Promise(r=>setTimeout(r,3000))]);}
 if(fixtureCreated){const db=dbClient.db(name);assert(name.startsWith("buzz_verify_"));assert(await db.collection("_fixture").findOne({_id:name}));await db.dropDatabase();console.log("Temporary verification database removed.");}
 if(disposableUid&&adminApp)await getAuth(adminApp).deleteUser(disposableUid).catch(e=>{if(e.code!=="auth/user-not-found")throw e;});
 if(adminApp)await deleteApp(adminApp);
 await dbClient.close();
}

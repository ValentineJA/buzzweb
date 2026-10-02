"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { clientAuth } from "@/app/lib/auth/client";
import { userRequest } from "@/app/lib/auth/flow";
import { ErrorNote, useAction } from "./common";
export default function DeleteAccount(){const [confirmation,setConfirmation]=useState("");const a=useAction();return <section className="real-card"><h2>Delete account</h2><p>Permanently delete your profile, uploaded images, posts and sent messages. Rooms you organise will close. Safety reports may be retained for review.</p><p>Sign in again immediately before deleting your account.</p><Link href="/login?next=/settings">Sign in again ↗</Link><form className="real-form" onSubmit={e=>{e.preventDefault();if(!confirm("Permanently delete your BUZZ account and content? This cannot be undone."))return;void a.run(async()=>{const user=clientAuth().currentUser;if(!user)throw Error("Sign in again first.");await userRequest("/api/account/delete",user,{confirm:confirmation});await signOut(clientAuth());window.location.replace("/signup");});}}><label>Type DELETE to confirm<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/></label><ErrorNote text={a.error}/><button disabled={confirmation!=="DELETE"||a.busy}>Permanently delete my account</button></form></section>;}

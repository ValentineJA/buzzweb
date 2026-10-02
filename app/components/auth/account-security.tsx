"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmailAuthProvider, linkWithPopup, onAuthStateChanged, reauthenticateWithCredential, unlink, updatePassword, verifyBeforeUpdateEmail, type User } from "firebase/auth";
import { clientAuth, providerFor } from "@/app/lib/auth/client";
import { useAccount } from "./account-provider";
import { authMessage, logOut } from "@/app/lib/auth/flow";
import { passwordProblem } from "@/app/lib/auth/validation";
import PasswordField from "./password-field";
export default function AccountSecurity() {
  const account = useAccount();
  const [user, setUser] = useState<User | null>(null); const [providers, setProviders] = useState<string[]>([]);
  const [currentPassword, setCurrentPassword] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => onAuthStateChanged(clientAuth(), (value) => { const matched = value?.uid === account.uid ? value : null; setUser(matched); setProviders(matched?.providerData.map((provider) => provider.providerId) || []); }), [account.uid]);
  const perform = async (action: () => Promise<void>) => {
    setError(""); setNotice(""); setBusy(true);
    try { await action(); if (user) { await user.reload(); setProviders(user.providerData.map((provider) => provider.providerId)); } }
    catch (caught) { setError(authMessage(caught)); } finally { setBusy(false); }
  };
  const reauthenticate = async () => {
    if (!user) throw new Error("Please sign in again to manage account security.");
    if (providers.includes("password")) {
      if (!currentPassword) throw new Error("Enter your current password first.");
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, currentPassword));
    }
  };
  return <main className="social-page security-page"><Link className="auth-back" href="/settings">← Settings</Link><p className="social-kicker">YOUR ACCOUNT. YOUR CONTROL.</p><h1>Keep it yours<span>.</span></h1><p className="social-subtitle">Signed in as {account.email}<br />Role: {account.role === "admin" ? "Admin" : account.role === "subadmin" ? "SubAdmin" : "Member"}{account.isTestAccount ? " · Test account" : ""}</p>
    {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}
    {!user ? <div className="auth-notice"><p>Sign in again on this tab to manage your password and connected accounts.</p><Link className="auth-primary" href="/login?next=/account/security">Verify it’s you ↗</Link></div> : <>
      <section className="security-card"><h2>Connected accounts</h2><p>Link a provider to sign in to this same BUZZ account.</p>{(["Google", "X", "Facebook"] as const).map((name) => { const id = name === "Google" ? "google.com" : name === "X" ? "twitter.com" : "facebook.com"; const linked = providers.includes(id); return <div className="provider-row" key={name}><span><strong>{name === "Facebook" ? "Facebook / Meta" : name}</strong><small>{linked ? "Connected" : "Not connected"}</small></span><button disabled={busy || (linked && providers.length <= 1)} onClick={() => void perform(async () => { if (linked) { if (user.providerData.length <= 1) throw new Error("Keep at least one sign-in method connected."); await unlink(user, id); setNotice(`${name} disconnected.`); } else { await linkWithPopup(user, providerFor(name)); setNotice(`${name} connected to your account.`); } })}>{linked ? "Disconnect" : "Connect"}</button></div>; })}</section>
      <section className="security-card"><h2>{providers.includes("password") ? "Change password" : "Add a password"}</h2>{providers.includes("password") && <PasswordField label="Current password" name="current-password" value={currentPassword} onChange={setCurrentPassword} />}<form onSubmit={(event) => { event.preventDefault(); void perform(async () => { const problem = passwordProblem(password); if (problem) throw new Error(problem); if (password !== confirm) throw new Error("Your passwords don’t match."); await reauthenticate(); await updatePassword(user, password); setPassword(""); setConfirm(""); setCurrentPassword(""); setNotice("Password updated. Please sign in again to refresh your session."); }); }}><PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" minLength={10} /><p className="password-help">10+ characters with uppercase, lowercase, a number, and a symbol.</p><PasswordField label="Confirm new password" name="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" /><button className="auth-primary" disabled={busy}>Update password</button></form><Link className="auth-back" href="/login?next=/account/security">Sign in again</Link></section>
      <section className="security-card"><h2>Update recovery email</h2><p>We’ll verify the new address before changing it. For password accounts, enter your current password above first.</p><form onSubmit={(event) => { event.preventDefault(); void perform(async () => { await reauthenticate(); await verifyBeforeUpdateEmail(user, email.trim(), { url: `${window.location.origin}/login` }); setNotice("A verification link has been sent to your new address. Confirm it, then sign in again."); }); }}><label className="auth-field">New email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="auth-secondary" disabled={busy}>Send verification link</button></form></section>
    </>}
    <section className="security-card"><h2>Sessions</h2><p>Sign out here, or revoke sessions across your devices. Other sessions are rejected on their next server request.</p><button className="auth-secondary" disabled={busy} onClick={() => void perform(() => logOut())}>Sign out of this device</button><button className="auth-secondary" disabled={busy} onClick={() => void perform(() => logOut(true))}>Sign out of all devices</button></section>
  </main>;
}
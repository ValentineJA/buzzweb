"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { reload, sendEmailVerification, verifyBeforeUpdateEmail, type User } from "firebase/auth";
import { clientAuth, clientAuthConfigured } from "@/app/lib/auth/client";
import { authMessage, finishSignIn, userRequest } from "@/app/lib/auth/flow";
import { isAdult, safeNext, validHandle } from "@/app/lib/auth/validation";

export default function CompleteAccount({ mode }: { mode: "setup" | "verify" }) {
  const params = useSearchParams(); const next = safeNext(params.get("next")); const remember = params.get("remember") === "1";
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  const [name, setName] = useState(""); const [handle, setHandle] = useState(""); const [birthDate, setBirthDate] = useState(""); const [adult, setAdult] = useState(false); const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!clientAuthConfigured) return;
    let cancelled = false;
    const auth = clientAuth();
    auth.authStateReady().then(() => { if (cancelled) return; setUser(auth.currentUser); setName(auth.currentUser?.displayName || ""); setEmail(auth.currentUser?.email || ""); setLoading(false); }).catch(() => { if (!cancelled) { setError("Couldn’t restore sign-in. Please sign in again."); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(cooldown - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  const act = async (action: "setup" | "resend" | "check") => {
    if (!user) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (action === "setup") {
        if (!adult || !isAdult(birthDate)) throw new Error("You must be 18 or older to use BUZZ.");
        if (name.trim().length < 2 || !validHandle(handle)) throw new Error("Enter a name and a handle of 3–25 letters, numbers, or underscores.");
        await userRequest("/api/auth/setup", user, { name, handle, birthDate, adultConfirmation: adult });
        await finishSignIn(user, next, remember);
      } else if (action === "resend") {
        if (cooldown) return;
        if (!user.email) await verifyBeforeUpdateEmail(user, email.trim(), { url: `${window.location.origin}/verify-email` });
        else await sendEmailVerification(user, { url: `${window.location.origin}/verify-email` });
        setCooldown(60); setNotice("Check your inbox and spam folder for the verification link. Return here after you open it.");
      } else {
        await reload(user);
        if (!user.emailVerified) throw new Error("Your email hasn’t been verified yet. Open the link in your inbox, then try again.");
        await finishSignIn(user, next, remember);
      }
    } catch (caught) { setError(authMessage(caught)); } finally { setBusy(false); }
  };
  return <main className="auth-page"><div className="auth-intro"><span className="auth-adult-mark">{mode === "setup" ? "A SPACE FOR ADULTS · 18+" : "ONE LAST HELLO"}</span><h1>{mode === "setup" ? <>Your scene.<br /><em>Your introduction.</em></> : <>Check your inbox.<br /><em>Then join the night.</em></>}</h1><p>{mode === "setup" ? "Every new account needs an adult profile, including social sign-ins. Your birthday is private and can’t be changed here later." : "Verify your email before entering BUZZ. This helps protect your account and makes recovery possible."}</p></div>
    {!clientAuthConfigured ? <p className="auth-notice">Sign-in is being set up.</p> : loading ? <p role="status">Restoring your sign-in…</p> : !user ? <p className="auth-notice">Please <Link href="/login">sign in</Link> to continue.</p> : <>
      {mode === "setup" ? <form className="auth-form" onSubmit={(event) => { event.preventDefault(); void act("setup"); }}><label className="auth-field">Your name<input required minLength={2} maxLength={45} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="auth-field">Your handle<input required pattern="[a-zA-Z0-9_]{3,25}" maxLength={25} autoComplete="username" value={handle} onChange={(event) => setHandle(event.target.value)} /></label><label className="auth-field">Date of birth<input type="date" required min="1900-01-01" autoComplete="bday" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /><small>18 or older. Your date of birth is never shown on your profile.</small></label><label className="auth-checkbox"><input type="checkbox" required checked={adult} onChange={(event) => setAdult(event.target.checked)} /><span>I’m at least 18 and these details are accurate.</span></label><button className="auth-primary" disabled={busy}>{busy ? "Saving…" : "Complete my account ↗"}</button></form> : <><form onSubmit={(event) => { event.preventDefault(); void act("resend"); }}>{user.email ? <div className="verify-address"><span>YOUR EMAIL</span><strong>{user.email}</strong></div> : <label className="auth-field">An email for account recovery<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /><small>Your sign-in provider didn’t share an email. Add and verify one to continue.</small></label>}<button type="submit" className="auth-secondary" disabled={busy || cooldown > 0}>{cooldown ? `Resend in ${cooldown}s` : "Send verification email"}</button></form><button className="auth-primary" disabled={busy} onClick={() => void act("check")}>{busy ? "Checking…" : "I’ve verified my email ↗"}</button></>}
      {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}
    </>}
    <p className="auth-switch"><Link href="/login">Back to sign in</Link></p><p className="auth-fine-print">Age eligibility is based on the birthday you provide. This is not identity-document verification.</p>
  </main>;
}
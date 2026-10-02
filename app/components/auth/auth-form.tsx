"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { clientAuth, clientAuthConfigured, loginEmail, providerFor, type SocialProvider } from "@/app/lib/auth/client";
import { authMessage, finishSignIn, userRequest } from "@/app/lib/auth/flow";
import { isAdult, passwordProblem, safeNext, validHandle } from "@/app/lib/auth/validation";
import PasswordField from "./password-field";

export default function AuthForm({ mode }: { mode: "login" | "signup" | "recover" }) {
  const search = useSearchParams();
  const next = safeNext(search.get("next"));
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [name, setName] = useState(""); const [handle, setHandle] = useState(""); const [birthDate, setBirthDate] = useState(""); const [adult, setAdult] = useState(false);
  const [remember, setRemember] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const validateSetup = () => {
    if (!isAdult(birthDate) || !adult) throw new Error("You must be 18 or older to join BUZZ. Enter your birthday and confirm your age.");
    if (name.trim().length < 2 || !validHandle(handle)) throw new Error("Enter your name and a handle of 3–25 letters, numbers, or underscores.");
  };
  const signupData = () => ({ name: name.trim(), handle, birthDate, adultConfirmation: adult });
  const social = async (provider: SocialProvider) => {
    setError(""); setNotice(""); setBusy(true);
    try {
      if (mode === "signup") validateSetup();
      const auth = clientAuth();
      // Start the popup in the click handler, before unrelated awaits.
      const result = await signInWithPopup(auth, providerFor(provider));
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      if (mode === "signup") await userRequest("/api/auth/setup", result.user, signupData());
      await finishSignIn(result.user, next, remember);
    } catch (caught) { setError(authMessage(caught)); } finally { setBusy(false); }
  };
  const submit = async () => {
    setError(""); setNotice(""); setBusy(true);
    try {
      const auth = clientAuth();
      if (mode === "recover") {
        try { await sendPasswordResetEmail(auth, loginEmail(email), { url: `${window.location.origin}/login` }); }
        catch (caught) { const code = (caught as { code?: string }).code; if (!["auth/user-not-found", "auth/invalid-email"].includes(code || "")) throw caught; }
        setNotice("If an account matches that address, a recovery email is on its way. Check your spam folder too."); return;
      }
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      if (mode === "signup") {
        validateSetup();
        const problem = passwordProblem(password); if (problem) throw new Error(problem);
        if (password !== confirm) throw new Error("Your passwords don’t match.");
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(result.user, { displayName: name.trim() });
        try { await userRequest("/api/auth/setup", result.user, signupData()); }
        catch { window.location.replace(`/setup?next=${encodeURIComponent(next)}`); return; }
        try { await sendEmailVerification(result.user, { url: `${window.location.origin}/verify-email` }); }
        catch { /* Verification page offers resend if email delivery is temporarily unavailable. */ }
        window.location.replace(`/verify-email?next=${encodeURIComponent(next)}`);
      } else {
        const result = await signInWithEmailAndPassword(auth, loginEmail(email), password);
        await finishSignIn(result.user, next, remember);
      }
    } catch (caught) { setError(authMessage(caught)); } finally { setBusy(false); }
  };
  return <main className="auth-page"><div className="auth-intro"><span className="auth-adult-mark">18+ · GOOD COMPANY ONLY</span><h1>{mode === "login" ? <>Your people.<br /><em>Your way in.</em></> : mode === "signup" ? <>Good nights<br /><em>start with you.</em></> : <>Let’s get you<br /><em>back in.</em></>}</h1><p>{mode === "login" ? "The plans, the people, the nights worth remembering." : mode === "signup" ? "Make yourself a little space in the crowd." : "Enter your email and we’ll help you reset your password."}</p></div>
    {!clientAuthConfigured && <p className="auth-notice">Sign-in is being set up. Accounts will be available soon.</p>}
    <form className="auth-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {mode === "signup" && <><div className="auth-field-pair"><label className="auth-field">Your name<input autoComplete="name" required maxLength={45} minLength={2} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="auth-field">Your handle<input autoComplete="username" required pattern="[a-zA-Z0-9_]{3,25}" title="3–25 letters, numbers, or underscores" maxLength={25} value={handle} onChange={(event) => setHandle(event.target.value)} /></label></div><label className="auth-field">Date of birth<input type="date" autoComplete="bday" required min="1900-01-01" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /><small>BUZZ is for adults aged 18+. Your birthday stays private.</small></label><label className="auth-checkbox"><input type="checkbox" required checked={adult} onChange={(event) => setAdult(event.target.checked)} /><span>I confirm that I’m at least 18 and my birthday is accurate.</span></label></>}
      <label className="auth-field">{mode === "login" && process.env.NEXT_PUBLIC_ENABLE_TEST_ACCOUNTS === "true" ? "Email or test username" : "Email address"}<input name="email" type={mode === "login" ? "text" : "email"} inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete={mode === "login" ? "username" : "email"} required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
      {mode !== "recover" && <PasswordField value={password} onChange={setPassword} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 10 : undefined} />}
      {mode === "signup" && <><p className="password-help">10+ characters, with uppercase, lowercase, a number, and a symbol.</p><PasswordField label="Confirm password" name="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" /></>}
      {mode === "login" && <div className="auth-form-options"><label className="auth-checkbox"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Keep me signed in</span></label><Link href="/recover">Forgot password?</Link></div>}
      {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}
      <button className="auth-primary" disabled={busy || !clientAuthConfigured}>{busy ? "Just a moment…" : mode === "login" ? "Let me in ↗" : mode === "signup" ? "Create my account ↗" : "Send recovery email ↗"}</button>
    </form>
    {mode !== "recover" && <><div className="auth-divider"><span>OR CONTINUE WITH</span></div><div className="social-auth-buttons">{(["Google", "X", "Facebook"] as const).map((provider) => <button key={provider} disabled={busy || !clientAuthConfigured} onClick={() => void social(provider)}><span aria-hidden="true">{provider === "Google" ? "G" : provider === "X" ? "𝕏" : "f"}</span>{provider === "Facebook" ? "Facebook / Meta" : provider}</button>)}</div>{mode === "signup" && <p className="auth-fine-print">Complete your name, handle, and age confirmation above before choosing a social sign-in.</p>}</>}
    <p className="auth-switch">{mode === "login" ? <>New to the good company? <Link href="/signup">Join BUZZ</Link></> : <>Already part of the crowd? <Link href="/login">Sign in</Link></>}</p><p className="auth-footer">A little more connected. A lot more you. <span>✦</span></p>
  </main>;
}
"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { applyActionCode, checkActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { clientAuth, clientAuthConfigured } from "@/app/lib/auth/client";
import { authMessage } from "@/app/lib/auth/flow";
import { passwordProblem } from "@/app/lib/auth/validation";
import PasswordField from "./password-field";
export default function EmailAction() {
  const params = useSearchParams(); const mode = params.get("mode"); const code = params.get("oobCode");
  const [ready, setReady] = useState(false); const [error, setError] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        if (!code || !["resetPassword", "verifyEmail", "recoverEmail", "verifyAndChangeEmail"].includes(mode || "")) throw new Error("This email link is incomplete or unsupported.");
        if (!clientAuthConfigured) throw new Error("Account recovery is being set up. Please try again later.");
        const auth = clientAuth();
        if (mode === "resetPassword") await verifyPasswordResetCode(auth, code); else await checkActionCode(auth, code);
        if (!cancelled) setReady(true);
      } catch (caught) { if (!cancelled) setError(authMessage(caught)); }
    }
    void check(); return () => { cancelled = true; };
  }, [code, mode]);
  const submit = async () => {
    if (!code) return; setBusy(true); setError("");
    try {
      if (mode === "resetPassword") { const problem = passwordProblem(password); if (problem) throw new Error(problem); if (password !== confirm) throw new Error("Your passwords don’t match."); await confirmPasswordReset(clientAuth(), code, password); }
      else await applyActionCode(clientAuth(), code);
      setDone(true);
    } catch (caught) { setError(authMessage(caught)); } finally { setBusy(false); }
  };
  return <main className="auth-page"><div className="auth-intro"><span className="auth-adult-mark">ACCOUNT SECURITY</span><h1>{mode === "resetPassword" ? <>A fresh start.<br /><em>A new password.</em></> : <>Make it official.<br /><em>Confirm your email.</em></>}</h1></div>{done ? <div className="auth-notice" role="status"><strong>{mode === "resetPassword" ? "Your password has been reset." : "Your email action is complete."}</strong><p>{mode === "recoverEmail" ? "If you didn’t request the email change, reset your password next." : "You can continue securely."}</p><Link className="auth-primary" href={mode === "resetPassword" || mode === "recoverEmail" ? "/login" : "/verify-email"}>Continue ↗</Link>{mode === "recoverEmail" && <Link href="/recover">Reset password</Link>}</div> : ready ? <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>{mode === "resetPassword" && <><PasswordField value={password} onChange={setPassword} autoComplete="new-password" minLength={10} /><p className="password-help">10+ characters with uppercase, lowercase, a number, and a symbol.</p><PasswordField label="Confirm password" name="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" /></>}<button className="auth-primary" disabled={busy}>{busy ? "Updating…" : mode === "resetPassword" ? "Set new password" : mode === "recoverEmail" ? "Restore previous email" : "Confirm email"}</button></form> : !error && <p role="status">Checking your link…</p>}{error && <p className="auth-error" role="alert">{error}</p>}<p className="auth-switch"><Link href="/login">Back to sign in</Link> · <Link href="/recover">Request a new recovery link</Link></p></main>;
}
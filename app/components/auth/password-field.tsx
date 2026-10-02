"use client";
import { useState } from "react";
export default function PasswordField({ label = "Password", name = "password", value, onChange, autoComplete = "current-password", minLength }: { label?: string; name?: string; value: string; onChange: (value: string) => void; autoComplete?: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return <label className="auth-field">{label}<span className="password-input"><input name={name} type={visible ? "text" : "password"} required minLength={minLength} maxLength={128} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} /><button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Hide" : "Show"}</button></span></label>;
}
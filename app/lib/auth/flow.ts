"use client";
import { signOut, type User } from "firebase/auth";
import { clientAuth } from "./client";
import { safeNext } from "./validation";

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}
export async function userRequest<T>(url: string, user: User, data?: unknown) {
  const token = await user.getIdToken(true);
  return requestJson<T>(url, { method: data === undefined ? "GET" : "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
}
export async function finishSignIn(user: User, next = "/", remember = false) {
  // Remove an older account session before evaluating this identity.
  await requestJson("/api/account/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  const status = await userRequest<{ needsSetup: boolean; emailVerified: boolean; allowed: boolean }>("/api/auth/status", user);
  if (!status.allowed) throw new Error("This account cannot access BUZZ. It may be restricted or test access may be disabled.");
  const destination = safeNext(next);
  const query = new URLSearchParams({ next: destination, remember: remember ? "1" : "0" });
  if (status.needsSetup) { window.location.replace(`/setup?${query}`); return; }
  if (!status.emailVerified) { window.location.replace(`/verify-email?${query}`); return; }
  await userRequest("/api/auth/session", user, { remember });
  // A new document drops any router cache belonging to the previous account.
  window.location.replace(destination);
}
export async function logOut(allDevices = false) {
  await requestJson("/api/account/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allDevices }) });
  try { await signOut(clientAuth()); } finally { window.location.replace("/login"); }
}
export function authMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "That email or password isn’t correct. Try again, or reset your password.",
    "auth/wrong-password": "That email or password isn’t correct.",
    "auth/user-not-found": "That email or password isn’t correct.",
    "auth/email-already-in-use": "We couldn’t create that account. Try signing in or recovering your account.",
    "auth/weak-password": "Choose a stronger password with uppercase, lowercase, a number, and a symbol.",
    "auth/password-does-not-meet-requirements": "Your password doesn’t meet the project’s password requirements.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a little before trying again.",
    "auth/popup-closed-by-user": "Sign-in was cancelled. You can try again.",
    "auth/cancelled-popup-request": "Another sign-in window is already open.",
    "auth/popup-blocked": "Allow the sign-in popup in your browser, then try again.",
    "auth/account-exists-with-different-credential": "Use the sign-in method you originally chose. You can link this provider in Account security after signing in.",
    "auth/credential-already-in-use": "This provider is already linked to another account.",
    "auth/provider-already-linked": "That provider is already connected.",
    "auth/requires-recent-login": "Please sign in again before changing your account security.",
    "auth/user-disabled": "This account is unavailable.",
    "auth/network-request-failed": "Check your connection and try again.",
    "auth/operation-not-allowed": "This sign-in method isn’t available yet.",
    "auth/unauthorized-domain": "Sign-in hasn’t been enabled for this website address yet.",
    "auth/expired-action-code": "This link has expired. Request a new one.",
    "auth/invalid-action-code": "This link has expired or has already been used. Request a new one.",
  };
  if (code) return messages[code] || "We couldn’t complete that sign-in action. Please try again.";
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
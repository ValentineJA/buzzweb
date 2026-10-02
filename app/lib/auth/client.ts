"use client";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, TwitterAuthProvider } from "firebase/auth";
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const clientAuthConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
export function clientAuth() {
  if (!clientAuthConfigured) throw new Error("Sign-in is being set up. Please try again later.");
  const app = getApps().find((item) => item.name === "buzz-client") || initializeApp(config, "buzz-client");
  return getAuth(app);
}
export type SocialProvider = "Google" | "X" | "Facebook";
export function providerFor(name: SocialProvider) {
  if (name === "Google") { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); return provider; }
  if (name === "Facebook") { const provider = new FacebookAuthProvider(); provider.addScope("email"); return provider; }
  return new TwitterAuthProvider();
}
export function loginEmail(value: string) {
  const input = value.trim();
  if (process.env.NEXT_PUBLIC_ENABLE_TEST_ACCOUNTS === "true") {
    if (["user1", "user1-admin"].includes(input.toLowerCase())) return process.env.NEXT_PUBLIC_TEST_USER1_EMAIL || "user1@buzz.test";
    if (["user2", "user2-subadmin"].includes(input.toLowerCase())) return process.env.NEXT_PUBLIC_TEST_USER2_EMAIL || "user2@buzz.test";
  }
  return input;
}
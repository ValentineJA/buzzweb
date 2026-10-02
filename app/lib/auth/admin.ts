import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function authConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.MONGODB_URI && process.env.MONGODB_DB && process.env.APP_URL);
}
export function adminAuth() {
  const existing = getApps().find((app) => app.name === "buzz-admin");
  if (existing) return getAuth(existing);
  if (!authConfigured()) throw new Error("AUTH_NOT_CONFIGURED");
  const app = initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n") }) }, "buzz-admin");
  return getAuth(app);
}
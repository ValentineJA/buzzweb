import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminAuth, authConfigured } from "./admin";
import { database } from "./mongodb";
import { isAdult } from "./validation";
import { publicAccount, type Role, type UserDocument } from "./types";

export const sessionCookie = process.env.NODE_ENV === "production" ? "__Host-buzz_session" : "buzz_session";
export const getAccount = cache(async () => {
  if (!authConfigured()) return null;
  const cookie = (await cookies()).get(sessionCookie)?.value;
  if (!cookie) return null;
  let uid: string;
  try {
    const claims = await adminAuth().verifySessionCookie(cookie, true);
    if (!claims.email_verified) return null;
    uid = claims.uid;
  } catch { return null; }
  const user = await (await database()).collection<UserDocument>("users").findOne({ _id: uid });
  if (!user || user.disabled || !isAdult(user.birthDate)) return null;
  if (user.isTestAccount && process.env.ENABLE_TEST_ACCOUNTS !== "true") return null;
  return publicAccount(user);
});
export async function requireAccount() {
  const account = await getAccount();
  if (!account) redirect("/login");
  return account;
}
/** Use this on every future privileged API/action; hiding a button is not authorization. */
export async function requireRole(allowed: Role[]) {
  const account = await requireAccount();
  if (!allowed.includes(account.role)) throw new Error("FORBIDDEN");
  return account;
}
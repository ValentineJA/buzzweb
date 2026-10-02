import { NextResponse } from "next/server";
import { ApiError, apiFailure, assertOrigin, bearerUser, readJson } from "@/app/lib/auth/api";
import { adminAuth } from "@/app/lib/auth/admin";
import { database } from "@/app/lib/auth/mongodb";
import { sessionCookie } from "@/app/lib/auth/session";
import { isAdult } from "@/app/lib/auth/validation";
import type { UserDocument } from "@/app/lib/auth/types";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const token = await bearerUser(request);
    const body = await readJson(request);
    if (Math.floor(Date.now() / 1000) - token.auth_time > 300) throw new ApiError(401, "recent-login-required", "For your security, please sign in again.");
    if (token.email_verified !== true || !token.email) throw new ApiError(403, "verify-email", "Verify your email before entering BUZZ.");
    const users = (await database()).collection<UserDocument>("users");
    const user = await users.findOne({ _id: token.uid });
    if (!user) throw new ApiError(403, "setup-required", "Complete your profile before entering BUZZ.");
    if (!isAdult(user.birthDate) || user.disabled) throw new ApiError(403, "restricted", "This account cannot access BUZZ.");
    if (user.isTestAccount && process.env.ENABLE_TEST_ACCOUNTS !== "true") throw new ApiError(403, "test-disabled", "Test accounts are disabled here.");
    const remembered = body.remember === true;
    const expiresIn = (remembered ? 14 : 1) * 24 * 60 * 60 * 1000;
    const cookie = await adminAuth().createSessionCookie(request.headers.get("authorization")!.slice(7), { expiresIn });
    await users.updateOne({ _id: user._id }, { $set: { email: token.email, updatedAt: new Date() } });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookie, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", ...(remembered ? { maxAge: expiresIn / 1000 } : {}) });
    return response;
  } catch (error) { return apiFailure(error); }
}
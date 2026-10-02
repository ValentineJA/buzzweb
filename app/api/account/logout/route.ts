import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiFailure, assertOrigin, readJson } from "@/app/lib/auth/api";
import { adminAuth } from "@/app/lib/auth/admin";
import { sessionCookie } from "@/app/lib/auth/session";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const body = await readJson(request);
    if (body.allDevices === true) {
      const cookie = (await cookies()).get(sessionCookie)?.value;
      if (cookie) {
        const token = await adminAuth().verifySessionCookie(cookie, true);
        await adminAuth().revokeRefreshTokens(token.uid);
      }
    }
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookie, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return apiFailure(error); }
}
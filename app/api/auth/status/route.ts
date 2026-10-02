import { apiFailure, bearerUser } from "@/app/lib/auth/api";
import { database } from "@/app/lib/auth/mongodb";
import { isAdult } from "@/app/lib/auth/validation";
import type { UserDocument } from "@/app/lib/auth/types";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const token = await bearerUser(request);
    const user = await (await database()).collection<UserDocument>("users").findOne({ _id: token.uid });
    return Response.json({ needsSetup: !user, emailVerified: token.email_verified === true, allowed: !user || (!user.disabled && isAdult(user.birthDate) && (!user.isTestAccount || process.env.ENABLE_TEST_ACCOUNTS === "true")) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
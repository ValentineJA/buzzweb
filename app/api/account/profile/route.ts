import { MongoServerError } from "mongodb";
import { ApiError, apiFailure, assertOrigin, readJson } from "@/app/lib/auth/api";
import { getAccount } from "@/app/lib/auth/session";
import { database } from "@/app/lib/auth/mongodb";
import { validHandle } from "@/app/lib/auth/validation";
import type { UserDocument } from "@/app/lib/auth/types";
export const runtime = "nodejs";
export async function PATCH(request: Request) {
  try {
    assertOrigin(request);
    const account = await getAccount();
    if (!account) throw new ApiError(401, "sign-in-required", "Please sign in again.");
    const body = await readJson(request);
    const string = (key: string, max: number) => {
      if (typeof body[key] !== "string" || (body[key] as string).length > max) throw new ApiError(400, "invalid-profile", "Check your profile details.");
      return (body[key] as string).trim();
    };
    const name = string("name", 45); const handle = string("handle", 25).toLowerCase();
    const bio = string("bio", 180); const city = string("city", 40); const mood = string("mood", 60);
    if (name.length < 2 || !validHandle(handle) || !Array.isArray(body.interests) || body.interests.length > 6 || body.interests.some((item) => typeof item !== "string" || item.length > 40)) throw new ApiError(400, "invalid-profile", "Check your name, handle, and interests.");
    const profile = { name, handle, bio, city, mood, interests: [...new Set((body.interests as string[]).map((item) => item.trim()).filter(Boolean))] };
    const users = (await database()).collection<UserDocument>("users");
    await users.createIndex({ handle: 1 }, { unique: true });
    // Only editable public profile fields. Never accept role, UID, birthday, or verification state.
    await users.updateOne({ _id: account.uid }, { $set: { profile, handle, updatedAt: new Date() } });
    return Response.json({ profile });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return apiFailure(new ApiError(409, "handle-taken", "That handle is taken."));
    return apiFailure(error);
  }
}
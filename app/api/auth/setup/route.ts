import { MongoServerError } from "mongodb";
import { ApiError, apiFailure, assertOrigin, bearerUser, readJson } from "@/app/lib/auth/api";
import { database } from "@/app/lib/auth/mongodb";
import { isAdult, validHandle } from "@/app/lib/auth/validation";
import type { UserDocument } from "@/app/lib/auth/types";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const token = await bearerUser(request);
    const body = await readJson(request);
    if (body.adultConfirmation !== true || !isAdult(body.birthDate)) throw new ApiError(403, "age-restricted", "BUZZ is for people aged 18 and over.");
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 45 || !validHandle(body.handle)) throw new ApiError(400, "invalid-profile", "Enter your name and a handle of 3–25 letters, numbers, or underscores.");
    const users = (await database()).collection<UserDocument>("users");
    await users.createIndex({ handle: 1 }, { unique: true });
    const existing = await users.findOne({ _id: token.uid });
    if (existing) {
      if (existing.disabled || !isAdult(existing.birthDate)) throw new ApiError(403, "restricted", "This account cannot access BUZZ.");
      return Response.json({ ok: true });
    }
    const handle = body.handle.toLowerCase();
    const now = new Date();
    await users.updateOne({ _id: token.uid }, { $setOnInsert: {
      email: token.email || "", birthDate: body.birthDate as string, adultConfirmedAt: now,
      role: "member", handle, isTestAccount: false,
      profile: { name: body.name.trim(), handle, bio: "", city: "", mood: "One more song", interests: [] },
      createdAt: now, updatedAt: now,
    } }, { upsert: true });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return apiFailure(new ApiError(409, "handle-taken", "That handle is taken. Try another one."));
    return apiFailure(error);
  }
}
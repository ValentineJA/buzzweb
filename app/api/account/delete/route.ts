import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "@/app/lib/auth/admin";
import { apiFailure, ApiError, assertOrigin, bearerUser, readJson } from "@/app/lib/auth/api";
import { database } from "@/app/lib/auth/mongodb";
import { sessionCookie } from "@/app/lib/auth/session";
export const runtime = "nodejs";
export async function POST(request: Request) {
    try {
        assertOrigin(request);
        const token = await bearerUser(request);
        const body = await readJson(request);
        if (body.confirm !== "DELETE")
            throw new ApiError(400, "confirmation", "Type DELETE to confirm.");
        if (Math.floor(Date.now() / 1000) - token.auth_time > 300)
            throw new ApiError(401, "recent-login", "Sign in again, then return here to delete your account within five minutes.");
        const session = (await cookies()).get(sessionCookie)?.value;
        if (!session)
            throw new ApiError(401, "session", "Please sign in again.");
        const claims = await adminAuth().verifySessionCookie(session, true);
        if (claims.uid !== token.uid)
            throw new ApiError(403, "identity", "Please sign in to the same account.");
        const db = await database(), uid = token.uid, now = new Date().toISOString();
        // Hide the account immediately; the same freshly authenticated identity may retry cleanup.
        await db.collection<{
            _id: string;
            disabled: boolean;
        }>("users").updateOne({ _id: uid }, { $set: { disabled: true } });
        const posts = await db.collection<{
            _id: string;
        }>("posts").find({ ownerId: uid }, { projection: { _id: 1 } }).toArray();
        const ids = posts.map(p => p._id);
        await Promise.all([
            db.collection("reactions").deleteMany({ $or: [{ uid }, { postId: { $in: ids } }] }),
            db.collection("comments").deleteMany({ $or: [{ ownerId: uid }, { postId: { $in: ids } }] }),
            db.collection("messages").deleteMany({ ownerId: uid }),
            db.collection("media").deleteMany({ ownerId: uid }),
            db.collection("follows").deleteMany({ $or: [{ from: uid }, { to: uid }] }),
            db.collection("blocks").deleteMany({ $or: [{ from: uid }, { to: uid }] }),
            db.collection("notifications").deleteMany({ $or: [{ from: uid }, { to: uid }] }),
            db.collection("reads").deleteMany({ uid }),
            db.collection<{
                _id: string;
            }>("preferences").deleteOne({ _id: uid }),
            db.collection("rooms").updateMany({ ownerId: uid }, { $set: { expiresAt: now } }),
            db.collection<{
                members: string[];
            }>("rooms").updateMany({ members: uid }, { $pull: { members: uid } }),
        ]);
        await db.collection("posts").deleteMany({ ownerId: uid });
        await adminAuth().deleteUser(uid);
        await db.collection<{
            _id: string;
        }>("users").deleteOne({ _id: uid });
        const response = NextResponse.json({ ok: true });
        response.cookies.set(sessionCookie, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
        return response;
    }
    catch (error) {
        return apiFailure(error);
    }
}

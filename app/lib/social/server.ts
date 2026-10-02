import "server-only";
import { ensureIndexes } from "./indexes";
import { database } from "../auth/mongodb";
import { getAccount } from "../auth/session";
import { ApiError } from "../auth/api";
import type { UserDocument } from "../auth/types";
import { defaults, expired, type Settings, type Person } from "./types";
export type Preferences = Settings & {
    _id: string;
};
export type Edge = {
    _id: string;
    from: string;
    to: string;
    status: "accepted" | "pending";
};
export type Block = {
    _id: string;
    from: string;
    to: string;
};
export async function context() {
    const account = await getAccount();
    if (!account)
        throw new ApiError(401, "login", "Please sign in again.");
    const db = await database();
    await ensureIndexes(db);
    const [edges, blocks, prefs, users] = await Promise.all([
        db.collection<Edge>("follows").find({ $or: [{ from: account.uid }, { to: account.uid }] }).toArray(),
        db.collection<Block>("blocks").find({ $or: [{ from: account.uid }, { to: account.uid }] }).toArray(),
        db.collection<Preferences>("preferences").find({}).toArray(),
        db.collection<UserDocument>("users").find({ disabled: { $ne: true }, ...(process.env.ENABLE_TEST_ACCOUNTS === "true" ? {} : { isTestAccount: { $ne: true } }) }, { projection: { profile: 1, handle: 1, disabled: 1, isTestAccount: 1 } }).toArray(),
    ]);
    const settings = (id: string): Settings => ({ ...defaults, ...prefs.find(p => p._id === id) });
    const blocked = (id: string) => blocks.some(b => b.from === id || b.to === id);
    const follows = (from: string, to: string) => edges.some(e => e.from === from && e.to === to && e.status === "accepted");
    const person = (id: string): Person => {
        const u = users.find(u => u._id === id);
        const p = u?.profile;
        return { id, name: p?.name || "Unavailable account", handle: p?.handle || "", bio: p?.bio || "", city: p?.city || "", mood: p?.mood || "", interests: p?.interests || [], following: follows(account.uid, id), requested: edges.some(e => e.from === account.uid && e.to === id && e.status === "pending"), private: settings(id).privateProfile };
    };
    const visible = (p: {
        ownerId: string;
        audience?: string;
        expiresAt?: string | null;
    }) => !expired(p.expiresAt) && !!users.find(u => u._id === p.ownerId) && !blocked(p.ownerId) && (p.ownerId === account.uid || ((!settings(p.ownerId).privateProfile && p.audience !== "followers") || follows(account.uid, p.ownerId)));
    return { account, db, edges, blocks, users, settings, blocked, follows, person, visible };
}
export type Context = Awaited<ReturnType<typeof context>>;
export function fail(message: string, status = 400): never { throw new ApiError(status, "social-error", message); }
export function string(value: unknown, max = 2000, required = false) { if (typeof value !== "string" || value.length > max || (required && !value.trim()))
    fail("Check the text and try again."); return value.trim(); }
export async function notify(c: Context, to: string, text: string, href: string) {
    if (to === c.account.uid || !c.settings(to).notifications)
        return;
    await c.db.collection("notifications").insertOne({ to, from: c.account.uid, text, href, read: false, createdAt: new Date().toISOString() });
}
export async function throttle(c: Context) {
    const slot = Math.floor(Date.now() / 60000);
    const result = await c.db.collection<{
        _id: string;
        count: number;
        expiresAt: Date;
    }>("limits").findOneAndUpdate({ _id: c.account.uid + ":" + slot }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((slot + 2) * 60000) } }, { upsert: true, returnDocument: "after" });
    if (result && result.count > 90)
        fail("Too many actions. Please wait a minute.", 429);
}

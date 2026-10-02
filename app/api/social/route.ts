import type { Filter } from "mongodb";
import { randomUUID } from "node:crypto";
import { apiFailure, assertOrigin, readJson } from "@/app/lib/auth/api";
import { context, fail, string, notify, throttle, type Context, type Edge, type Block, type Preferences } from "@/app/lib/social/server";
import { canEdit, defaults, expired, kinds, type Post, type Room, type Message, type Settings } from "@/app/lib/social/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type StoredPost = Omit<Post, "author" | "likes" | "liked" | "saved" | "going" | "here" | "attendance" | "comments"> & {
    point?: {
        type: "Point";
        coordinates: number[];
    };
};
type StoredRoom = Omit<Room, "people" | "unread" | "closed">;
type StoredMessage = Omit<Message, "author" | "readBy">;
type Reaction = {
    _id: string;
    postId: string;
    uid: string;
    kind: "like" | "save" | "going" | "here";
};
type CommentDoc = {
    _id: string;
    postId: string;
    ownerId: string;
    text: string;
    createdAt: string;
};
type Read = {
    _id: string;
    roomId: string;
    uid: string;
    at: string;
};
const json = (data: unknown) => Response.json(data, { headers: { "Cache-Control": "no-store" } });
async function post(c: Context, id: string) {
    const p = await c.db.collection<StoredPost>("posts").findOne({ _id: id });
    if (!p || !c.visible(p))
        fail("This post is unavailable.", 404);
    return p;
}
async function room(c: Context, id: string, write = false) {
    const r = await c.db.collection<StoredRoom>("rooms").findOne({ _id: id, members: c.account.uid });
    if (!r || r.members.some(id => c.blocked(id)))
        fail("This conversation is unavailable.", 404);
    if (write && expired(r.expiresAt))
        fail("This party room has expired.", 403);
    return r;
}
function owner(ownerId: string, c: Context) { if (!canEdit(ownerId, c.account.uid))
    fail("Only the owner can change this.", 403); }
function target(c: Context, id: string) { if (id === c.account.uid || c.blocked(id) || !c.users.some(u => u._id === id))
    fail("This account is unavailable.", 404); }
async function decorate(c: Context, posts: StoredPost[]) {
    const ids = posts.map(p => p._id);
    const [reactions, comments] = await Promise.all([c.db.collection<Reaction>("reactions").find({ postId: { $in: ids } }).toArray(), c.db.collection<CommentDoc>("comments").find({ postId: { $in: ids } }).toArray()]);
    return posts.map(p => { const rows = reactions.filter(r => r.postId === p._id); return { ...p, author: c.person(p.ownerId), likes: rows.filter(r => r.kind === "like").length, liked: rows.some(r => r.kind === "like" && r.uid === c.account.uid), saved: rows.some(r => r.kind === "save" && r.uid === c.account.uid), going: rows.filter(r => r.kind === "going" || r.kind === "here").length, here: p.endsAt && p.endsAt <= new Date().toISOString() ? 0 : rows.filter(r => r.kind === "here").length, attendance: rows.find(r => (r.kind === "going" || r.kind === "here") && r.uid === c.account.uid)?.kind || "", comments: comments.filter(r => r.postId === p._id && !c.blocked(r.ownerId)).length }; });
}
export async function GET(request: Request) {
    try {
        const c = await context();
        const uid = c.account.uid;
        const q = new URL(request.url).searchParams;
        const resource = q.get("resource") || "feed";
        const id = q.get("id") || "";
        if (resource === "settings")
            return json({ settings: c.settings(uid), blocked: c.blocks.filter(b => b.from === uid).map(b => c.person(b.to)), requests: c.edges.filter(e => e.to === uid && e.status === "pending" && !c.blocked(e.from)).map(e => c.person(e.from)) });
        if (resource === "users") {
            const term = (q.get("q") || "").toLowerCase().replace(/^@/, "").slice(0, 80);
            return json({ people: c.users.filter(u => u._id !== uid && !c.blocked(u._id) && c.settings(u._id).discoverable && (`${u.profile.name} ${u.handle}`).toLowerCase().includes(term)).slice(0, 40).map(u => c.person(u._id)) });
        }
        if (resource === "profile") {
            const who = id || uid;
            if (c.blocked(who) || !c.users.some(u => u._id === who))
                fail("Profile unavailable.", 404);
            const edges = await c.db.collection<Edge>("follows").find({ status: "accepted", $or: [{ from: who }, { to: who }] }).toArray();
            const allowed = who === uid || !c.settings(who).privateProfile || c.follows(uid, who);
            return json({ person: c.person(who), followers: edges.filter(e => e.to === who).length, following: edges.filter(e => e.from === who).length, people: allowed ? edges.map(e => c.person(e.from === who ? e.to : e.from)).filter(p => !c.blocked(p.id)) : [], locked: !allowed });
        }
        if (resource === "feed") {
            // Apply audience restrictions before pagination; hidden posts must not consume a page.
            const following = c.edges.filter(e => e.from === uid && e.status === "accepted").map(e => e.to);
            const publicOwners = c.users.filter(u => !c.settings(u._id).privateProfile && !c.blocked(u._id)).map(u => u._id);
            const allowedOwners = c.users.filter(u => !c.blocked(u._id)).map(u => u._id);
            const page = Math.floor(Math.max(0, Math.min(1000, Number(q.get("page")) || 0)));
            const saved = q.get("saved") === "1" ? await c.db.collection<Reaction>("reactions").find({ uid, kind: "save" }).toArray() : null;
            const term = (q.get("q") || "").slice(0, 80);
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, match => "\\" + match);
            const lat = q.get("lat"), lng = q.get("lng");
            const radius = Math.max(1, Math.min(200, Number(q.get("radius")) || 25));
            if (lat && lng && (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180))
                fail("Invalid search location.");
            const filters: Filter<StoredPost>[] = [
                { ownerId: { $in: allowedOwners } }, { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date().toISOString() } }] },
                { $or: [{ ownerId: uid }, { ownerId: { $in: following } }, { ownerId: { $in: publicOwners }, audience: "public" }] },
                ...(id ? [{ ownerId: id }] : []), ...(q.get("following") === "1" ? [{ ownerId: { $in: [uid, ...following] } }] : []),
                ...(saved ? [{ _id: { $in: saved.map(r => r.postId) } }] : []),
                ...(q.get("events") === "1" ? [{ kind: { $in: ["event", "live"] as const } }] : []),
                ...(q.get("category") ? [{ category: q.get("category")! }] : []), ...(q.get("free") === "1" ? [{ price: 0 }] : []),
                ...(term ? [{ $or: [{ title: { $regex: escaped, $options: "i" } }, { text: { $regex: escaped, $options: "i" } }, { location: { $regex: escaped, $options: "i" } }] }] : []),
                ...(lat && lng ? [{ point: { $geoWithin: { $centerSphere: [[Number(lng), Number(lat)], radius / 6371] } } }] : []),
            ];
            const rows = await c.db.collection<StoredPost>("posts").find({ $and: filters }).sort({ createdAt: -1, _id: -1 }).skip(page * 20).limit(21).toArray();
            const filtered = rows.slice(0, 20).filter(c.visible);
            return json({ posts: await decorate(c, filtered), more: rows.length > 20 });
        }
        if (resource === "comments") {
            await post(c, id);
            return json({ comments: (await c.db.collection<CommentDoc>("comments").find({ postId: id }).sort({ createdAt: -1 }).limit(100).toArray()).filter(m => !c.blocked(m.ownerId)).map(m => ({ ...m, author: c.person(m.ownerId) })) });
        }
        if (resource === "rooms") {
            const rooms = await c.db.collection<StoredRoom>("rooms").find({ members: uid }).sort({ updatedAt: -1 }).limit(100).toArray();
            const reads = await c.db.collection<Read>("reads").find({ uid }).toArray();
            return json({ rooms: await Promise.all(rooms.filter(r => !r.members.some(id => c.blocked(id))).map(async (r) => ({ ...r, people: r.members.map(c.person), closed: expired(r.expiresAt), unread: await c.db.collection<StoredMessage>("messages").countDocuments({ roomId: r._id, ownerId: { $ne: uid }, createdAt: { $gt: reads.find(x => x.roomId === r._id)?.at || "" } }) }))) });
        }
        if (resource === "messages") {
            const r = await room(c, id);
            const reads = await c.db.collection<Read>("reads").find({ roomId: id }).toArray();
            const messages = await c.db.collection<StoredMessage>("messages").find({ roomId: id, ...(q.get("before") ? { createdAt: { $lt: q.get("before")! } } : {}) }).sort({ createdAt: -1 }).limit(50).toArray();
            return json({ messages: messages.reverse().map(m => ({ ...m, author: c.person(m.ownerId), readBy: reads.filter(x => x.at >= m.createdAt && x.uid !== m.ownerId && c.settings(x.uid).readReceipts).map(x => x.uid) })), closed: expired(r.expiresAt), more: messages.length === 50 });
        }
        if (resource === "notifications")
            return json({ notifications: await c.db.collection("notifications").find({ to: uid, from: { $nin: c.blocks.map(b => b.from === uid ? b.to : b.from) } }).sort({ createdAt: -1 }).limit(50).toArray() });
        if (resource === "reports")
            return json({ reports: await c.db.collection("reports").find(c.account.role === "admin" || c.account.role === "subadmin" ? {} : { reporterId: uid }).sort({ createdAt: -1 }).limit(100).toArray() });
        if (resource === "export") {
            const [posts, comments, messages, follows, settings] = await Promise.all([c.db.collection<StoredPost>("posts").find({ ownerId: uid }).toArray(), c.db.collection<CommentDoc>("comments").find({ ownerId: uid }).toArray(), c.db.collection<StoredMessage>("messages").find({ ownerId: uid }).toArray(), c.db.collection<Edge>("follows").find({ from: uid }).toArray(), c.db.collection<Preferences>("preferences").findOne({ _id: uid })]);
            return json({ account: c.account, posts, comments, messages, follows, settings, exportedAt: new Date().toISOString() });
        }
        fail("Unknown request.", 404);
    }
    catch (error) {
        return apiFailure(error);
    }
}
export async function POST(request: Request) {
    try {
        assertOrigin(request);
        const c = await context();
        const uid = c.account.uid;
        await throttle(c);
        const b = await readJson(request);
        const action = string(b.action, 40, true);
        const id = typeof b.id === "string" ? string(b.id, 150) : "";
        const now = new Date().toISOString();
        if (action === "follow") {
            target(c, id);
            const collection = c.db.collection<Edge>("follows");
            const key = `${uid}:${id}`;
            if (b.enabled === false)
                await collection.deleteOne({ _id: key });
            else {
                if (!c.settings(id).discoverable && !c.follows(uid, id))
                    fail("This account is not accepting new follows.", 403);
                const result = await collection.updateOne({ _id: key }, { $setOnInsert: { from: uid, to: id, status: c.settings(id).privateProfile ? "pending" : "accepted" } }, { upsert: true });
                if (result.upsertedCount)
                    await notify(c, id, `${c.account.profile.name} ${c.settings(id).privateProfile ? "requested to follow you" : "followed you"}`, "/settings");
            }
        }
        else if (action === "follow-request") {
            const edge = c.db.collection<Edge>("follows");
            if (b.accept === true) {
                if (c.blocked(id))
                    fail("Account blocked.", 403);
                await edge.updateOne({ from: id, to: uid, status: "pending" }, { $set: { status: "accepted" } });
            }
            else
                await edge.deleteOne({ from: id, to: uid });
        }
        else if (action === "block") {
            if (id === uid)
                fail("You cannot block yourself.");
            const blocks = c.db.collection<Block>("blocks");
            if (b.enabled === false)
                await blocks.deleteOne({ _id: `${uid}:${id}` });
            else {
                await blocks.updateOne({ _id: `${uid}:${id}` }, { $set: { from: uid, to: id } }, { upsert: true });
                await c.db.collection<Edge>("follows").deleteMany({ $or: [{ from: uid, to: id }, { from: id, to: uid }] });
            }
        }
        else if (action === "post-save") {
            const old = id ? await post(c, id) : null;
            if (old)
                owner(old.ownerId, c);
            const kind = string(b.kind, 20) as StoredPost["kind"];
            if (!kinds.includes(kind))
                fail("Choose a post type.");
            const title = string(b.title, 120, true), text = string(b.text, 2000), location = string(b.location, 160), category = string(b.category, 40);
            const audience = b.audience === "followers" ? "followers" : "public";
            const date = (v: unknown) => { if (!v)
                return null; const d = new Date(string(v, 40)); if (!Number.isFinite(d.getTime()))
                fail("Choose a valid date."); return d.toISOString(); };
            const startsAt = date(b.startsAt), endsAt = date(b.endsAt);
            if ((kind === "event" || kind === "live") && (!startsAt || !endsAt || endsAt <= startsAt))
                fail("Events need an end time after their start time.");
            const coord = (v: unknown, max: number) => { if (v === null || v === "" || v === undefined)
                return null; if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > max)
                fail("Invalid coordinates."); return v; };
            const latitude = coord(b.latitude, 90), longitude = coord(b.longitude, 180);
            if ((latitude === null) !== (longitude === null))
                fail("Provide both coordinates.");
            const price = typeof b.price === "number" ? b.price : 0;
            if (!Number.isFinite(price) || price < 0 || price > 100000)
                fail("Invalid price.");
            const mediaId = string(b.mediaId, 150);
            if (mediaId && !await c.db.collection<{
                _id: string;
                ownerId: string;
            }>("media").findOne({ _id: mediaId, ownerId: uid }))
                fail("Upload your own image.", 403);
            if (old && old.kind !== kind)
                fail("A published post's type cannot be changed.");
            const data: StoredPost = { _id: id || randomUUID(), ownerId: uid, kind, title, text, mediaId, location, category, audience, startsAt, endsAt, latitude, longitude, price, createdAt: old?.createdAt || now, expiresAt: old ? old.expiresAt : kind === "story" ? new Date(Date.now() + 86400000).toISOString() : null };
            if (latitude !== null && longitude !== null)
                data.point = { type: "Point", coordinates: [longitude, latitude] };
            await c.db.collection<StoredPost>("posts").replaceOne({ _id: data._id, ownerId: uid }, data, { upsert: !old });
            return json({ ok: true, id: data._id });
        }
        else if (action === "post-delete") {
            const p = await post(c, id);
            owner(p.ownerId, c);
            await c.db.collection<StoredPost>("posts").deleteOne({ _id: id, ownerId: uid });
            await Promise.all([c.db.collection("comments").deleteMany({ postId: id }), c.db.collection("reactions").deleteMany({ postId: id }), c.db.collection<StoredRoom>("rooms").updateMany({ eventId: id }, { $set: { expiresAt: now } })]);
        }
        else if (action === "reaction") {
            const p = await post(c, id);
            const kind = string(b.kind, 15);
            if (!["like", "save", "going", "here"].includes(kind))
                fail("Invalid action.");
            const attendance = kind === "going" || kind === "here";
            if (attendance && !["event", "live"].includes(p.kind))
                fail("Not an event.");
            if (attendance && p.endsAt && p.endsAt <= now)
                fail("This event has ended.");
            if (kind === "here" && p.startsAt && p.startsAt > now)
                fail("Check-in opens when the event starts.");
            const key = `${uid}:${id}:${attendance ? "attendance" : kind}`;
            if (b.enabled === false)
                await c.db.collection<Reaction>("reactions").deleteOne({ _id: key });
            else {
                const result = await c.db.collection<Reaction>("reactions").updateOne({ _id: key }, { $set: { uid, postId: id, kind: kind as Reaction["kind"] } }, { upsert: true });
                if (kind === "like" && result.upsertedCount)
                    await notify(c, p.ownerId, `${c.account.profile.name} liked ${p.title}`, "/");
            }
        }
        else if (action === "comment") {
            const p = await post(c, id);
            const permission = c.settings(p.ownerId).comments;
            if (p.ownerId !== uid && (permission === "nobody" || (permission === "followers" && !c.follows(uid, p.ownerId))))
                fail("Comments are restricted on this post.", 403);
            await c.db.collection<CommentDoc>("comments").insertOne({ _id: randomUUID(), postId: id, ownerId: uid, text: string(b.text, 1000, true), createdAt: now });
            await notify(c, p.ownerId, `${c.account.profile.name} commented on ${p.title}`, "/");
        }
        else if (action === "comment-delete") {
            const row = await c.db.collection<CommentDoc>("comments").findOne({ _id: id });
            if (!row)
                fail("Comment unavailable.", 404);
            const p = await post(c, row.postId);
            if (row.ownerId !== uid && p.ownerId !== uid)
                fail("Only the author or post owner can remove this comment.", 403);
            await c.db.collection<CommentDoc>("comments").deleteOne({ _id: id });
        }
        else if (action === "room-create") {
            const kind = b.kind === "party" ? "party" : b.kind === "group" ? "group" : "direct";
            const members = Array.isArray(b.members) ? [...new Set(b.members.map(x => string(x, 150)))] : [];
            if (members.length < 1 || members.length > 30 || (kind === "direct" && members.length !== 1))
                fail("Choose 1 person for a direct chat, or up to 30 for a group.");
            for (const member of members) {
                target(c, member);
                const rule = kind === "direct" ? c.settings(member).messages : c.settings(member).groupInvites;
                if (rule === "nobody" || (rule === "following" && !c.follows(member, uid)))
                    fail(`${c.person(member).name} does not allow this invitation.`, 403);
            }
            const eventId = typeof b.eventId === "string" ? b.eventId : "";
            if (kind === "party") {
                const event = await post(c, eventId);
                owner(event.ownerId, c);
                if (!["event", "live"].includes(event.kind))
                    fail("Select an event you organise.");
            }
            const sorted = [uid, ...members].sort();
            const key = kind === "direct" ? `direct:${sorted.join(":")}` : randomUUID();
            const hours = Number(b.hours);
            if (!Number.isFinite(hours) || hours < 0 || hours > 720)
                fail("Expiry must be between 0 and 720 hours.");
            const data: StoredRoom = { _id: key, ownerId: uid, name: kind === "direct" ? "" : string(b.name, 80, true), kind, members: sorted, eventId: kind === "party" ? eventId : "", expiresAt: kind === "party" && hours > 0 ? new Date(Date.now() + hours * 3600000).toISOString() : null, updatedAt: now };
            await c.db.collection<StoredRoom>("rooms").updateOne({ _id: key }, { $setOnInsert: data }, { upsert: true });
            return json({ ok: true, id: key });
        }
        else if (action === "room-update") {
            const r = await room(c, id, true);
            owner(r.ownerId, c);
            if (r.kind === "direct")
                fail("Direct conversations cannot be renamed.");
            const hours = Number(b.hours);
            if (!Number.isFinite(hours) || hours < 0 || hours > 720)
                fail("Invalid expiry.");
            await c.db.collection<StoredRoom>("rooms").updateOne({ _id: id, ownerId: uid }, { $set: { name: string(b.name, 80, true), expiresAt: r.kind === "party" && hours > 0 ? new Date(Date.now() + hours * 3600000).toISOString() : null } });
        }
        else if (action === "room-remove-member") {
            const r = await room(c, id, true);
            owner(r.ownerId, c);
            const member = string(b.member, 150, true);
            if (r.kind === "direct" || member === uid)
                fail("Cannot remove this member.");
            await c.db.collection<StoredRoom>("rooms").updateOne({ _id: id, ownerId: uid }, { $pull: { members: member } });
        }
        else if (action === "room-leave") {
            const r = await room(c, id);
            if (r.ownerId === uid && r.kind !== "direct")
                fail("Close your room instead, so participants keep the conversation.");
            if (r.kind === "direct")
                fail("Block this person in Explore to stop the conversation.");
            await c.db.collection<StoredRoom>("rooms").updateOne({ _id: id }, { $pull: { members: uid } });
        }
        else if (action === "room-close") {
            const r = await room(c, id);
            owner(r.ownerId, c);
            if (r.kind === "direct")
                fail("Cannot close direct chats.");
            await c.db.collection<StoredRoom>("rooms").updateOne({ _id: id, ownerId: uid }, { $set: { expiresAt: now } });
        }
        else if (action === "message-send") {
            const r = await room(c, id, true);
            if (r.kind === "direct") {
                const peer = r.members.find(x => x !== uid)!;
                const rule = c.settings(peer).messages;
                if (rule === "nobody" || (rule === "following" && !c.follows(peer, uid)))
                    fail("This person has restricted messages.", 403);
            }
            await c.db.collection<StoredMessage>("messages").insertOne({ _id: randomUUID(), roomId: id, ownerId: uid, text: string(b.text, 2000, true), createdAt: now });
            await c.db.collection<StoredRoom>("rooms").updateOne({ _id: id }, { $set: { updatedAt: now } });
            for (const member of r.members)
                await notify(c, member, `${c.account.profile.name} sent a message`, "/message");
        }
        else if (action === "message-edit" || action === "message-delete") {
            const m = await c.db.collection<StoredMessage>("messages").findOne({ _id: id });
            if (!m)
                fail("Message unavailable.", 404);
            await room(c, m.roomId, true);
            owner(m.ownerId, c);
            if (action === "message-delete")
                await c.db.collection<StoredMessage>("messages").deleteOne({ _id: id, ownerId: uid });
            else
                await c.db.collection<StoredMessage>("messages").updateOne({ _id: id, ownerId: uid }, { $set: { text: string(b.text, 2000, true), editedAt: now } });
        }
        else if (action === "read") {
            await room(c, id);
            await c.db.collection<Read>("reads").updateOne({ _id: `${uid}:${id}` }, { $set: { uid, roomId: id, at: now } }, { upsert: true });
        }
        else if (action === "notifications-read") {
            await c.db.collection("notifications").updateMany({ to: uid }, { $set: { read: true } });
        }
        else if (action === "report") {
            const kind = string(b.kind, 20);
            let ownerId = "", snapshot = "";
            if (kind === "post") {
                const p = await post(c, id);
                ownerId = p.ownerId;
                snapshot = p.title + "\n" + p.text;
            }
            else if (kind === "user") {
                target(c, id);
                ownerId = id;
                snapshot = c.person(id).name + "\n" + c.person(id).bio;
            }
            else if (kind === "message") {
                const m = await c.db.collection<StoredMessage>("messages").findOne({ _id: id });
                if (!m)
                    fail("Message unavailable.", 404);
                await room(c, m.roomId);
                ownerId = m.ownerId;
                snapshot = m.text;
            }
            else
                fail("Invalid report.");
            if (ownerId === uid)
                fail("You cannot report your own content.");
            await c.db.collection<{
                _id: string;
            }>("reports").updateOne({ _id: uid + ":" + kind + ":" + id }, { $setOnInsert: { reporterId: uid, ownerId, targetId: id, kind, snapshot, reason: string(b.reason, 1000, true), status: "open", createdAt: now } }, { upsert: true });
        }
        else if (action === "report-review") {
            if (c.account.role !== "admin" && c.account.role !== "subadmin")
                fail("Only moderators can review reports.", 403);
            await c.db.collection<{
                _id: string;
            }>("reports").updateOne({ _id: id }, { $set: { status: "reviewed", reviewedBy: uid, reviewedAt: now } });
        }
        else if (action === "settings") {
            const s = { ...c.settings(uid) };
            const input = b.settings;
            if (!input || typeof input !== "object" || Array.isArray(input))
                fail("Invalid settings.");
            const v = input as Record<string, unknown>;
            for (const key of ["privateProfile", "discoverable", "notifications", "readReceipts", "reducedMotion", "freeOnly"] as const) {
                if (typeof v[key] !== "boolean")
                    fail("Invalid setting.");
                s[key] = v[key] as boolean;
            }
            for (const key of ["messages", "groupInvites"] as const) {
                if (!["everyone", "following", "nobody"].includes(String(v[key])))
                    fail("Invalid permission.");
                s[key] = v[key] as Settings[typeof key];
            }
            if (!["everyone", "followers", "nobody"].includes(String(v.comments)) || !["light", "dark"].includes(String(v.theme)))
                fail("Invalid setting.");
            s.comments = v.comments as Settings["comments"];
            s.theme = v.theme as Settings["theme"];
            s.radius = Number(v.radius);
            s.partyHours = Number(v.partyHours);
            if (!Number.isFinite(s.radius) || s.radius < 1 || s.radius > 200 || !Number.isFinite(s.partyHours) || s.partyHours < 0 || s.partyHours > 720)
                fail("Check radius and expiry.");
            s.category = string(v.category, 40);
            const clean = Object.fromEntries(Object.keys(defaults).map(key => [key, s[key as keyof Settings]]));
            await c.db.collection<Preferences>("preferences").updateOne({ _id: uid }, { $set: clean }, { upsert: true });
        }
        else
            fail("Unknown action.", 404);
        return json({ ok: true });
    }
    catch (error) {
        return apiFailure(error);
    }
}

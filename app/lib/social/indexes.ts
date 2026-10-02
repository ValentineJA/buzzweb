import "server-only";
import type { Db } from "mongodb";
let ready: Promise<unknown> | undefined;
export function ensureIndexes(db: Db) {
    return ready ??= Promise.all([
        db.collection("posts").createIndex({ createdAt: -1, _id: -1 }),
        db.collection("posts").createIndex({ ownerId: 1, createdAt: -1 }),
        db.collection("posts").createIndex({ point: "2dsphere" }),
        db.collection("follows").createIndex({ to: 1, status: 1 }),
        db.collection("follows").createIndex({ from: 1, status: 1 }),
        db.collection("blocks").createIndex({ to: 1 }),
        db.collection("blocks").createIndex({ from: 1 }),
        db.collection("reactions").createIndex({ postId: 1, kind: 1 }),
        db.collection("comments").createIndex({ postId: 1, createdAt: -1 }),
        db.collection("rooms").createIndex({ members: 1, updatedAt: -1 }),
        db.collection("messages").createIndex({ roomId: 1, createdAt: -1 }),
        db.collection("notifications").createIndex({ to: 1, createdAt: -1 }),
        db.collection("media").createIndex({ ownerId: 1, createdAt: 1 }),
        db.collection("limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch(error => { ready = undefined; throw error; });
}

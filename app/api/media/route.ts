import { randomUUID } from "node:crypto";
import { Binary } from "mongodb";
import { apiFailure, assertOrigin } from "@/app/lib/auth/api";
import { context, fail } from "@/app/lib/social/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
    try {
        assertOrigin(request);
        const c = await context();
        if (Number(request.headers.get("content-length")) > 3 * 1024 * 1024)
            fail("Images must be under 3 MB.", 413);
        const reader = request.body?.getReader();
        if (!reader)
            fail("Choose an image.");
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                size += value.length;
                if (size > 3 * 1024 * 1024) {
                    await reader.cancel();
                    fail("Images must be under 3 MB.", 413);
                }
                chunks.push(value);
            }
        }
        finally {
            reader.releaseLock();
        }
        const bytes = Buffer.concat(chunks);
        let type = "";
        if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
            type = "image/png";
        else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
            type = "image/jpeg";
        else if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
            type = "image/webp";
        if (!type)
            fail("Choose a JPEG, PNG, or WebP image.");
        const media = c.db.collection<{
            _id: string;
            ownerId: string;
            bytes: Binary;
            type: string;
            createdAt: Date;
        }>("media");
        if (await media.countDocuments({ ownerId: c.account.uid, createdAt: { $gte: new Date(Date.now() - 86400000) } }) >= 30)
            fail("You can upload up to 30 images per day.", 429);
        const id = randomUUID();
        await media.insertOne({ _id: id, ownerId: c.account.uid, bytes: new Binary(bytes), type, createdAt: new Date() });
        return Response.json({ id });
    }
    catch (error) {
        return apiFailure(error);
    }
}

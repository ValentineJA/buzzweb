import { Binary } from "mongodb";
import { apiFailure } from "@/app/lib/auth/api";
import { context, fail } from "@/app/lib/social/server";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const c = await context();
        const { id } = await params;
        const media = await c.db.collection<{
            _id: string;
            ownerId: string;
            bytes: Binary;
            type: string;
        }>("media").findOne({ _id: id });
        if (!media)
            fail("Image unavailable.", 404);
        if (media.ownerId !== c.account.uid) {
            const posts = await c.db.collection<{
                ownerId: string;
                audience: string;
                expiresAt: string | null;
            }>("posts").find({ mediaId: id }).toArray();
            if (!posts.some(c.visible))
                fail("Image unavailable.", 404);
        }
        return new Response(new Uint8Array(media.bytes.buffer), { headers: { "Content-Type": media.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } });
    }
    catch (error) {
        return apiFailure(error);
    }
}

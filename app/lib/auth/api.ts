import "server-only";
import { adminAuth, authConfigured } from "./admin";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function assertOrigin(request: Request) {
  const expected = process.env.APP_URL;
  if (!authConfigured() || !expected) throw new ApiError(503, "not-configured", "Sign-in is being set up. Please try again later.");
  if (request.headers.get("origin") !== new URL(expected).origin) throw new ApiError(403, "invalid-origin", "This request could not be accepted.");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "invalid-origin", "This request could not be accepted.");
}
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415, "invalid-content", "Expected JSON.");
  // Bound the stream even when Content-Length is omitted or dishonest.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid-body", "Missing request body.");
  let size = 0; let text = ""; const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); throw new ApiError(413, "too-large", "Request is too large."); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "invalid-body", "Invalid request body.");
  } finally { reader.releaseLock(); }
}
export async function bearerUser(request: Request) {
  if (!authConfigured()) throw new ApiError(503, "not-configured", "Sign-in is being set up. Please try again later.");
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ") || header.length > 12000) throw new ApiError(401, "sign-in-required", "Please sign in again.");
  try { return await adminAuth().verifyIdToken(header.slice(7), true); }
  catch { throw new ApiError(401, "sign-in-required", "Please sign in again."); }
}
export function apiFailure(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  // Never return SDK errors: they may contain connection strings or other credentials.
  return Response.json({ error: "We couldn’t complete that request. Please try again.", code: "service-unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
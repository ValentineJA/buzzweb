import "server-only";
import { MongoClient } from "mongodb";

const globalMongo = globalThis as typeof globalThis & { buzzMongo?: Promise<MongoClient> };
export async function database() {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) throw new Error("AUTH_NOT_CONFIGURED");
  if (!globalMongo.buzzMongo) {
    const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
    globalMongo.buzzMongo = client.connect().catch((error: unknown) => {
      globalMongo.buzzMongo = undefined;
      // Log only known categories, never raw errors or connection strings.
      const names = new Set(["MongoServerSelectionError", "MongoNetworkError", "MongoNetworkTimeoutError", "MongoServerError", "MongoParseError"]);
      const name = error instanceof Error && names.has(error.name) ? error.name : "MongoConnectionError";
      const code = typeof error === "object" && error && "code" in error && typeof error.code === "number" ? error.code : undefined;
      console.error("[buzz:mongodb] Connection failed", { name, code });
      throw error;
    });
  }
  return (await globalMongo.buzzMongo).db(process.env.MONGODB_DB);
}
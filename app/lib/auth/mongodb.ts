import "server-only";
import { MongoClient } from "mongodb";

const globalMongo = globalThis as typeof globalThis & { buzzMongo?: Promise<MongoClient> };
export async function database() {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) throw new Error("AUTH_NOT_CONFIGURED");
  if (!globalMongo.buzzMongo) {
    const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
    globalMongo.buzzMongo = client.connect().catch((error) => { globalMongo.buzzMongo = undefined; throw error; });
  }
  return (await globalMongo.buzzMongo).db(process.env.MONGODB_DB);
}
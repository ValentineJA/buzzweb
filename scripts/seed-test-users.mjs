import nextEnv from "@next/env";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { MongoClient } from "mongodb";
nextEnv.loadEnvConfig(process.cwd());

async function seed() {
  const required = ["FIREBASE_PROJECT_ID", "FIREBASE_TEST_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "MONGODB_URI", "MONGODB_DB", "TEST_USER1_PASSWORD", "TEST_USER2_PASSWORD"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(", ")}. Fill .env.local first.`);
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_TEST_ACCOUNTS !== "true" || process.env.FIREBASE_TEST_PROJECT_ID !== process.env.FIREBASE_PROJECT_ID) throw new Error("Test seeding requires non-production mode, ENABLE_TEST_ACCOUNTS=true, and an explicitly matching FIREBASE_TEST_PROJECT_ID.");
  if (process.argv.includes("--check")) { console.log("Test seed configuration is present. No accounts changed."); return; }
  const app = initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
  const auth = getAuth(app);
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const users = client.db(process.env.MONGODB_DB).collection("users");
    await users.createIndex({ handle: 1 }, { unique: true });
    const accounts = [
      { uid: "buzz-test-user1-admin", name: "User1-Admin", handle: "user1_admin", role: "admin", email: process.env.NEXT_PUBLIC_TEST_USER1_EMAIL || "user1@buzz.test", password: process.env.TEST_USER1_PASSWORD },
      { uid: "buzz-test-user2-subadmin", name: "User2-SubAdmin", handle: "user2_subadmin", role: "subadmin", email: process.env.NEXT_PUBLIC_TEST_USER2_EMAIL || "user2@buzz.test", password: process.env.TEST_USER2_PASSWORD },
    ];
    for (const account of accounts) {
      // Never take over an existing unrelated user, even if its email happens to match.
      let existing;
      try { existing = await auth.getUserByEmail(account.email); } catch (error) { if (error.code !== "auth/user-not-found") throw error; }
      if (existing && existing.uid !== account.uid) throw new Error("A test email already belongs to another account. Choose a different test email.");
      const values = { email: account.email, password: account.password, displayName: account.name, emailVerified: true, disabled: false };
      let byUid;
      try { byUid = await auth.getUser(account.uid); } catch (error) { if (error.code !== "auth/user-not-found") throw error; }
      if (byUid && byUid.email !== account.email) throw new Error("A reserved test UID has a different email. Review it before seeding.");
      if (byUid) await auth.updateUser(account.uid, values); else await auth.createUser({ uid: account.uid, ...values });
      await auth.setCustomUserClaims(account.uid, { role: account.role, isTestAccount: true });
      await auth.revokeRefreshTokens(account.uid);
      const now = new Date();
      await users.updateOne({ _id: account.uid }, {
        $set: { email: account.email, role: account.role, handle: account.handle, isTestAccount: true, disabled: false, updatedAt: now },
        $setOnInsert: { birthDate: "2000-01-01", adultConfirmedAt: now, createdAt: now, profile: { name: account.name, handle: account.handle, bio: "BUZZ development test account.", city: "", mood: "One more song", interests: [] } },
      }, { upsert: true });
      console.log(`Ready: ${account.name} (${account.email}), role=${account.role}. Password was not logged.`);
    }
  } finally { await client.close(); }
}
seed().catch((error) => {
  // Only own validation errors are safe to print; SDK messages may contain secrets.
  const safe = /^(Missing configuration:|Test seeding requires|A test email|A reserved test UID)/.test(error.message || "");
  console.error(safe ? error.message : "Test seeding failed. Check Firebase credentials, MongoDB access, and uniqueness of the test identities.");
  process.exitCode = 1;
});
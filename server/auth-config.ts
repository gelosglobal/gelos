/**
 * Better Auth + Mongo (Express / local dev).
 * Kept in sync with `api/[...path].ts` — Vercel bundles that file alone (no local imports).
 */
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";

function mongoUri(): string {
  const u =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_URl;
  if (!u) {
    throw new Error("Set MONGODB_URI or DATABASE_URL in the environment (MongoDB connection string).");
  }
  return u;
}

const dbName = process.env.MONGODB_DB_NAME || "gelos";

const txEnv = process.env.MONGODB_TRANSACTIONS;
const transaction =
  txEnv === "true"
    ? true
    : txEnv === "false"
      ? false
      : process.env.NODE_ENV !== "production"
        ? false
        : undefined;

function resolveBaseURL(): string {
  const u = process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "");
  if (u) return u;
  return "http://localhost:3005";
}

function resolveTrustedOrigins(): string[] {
  const extra = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const base = resolveBaseURL();
  const local = ["http://localhost:3005", "http://127.0.0.1:3005", "http://localhost:5173", "http://127.0.0.1:5173"];
  const merged =
    base.startsWith("http://localhost") || base.startsWith("http://127.0.0.1")
      ? [base, ...extra, ...local]
      : [base, ...extra];

  return [...new Set(merged)];
}

export function getCorsOrigins(): string[] | boolean {
  return resolveTrustedOrigins();
}

let mongoClientSingleton: MongoClient | null = null;
let authSingleton: ReturnType<typeof betterAuth> | null = null;

export function getMongoClient(): MongoClient {
  if (!mongoClientSingleton) {
    mongoClientSingleton = new MongoClient(mongoUri(), {
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 15_000,
    });
  }
  return mongoClientSingleton;
}

export function getAuth(): ReturnType<typeof betterAuth> {
  if (!authSingleton) {
    const secret = process.env.BETTER_AUTH_SECRET?.trim();
    if (!secret) {
      throw new Error("BETTER_AUTH_SECRET is not set");
    }
    const client = getMongoClient();
    authSingleton = betterAuth({
      secret,
      baseURL: resolveBaseURL(),
      basePath: "/api/auth",
      database: mongodbAdapter(client.db(dbName), {
        client,
        transaction,
      }),
      emailAndPassword: { enabled: true },
      trustedOrigins: resolveTrustedOrigins(),
    }) as ReturnType<typeof betterAuth>;
  }
  return authSingleton;
}

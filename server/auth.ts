import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
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

/** Single client for adapter + connection pooling (important on Vercel serverless). */
export const mongoClient = new MongoClient(mongoUri());

const txEnv = process.env.MONGODB_TRANSACTIONS;
const transaction =
  txEnv === "true" ? true : txEnv === "false" ? false : undefined;

/**
 * Public URL where the app is served (no trailing slash).
 * On Vercel, set BETTER_AUTH_URL or rely on VERCEL_URL.
 */
function resolveBaseURL(): string {
  const explicit = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
}

/** Origins allowed for CORS / cookie context (browser + serverless). */
function resolveTrustedOrigins(): string[] {
  const fromEnv = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const vercel: string[] = [];
  if (process.env.VERCEL_URL) vercel.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) vercel.push(process.env.VERCEL_BRANCH_URL.replace(/\/$/, ""));

  const dev = ["http://localhost:5173", "http://127.0.0.1:5173"];

  const base = resolveBaseURL();
  const merged = [...fromEnv, ...vercel, base];
  if (process.env.NODE_ENV !== "production") {
    merged.push(...dev);
  }
  return [...new Set(merged)];
}

/** For Express `cors()` when running `pnpm dev:auth` / `start:auth`. */
export function getCorsOrigins(): string[] | boolean {
  return resolveTrustedOrigins();
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: resolveBaseURL(),
  basePath: "/api/auth",
  database: mongodbAdapter(mongoClient.db(dbName), {
    client: mongoClient,
    transaction,
  }),
  emailAndPassword: { enabled: true },
  trustedOrigins: resolveTrustedOrigins(),
});

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

/** Single client for adapter + connection pooling. */
export const mongoClient = new MongoClient(mongoUri());

const txEnv = process.env.MONGODB_TRANSACTIONS;
const transaction =
  txEnv === "true" ? true : txEnv === "false" ? false : undefined;

/** Public origin where the app is served (no trailing slash). In production set to your real URL, e.g. https://staff.gelosglobal.com */
function resolveBaseURL(): string {
  const u = process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "");
  if (u) return u;
  return "http://localhost:5173";
}

/** Origins for CORS / cookies: your site + optional extra domains from env. */
function resolveTrustedOrigins(): string[] {
  const extra = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const base = resolveBaseURL();
  const local = ["http://localhost:5173", "http://127.0.0.1:5173"];
  const merged =
    base.startsWith("http://localhost") || base.startsWith("http://127.0.0.1")
      ? [base, ...extra, ...local]
      : [base, ...extra];

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

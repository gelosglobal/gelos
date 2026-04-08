/**
 * Better Auth handler for Vercel (root catch-all under `/api/*`).
 *
 * Use `api/[...path].ts` (not `api/auth/[...path].ts`): on Vercel, a nested catch-all
 * after a static `auth` segment only matched one path segment, so `/api/auth/sign-in/email`
 * returned NOT_FOUND while `/api/auth/get-session` worked.
 *
 * Self-contained — do not import other project files (Vercel bundles this file alone).
 * Mirror changes in `server/auth-config.ts` (Express).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { toNodeHandler } from "better-auth/node";
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

let mongoClientSingleton: MongoClient | null = null;
let authSingleton: ReturnType<typeof betterAuth> | null = null;

function getMongoClient(): MongoClient {
  if (!mongoClientSingleton) {
    mongoClientSingleton = new MongoClient(mongoUri(), {
      serverSelectionTimeoutMS: 15_000,
      connectTimeoutMS: 15_000,
    });
  }
  return mongoClientSingleton;
}

function getAuth(): ReturnType<typeof betterAuth> {
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

let nodeHandler: ReturnType<typeof toNodeHandler> | null = null;
function getNodeHandler() {
  if (!nodeHandler) nodeHandler = toNodeHandler(getAuth());
  return nodeHandler;
}

/** Path after `/api/` from Vercel `[...path]` (multi-segment) or from `req.url`. */
function pathAfterApi(req: VercelRequest): string {
  const q = req.query.path;
  if (Array.isArray(q) && q.length > 0) {
    return q.map(String).join("/");
  }
  if (typeof q === "string" && q.length > 0) {
    return q;
  }
  const raw = req.url?.split("?")[0] ?? "";
  if (raw.startsWith("/api/")) {
    return raw.slice("/api/".length);
  }
  try {
    const pathname = new URL(req.url ?? "/", "http://local").pathname;
    if (pathname.startsWith("/api/")) {
      return pathname.slice("/api/".length);
    }
  } catch {
    /* ignore */
  }
  return "";
}

function syncOriginalUrl(req: VercelRequest, full: string) {
  const r = req as VercelRequest & { originalUrl?: string };
  r.originalUrl = full;
}

function hasMongoUri(): boolean {
  return Boolean(
    process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.DATABASE_URl,
  );
}

export default async function apiCatchAll(req: VercelRequest, res: VercelResponse) {
  try {
    const raw = req.url ?? "/";
    const qs = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
    const afterApi = pathAfterApi(req);
    if (afterApi !== "auth" && !afterApi.startsWith("auth/")) {
      res.status(404).send("Not found");
      return;
    }

    const fullPath = `/api/${afterApi}${qs}`;
    req.url = fullPath;
    syncOriginalUrl(req, fullPath);

    if (!process.env.BETTER_AUTH_SECRET) {
      console.error("[auth] BETTER_AUTH_SECRET is not set");
      res.status(500).json({ error: "server_misconfigured", detail: "missing_BETTER_AUTH_SECRET" });
      return;
    }
    if (!hasMongoUri()) {
      console.error("[auth] DATABASE_URL / MONGODB_URI is not set");
      res.status(500).json({ error: "server_misconfigured", detail: "missing_database_url" });
      return;
    }

    await getMongoClient().connect();
    await getNodeHandler()(req, res);
  } catch (err) {
    console.error("[auth] handler error:", err);
    if (!res.headersSent) {
      const payload: { error: string; detail?: string } = { error: "auth_failed" };
      if (process.env.VERCEL_ENV === "development" || process.env.NODE_ENV !== "production") {
        payload.detail = err instanceof Error ? err.message : String(err);
      }
      res.status(500).json(payload);
    }
  }
}

/**
 * Self-contained Better Auth handler for Vercel.
 * Do not import other project files here — the bundler only emits this file; local imports become broken ESM paths at runtime.
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

function restAfterAuth(req: VercelRequest): string {
  const p = req.query.path;
  if (Array.isArray(p)) return p.join("/");
  if (typeof p === "string") return p;
  const raw = req.url?.split("?")[0] ?? "";
  const prefix = "/api/auth/";
  if (raw.startsWith(prefix)) return raw.slice(prefix.length);
  try {
    const pathname = new URL(req.url ?? "/", "http://local").pathname;
    if (pathname.startsWith(prefix)) return pathname.slice(prefix.length);
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

export default async function authCatchAll(req: VercelRequest, res: VercelResponse) {
  try {
    const raw = req.url ?? "/";
    const q = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
    const rest = restAfterAuth(req);
    const fullPath = `/api/auth/${rest}${q}`;
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

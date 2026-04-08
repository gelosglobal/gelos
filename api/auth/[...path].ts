/**
 * Handles all Better Auth routes: /api/auth/get-session, /api/auth/sign-in/email, etc.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { toNodeHandler } from "better-auth/node";
import { getAuth, getMongoClient } from "./auth-config";

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

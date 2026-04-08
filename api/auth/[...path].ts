/**
 * Handles all Better Auth routes: /api/auth/get-session, /api/auth/sign-in/email, etc.
 * Nested under `api/auth/` so Vercel reliably matches multi-segment paths (root `api/[...slug]` can 404).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { toNodeHandler } from "better-auth/node";
import { auth, mongoClient } from "../lib/auth";

const nodeHandler = toNodeHandler(auth);

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
      res.status(500).json({ error: "server_misconfigured" });
      return;
    }

    await mongoClient.connect();
    await nodeHandler(req, res);
  } catch (err) {
    console.error("[auth] handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "auth_failed" });
    }
  }
}

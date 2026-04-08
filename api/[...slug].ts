/**
 * Root catch-all /api/* — Vercel matches this reliably for /api/auth/sign-in/email (nested api/auth/[...] is flaky).
 * Local dev uses Express (server/index.ts).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { toNodeHandler } from "better-auth/node";
import { auth, mongoClient } from "../server/auth";

const handler = toNodeHandler(auth);

function slugFromQuery(req: VercelRequest): string {
  const q = req.query;
  const c = q.slug ?? q.path;
  if (Array.isArray(c)) return c.join("/");
  if (typeof c === "string") return c;
  return "";
}

/** When query helpers omit `slug`, derive path after `/api/` from `req.url` (Vercel catch-all). */
function slugFromUrlPath(url: string | undefined): string {
  if (!url) return "";
  const pathOnly = url.split("?")[0] ?? "";
  if (pathOnly.startsWith("/api/")) return pathOnly.slice(5);
  try {
    const p = new URL(url, "http://local").pathname;
    if (p.startsWith("/api/")) return p.slice(5);
  } catch {
    /* ignore */
  }
  return "";
}

function resolveApiSlug(req: VercelRequest): string {
  const fromQuery = slugFromQuery(req);
  if (fromQuery) return fromQuery;
  return slugFromUrlPath(req.url);
}

function syncOriginalUrl(req: VercelRequest, full: string) {
  const r = req as VercelRequest & { originalUrl?: string };
  r.originalUrl = full;
}

export default async function apiSlug(req: VercelRequest, res: VercelResponse) {
  try {
    const raw = req.url ?? "/";
    const q = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
    const slug = resolveApiSlug(req);

    if (!slug.startsWith("auth")) {
      res.status(404).end();
      return;
    }

    req.url = `/api/${slug}${q}`;
    syncOriginalUrl(req, req.url);

    if (!process.env.BETTER_AUTH_SECRET) {
      console.error("[auth] BETTER_AUTH_SECRET is not set");
      res.status(500).json({ error: "server_misconfigured" });
      return;
    }

    await mongoClient.connect();
    await handler(req, res);
  } catch (err) {
    console.error("[auth] handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "auth_failed" });
    }
  }
}

/**
 * Vercel: files under /api become Node serverless routes. Local dev uses Express (server/index.ts).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { toNodeHandler } from "better-auth/node";
import { auth, mongoClient } from "../../server/auth";

const AUTH_PREFIX = "/api/auth";
const handler = toNodeHandler(auth);

function normalizeAuthUrl(req: VercelRequest) {
  let raw = req.url ?? "/";
  const q = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
  let pathPart = raw.includes("?") ? raw.slice(0, raw.indexOf("?")) : raw;

  if (pathPart === AUTH_PREFIX || pathPart.startsWith(`${AUTH_PREFIX}/`)) {
    syncOriginalUrl(req, raw);
    return;
  }

  const slug = req.query?.slug;
  const fromSlug =
    typeof slug === "string" ? slug : Array.isArray(slug) ? slug.join("/") : "";

  const sub = (fromSlug || pathPart).replace(/^\/+/, "");
  if (!sub) {
    syncOriginalUrl(req, raw);
    return;
  }

  raw = `${AUTH_PREFIX}/${sub}${q}`;
  req.url = raw;
  syncOriginalUrl(req, raw);
}

/** better-call uses originalUrl + url; Vercel often only sets url — keep them aligned. */
function syncOriginalUrl(req: VercelRequest, full: string) {
  const r = req as VercelRequest & { originalUrl?: string };
  r.originalUrl = full;
}

export default async function vercelAuth(req: VercelRequest, res: VercelResponse) {
  try {
    normalizeAuthUrl(req);

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

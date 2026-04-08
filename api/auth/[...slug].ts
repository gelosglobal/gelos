/**
 * Vercel turns any file under /api into a serverless function automatically — no extra UI config.
 * This file only runs on Vercel; local dev uses Express in server/index.ts.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { toNodeHandler } from "better-auth/node";
import { auth, mongoClient } from "../../server/auth";

const AUTH_PREFIX = "/api/auth";
const handler = toNodeHandler(auth);

function normalizeAuthUrl(req: VercelRequest) {
  const raw = req.url ?? "/";
  const q = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
  const pathPart = raw.includes("?") ? raw.slice(0, raw.indexOf("?")) : raw;

  if (pathPart === AUTH_PREFIX || pathPart.startsWith(`${AUTH_PREFIX}/`)) {
    return;
  }

  const slug = req.query?.slug;
  const fromSlug =
    typeof slug === "string" ? slug : Array.isArray(slug) ? slug.join("/") : "";

  const sub = (fromSlug || pathPart).replace(/^\/+/, "");
  if (!sub) return;

  req.url = `${AUTH_PREFIX}/${sub}${q}`;
}

export default async function vercelAuth(req: VercelRequest, res: VercelResponse) {
  normalizeAuthUrl(req);
  await mongoClient.connect();
  await handler(req, res);
}

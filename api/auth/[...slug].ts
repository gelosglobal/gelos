/**
 * Vercel Serverless — Better Auth catch-all for /api/auth/*
 * Vercel often passes req.url without the /api/auth prefix; better-call then builds
 * the wrong Request URL and Better Auth returns 404. Normalize before handling.
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

  let sub = (fromSlug || pathPart).replace(/^\/+/, "");
  if (!sub) return;

  req.url = `${AUTH_PREFIX}/${sub}${q}`;
}

export default async function vercelAuth(req: VercelRequest, res: VercelResponse) {
  normalizeAuthUrl(req);
  await mongoClient.connect();
  await handler(req, res);
}

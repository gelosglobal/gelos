/**
 * Vercel Serverless — Better Auth catch-all for /api/auth/*
 * @see https://vercel.com/docs/functions/serverless-functions
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { toNodeHandler } from "better-auth/node";
import { auth, mongoClient } from "../../server/auth";

const handler = toNodeHandler(auth);

export default async function vercelAuth(req: VercelRequest, res: VercelResponse) {
  await mongoClient.connect();
  await handler(req, res);
}

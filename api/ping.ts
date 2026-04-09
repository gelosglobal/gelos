import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function ping(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
}


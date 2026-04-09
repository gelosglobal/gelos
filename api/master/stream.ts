import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "../_prisma";
import { computeMasterSummary } from "./_summary";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function masterStream(req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    const orgIdFromQuery = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
    const org =
      orgIdFromQuery
        ? await prisma.organization.findUnique({ where: { id: orgIdFromQuery }, select: { id: true } })
        : await prisma.organization.findFirst({ select: { id: true } });

    if (!org) {
      res.status(400).json({ error: "no_org_configured" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    (res as any).flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send("hello", { ok: true, orgId: org.id, ts: new Date().toISOString() });

    let lastTs = new Date(Date.now() - 60_000);
    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    const tick = async () => {
      if (closed) return;

      const summary = await computeMasterSummary(org.id);
      send("summary", summary);

      const events = await prisma.liveEvent.findMany({
        where: { orgId: org.id, ts: { gt: lastTs } },
        orderBy: { ts: "asc" },
        take: 50,
        select: { id: true, kind: true, ts: true, title: true, message: true, data: true },
      });

      if (events.length) {
        lastTs = new Date(events[events.length - 1]!.ts);
        for (const e of events) send("live", e);
      }

      res.write(": ping\n\n");
      setTimeout(tick, 2500);
    };

    tick().catch((err) => {
      console.error("[master] stream error:", err);
      if (!closed) {
        try {
          send("error", { message: err instanceof Error ? err.message : String(err) });
        } finally {
          res.end();
        }
      }
    });
  } catch (err) {
    console.error("[master] stream handler error:", err);
    res.status(500).json({ error: "master_stream_failed" });
  }
}


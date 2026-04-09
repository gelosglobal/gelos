import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "../_prisma.js";
import { computeMasterSummary } from "./_summary.js";
import { ensureOrg } from "../_ensureOrg.js";

export default async function masterSnapshot(req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    const orgIdFromQuery = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
    const org = await ensureOrg(prisma as any, orgIdFromQuery);

    const summary = await computeMasterSummary(org.id);
    const recentEvents = await prisma.liveEvent.findMany({
      where: { orgId: org.id },
      orderBy: { ts: "desc" },
      take: 20,
      select: { id: true, kind: true, ts: true, title: true, message: true, data: true },
    });

    res.json({
      orgId: org.id,
      orgName: org.name ?? "Gelos",
      summary,
      recentEvents,
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[master] snapshot error:", err);
    res.status(500).json({
      error: "master_snapshot_failed",
      detail: process.env.NODE_ENV !== "production" ? (err instanceof Error ? err.message : String(err)) : undefined,
    });
  }
}


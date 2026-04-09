import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "../_prisma";
import { computeMasterSummary } from "./_summary";

export default async function masterSnapshot(req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    const orgIdFromQuery = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
    const org =
      orgIdFromQuery
        ? await prisma.organization.findUnique({ where: { id: orgIdFromQuery }, select: { id: true, name: true } })
        : await prisma.organization.findFirst({ select: { id: true, name: true } });

    if (!org) {
      res.json({
        orgId: null,
        orgName: null,
        summary: {
          asOf: new Date().toISOString(),
          kpis: { orders: 0, revenue: 0, refunds: 0, checkoutsStarted: 0, activeCheckouts: 0, currency: null },
          mix: { dtc: { orders: 0, revenue: 0 }, sf: { orders: 0, revenue: 0 }, unknown: { orders: 0, revenue: 0 }, total: { orders: 0, revenue: 0 } },
          risk: { ordersLastHour: 0, revenueLastHour: 0, ordersLast15m: 0, revenuePerOrder: 0, refundRate: 0 },
          alerts: [],
        },
        recentEvents: [],
        asOf: new Date().toISOString(),
      });
      return;
    }

    const summary = await computeMasterSummary(org.id);
    const recentEvents = await prisma.liveEvent.findMany({
      where: { orgId: org.id },
      orderBy: { ts: "desc" },
      take: 20,
      select: { id: true, kind: true, ts: true, title: true, message: true, data: true },
    });

    res.json({
      orgId: org.id,
      orgName: org.name,
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


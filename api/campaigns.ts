import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "./_prisma.js";
import { ensureOrg } from "./_ensureOrg.js";

export default async function campaigns(req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    const orgIdFromQuery = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
    const org = await ensureOrg(prisma as any, orgIdFromQuery);

    if (req.method === "GET") {
      const channel = typeof req.query.channel === "string" ? req.query.channel : "";
      const status = typeof req.query.status === "string" ? req.query.status : "";

      const where: any = { orgId: org.id };
      if (channel) where.channel = channel;
      if (status) where.status = status;

      const campaigns = await prisma.campaign.findMany({
        where,
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        take: 500,
        select: {
          id: true,
          externalId: true,
          name: true,
          channel: true,
          spend: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ orgId: org.id, campaigns });
      return;
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as any;
      const name = String(body.name ?? "").trim();
      if (!name) {
        res.status(400).json({ error: "name_required" });
        return;
      }
      const channel = String(body.channel ?? "").trim();
      if (!channel) {
        res.status(400).json({ error: "channel_required" });
        return;
      }

      const spend = Number(body.spend ?? 0);
      const status = String(body.status ?? "Active");

      const startDateStr = String(body.startDate ?? "");
      const startDate = startDateStr ? new Date(startDateStr) : new Date();
      if (Number.isNaN(startDate.getTime())) {
        res.status(400).json({ error: "invalid_start_date" });
        return;
      }
      const endDateStr = String(body.endDate ?? "");
      const endDate = endDateStr ? new Date(endDateStr) : null;
      if (endDateStr && (!endDate || Number.isNaN(endDate.getTime()))) {
        res.status(400).json({ error: "invalid_end_date" });
        return;
      }

      const created = await prisma.campaign.create({
        data: {
          orgId: org.id,
          externalId: typeof body.externalId === "string" ? body.externalId : null,
          name,
          channel,
          spend: Number.isFinite(spend) ? Math.max(0, spend) : 0,
          status,
          startDate,
          endDate,
        },
        select: {
          id: true,
          externalId: true,
          name: true,
          channel: true,
          spend: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json({ campaign: created });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("[campaigns] error:", err);
    res.status(500).json({ error: "campaigns_failed" });
  }
}


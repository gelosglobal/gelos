import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "../_prisma.js";

export default async function campaignById(req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    const id = typeof req.query.id === "string" ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : "";
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }

    if (req.method === "PATCH") {
      const body = (req.body ?? {}) as any;
      const data: any = {};
      if (typeof body.name === "string") data.name = body.name;
      if (typeof body.channel === "string") data.channel = body.channel;
      if (body.spend !== undefined) data.spend = Math.max(0, Number(body.spend));
      if (typeof body.status === "string") data.status = body.status;
      if (typeof body.startDate === "string") data.startDate = new Date(body.startDate);
      if (typeof body.endDate === "string") data.endDate = body.endDate ? new Date(body.endDate) : null;

      if (!Object.keys(data).length) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      const updated = await prisma.campaign.update({
        where: { id },
        data,
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

      res.json({ campaign: updated });
      return;
    }

    if (req.method === "DELETE") {
      await prisma.campaign.delete({ where: { id } });
      res.json({ ok: true });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("[campaigns] id error:", err);
    res.status(500).json({ error: "campaign_failed" });
  }
}


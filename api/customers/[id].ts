import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_prisma";

export default async function customerById(req: VercelRequest, res: VercelResponse) {
  try {
    const id = typeof req.query.id === "string" ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : "";
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }

    if (req.method === "PATCH") {
      const body = (req.body ?? {}) as any;
      const data: any = {};
      if (typeof body.segment === "string") data.segment = body.segment;
      if (typeof body.notes === "string") data.notes = body.notes;
      if (typeof body.location === "string") data.location = body.location;
      if (typeof body.source === "string") data.source = body.source;
      if (typeof body.phone === "string") data.phone = body.phone;
      if (typeof body.email === "string") data.email = body.email;
      if (typeof body.name === "string") data.name = body.name;

      if (!Object.keys(data).length) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      const updated = await prisma.customer.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          location: true,
          source: true,
          segment: true,
          joinDate: true,
          notes: true,
          totalOrders: true,
          ltv: true,
          lastPurchase: true,
          favSku: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ customer: updated });
      return;
    }

    if (req.method === "DELETE") {
      await prisma.customer.delete({ where: { id } });
      res.json({ ok: true });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("[customers] id error:", err);
    res.status(500).json({ error: "customer_failed" });
  }
}


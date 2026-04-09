import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../_prisma";

export default async function orderById(req: VercelRequest, res: VercelResponse) {
  try {
    const id = typeof req.query.id === "string" ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : "";
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }

    if (req.method === "PATCH") {
      const body = (req.body ?? {}) as any;
      const status = typeof body.status === "string" ? body.status : undefined;
      const notes = typeof body.notes === "string" ? body.notes : undefined;

      if (!status && notes === undefined) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: status as any,
          notes: notes as any,
        },
        select: {
          id: true,
          externalId: true,
          customerName: true,
          items: true,
          total: true,
          currency: true,
          paymentMethod: true,
          source: true,
          status: true,
          orderDate: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ order: updated });
      return;
    }

    if (req.method === "DELETE") {
      await prisma.order.delete({ where: { id } });
      res.json({ ok: true });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("[orders] id error:", err);
    res.status(500).json({ error: "order_failed" });
  }
}


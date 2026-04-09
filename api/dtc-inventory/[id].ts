import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "../_prisma.js";

export default async function dtcInventoryById(req: VercelRequest, res: VercelResponse) {
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
      if (body.stock !== undefined) data.stock = Math.max(0, Math.round(Number(body.stock)));
      if (body.reorder !== undefined) data.reorder = Math.max(0, Math.round(Number(body.reorder)));
      if (body.velocity !== undefined) data.velocity = Math.max(0, Number(body.velocity));
      if (!Object.keys(data).length) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      const updated = await prisma.dtcInventoryItem.update({
        where: { id },
        data,
        select: { id: true, sku: true, stock: true, reorder: true, velocity: true, updatedAt: true },
      });
      res.json({ item: updated });
      return;
    }

    if (req.method === "DELETE") {
      await prisma.dtcInventoryItem.delete({ where: { id } });
      res.json({ ok: true });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("[dtc-inventory] id error:", err);
    res.status(500).json({ error: "dtc_inventory_item_failed" });
  }
}


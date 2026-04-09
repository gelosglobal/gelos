import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "./_prisma.js";
import { ensureOrg } from "./_ensureOrg.js";

export default async function dtcInventory(req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();

    const orgIdFromQuery = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
    const storeIdFromQuery = typeof req.query.storeId === "string" ? req.query.storeId : undefined;
    const org = await ensureOrg(prisma as any, orgIdFromQuery);

    if (req.method === "GET") {
      const items = await prisma.dtcInventoryItem.findMany({
        where: { orgId: org.id, storeId: storeIdFromQuery ?? null },
        orderBy: [{ sku: "asc" }],
        select: { id: true, sku: true, stock: true, reorder: true, velocity: true, updatedAt: true },
      });
      res.json({ orgId: org.id, items });
      return;
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as any;
      const sku = String(body.sku ?? "").trim();
      if (!sku) {
        res.status(400).json({ error: "sku_required" });
        return;
      }

      const stock = Number(body.stock ?? 0);
      const reorder = Number(body.reorder ?? 0);
      const velocity = Number(body.velocity ?? 0);

      const upserted = await prisma.dtcInventoryItem.upsert({
        where: {
          orgId_storeId_sku: { orgId: org.id, storeId: storeIdFromQuery ?? null, sku },
        },
        create: {
          orgId: org.id,
          storeId: storeIdFromQuery ?? null,
          sku,
          stock: Number.isFinite(stock) ? Math.max(0, Math.round(stock)) : 0,
          reorder: Number.isFinite(reorder) ? Math.max(0, Math.round(reorder)) : 0,
          velocity: Number.isFinite(velocity) ? Math.max(0, velocity) : 0,
        },
        update: {
          stock: Number.isFinite(stock) ? Math.max(0, Math.round(stock)) : undefined,
          reorder: Number.isFinite(reorder) ? Math.max(0, Math.round(reorder)) : undefined,
          velocity: Number.isFinite(velocity) ? Math.max(0, velocity) : undefined,
        },
        select: { id: true, sku: true, stock: true, reorder: true, velocity: true, updatedAt: true },
      });

      res.status(201).json({ item: upserted });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("[dtc-inventory] error:", err);
    res.status(500).json({ error: "dtc_inventory_failed" });
  }
}


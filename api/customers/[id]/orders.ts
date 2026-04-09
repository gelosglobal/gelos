import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "../../_prisma.js";

export default async function customerOrders(req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    const id = typeof req.query.id === "string" ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : "";
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, orgId: true, name: true } });
    if (!customer) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        orgId: customer.orgId,
        OR: [{ customerId: customer.id }, { customerName: customer.name }],
      },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        externalId: true,
        items: true,
        total: true,
        currency: true,
        paymentMethod: true,
        source: true,
        status: true,
        orderDate: true,
      },
    });

    res.json({ orders });
  } catch (err) {
    console.error("[customers] orders error:", err);
    res.status(500).json({
      error: "customer_orders_failed",
      detail: process.env.NODE_ENV !== "production" ? (err instanceof Error ? err.message : String(err)) : undefined,
    });
  }
}


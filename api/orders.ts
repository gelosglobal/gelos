import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "./_prisma";

export default async function orders(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const orgIdFromQuery = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
      const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
      const status = typeof req.query.status === "string" ? req.query.status : "";
      const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

      const org =
        orgIdFromQuery
          ? await prisma.organization.findUnique({ where: { id: orgIdFromQuery }, select: { id: true } })
          : await prisma.organization.findFirst({ select: { id: true } });

      if (!org) {
        res.json({ orgId: null, orders: [] });
        return;
      }

      const where: any = { orgId: org.id };
      if (status) where.status = status;
      if (q) {
        where.OR = [
          { customerName: { contains: q, mode: "insensitive" } },
          { externalId: { contains: q, mode: "insensitive" } },
        ];
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
        take: limit,
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

      res.json({ orgId: org.id, orders });
      return;
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as any;
      const orgIdFromQuery = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
      const org =
        orgIdFromQuery
          ? await prisma.organization.findUnique({ where: { id: orgIdFromQuery }, select: { id: true } })
          : await prisma.organization.findFirst({ select: { id: true } });

      if (!org) {
        res.status(400).json({ error: "no_org_configured" });
        return;
      }

      const customerName = String(body.customerName ?? "").trim();
      if (!customerName) {
        res.status(400).json({ error: "customer_name_required" });
        return;
      }

      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) {
        res.status(400).json({ error: "items_required" });
        return;
      }

      const total = Number(body.total ?? body.value ?? 0);
      if (!Number.isFinite(total) || total <= 0) {
        res.status(400).json({ error: "invalid_total" });
        return;
      }

      const orderDateStr = String(body.orderDate ?? body.date ?? "");
      const orderDate = orderDateStr ? new Date(orderDateStr) : new Date();
      if (Number.isNaN(orderDate.getTime())) {
        res.status(400).json({ error: "invalid_order_date" });
        return;
      }

      const created = await prisma.order.create({
        data: {
          orgId: org.id,
          storeId: typeof body.storeId === "string" ? body.storeId : null,
          externalId: typeof body.externalId === "string" && body.externalId.trim() ? body.externalId.trim() : null,
          status: typeof body.status === "string" ? body.status : "Pending",
          customerId: typeof body.customerId === "string" ? body.customerId : null,
          customerName,
          email: typeof body.email === "string" ? body.email : null,
          country: typeof body.country === "string" ? body.country : null,
          items,
          paymentMethod: String(body.paymentMethod ?? "Mobile Money"),
          source: String(body.source ?? "Website"),
          orderDate,
          notes: typeof body.notes === "string" ? body.notes : null,
          total,
          currency: typeof body.currency === "string" ? body.currency : null,
        } as any,
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

      res.status(201).json({ order: created });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("[orders] error:", err);
    res.status(500).json({ error: "orders_failed" });
  }
}


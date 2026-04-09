import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPrisma } from "./_prisma.js";

export default async function customers(req: VercelRequest, res: VercelResponse) {
  try {
    const prisma = getPrisma();
    if (req.method === "GET") {
      const orgIdFromQuery = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
      const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
      const segment = typeof req.query.segment === "string" ? req.query.segment : "";
      const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 200;
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

      const org =
        orgIdFromQuery
          ? await prisma.organization.findUnique({ where: { id: orgIdFromQuery }, select: { id: true } })
          : await prisma.organization.findFirst({ select: { id: true } });

      if (!org) {
        res.json({ orgId: null, customers: [] });
        return;
      }

      const where: any = { orgId: org.id };
      if (segment) where.segment = segment;
      if (q) {
        where.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ];
      }

      const customers = await prisma.customer.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: limit,
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

      res.json({ orgId: org.id, customers });
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

      const name = String(body.name ?? "").trim();
      if (!name) {
        res.status(400).json({ error: "name_required" });
        return;
      }

      const joinDateStr = String(body.joinDate ?? "");
      const joinDate = joinDateStr ? new Date(joinDateStr) : new Date();
      if (Number.isNaN(joinDate.getTime())) {
        res.status(400).json({ error: "invalid_join_date" });
        return;
      }

      const created = await prisma.customer.create({
        data: {
          orgId: org.id,
          name,
          phone: typeof body.phone === "string" ? body.phone : null,
          email: typeof body.email === "string" ? body.email : null,
          location: typeof body.location === "string" ? body.location : null,
          source: typeof body.source === "string" ? body.source : null,
          segment: typeof body.segment === "string" ? body.segment : "New",
          joinDate,
          notes: typeof body.notes === "string" ? body.notes : null,
        },
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

      res.status(201).json({ customer: created });
      return;
    }

    res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    console.error("[customers] error:", err);
    res.status(500).json({
      error: "customers_failed",
      detail: process.env.NODE_ENV !== "production" ? (err instanceof Error ? err.message : String(err)) : undefined,
    });
  }
}


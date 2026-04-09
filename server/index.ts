import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { getAuth, getCorsOrigins, getMongoClient } from "./auth-config";
import { prisma } from "./db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../dist");

const app = express();
const port = Number(process.env.PORT ?? process.env.AUTH_PORT ?? 3005);

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/**
 * better-call builds the Web Request URL from Host + proto. In dev, align with BETTER_AUTH_URL
 * (same Express port as the UI — no separate dev server).
 */
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "production") {
    const raw = process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3005";
    try {
      const u = new URL(raw);
      req.headers.host = u.host;
      req.headers["x-forwarded-proto"] = u.protocol.replace(":", "");
    } catch {
      /* keep incoming */
    }
    next();
    return;
  }
  const xf = req.headers["x-forwarded-host"];
  if (typeof xf === "string" && xf) {
    req.headers.host = xf.split(",")[0].trim();
  }
  const proto = req.headers["x-forwarded-proto"];
  if (typeof proto === "string" && proto) {
    req.headers["x-forwarded-proto"] = proto.split(",")[0].trim();
  }
  next();
});

app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
  }),
);

const authHandler = toNodeHandler(getAuth());
app.use((req, res, next) => {
  const pathOnly = (req.originalUrl ?? req.url ?? "/").split("?")[0] ?? "/";
  if (!pathOnly.startsWith("/api/auth")) {
    next();
    return;
  }
  Promise.resolve(authHandler(req, res)).catch(next);
});

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "gelos-os" });
});

function utcDayStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function classifyStorePlatform(platform: string | null | undefined): "dtc" | "sf" | "unknown" {
  const p = (platform ?? "").toLowerCase();
  if (!p) return "unknown";
  if (p.includes("sf") || p.includes("salesforce") || p.includes("sales force") || p.includes("field")) return "sf";
  if (p.includes("dtc") || p.includes("shopify") || p.includes("website") || p.includes("web")) return "dtc";
  return "unknown";
}

async function computeMasterSummary(orgId: string) {
  const now = new Date();
  const dayStart = utcDayStart(now);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fifteenAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const stores = await prisma.store.findMany({
    where: { orgId },
    select: { id: true, platform: true, name: true, currency: true },
  });
  const storeClass = new Map<string, "dtc" | "sf" | "unknown">(
    stores.map((s) => [s.id, classifyStorePlatform(s.platform)]),
  );

  const todayRollups = await prisma.kpiRollupMinute.findMany({
    where: { orgId, bucketTs: { gte: dayStart, lte: now } },
    select: { storeId: true, orders: true, revenue: true, refunds: true, checkoutsStarted: true, activeCheckouts: true, currency: true, bucketTs: true },
  });

  const sum = {
    orders: 0,
    revenue: 0,
    refunds: 0,
    checkoutsStarted: 0,
    activeCheckouts: 0,
  };
  const mix = {
    dtc: { orders: 0, revenue: 0 },
    sf: { orders: 0, revenue: 0 },
    unknown: { orders: 0, revenue: 0 },
  };

  for (const r of todayRollups) {
    sum.orders += r.orders ?? 0;
    sum.revenue += r.revenue ?? 0;
    sum.refunds += r.refunds ?? 0;
    sum.checkoutsStarted += r.checkoutsStarted ?? 0;
    // activeCheckouts is a gauge; use the latest bucket per store (handled below). Here we ignore.

    const cls = r.storeId ? (storeClass.get(r.storeId) ?? "unknown") : "unknown";
    mix[cls].orders += r.orders ?? 0;
    mix[cls].revenue += r.revenue ?? 0;
  }

  // Latest activeCheckouts (gauge) per store → sum
  const latestPerStore = await prisma.kpiRollupMinute.findMany({
    where: { orgId },
    orderBy: { bucketTs: "desc" },
    take: Math.min(Math.max(stores.length, 1) * 2, 50),
    select: { storeId: true, bucketTs: true, activeCheckouts: true },
  });
  const seen = new Set<string | null>();
  let activeCheckouts = 0;
  for (const r of latestPerStore) {
    const key = r.storeId ?? null;
    if (seen.has(key)) continue;
    seen.add(key);
    activeCheckouts += r.activeCheckouts ?? 0;
  }

  const lastHour = todayRollups.filter((r) => r.bucketTs >= hourAgo);
  const last15 = todayRollups.filter((r) => r.bucketTs >= fifteenAgo);

  const ordersLastHour = lastHour.reduce((s, r) => s + (r.orders ?? 0), 0);
  const revenueLastHour = lastHour.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const ordersLast15m = last15.reduce((s, r) => s + (r.orders ?? 0), 0);

  const revenuePerOrder = sum.orders ? sum.revenue / sum.orders : 0;
  const refundRate = sum.revenue ? sum.refunds / sum.revenue : 0;

  const alerts: { id: string; severity: "info" | "warn" | "critical"; title: string; message: string }[] = [];
  if (activeCheckouts >= 10) {
    alerts.push({
      id: "high_active_checkouts",
      severity: "warn",
      title: "High active checkouts",
      message: `${activeCheckouts} active checkouts — watch payment failures and support load.`,
    });
  }
  if (refundRate >= 0.08 && sum.refunds > 0) {
    alerts.push({
      id: "high_refund_rate",
      severity: "critical",
      title: "Refund rate elevated",
      message: `Refunds are ${(refundRate * 100).toFixed(1)}% of gross revenue today.`,
    });
  }
  if (ordersLast15m === 0 && sum.orders > 0) {
    alerts.push({
      id: "no_orders_15m",
      severity: "info",
      title: "Quiet window",
      message: "No paid orders in the last 15 minutes.",
    });
  }

  const currency =
    stores.find((s) => s.currency)?.currency ??
    todayRollups.find((r) => r.currency)?.currency ??
    null;

  return {
    asOf: now.toISOString(),
    kpis: {
      ...sum,
      activeCheckouts,
      currency,
    },
    mix: {
      dtc: mix.dtc,
      sf: mix.sf,
      unknown: mix.unknown,
      total: { orders: sum.orders, revenue: sum.revenue },
    },
    risk: {
      ordersLastHour,
      revenueLastHour,
      ordersLast15m,
      revenuePerOrder,
      refundRate,
    },
    alerts,
  };
}

app.get("/api/master/snapshot", async (req, res, next) => {
  try {
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

    const now = new Date();
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
      asOf: now.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/master/stream", async (req, res, next) => {
  try {
    const orgIdFromQuery = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
    const org =
      orgIdFromQuery
        ? await prisma.organization.findUnique({ where: { id: orgIdFromQuery }, select: { id: true } })
        : await prisma.organization.findFirst({ select: { id: true } });

    if (!org) {
      res.status(400).json({ error: "no_org_configured" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send("hello", { ok: true, orgId: org.id, ts: new Date().toISOString() });

    let lastTs = new Date(Date.now() - 60_000);
    let closed = false;

    req.on("close", () => {
      closed = true;
    });

    const tick = async () => {
      if (closed) return;

      const summary = await computeMasterSummary(org.id);
      send("summary", summary);

      const events = await prisma.liveEvent.findMany({
        where: { orgId: org.id, ts: { gt: lastTs } },
        orderBy: { ts: "asc" },
        take: 50,
        select: { id: true, kind: true, ts: true, title: true, message: true, data: true },
      });

      if (events.length) {
        lastTs = new Date(events[events.length - 1]!.ts);
        for (const e of events) send("live", e);
      }

      // keepalive
      res.write(": ping\n\n");
      setTimeout(tick, 2500);
    };

    tick().catch((err) => {
      if (!closed) {
        try {
          send("error", { message: err instanceof Error ? err.message : String(err) });
        } finally {
          res.end();
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/orders", async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

app.post("/api/orders", async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

app.patch("/api/orders/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
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
  } catch (err) {
    next(err);
  }
});

app.delete("/api/orders/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    await prisma.order.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/customers", async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

app.post("/api/customers", async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

app.patch("/api/customers/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
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
  } catch (err) {
    next(err);
  }
});

app.delete("/api/customers/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    await prisma.customer.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/customers/:id/orders", async (req, res, next) => {
  try {
    const id = req.params.id;
    const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, orgId: true, name: true } });
    if (!customer) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    // Prefer exact customerId match; fallback to name (for early data).
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
    next(err);
  }
});

const hasDist = fs.existsSync(path.join(distDir, "index.html"));
if (hasDist) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

async function main() {
  await getMongoClient().connect();
  app.listen(port, () => {
    const where = hasDist ? `+ static from dist/` : "(run pnpm run build, or pnpm dev for watch)";
    console.log(`[gelos] http://localhost:${port}  ${where}  MongoDB: connected`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

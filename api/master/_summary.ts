import { prisma } from "../_prisma";

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

export async function computeMasterSummary(orgId: string) {
  const now = new Date();
  const dayStart = utcDayStart(now);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fifteenAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const stores = await prisma.store.findMany({
    where: { orgId },
    select: { id: true, platform: true, currency: true },
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

    const cls = r.storeId ? (storeClass.get(r.storeId) ?? "unknown") : "unknown";
    mix[cls].orders += r.orders ?? 0;
    mix[cls].revenue += r.revenue ?? 0;
  }

  // Latest activeCheckouts per store → sum
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
    kpis: { ...sum, activeCheckouts, currency },
    mix: {
      dtc: mix.dtc,
      sf: mix.sf,
      unknown: mix.unknown,
      total: { orders: sum.orders, revenue: sum.revenue },
    },
    risk: { ordersLastHour, revenueLastHour, ordersLast15m, revenuePerOrder, refundRate },
    alerts,
  };
}


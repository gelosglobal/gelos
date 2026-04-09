import { prisma } from "../db";
import type { LiveEventKind, OrderStatus, Prisma } from "@prisma/client";

function minuteBucketStart(ts: Date): Date {
  return new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate(), ts.getUTCHours(), ts.getUTCMinutes(), 0, 0));
}

type BaseCtx = {
  orgId: string;
  storeId?: string | null;
  country?: string | null;
  currency?: string | null;
};

type OrderLike = BaseCtx & {
  orderId: string;
  externalId?: string | null;
  total: number;
  status?: OrderStatus;
  ts: Date;
};

async function writeLiveEvent(input: BaseCtx & {
  kind: LiveEventKind;
  ts: Date;
  title?: string;
  message?: string;
  orderId?: string;
  data?: Prisma.InputJsonObject;
}) {
  await prisma.liveEvent.create({
    data: {
      orgId: input.orgId,
      storeId: input.storeId ?? null,
      kind: input.kind,
      ts: input.ts,
      title: input.title ?? null,
      message: input.message ?? null,
      orderId: input.orderId ?? null,
      data: input.data ?? undefined,
    },
  });
}

async function bumpMinuteRollup(input: BaseCtx & {
  ts: Date;
  delta: {
    orders?: number;
    revenue?: number;
    refunds?: number;
    checkoutsStarted?: number;
    activeCheckouts?: number;
  };
}) {
  const bucketTs = minuteBucketStart(input.ts);

  await prisma.kpiRollupMinute.upsert({
    where: {
      orgId_storeId_bucketTs_country: {
        orgId: input.orgId,
        storeId: input.storeId ?? null,
        bucketTs,
        country: input.country ?? null,
      },
    },
    create: {
      orgId: input.orgId,
      storeId: input.storeId ?? null,
      country: input.country ?? null,
      bucketTs,
      currency: input.currency ?? null,
      orders: input.delta.orders ?? 0,
      revenue: input.delta.revenue ?? 0,
      refunds: input.delta.refunds ?? 0,
      checkoutsStarted: input.delta.checkoutsStarted ?? 0,
      activeCheckouts: input.delta.activeCheckouts ?? 0,
    },
    update: {
      currency: input.currency ?? undefined,
      orders: input.delta.orders ? { increment: input.delta.orders } : undefined,
      revenue: input.delta.revenue ? { increment: input.delta.revenue } : undefined,
      refunds: input.delta.refunds ? { increment: input.delta.refunds } : undefined,
      checkoutsStarted: input.delta.checkoutsStarted ? { increment: input.delta.checkoutsStarted } : undefined,
      activeCheckouts: input.delta.activeCheckouts ? { increment: input.delta.activeCheckouts } : undefined,
    },
  });
}

export async function recordOrderPaid(input: OrderLike) {
  await writeLiveEvent({
    orgId: input.orgId,
    storeId: input.storeId,
    kind: "ORDER_PAID",
    ts: input.ts,
    title: "Order paid",
    message: input.externalId ? `Order ${input.externalId} paid` : "Order paid",
    orderId: input.orderId,
    data: {
      total: input.total,
      currency: input.currency,
      country: input.country,
    },
  });

  await bumpMinuteRollup({
    orgId: input.orgId,
    storeId: input.storeId,
    country: input.country,
    currency: input.currency,
    ts: input.ts,
    delta: { orders: 1, revenue: input.total },
  });
}

export async function recordOrderRefunded(input: OrderLike & { refundAmount: number }) {
  await writeLiveEvent({
    orgId: input.orgId,
    storeId: input.storeId,
    kind: "ORDER_REFUNDED",
    ts: input.ts,
    title: "Order refunded",
    message: input.externalId ? `Order ${input.externalId} refunded` : "Order refunded",
    orderId: input.orderId,
    data: {
      refundAmount: input.refundAmount,
      currency: input.currency,
      country: input.country,
    },
  });

  await bumpMinuteRollup({
    orgId: input.orgId,
    storeId: input.storeId,
    country: input.country,
    currency: input.currency,
    ts: input.ts,
    delta: { refunds: input.refundAmount },
  });
}

export async function recordCheckoutStarted(input: BaseCtx & { sessionId: string; ts: Date; step?: string | null; email?: string | null }) {
  await prisma.checkoutEvent.create({
    data: {
      orgId: input.orgId,
      storeId: input.storeId ?? null,
      sessionId: input.sessionId,
      email: input.email ?? null,
      country: input.country ?? null,
      ts: input.ts,
      step: input.step ?? null,
    },
  });

  await writeLiveEvent({
    orgId: input.orgId,
    storeId: input.storeId,
    kind: "CHECKOUT_STARTED",
    ts: input.ts,
    title: "Checkout started",
    message: input.country ? `Checkout started (${input.country})` : "Checkout started",
    data: {
      sessionId: input.sessionId,
      step: input.step,
      country: input.country,
    },
  });

  await bumpMinuteRollup({
    orgId: input.orgId,
    storeId: input.storeId,
    country: input.country,
    currency: input.currency,
    ts: input.ts,
    delta: { checkoutsStarted: 1, activeCheckouts: 1 },
  });
}

export async function recordCheckoutResolved(input: BaseCtx & { ts: Date; sessionId: string }) {
  // Keep this simple: decrement active checkouts for the minute the resolution happens.
  // If you want strict correctness, track active sessions separately.
  await bumpMinuteRollup({
    orgId: input.orgId,
    storeId: input.storeId,
    country: input.country,
    currency: input.currency,
    ts: input.ts,
    delta: { activeCheckouts: -1 },
  });

  await writeLiveEvent({
    orgId: input.orgId,
    storeId: input.storeId,
    kind: "ALERT",
    ts: input.ts,
    title: "Checkout resolved",
    message: "Checkout completed or timed out",
    data: { sessionId: input.sessionId },
  });
}


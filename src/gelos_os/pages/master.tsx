import { C } from "../constants";
import { fmtGHS, getProd, pctOf } from "../lib";
import { S } from "../styles";
import { AIBox, Badge } from "../ui";
import { useEffect, useMemo, useRef, useState } from "react";

/** Local layout tokens — master dashboard only */
const M = {
  page: { display: "flex", flexDirection: "column" as const, gap: 24, maxWidth: 1280 },
  hero: {
    background: "linear-gradient(145deg, #f8fafc 0%, #ffffff 42%, #f3f6fb 100%)",
    borderRadius: 16,
    padding: "26px 30px",
    border: "1px solid #e4eaf1",
    boxShadow: "0 4px 28px rgba(26, 60, 94, 0.07)",
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  heroTitle: { margin: 0, fontSize: "1.5rem", fontWeight: 800, color: C.primary, letterSpacing: -0.3 },
  heroSub: { margin: "8px 0 0", fontSize: ".95rem", color: "#64748b", lineHeight: 1.55, maxWidth: 460 },
  pill: {
    fontSize: ".82rem",
    fontWeight: 700,
    color: C.primary,
    background: "rgba(26, 60, 94, 0.08)",
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid rgba(26, 60, 94, 0.12)",
    whiteSpace: "nowrap" as const,
  },
  sectionLabel: (color: string) => ({
    fontSize: ".8rem",
    fontWeight: 800,
    letterSpacing: 1.1,
    color,
    marginBottom: 12,
    textTransform: "uppercase" as const,
  }),
  kpiBig: (accent: string) => ({
    background: "#fff",
    borderRadius: 12,
    padding: "16px 18px",
    border: "1px solid #eef2f6",
    boxShadow: "0 2px 12px rgba(0,0,0,.04)",
    borderLeft: `4px solid ${accent}`,
    minHeight: 108,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
  }),
  kpiBigLabel: { fontSize: ".8rem", color: "#64748b", fontWeight: 600, marginBottom: 6 },
  kpiBigValue: { fontSize: "1.65rem", fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.15 },
  kpiBigHint: { fontSize: ".78rem", color: "#94a3b8", marginTop: 8 },
  statSmall: (accent: string) => ({
    ...S.statCard(accent),
    padding: "14px 16px",
    transition: "box-shadow .15s",
  }),
  mixCard: {
    ...S.card,
    padding: 0,
    marginBottom: 0,
    overflow: "hidden" as const,
  },
  mixInner: { padding: "18px 20px 20px" },
  mixBar: {
    display: "flex",
    height: 42,
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,.06)",
  },
  mixLegend: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 16,
    marginTop: 14,
    fontSize: ".88rem",
  },
  alertPanel: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #fde8e8",
    boxShadow: "0 2px 12px rgba(231, 76, 60, 0.06)",
    overflow: "hidden" as const,
  },
  alertPanelHead: {
    padding: "14px 18px",
    background: "linear-gradient(90deg, #fff5f5 0%, #fff 100%)",
    borderBottom: "1px solid #fce8e8",
    fontSize: ".9rem",
    fontWeight: 800,
    color: C.danger,
  },
  tableWrap: { overflowX: "auto" as const },
  trAlt: (i: number) => ({ background: i % 2 === 0 ? "#fff" : "#fafbfd" }),
};

export function MasterDashboard({ data }: { data: any }) {
  const delivered = data.orders.filter((o: any) => o.status === "Delivered");
  const dtcRev = delivered.reduce((s: number, o: any) => s + o.value, 0);
  const b2bCollected = data.b2bPayments.reduce((s: number, p: any) => s + p.paid, 0);
  const b2bOutstanding = data.b2bPayments.reduce((s: number, p: any) => s + (p.amount - p.paid), 0);
  const totalRev = dtcRev + b2bCollected;
  const lowDTC = data.dtcInventory.filter((i: any) => i.stock <= i.reorder);
  const lowSF = data.sfInventory.filter((i: any) => i.stock <= i.reorder);
  const overdue = data.b2bPayments.filter((p: any) => p.status === "Overdue");
  const churn = data.customers.filter((c: any) => c.segment === "Churn Risk");
  const totalSpend = data.campaigns.reduce((s: number, c: any) => s + c.spend, 0);
  const roas = totalSpend ? Math.round((dtcRev / totalSpend) * 100) / 100 : 0;
  const sfContrib = totalRev ? Math.round((b2bCollected / totalRev) * 100) : 0;
  const dtcShare = pctOf(dtcRev, totalRev);
  const sfShare = pctOf(b2bCollected, totalRev);
  const alertCount = lowDTC.length + overdue.length + lowSF.length;
  const now = new Date();

  const secondaryStats: [string, string | number, string, string][] = [
    ["ROAS", roas + "×", "on marketing spend", C.teal],
    ["SF share", sfContrib + "%", "of total revenue", C.sfBlue],
    ["DTC low stock", lowDTC.length, "SKUs below reorder", C.warn],
    ["SF low stock", lowSF.length, "SKU lines", C.warn],
    ["Churn risk", churn.length, "DTC customers", C.danger],
    ["B2B outstanding", fmtGHS(b2bOutstanding), overdue.length + " overdue", C.danger],
  ];

  return (
    <div style={M.page}>
      <header style={M.hero}>
        <div>
          <h1 style={M.heroTitle}>Command center</h1>
          <p style={M.heroSub}>
            One view across DTC sell-out and field sales. Track revenue health, channel mix, and what needs attention today.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span style={M.pill}>
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
          <span style={{ fontSize: ".84rem", color: "#94a3b8", fontWeight: 600 }}>
            {alertCount > 0 ? `${alertCount} active alerts` : "All clear — no critical stock or payment alerts"}
          </span>
        </div>
      </header>

      <section>
        <div style={M.sectionLabel(C.primary)}>Revenue</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div style={M.kpiBig(C.primary)}>
            <div>
              <div style={M.kpiBigLabel}>Total revenue</div>
              <div style={{ ...M.kpiBigValue, color: C.primary }}>{fmtGHS(totalRev)}</div>
            </div>
            <div style={M.kpiBigHint}>DTC delivered + B2B collected</div>
          </div>
          <div style={M.kpiBig(C.purple)}>
            <div>
              <div style={M.kpiBigLabel}>DTC (delivered)</div>
              <div style={{ ...M.kpiBigValue, color: C.purple }}>{fmtGHS(dtcRev)}</div>
            </div>
            <div style={M.kpiBigHint}>{pctOf(dtcRev, totalRev)}% of mix</div>
          </div>
          <div style={M.kpiBig(C.sfBlue)}>
            <div>
              <div style={M.kpiBigLabel}>B2B collected</div>
              <div style={{ ...M.kpiBigValue, color: C.sfBlue }}>{fmtGHS(b2bCollected)}</div>
            </div>
            <div style={M.kpiBigHint}>{pctOf(b2bCollected, totalRev)}% of mix</div>
          </div>
        </div>
      </section>

      <section>
        <div style={M.sectionLabel("#64748b")}>Performance & risk</div>
        <div style={{ ...S.statGrid, gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 12 }}>
          {secondaryStats.map(([l, v, s, c]) => (
            <div key={String(l)} style={M.statSmall(c)}>
              <div style={{ fontSize: ".8rem", color: "#64748b", fontWeight: 600, marginBottom: 5 }}>{l}</div>
              <div style={{ fontSize: "1.22rem", fontWeight: 900, color: c }}>{v}</div>
              <div style={{ fontSize: ".74rem", color: "#94a3b8", marginTop: 5 }}>{s}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={M.mixCard}>
        <div style={{ ...S.cardHeader(C.primary), borderLeft: `4px solid ${C.primary}` }}>
          <span style={{ fontWeight: 800, color: C.primary, fontSize: ".95rem" }}>Revenue mix — DTC vs Sales Force</span>
        </div>
        <div style={M.mixInner}>
          {totalRev > 0 ? (
            <>
              <div style={M.mixBar}>
                <div
                  title={`DTC ${dtcShare}%`}
                  style={{
                    flex: dtcRev > 0 ? dtcRev : 0,
                    minWidth: dtcRev > 0 ? 64 : 0,
                    background: `linear-gradient(180deg, ${C.purple} 0%, #7c4fd4 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: ".82rem",
                    fontWeight: 800,
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0,0,0,.2)",
                  }}
                >
                  {dtcRev > 0 ? `DTC ${dtcShare}%` : ""}
                </div>
                <div
                  title={`SF ${sfShare}%`}
                  style={{
                    flex: b2bCollected > 0 ? b2bCollected : 0,
                    minWidth: b2bCollected > 0 ? 64 : 0,
                    background: `linear-gradient(180deg, ${C.sfBlue} 0%, #3d8fd4 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: ".82rem",
                    fontWeight: 800,
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0,0,0,.2)",
                  }}
                >
                  {b2bCollected > 0 ? `SF ${sfShare}%` : ""}
                </div>
              </div>
              <div style={M.mixLegend}>
                <span>
                  <b style={{ color: C.purple }}>●</b> DTC {fmtGHS(dtcRev)} · {dtcShare}%
                </span>
                <span>
                  <b style={{ color: C.sfBlue }}>●</b> SF {fmtGHS(b2bCollected)} · {sfShare}%
                </span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: ".85rem", padding: "12px 0" }}>
              No revenue recorded yet — orders and collections will appear here.
            </div>
          )}
        </div>
      </section>

      {(lowDTC.length > 0 || overdue.length > 0 || lowSF.length > 0) && (
        <section style={M.alertPanel}>
          <div style={M.alertPanelHead}>Needs attention</div>
          <div style={{ padding: "12px 14px 14px" }}>
            {lowDTC.map((i: any) => {
              const p = getProd(i.sku);
              const days = i.velocity ? Math.round(i.stock / i.velocity) : "—";
              return (
                <div key={i.sku} style={{ ...S.alert(C.danger), marginBottom: 8 }}>
                  <b>DTC stock</b> · {p.name} — {i.stock} units left (~{days}d at current velocity)
                </div>
              );
            })}
            {lowSF.map((i: any) => (
              <div key={i.id} style={{ ...S.alert(C.warn), marginBottom: 8 }}>
                <b>Field stock</b> · {i.product} — {i.stock} {i.unit}
              </div>
            ))}
            {overdue.map((p: any) => (
              <div key={p.id} style={{ ...S.alert(C.danger), marginBottom: 8 }}>
                <b>B2B overdue</b> · {p.outlet} — {p.invoice} · {fmtGHS(p.amount - p.paid)} due
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div style={M.sectionLabel(C.primary)}>Latest activity</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          <div style={{ ...S.card, marginBottom: 0 }}>
            <div style={S.cardHeader(C.purple)}>
              <span style={{ fontWeight: 800, color: C.purple, fontSize: ".83rem" }}>Recent DTC orders</span>
            </div>
            <div style={M.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Customer", "Value", "Status", "Date"].map((h) => (
                      <th key={h} style={S.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.orders.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                        No orders yet
                      </td>
                    </tr>
                  ) : (
                    data.orders
                      .slice()
                      .reverse()
                      .slice(0, 5)
                      .map((o: any, i: number) => (
                        <tr key={o.id} style={M.trAlt(i)}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{o.customerName}</td>
                          <td style={{ ...S.td, fontWeight: 800, color: C.success }}>{fmtGHS(o.value)}</td>
                          <td style={S.td}>
                            <Badge s={o.status} />
                          </td>
                          <td style={{ ...S.td, color: "#64748b", fontSize: ".76rem" }}>{o.date}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ ...S.card, marginBottom: 0 }}>
            <div style={S.cardHeader(C.sfBlue)}>
              <span style={{ fontWeight: 800, color: C.sfBlue, fontSize: ".83rem" }}>Recent field visits</span>
            </div>
            <div style={M.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Outlet", "Rep", "Purpose", "Status"].map((h) => (
                      <th key={h} style={S.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.visits.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                        No visits logged
                      </td>
                    </tr>
                  ) : (
                    data.visits
                      .slice()
                      .reverse()
                      .slice(0, 5)
                      .map((v: any, i: number) => (
                        <tr key={v.id} style={M.trAlt(i)}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{v.outlet}</td>
                          <td style={{ ...S.td, color: "#64748b" }}>{v.rep}</td>
                          <td style={S.td}>{v.purpose}</td>
                          <td style={S.td}>
                            <Badge s={v.status} />
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <AIBox
        context={{
          dtcRevenue: dtcRev,
          b2bCollected,
          b2bOutstanding,
          sfContrib,
          lowDTCCount: lowDTC.length,
          overdue: overdue.length,
          churnRisk: churn.length,
          roas,
        }}
        placeholder="Ask anything: e.g. biggest revenue risk this week, or how DTC vs SF are trending"
        color={C.teal}
      />
    </div>
  );
}

type LiveKpis = {
  orders: number;
  revenue: number;
  refunds: number;
  checkoutsStarted: number;
  activeCheckouts: number;
  currency?: string | null;
};

type LiveEventRow = {
  id: string;
  kind: string;
  ts: string;
  title: string | null;
  message: string | null;
  data?: unknown;
};

type LiveSummary = {
  asOf: string;
  kpis: LiveKpis;
  mix: {
    dtc: { orders: number; revenue: number };
    sf: { orders: number; revenue: number };
    unknown: { orders: number; revenue: number };
    total: { orders: number; revenue: number };
  };
  risk: {
    ordersLastHour: number;
    revenueLastHour: number;
    ordersLast15m: number;
    revenuePerOrder: number;
    refundRate: number;
  };
  alerts: { id: string; severity: "info" | "warn" | "critical"; title: string; message: string }[];
};

type MasterSnapshot = {
  orgId: string | null;
  orgName: string | null;
  summary: LiveSummary;
  recentEvents: LiveEventRow[];
  asOf: string;
};

function fmtMoney(n: number) {
  return fmtGHS(n);
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function MasterDashboardLive({ data }: { data?: any }) {
  const [snap, setSnap] = useState<MasterSnapshot | null>(null);
  const [streamOk, setStreamOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const summary = snap?.summary;
  const kpis = summary?.kpis;
  const events = snap?.recentEvents ?? [];

  const cards = useMemo(() => {
    const revenue = kpis?.revenue ?? 0;
    const refunds = kpis?.refunds ?? 0;
    return [
      { label: "Revenue (today)", value: fmtMoney(revenue), accent: C.primary, hint: "Gross (Order.total)" },
      { label: "Orders (today)", value: String(kpis?.orders ?? 0), accent: C.purple, hint: "Paid orders counted in rollups" },
      { label: "Refunds (today)", value: fmtMoney(refunds), accent: C.danger, hint: "Track net as revenue − refunds" },
      { label: "Active checkouts", value: String(kpis?.activeCheckouts ?? 0), accent: C.teal, hint: "Live gauge (best-effort)" },
    ] as const;
  }, [kpis]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const r = await fetch("/api/master/snapshot", { credentials: "include" });
        const d = (await r.json()) as MasterSnapshot;
        if (!cancelled) setSnap(d);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!snap?.orgId) return;
    if (esRef.current) esRef.current.close();

    setStreamOk(false);
    const es = new EventSource(`/api/master/stream?orgId=${encodeURIComponent(snap.orgId)}`, { withCredentials: true } as any);
    esRef.current = es;

    const onHello = (ev: MessageEvent) => {
      setStreamOk(true);
      try {
        const d = JSON.parse(ev.data);
        if (d?.orgId && d.orgId !== snap.orgId) {
          // ignore
        }
      } catch {
        // ignore
      }
    };

    const onLive = (ev: MessageEvent) => {
      try {
        const row = JSON.parse(ev.data) as LiveEventRow;
        setSnap((s) => {
          if (!s) return s;
          const next = [row, ...s.recentEvents].slice(0, 40);
          return { ...s, recentEvents: next, asOf: new Date().toISOString() };
        });
      } catch {
        // ignore
      }
    };

    const onSummary = (ev: MessageEvent) => {
      try {
        const d = JSON.parse(ev.data) as LiveSummary;
        setSnap((s) => (s ? { ...s, summary: d, asOf: new Date().toISOString() } : s));
      } catch {
        // ignore
      }
    };

    const onError = () => setStreamOk(false);

    es.addEventListener("hello", onHello as any);
    es.addEventListener("live", onLive as any);
    es.addEventListener("summary", onSummary as any);
    es.onerror = onError;

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [snap?.orgId]);

  const now = new Date();
  const dtcRev = summary?.mix.dtc.revenue ?? 0;
  const sfRev = summary?.mix.sf.revenue ?? 0;
  const totalRev = summary?.mix.total.revenue ?? 0;
  const dtcShare = pctOf(dtcRev, totalRev);
  const sfShare = pctOf(sfRev, totalRev);

  return (
    <div style={M.page}>
      <header style={M.hero}>
        <div>
          <h1 style={M.heroTitle}>Command center (Live)</h1>
          <p style={M.heroSub}>
            Realtime sales KPIs and ops activity. This view updates automatically as new orders, refunds, and checkouts arrive.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span style={M.pill}>
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
          <span style={{ fontSize: ".84rem", color: "#94a3b8", fontWeight: 600 }}>
            {snap?.orgName ? `${snap.orgName} · ` : ""}
            {streamOk ? "Live connected" : "Connecting…"}
            {snap?.asOf ? ` · updated ${timeAgo(snap.asOf)}` : ""}
          </span>
        </div>
      </header>

      {err && (
        <section style={{ ...S.card, borderLeft: `4px solid ${C.danger}`, marginBottom: 0 }}>
          <div style={{ fontWeight: 800, color: C.danger, marginBottom: 6 }}>Couldn’t load live data</div>
          <div style={{ color: "#64748b", fontSize: ".9rem" }}>{err}</div>
        </section>
      )}

      <section>
        <div style={M.sectionLabel(C.primary)}>Today</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {cards.map((c) => (
            <div key={c.label} style={M.kpiBig(c.accent)}>
              <div>
                <div style={M.kpiBigLabel}>{c.label}</div>
                <div style={{ ...M.kpiBigValue, color: c.accent }}>{c.value}</div>
              </div>
              <div style={M.kpiBigHint}>{c.hint}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...S.card, marginBottom: 0 }}>
        <div style={S.cardHeader(C.primary)}>
          <span style={{ fontWeight: 800, color: C.primary, fontSize: ".9rem" }}>Live feed</span>
        </div>
        <div style={{ padding: "14px 16px" }}>
          {events.length === 0 ? (
            <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: ".9rem" }}>
              No live events yet. When you start calling `recordOrderPaid()` / `recordCheckoutStarted()` on the server, they’ll appear here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {events.slice(0, 20).map((e) => (
                <div key={e.id} style={{ ...S.alert(C.primary), display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>
                      {e.title || e.kind}
                      <span style={{ marginLeft: 8, color: "#64748b", fontWeight: 600, fontSize: ".8rem" }}>
                        {new Date(e.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {e.message && <div style={{ color: "#64748b", fontSize: ".86rem", marginTop: 2 }}>{e.message}</div>}
                  </div>
                  <span style={{ fontSize: ".74rem", color: "#94a3b8", fontWeight: 700, whiteSpace: "nowrap" }}>{timeAgo(e.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div style={M.sectionLabel("#64748b")}>Performance &amp; risk</div>
        <div style={{ ...S.statGrid, gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 12 }}>
          {[
            ["Orders (last hr)", summary ? String(summary.risk.ordersLastHour) : "—", "momentum signal", C.primary],
            ["Revenue (last hr)", summary ? fmtMoney(summary.risk.revenueLastHour) : "—", "gross in last 60m", C.teal],
            ["AOV (today)", summary ? fmtMoney(summary.risk.revenuePerOrder) : "—", "avg order value", C.purple],
            ["Refund rate", summary ? `${(summary.risk.refundRate * 100).toFixed(1)}%` : "—", "refunds / gross", C.danger],
            ["Orders (last 15m)", summary ? String(summary.risk.ordersLast15m) : "—", "short-window pulse", C.sfBlue],
            ["Checkouts started", summary ? String(summary.kpis.checkoutsStarted) : "—", "today", C.warn],
          ].map(([l, v, s, c]) => (
            <div key={String(l)} style={M.statSmall(String(c))}>
              <div style={{ fontSize: ".8rem", color: "#64748b", fontWeight: 600, marginBottom: 5 }}>{l}</div>
              <div style={{ fontSize: "1.22rem", fontWeight: 900, color: String(c) }}>{v as any}</div>
              <div style={{ fontSize: ".74rem", color: "#94a3b8", marginTop: 5 }}>{s}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={M.mixCard}>
        <div style={{ ...S.cardHeader(C.primary), borderLeft: `4px solid ${C.primary}` }}>
          <span style={{ fontWeight: 800, color: C.primary, fontSize: ".95rem" }}>Revenue mix — DTC vs Sales Force</span>
        </div>
        <div style={M.mixInner}>
          {totalRev > 0 ? (
            <>
              <div style={M.mixBar}>
                <div
                  title={`DTC ${dtcShare}%`}
                  style={{
                    flex: dtcRev > 0 ? dtcRev : 0,
                    minWidth: dtcRev > 0 ? 64 : 0,
                    background: `linear-gradient(180deg, ${C.purple} 0%, #7c4fd4 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: ".82rem",
                    fontWeight: 800,
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0,0,0,.2)",
                  }}
                >
                  {dtcRev > 0 ? `DTC ${dtcShare}%` : ""}
                </div>
                <div
                  title={`SF ${sfShare}%`}
                  style={{
                    flex: sfRev > 0 ? sfRev : 0,
                    minWidth: sfRev > 0 ? 64 : 0,
                    background: `linear-gradient(180deg, ${C.sfBlue} 0%, #3d8fd4 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: ".82rem",
                    fontWeight: 800,
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0,0,0,.2)",
                  }}
                >
                  {sfRev > 0 ? `SF ${sfShare}%` : ""}
                </div>
              </div>
              <div style={M.mixLegend}>
                <span>
                  <b style={{ color: C.purple }}>●</b> DTC {fmtMoney(dtcRev)} · {dtcShare}%
                </span>
                <span>
                  <b style={{ color: C.sfBlue }}>●</b> SF {fmtMoney(sfRev)} · {sfShare}%
                </span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: ".85rem", padding: "12px 0" }}>
              No revenue recorded yet — as events arrive this mix will update live.
            </div>
          )}
        </div>
      </section>

      <section style={M.alertPanel}>
        <div style={M.alertPanelHead}>Needs attention</div>
        <div style={{ padding: "12px 14px 14px" }}>
          {summary?.alerts?.length ? (
            summary.alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  ...S.alert(a.severity === "critical" ? C.danger : a.severity === "warn" ? C.warn : C.primary),
                  marginBottom: 8,
                }}
              >
                <b>{a.title}</b> · {a.message}
              </div>
            ))
          ) : (
            <div style={{ color: "#94a3b8", fontWeight: 650 }}>All clear — no live alerts right now.</div>
          )}
        </div>
      </section>

      <section>
        <div style={M.sectionLabel(C.primary)}>Latest activity</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          <div style={{ ...S.card, marginBottom: 0 }}>
            <div style={S.cardHeader(C.purple)}>
              <span style={{ fontWeight: 800, color: C.purple, fontSize: ".83rem" }}>Recent DTC orders</span>
            </div>
            <div style={M.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Customer", "Value", "Status", "Date"].map((h) => (
                      <th key={h} style={S.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.filter((e) => String(e.kind).includes("ORDER")).length ? (
                    events
                      .filter((e) => String(e.kind).includes("ORDER"))
                      .slice(0, 5)
                      .map((o, i) => (
                        <tr key={o.id} style={M.trAlt(i)}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{o.title || o.kind}</td>
                          <td style={{ ...S.td, fontWeight: 800, color: C.success }}>
                            {(o as any)?.data?.total ? fmtMoney(Number((o as any).data.total)) : "—"}
                          </td>
                          <td style={S.td}>
                            <Badge s={String(o.kind).replace("ORDER_", "")} />
                          </td>
                          <td style={{ ...S.td, color: "#64748b", fontSize: ".76rem" }}>
                            {new Date(o.ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                        Recent order events will appear here
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ ...S.card, marginBottom: 0 }}>
            <div style={S.cardHeader(C.sfBlue)}>
              <span style={{ fontWeight: 800, color: C.sfBlue, fontSize: ".83rem" }}>Recent field visits</span>
            </div>
            <div style={M.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Outlet", "Rep", "Purpose", "Status"].map((h) => (
                      <th key={h} style={S.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.filter((e) => String(e.kind).includes("INTEGRATION") || String(e.kind).includes("ALERT")).length ? (
                    events
                      .filter((e) => String(e.kind).includes("INTEGRATION") || String(e.kind).includes("ALERT"))
                      .slice(0, 5)
                      .map((v, i) => (
                        <tr key={v.id} style={M.trAlt(i)}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{v.title || v.kind}</td>
                          <td style={{ ...S.td, color: "#64748b" }}>{(v as any)?.data?.source || "—"}</td>
                          <td style={S.td}>{v.message || "—"}</td>
                          <td style={S.td}>
                            <Badge s={String(v.kind)} />
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                        Ops + integration events will appear here
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <AIBox
        context={{
          orgName: snap?.orgName ?? null,
          summary,
          recentEvents: events.slice(0, 15),
          streamOk,
        }}
        placeholder="AI Insights: e.g. what changed in the last 30 minutes, or what’s the biggest ops risk right now?"
        color={C.teal}
      />
    </div>
  );
}

import { C } from "../constants";
import { fmtGHS, getProd, pctOf } from "../lib";
import { S } from "../styles";
import { AIBox, Badge } from "../ui";

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

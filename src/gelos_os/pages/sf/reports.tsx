import { useState } from "react";
import { B2B_PAY_STATUSES, C, REPS } from "../../constants";
import { bc, filterByTime, fmtGHS, pctOf } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, ProgressBar, TimeFilter } from "../../ui";

export function Reports({ data }: any) {
  const [tab, setTab] = useState("rep");
  const [tf, setTf] = useState("Monthly");
  const visits = filterByTime(data.visits, tf);
  const payments = filterByTime(data.b2bPayments, tf, "date");
  const dtcRevenue = data.orders.filter((o: any) => o.status === "Delivered").reduce((s: number, o: any) => s + o.value, 0);
  const b2bCollected = payments.reduce((s: number, p: any) => s + p.paid, 0);
  const b2bInvoiced = payments.reduce((s: number, p: any) => s + p.amount, 0);
  const b2bOutstanding = b2bInvoiced - b2bCollected;

  const repStats = REPS.map((r) => {
    const repVisits = visits.filter((v: any) => v.rep === r);
    const repPay = payments.filter((p: any) => p.rep === r);
    const repColl = repPay.reduce((s: number, p: any) => s + p.paid, 0);
    const repInv = repPay.reduce((s: number, p: any) => s + p.amount, 0);
    const repOutlets = data.outlets.filter((o: any) => o.rep === r).length;
    const target = data.targets.find((t: any) => t.rep === r);
    const attain = target ? pctOf(repColl, target.monthlyTarget) : 0;
    const collRate = repInv ? pctOf(repColl, repInv) : 0;
    return {
      r,
      visits: repVisits.length,
      completed: repVisits.filter((v: any) => v.status === "Completed").length,
      outlets: repOutlets,
      collected: repColl,
      invoiced: repInv,
      collRate,
      attain,
      target: target?.monthlyTarget || 0,
    };
  }).sort((a: any, b: any) => b.collected - a.collected);

  const outletStats = data.outlets
    .map((o: any) => {
      const outPay = payments.filter((p: any) => p.outlet === o.name);
      const outVisits = visits.filter((v: any) => v.outlet === o.name);
      return {
        ...o,
        revenue: outPay.reduce((s: number, p: any) => s + p.paid, 0),
        balance: outPay.reduce((s: number, p: any) => s + (p.amount - p.paid), 0),
        visits: outVisits.length,
      };
    })
    .sort((a: any, b: any) => b.revenue - a.revenue);

  const TABS: [string, string][] = [
    ["rep", "Rep Performance"],
    ["outlet", "Outlet Report"],
    ["field", "Field vs DTC"],
    ["collection", "Collection Report"],
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "6px 14px",
              border: `1px solid ${tab === id ? C.sfBlue : "#dde3ea"}`,
              borderRadius: 6,
              fontSize: ".78rem",
              cursor: "pointer",
              fontWeight: tab === id ? 700 : 400,
              background: tab === id ? "#e8f0fe" : "#fff",
              color: tab === id ? C.sfBlue : "#555",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <TimeFilter value={tf} onChange={setTf} />

      {tab === "rep" && (
        <div style={S.card}>
          <div style={S.cardHeader(C.sfBlue)}>
            <span style={{ fontWeight: 700, color: C.sfBlue, fontSize: ".85rem" }}>Rep Performance Report — {tf}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Rep", "Visits", "Done", "Outlets", "Collected", "Invoiced", "Collection Rate", "vs Target", "Attainment"].map((h) => (
                    <th key={h} style={S.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repStats.map((r: any, i: number) => (
                  <tr key={r.r} style={{ background: i === 0 ? "#f0fff4" : "" }}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}{r.r}</td>
                    <td style={S.td}>{r.visits}</td>
                    <td style={S.td}>{r.completed}</td>
                    <td style={S.td}>{r.outlets}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(r.collected)}</td>
                    <td style={S.td}>{fmtGHS(r.invoiced)}</td>
                    <td style={S.td}>
                      <ProgressBar value={r.collected} max={r.invoiced || 1} />
                    </td>
                    <td style={S.td}>{fmtGHS(r.target)}</td>
                    <td style={{ ...S.td, minWidth: 120 }}>
                      <ProgressBar value={r.collected} max={r.target || 1} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "outlet" && (
        <div style={S.card}>
          <div style={S.cardHeader(C.teal)}>
            <span style={{ fontWeight: 700, color: C.teal, fontSize: ".85rem" }}>Outlet Report — {tf}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Outlet", "Channel", "Location", "Rep", "Status", "Visits", "Revenue", "Balance"].map((h) => (
                    <th key={h} style={S.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outletStats.map((o: any) => (
                  <tr key={o.id}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{o.name}</td>
                    <td style={S.td}>
                      <Badge s={o.channel} />
                    </td>
                    <td style={S.td}>{o.location}</td>
                    <td style={S.td}>{o.rep}</td>
                    <td style={S.td}>
                      <Badge s={o.status} />
                    </td>
                    <td style={S.td}>{o.visits}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(o.revenue)}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: o.balance > 0 ? C.danger : C.success }}>{fmtGHS(o.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 14px", display: "flex", gap: 14, fontSize: ".79rem", borderTop: "1px solid #eee", flexWrap: "wrap" }}>
            <span>
              Active: <b style={{ color: C.success }}>{data.outlets.filter((o: any) => o.status === "Active").length}</b>
            </span>
            <span>
              Pending: <b style={{ color: C.warn }}>{data.outlets.filter((o: any) => o.status === "Pending").length}</b>
            </span>
            <span>
              Follow-up: <b style={{ color: C.sfBlue }}>{data.outlets.filter((o: any) => o.status === "Follow-up").length}</b>
            </span>
            <span>
              Total Outstanding: <b style={{ color: C.danger }}>{fmtGHS(outletStats.reduce((s: number, o: any) => s + o.balance, 0))}</b>
            </span>
          </div>
        </div>
      )}

      {tab === "field" && (
        <div>
          <div style={S.statGrid}>
            {[
              ["DTC Revenue", fmtGHS(dtcRevenue), "", C.purple],
              ["SF Revenue", fmtGHS(b2bCollected), "collected", C.sfBlue],
              ["Total Revenue", fmtGHS(dtcRevenue + b2bCollected), "combined", C.primary],
              ["SF Contribution", pctOf(b2bCollected, dtcRevenue + b2bCollected) + "%", "of total", C.sfBlue],
            ].map(([l, v, s, c]) => (
              <div key={String(l)} style={S.statCard(String(c))}>
                <div style={{ fontSize: ".7rem", color: "#888" }}>{l as any}</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: c as any }}>{v as any}</div>
                {s && <div style={{ fontSize: ".67rem", color: "#aaa" }}>{s as any}</div>}
              </div>
            ))}
          </div>
          <div style={{ ...S.card, padding: "16px" }}>
            <div style={{ fontSize: ".8rem", fontWeight: 700, color: "#888", marginBottom: 12 }}>REVENUE CHANNEL BREAKDOWN — {tf}</div>
            {[
              ["DTC (Direct-to-Consumer)", dtcRevenue, C.purple],
              ["Sales Force (B2B/Trade)", b2bCollected, C.sfBlue],
            ].map(([label, val, col]) => (
              <div key={String(label)} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem", fontWeight: 700, marginBottom: 5 }}>
                  <span>{label as any}</span>
                  <span style={{ color: col as any }}>{fmtGHS(val)}</span>
                </div>
                <ProgressBar value={val as number} max={dtcRevenue + b2bCollected} color={col as string} />
              </div>
            ))}
            <div style={{ marginTop: 14, padding: "10px 12px", background: "#f7f9fb", borderRadius: 8, fontSize: ".79rem" }}>
              <b>SF Active Outlets:</b> {data.outlets.filter((o: any) => o.status === "Active").length} · <b>SF Visits ({tf}):</b> {visits.length} ·{" "}
              <b>POSM Deployed:</b> {data.posm.filter((p: any) => p.status === "Deployed").length}
            </div>
          </div>
        </div>
      )}

      {tab === "collection" && (
        <div>
          <div style={S.statGrid}>
            {[
              ["Total Invoiced", fmtGHS(b2bInvoiced), C.primary],
              ["Total Collected", fmtGHS(b2bCollected), C.success],
              ["Outstanding", fmtGHS(b2bOutstanding), C.danger],
              ["Collection Rate", pctOf(b2bCollected, b2bInvoiced) + "%", C.teal],
            ].map(([l, v, c]) => (
              <div key={String(l)} style={S.statCard(String(c))}>
                <div style={{ fontSize: ".7rem", color: "#888" }}>{l as any}</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color: c as any }}>{v as any}</div>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={S.cardHeader(C.teal)}>
              <span style={{ fontWeight: 700, color: C.teal, fontSize: ".85rem" }}>Collection by Rep — {tf}</span>
            </div>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Rep", "Invoiced", "Collected", "Outstanding", "Collection Rate"].map((h) => (
                    <th key={h} style={S.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repStats.map((r: any) => (
                  <tr key={r.r}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{r.r}</td>
                    <td style={S.td}>{fmtGHS(r.invoiced)}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(r.collected)}</td>
                    <td style={{ ...S.td, color: r.invoiced - r.collected > 0 ? C.danger : "#888" }}>{fmtGHS(r.invoiced - r.collected)}</td>
                    <td style={{ ...S.td, minWidth: 130 }}>
                      <ProgressBar value={r.collected} max={r.invoiced || 1} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={S.card}>
            <div style={S.cardHeader(C.sfBlue)}>
              <span style={{ fontWeight: 700, color: C.sfBlue, fontSize: ".85rem" }}>Invoice Status Breakdown</span>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", gap: 16, flexWrap: "wrap" }}>
              {B2B_PAY_STATUSES.map((s) => {
                const count = payments.filter((p: any) => p.status === s).length;
                const val = payments.filter((p: any) => p.status === s).reduce((sum: number, p: any) => sum + p.amount, 0);
                const [c, bg] = bc(s);
                return (
                  <div key={s} style={{ background: bg, borderRadius: 8, padding: "10px 14px", minWidth: 110 }}>
                    <div style={{ fontSize: ".7rem", fontWeight: 700, color: c }}>{s.toUpperCase()}</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: c, marginTop: 3 }}>{count} inv.</div>
                    <div style={{ fontSize: ".75rem", color: c, marginTop: 1 }}>{fmtGHS(val)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AIBox
        context={{ repStats, tab, tf, b2bCollected, b2bInvoiced, b2bOutstanding, dtcRevenue }}
        placeholder="e.g. Which rep has the worst collection rate? Where should I focus this week?"
        color={C.sfBlue}
      />
    </div>
  );
}

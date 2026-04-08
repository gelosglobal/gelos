import { useState } from "react";
import { C, REPS } from "../../constants";
import { filterByTime, fmtGHS, pctOf } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, ProgressBar, SearchBar, TimeFilter } from "../../ui";
import { useSFFilter } from "./filter";

export function SFDashboard({ data, view, rep }: any) {
  const [tf, setTf] = useState("Monthly");
  const outlets = useSFFilter(data.outlets, view, rep);
  const visits = useSFFilter(filterByTime(data.visits, tf), view, rep);
  const posm = useSFFilter(data.posm, view, rep);
  const pay = useSFFilter(data.b2bPayments, view, rep);
  const lowStock = useSFFilter(data.sfInventory, view, rep).filter((i: any) => i.stock <= i.reorder);
  const overdue = pay.filter((p: any) => p.status === "Overdue");
  const collected = pay.reduce((s: number, p: any) => s + p.paid, 0);
  const outstanding = pay.reduce((s: number, p: any) => s + (p.amount - p.paid), 0);
  return (
    <div>
      <TimeFilter value={tf} onChange={setTf} />
      <div style={S.statGrid}>
        {[
          ["Outlets", outlets.length, "total", C.sfBlue],
          ["Visits", visits.length, visits.filter((v: any) => v.status === "Completed").length + " done", C.success],
          [
            "POSM Deployed",
            posm.filter((p: any) => p.status === "Deployed").length,
            posm.filter((p: any) => p.status === "Pending").length + " pending",
            C.purple,
          ],
          ["Low Stock", lowStock.length, "products", C.warn],
          ["Collected", fmtGHS(collected), "", C.success],
          ["Outstanding", fmtGHS(outstanding), overdue.length + " overdue", C.danger],
        ].map(([l, v, s, c]) => (
          <div key={String(l)} style={S.statCard(String(c))}>
            <div style={{ fontSize: ".7rem", color: "#888" }}>{l as any}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: c as any }}>{v as any}</div>
            <div style={{ fontSize: ".67rem", color: "#aaa" }}>{s as any}</div>
          </div>
        ))}
      </div>
      {(lowStock.length > 0 || overdue.length > 0) && (
        <div style={{ marginBottom: 14 }}>
          {lowStock.map((i: any) => (
            <div key={i.id} style={S.alert(C.danger)}>
              ⚠️ <b>Low Stock:</b> {i.product} — {i.stock} {i.unit}
            </div>
          ))}
          {overdue.map((p: any) => (
            <div key={p.id} style={S.alert(C.warn)}>
              🔔 <b>Overdue:</b> {p.outlet} · {p.invoice} · {fmtGHS(p.amount - p.paid)}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={S.card}>
          <div style={S.cardHeader(C.sfBlue)}>
            <span style={{ fontWeight: 700, color: C.sfBlue, fontSize: ".83rem" }}>Recent Visits</span>
          </div>
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
              {visits
                .slice()
                .reverse()
                .slice(0, 5)
                .map((v: any) => (
                  <tr key={v.id}>
                    <td style={S.td}>{v.outlet}</td>
                    <td style={S.td}>{v.rep}</td>
                    <td style={S.td}>{v.purpose}</td>
                    <td style={S.td}>
                      <Badge s={v.status} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div style={S.card}>
          <div style={S.cardHeader(C.sfBlue)}>
            <span style={{ fontWeight: 700, color: C.sfBlue, fontSize: ".83rem" }}>Rep Scorecard</span>
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                {["Rep", "Visits", "Outlets", "Collections"].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REPS.map((r) => (
                <tr key={r}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{r}</td>
                  <td style={S.td}>{data.visits.filter((v: any) => v.rep === r).length}</td>
                  <td style={S.td}>{data.outlets.filter((o: any) => o.rep === r).length}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: C.success }}>
                    {fmtGHS(data.b2bPayments.filter((p: any) => p.rep === r).reduce((s: number, p: any) => s + p.paid, 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { C, REPS } from "../../constants";
import { filterByTime, fmtGHS, pctOf } from "../../lib";
import { S } from "../../styles";
import { AIBox, ProgressBar, TimeFilter } from "../../ui";

export function RepPerformance({ data }: any) {
  const [tf, setTf] = useState("Monthly");
  const visits = filterByTime(data.visits, tf);
  const payments = filterByTime(data.b2bPayments, tf, "date");
  const ranked = REPS.map((r) => {
    const outs = data.outlets.filter((o: any) => o.rep === r).length;
    const vis = visits.filter((v: any) => v.rep === r).length;
    const posm = data.posm.filter((p: any) => p.rep === r && p.status === "Deployed").length;
    const coll = payments.filter((p: any) => p.rep === r).reduce((s: number, p: any) => s + p.paid, 0);
    const outp = payments.filter((p: any) => p.rep === r).reduce((s: number, p: any) => s + (p.amount - p.paid), 0);
    const inv = payments.filter((p: any) => p.rep === r).reduce((s: number, p: any) => s + p.amount, 0);
    const collRate = inv ? pctOf(coll, inv) : 0;
    const target = data.targets.find((t: any) => t.rep === r);
    const score = Math.min(100, Math.round(outs * 10 + vis * 8 + posm * 5 + coll / 500));
    const attain = target ? pctOf(coll, target.monthlyTarget) : 0;
    return { r, outs, vis, posm, coll, outp, collRate, score, attain, target: target?.monthlyTarget || 0, visTarget: target?.visitsTarget || 0 };
  }).sort((a: any, b: any) => b.score - a.score);

  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div>
      <TimeFilter value={tf} onChange={setTf} />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, justifyContent: "center", alignItems: "flex-end" }}>
        {[ranked[1], ranked[0], ranked[2]]
          .filter(Boolean)
          .map((r: any, i: number) => {
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const heights = [180, 210, 160];
            const colors = [C.sfBlue, C.accent, C.teal];
            return (
              <div key={r.r} style={{ textAlign: "center", flex: 1, maxWidth: 180 }}>
                <div style={{ fontSize: rank === 1 ? "1.6rem" : "1.3rem", marginBottom: 4 }}>{medals[rank - 1]}</div>
                <div style={{ fontSize: ".8rem", fontWeight: 700, marginBottom: 4 }}>{r.r}</div>
                <div style={{ fontWeight: 900, color: colors[i], fontSize: ".95rem", marginBottom: 4 }}>{r.score} pts</div>
                <div
                  style={{
                    height: heights[i],
                    background: colors[i] + "22",
                    border: `2px solid ${colors[i]}`,
                    borderRadius: "8px 8px 0 0",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    padding: "0 0 10px",
                  }}
                >
                  <div style={{ fontSize: ".75rem", color: colors[i], fontWeight: 700, textAlign: "center" }}>
                    {fmtGHS(r.coll)}
                    <br />
                    collected
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div style={S.card}>
        <div style={S.cardHeader(C.sfBlue)}>
          <span style={{ fontWeight: 700, color: C.sfBlue, fontSize: ".85rem" }}>Full Leaderboard — {tf}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["#", "Rep", "Score", "Visits", "Outlets", "POSM", "Collected", "Outstanding", "Collection %", "vs Target"].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((r: any, i: number) => (
                <tr key={r.r} style={{ background: i === 0 ? "#fffbe6" : "" }}>
                  <td style={{ ...S.td, fontWeight: 900, color: (S as any).medal[i] || "#aaa", fontSize: "1rem" }}>{medals[i] || i + 1}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{r.r}</td>
                  <td style={S.td}>
                    <span style={{ fontWeight: 900, color: r.score > 70 ? C.success : r.score > 40 ? C.warn : C.danger, fontSize: ".9rem" }}>{r.score}</span>/100
                  </td>
                  <td style={S.td}>
                    <span style={{ fontWeight: 700 }}>{r.vis}</span>
                    <span style={{ color: "#aaa", fontSize: ".72rem" }}>/{r.visTarget}</span>
                  </td>
                  <td style={S.td}>{r.outs}</td>
                  <td style={S.td}>{r.posm}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(r.coll)}</td>
                  <td style={{ ...S.td, color: r.outp > 0 ? C.danger : "#888" }}>{fmtGHS(r.outp)}</td>
                  <td style={{ ...S.td, minWidth: 100 }}>
                    <ProgressBar value={r.coll} max={r.coll + r.outp || 1} />
                  </td>
                  <td style={{ ...S.td, minWidth: 100 }}>
                    <ProgressBar value={r.coll} max={r.target || 1} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AIBox context={{ ranked, tf }} placeholder="e.g. Who needs coaching? What separates top from bottom reps?" color={C.sfBlue} />
    </div>
  );
}

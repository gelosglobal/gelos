import { C, PAY_METHODS } from "../../constants";
import { fmtGHS, getProd, pctOf } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge } from "../../ui";

export function FinanceLayer({ data }: any) {
  const delivered = data.orders.filter((o: any) => o.status === "Delivered");
  const dtcRev = delivered.reduce((s: number, o: any) => s + o.value, 0);
  const cogs = delivered.reduce((s: number, o: any) => s + o.items.reduce((ss: number, i: any) => ss + getProd(i.sku).cost * i.qty, 0), 0);
  const grossProfit = dtcRev - cogs;
  const mktSpend = data.campaigns.reduce((s: number, c: any) => s + c.spend, 0);
  const b2bCollected = data.b2bPayments.reduce((s: number, p: any) => s + p.paid, 0);
  const b2bOutstanding = data.b2bPayments.reduce((s: number, p: any) => s + (p.amount - p.paid), 0);
  const netProfit = grossProfit - mktSpend;
  const methodSplit = PAY_METHODS.map((m) => ({
    m,
    count: delivered.filter((o: any) => o.paymentMethod === m).length,
    rev: delivered.filter((o: any) => o.paymentMethod === m).reduce((s: number, o: any) => s + o.value, 0),
  })).filter((x: any) => x.count > 0);

  return (
    <div>
      <div style={S.statGrid}>
        {[
          ["DTC Revenue", fmtGHS(dtcRev), "", C.success],
          ["B2B Collected", fmtGHS(b2bCollected), "", C.sfBlue],
          ["Total Revenue", fmtGHS(dtcRev + b2bCollected), "combined", C.primary],
          ["COGS", fmtGHS(cogs), "", C.danger],
          ["Gross Profit", fmtGHS(grossProfit), pctOf(grossProfit, dtcRev) + "% margin", C.success],
          ["Mktg Spend", fmtGHS(mktSpend), "", C.warn],
          ["Net Profit", fmtGHS(netProfit), "", netProfit > 0 ? C.success : C.danger],
          ["B2B Outstanding", fmtGHS(b2bOutstanding), "", C.danger],
        ].map(([l, v, s, c]) => (
          <div key={String(l)} style={S.statCard(String(c))}>
            <div style={{ fontSize: ".7rem", color: "#888" }}>{l as any}</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 900, color: c as any }}>{v as any}</div>
            {s && <div style={{ fontSize: ".66rem", color: "#aaa" }}>{s as any}</div>}
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardHeader(C.success)}>
          <span style={{ fontWeight: 700, color: C.success, fontSize: ".85rem" }}>Payment Method Split</span>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              {["Method", "Orders", "Revenue", "Share"].map((h) => (
                <th key={h} style={S.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {methodSplit.map((m: any) => (
              <tr key={m.m}>
                <td style={S.td}>
                  <Badge s={m.m} />
                </td>
                <td style={S.td}>{m.count}</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(m.rev)}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ background: "#eee", borderRadius: 3, height: 6, width: 60 }}>
                      <div style={{ background: C.success, width: pctOf(m.rev, dtcRev) + "%", height: 6, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: ".72rem", fontWeight: 700 }}>{pctOf(m.rev, dtcRev)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIBox context={{ dtcRev, b2bCollected, grossProfit, netProfit, mktSpend }} placeholder="e.g. What's eating our margins?" color={C.success} />
    </div>
  );
}

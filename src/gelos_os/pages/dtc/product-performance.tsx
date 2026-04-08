import { C, PRODUCTS } from "../../constants";
import { fmtGHS, pctOf } from "../../lib";
import { S } from "../../styles";
import { AIBox } from "../../ui";

export function ProductPerformance({ data }: any) {
  const delivered = data.orders.filter((o: any) => o.status === "Delivered");
  const prodStats = PRODUCTS.map((p) => {
    const items = delivered.flatMap((o: any) => o.items.filter((i: any) => i.sku === p.sku));
    const units = items.reduce((s: number, i: any) => s + i.qty, 0);
    const revenue = units * p.price;
    const profit = revenue - units * p.cost;
    const margin = revenue ? Math.round((profit / revenue) * 100) : 0;
    const inv = data.dtcInventory.find((i: any) => i.sku === p.sku);
    return { ...p, units, revenue, profit, margin, velocity: inv?.velocity || 0 };
  }).sort((a: any, b: any) => b.revenue - a.revenue);
  const totalRev = prodStats.reduce((s: number, p: any) => s + p.revenue, 0);

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardHeader(C.accent)}>
          <span style={{ fontWeight: 700, color: C.accent, fontSize: ".85rem" }}>Product Performance</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Product", "SKU", "Units", "Revenue", "Share", "Profit", "Margin", "Velocity"].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prodStats.map((p: any) => (
                <tr key={p.sku}>
                  <td style={{ ...S.td, fontWeight: 700 }}>{p.name}</td>
                  <td style={{ ...S.td, fontSize: ".71rem", color: "#888" }}>{p.sku}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{p.units}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: C.accent }}>{fmtGHS(p.revenue)}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ background: "#eee", borderRadius: 3, height: 6, width: 60 }}>
                        <div style={{ background: C.accent, width: pctOf(p.revenue, totalRev) + "%", height: 6, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: ".72rem", fontWeight: 700 }}>{pctOf(p.revenue, totalRev)}%</span>
                    </div>
                  </td>
                  <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(p.profit)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: p.margin > 40 ? C.success : C.warn }}>{p.margin}%</td>
                  <td style={S.td}>{p.velocity}/day</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AIBox context={{ productStats: prodStats }} placeholder="e.g. Which flavors to scale? Which to kill?" color={C.accent} />
    </div>
  );
}

import { C, PRODUCTS } from "../../constants";
import { fmtGHS, getProd, pctOf } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge } from "../../ui";

export function DTCInventory({ data, onUpdate }: any) {
  return (
    <div>
      <div style={S.card}>
        <div style={S.cardHeader(C.teal)}>
          <span style={{ fontWeight: 700, color: C.teal, fontSize: ".85rem" }}>DTC Inventory</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Product", "SKU", "Cost", "Price", "Margin", "Stock", "Reorder", "Velocity", "Days Left", "Status"].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.dtcInventory.map((i: any) => {
                const p = getProd(i.sku);
                const margin = p.cost ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
                const daysLeft = i.velocity ? Math.round(i.stock / i.velocity) : 99;
                const isLow = i.stock <= i.reorder;
                return (
                  <tr key={i.sku}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{p.name}</td>
                    <td style={{ ...S.td, fontSize: ".71rem", color: "#888" }}>{i.sku}</td>
                    <td style={S.td}>{fmtGHS(p.cost)}</td>
                    <td style={S.td}>{fmtGHS(p.price)}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: margin > 40 ? C.success : C.warn }}>{margin}%</td>
                    <td style={S.td}>
                      <span style={{ fontWeight: 700, color: isLow ? C.danger : C.success }}>{i.stock}</span>
                      <div style={{ background: "#eee", borderRadius: 3, height: 5, marginTop: 3, width: 60 }}>
                        <div
                          style={{
                            background: isLow ? C.danger : C.success,
                            width: Math.min(100, pctOf(i.stock, i.reorder * 2)) + "%",
                            height: 5,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </td>
                    <td style={S.td}>
                      <input
                        type="number"
                        value={i.reorder}
                        onChange={(e) => onUpdate("dtcInventory", { ...i, reorder: Number((e.target as any).value) })}
                        style={{ ...S.input, width: 60, padding: "3px 6px", fontSize: ".76rem" }}
                      />
                    </td>
                    <td style={S.td}>{i.velocity}/day</td>
                    <td style={{ ...S.td, fontWeight: 700, color: daysLeft < 7 ? C.danger : daysLeft < 14 ? C.warn : C.success }}>{daysLeft}d</td>
                    <td style={S.td}>
                      <Badge s={isLow ? "Low Stock" : "OK"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <AIBox context={{ inventory: data.dtcInventory, products: PRODUCTS }} placeholder="e.g. Which SKUs to reorder this week?" color={C.teal} />
    </div>
  );
}

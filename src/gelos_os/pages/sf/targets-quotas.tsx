import { useState } from "react";
import { C } from "../../constants";
import { fmtGHS, pctOf } from "../../lib";
import { S } from "../../styles";
import { AIBox, ProgressBar } from "../../ui";

export function TargetsQuotas({ data, onUpdate }: any) {
  const [editId, setEditId] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const upd = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: Number(e.target.value) }));
  const startEdit = (t: any) => {
    setEditId(t.id);
    setForm({ monthlyTarget: t.monthlyTarget, visitsTarget: t.visitsTarget, ordersTarget: t.ordersTarget });
  };
  const saveEdit = (t: any) => {
    onUpdate("targets", { ...t, ...form });
    setEditId(null);
  };
  return (
    <div>
      <div style={S.statGrid}>
        <div style={S.statCard(C.sfBlue)}>
          <div style={{ fontSize: ".7rem", color: "#888" }}>Total Team Target</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: C.sfBlue }}>{fmtGHS(data.targets.reduce((s: number, t: any) => s + t.monthlyTarget, 0))}</div>
          <div style={{ fontSize: ".67rem", color: "#aaa" }}>this month</div>
        </div>
        <div style={S.statCard(C.success)}>
          <div style={{ fontSize: ".7rem", color: "#888" }}>Total Achieved</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: C.success }}>{fmtGHS(data.targets.reduce((s: number, t: any) => s + t.achieved, 0))}</div>
        </div>
        <div style={S.statCard(C.warn)}>
          <div style={{ fontSize: ".7rem", color: "#888" }}>Team Attainment</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: C.warn }}>
            {pctOf(
              data.targets.reduce((s: number, t: any) => s + t.achieved, 0),
              data.targets.reduce((s: number, t: any) => s + t.monthlyTarget, 0),
            )}
            %
          </div>
        </div>
        <div style={S.statCard(C.success)}>
          <div style={{ fontSize: ".7rem", color: "#888" }}>Reps on Target</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: C.success }}>
            {data.targets.filter((t: any) => t.achieved >= t.monthlyTarget).length}/{data.targets.length}
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader(C.sfBlue)}>
          <span style={{ fontWeight: 700, color: C.sfBlue, fontSize: ".85rem" }}>Monthly Targets & Quotas</span>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              {["Rep", "Revenue Target", "Visits Target", "Orders Target", "Achieved", "Attainment", ""].map((h) => (
                <th key={h} style={S.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.targets.map((t: any) => (
              <tr key={t.id}>
                <td style={{ ...S.td, fontWeight: 700 }}>{t.rep}</td>
                <td style={S.td}>
                  {editId === t.id ? (
                    <input type="number" name="monthlyTarget" value={form.monthlyTarget} onChange={upd} style={{ ...S.input, width: 90, padding: "3px 6px" }} />
                  ) : (
                    fmtGHS(t.monthlyTarget)
                  )}
                </td>
                <td style={S.td}>
                  {editId === t.id ? (
                    <input type="number" name="visitsTarget" value={form.visitsTarget} onChange={upd} style={{ ...S.input, width: 60, padding: "3px 6px" }} />
                  ) : (
                    t.visitsTarget + " visits"
                  )}
                </td>
                <td style={S.td}>
                  {editId === t.id ? (
                    <input type="number" name="ordersTarget" value={form.ordersTarget} onChange={upd} style={{ ...S.input, width: 60, padding: "3px 6px" }} />
                  ) : (
                    t.ordersTarget + " orders"
                  )}
                </td>
                <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(t.achieved)}</td>
                <td style={{ ...S.td, minWidth: 130 }}>
                  <ProgressBar value={t.achieved} max={t.monthlyTarget} />
                </td>
                <td style={S.td}>
                  {editId === t.id ? (
                    <button onClick={() => saveEdit(t)} style={S.btnSm(C.success)}>
                      ✓
                    </button>
                  ) : (
                    <button onClick={() => startEdit(t)} style={S.btnSm(C.sfBlue)}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AIBox context={{ targets: data.targets }} placeholder="e.g. Which reps are at risk of missing target? How should we redistribute?" color={C.sfBlue} />
    </div>
  );
}

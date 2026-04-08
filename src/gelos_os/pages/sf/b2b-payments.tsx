import { useState } from "react";
import { B2B_PAY_STATUSES, C, REPS } from "../../constants";
import { filterByTime, fmtGHS, pctOf, today, uid } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, Field, Modal, SearchBar, TimeFilter } from "../../ui";
import { useSFFilter } from "./filter";

export function B2BPayments({ data, view, rep, onAdd, onDelete }: any) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [stF, setStF] = useState("");
  const [tf, setTf] = useState("All Time");
  const [form, setForm] = useState<any>({
    outlet: data.outlets[0]?.name || "",
    invoice: "",
    amount: 0,
    paid: 0,
    date: today(),
    due: "",
    status: "Pending",
    rep: view === "rep" ? rep : REPS[0],
  });
  const upd = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: ["amount", "paid"].includes(e.target.name) ? Number(e.target.value) : e.target.value }));

  let rows = useSFFilter(data.b2bPayments, view, rep);
  rows = filterByTime(rows, tf).filter((p: any) => {
    const q = search.toLowerCase();
    return (!q || (p.outlet + p.invoice).toLowerCase().includes(q)) && (!stF || p.status === stF);
  });
  const total = rows.reduce((s: number, p: any) => s + p.amount, 0);
  const collected = rows.reduce((s: number, p: any) => s + p.paid, 0);
  const save = () => {
    if (!form.invoice.trim()) return alert("Invoice # required");
    onAdd("b2bPayments", { ...form, id: uid() });
    setModal(false);
  };

  return (
    <div>
      <TimeFilter value={tf} onChange={setTf} />
      <div style={S.statGrid}>
        {[
          ["Invoiced", fmtGHS(total), C.primary],
          ["Collected", fmtGHS(collected), C.success],
          ["Outstanding", fmtGHS(total - collected), C.danger],
          ["Collection Rate", pctOf(collected, total) + "%", C.teal],
        ].map(([l, v, c]) => (
          <div key={String(l)} style={S.statCard(String(c))}>
            <div style={{ fontSize: ".7rem", color: "#888" }}>{l as any}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: c as any }}>{v as any}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardHeader(C.sfBlue)}>
          <span style={{ fontWeight: 700, color: C.sfBlue, fontSize: ".85rem" }}>B2B Payments ({rows.length})</span>
          <button onClick={() => setModal(true)} style={S.btnSm(C.sfBlue)}>
            + Add Invoice
          </button>
        </div>
        <SearchBar value={search} onChange={setSearch}>
          <select value={stF} onChange={(e) => setStF(e.target.value)} style={S.select}>
            <option value="">All</option>
            {B2B_PAY_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </SearchBar>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Outlet", "Invoice", "Amount", "Paid", "Balance", "Due", "Rep", "Status", ""].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#aaa" }}>
                    No records
                  </td>
                </tr>
              ) : (
                rows.map((p: any) => (
                  <tr key={p.id}>
                    <td style={S.td}>{p.outlet}</td>
                    <td style={S.td}>{p.invoice}</td>
                    <td style={S.td}>{fmtGHS(p.amount)}</td>
                    <td style={{ ...S.td, color: C.success, fontWeight: 700 }}>{fmtGHS(p.paid)}</td>
                    <td style={{ ...S.td, color: p.amount - p.paid > 0 ? C.danger : C.success, fontWeight: 700 }}>{fmtGHS(p.amount - p.paid)}</td>
                    <td style={S.td}>{p.due}</td>
                    <td style={S.td}>{p.rep}</td>
                    <td style={S.td}>
                      <Badge s={p.status} />
                    </td>
                    <td style={S.td}>
                      <button onClick={() => onDelete("b2bPayments", p.id)} style={S.btnSm(C.danger)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AIBox context={{ b2bPayments: rows, total, collected }} placeholder="e.g. Which accounts have overdue payments?" color={C.sfBlue} />

      {modal && (
        <Modal title="Add Invoice" onClose={() => setModal(false)} onSave={save} color={C.sfBlue}>
          <div style={S.formGrid}>
            <Field label="Outlet" name="outlet" value={form.outlet} onChange={upd} options={data.outlets.map((o: any) => o.name)} />
            <Field label="Invoice #" name="invoice" value={form.invoice} onChange={upd} />
            <Field label="Amount (GHS)" name="amount" value={form.amount} onChange={upd} type="number" />
            <Field label="Paid (GHS)" name="paid" value={form.paid} onChange={upd} type="number" />
            <Field label="Invoice Date" name="date" value={form.date} onChange={upd} type="date" />
            <Field label="Due Date" name="due" value={form.due} onChange={upd} type="date" />
            <Field label="Rep" name="rep" value={form.rep} onChange={upd} options={view === "rep" ? [rep] : REPS} />
            <Field label="Status" name="status" value={form.status} onChange={upd} options={B2B_PAY_STATUSES} />
          </div>
        </Modal>
      )}
    </div>
  );
}

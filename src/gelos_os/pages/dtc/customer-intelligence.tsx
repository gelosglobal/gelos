import { useState } from "react";
import { C, CUST_SEGMENTS, MKT_CHANNELS } from "../../constants";
import { bc, fmtGHS, getProd, today, uid } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, Field, Modal, SearchBar } from "../../ui";

export function CustomerIntelligence({ data, onAdd, onDelete, onUpdate }: any) {
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [segF, setSegF] = useState("");
  const [form, setForm] = useState<any>({ name: "", phone: "", email: "", location: "", source: MKT_CHANNELS[0], segment: "New", joinDate: today(), notes: "" });
  const upd = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));
  const save = () => {
    if (!form.name.trim()) return alert("Name required");
    onAdd("customers", { ...form, id: uid(), totalOrders: 0, ltv: 0, lastPurchase: "", favSku: "" });
    setModal(false);
  };
  const rows = data.customers.filter((c: any) => {
    const q = search.toLowerCase();
    return (!q || (c.name + c.phone + c.location).toLowerCase().includes(q)) && (!segF || c.segment === segF);
  });
  const custOrders = (c: any) => data.orders.filter((o: any) => o.customerId === c.id);

  return (
    <div>
      <div style={S.statGrid}>
        {CUST_SEGMENTS.map((seg) => {
          const [c, bg] = bc(seg);
          const count = data.customers.filter((x: any) => x.segment === seg).length;
          return (
            <div key={seg} style={{ ...S.statCard(c), background: bg }}>
              <div style={{ fontSize: ".7rem", fontWeight: 700, color: c }}>{seg.toUpperCase()}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: c }}>{count}</div>
            </div>
          );
        })}
        <div style={S.statCard(C.purple)}>
          <div style={{ fontSize: ".7rem", color: "#888" }}>Total LTV</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: C.purple }}>{fmtGHS(data.customers.reduce((s: number, c: any) => s + c.ltv, 0))}</div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader(C.purple)}>
          <span style={{ fontWeight: 700, color: C.purple, fontSize: ".85rem" }}>Customer Intelligence ({rows.length})</span>
          <button onClick={() => setModal(true)} style={S.btnSm(C.purple)}>
            + Add Customer
          </button>
        </div>
        <SearchBar value={search} onChange={setSearch}>
          <select value={segF} onChange={(e) => setSegF(e.target.value)} style={S.select}>
            <option value="">All Segments</option>
            {CUST_SEGMENTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </SearchBar>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Name", "Phone", "Location", "Source", "Segment", "Orders", "LTV", "Last Purchase", ""].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c: any) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setDetail(c)}>
                  <td style={{ ...S.td, fontWeight: 700, color: C.purple }}>{c.name}</td>
                  <td style={S.td}>{c.phone}</td>
                  <td style={S.td}>{c.location}</td>
                  <td style={S.td}>{c.source}</td>
                  <td style={S.td}>
                    <Badge s={c.segment} />
                  </td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{c.totalOrders}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: C.purple }}>{fmtGHS(c.ltv)}</td>
                  <td style={S.td}>{c.lastPurchase || "—"}</td>
                  <td style={S.td} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onDelete("customers", c.id)} style={S.btnSm(C.danger)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AIBox context={{ customers: rows }} placeholder="e.g. Who are top customers? How to win back churn risk?" color={C.purple} />

      {modal && (
        <Modal title="Add Customer" onClose={() => setModal(false)} onSave={save} color={C.purple}>
          <div style={S.formGrid}>
            <Field label="Full Name" name="name" value={form.name} onChange={upd} full />
            <Field label="Phone" name="phone" value={form.phone} onChange={upd} />
            <Field label="Email" name="email" value={form.email} onChange={upd} type="email" />
            <Field label="Location" name="location" value={form.location} onChange={upd} />
            <Field label="Source" name="source" value={form.source} onChange={upd} options={MKT_CHANNELS} />
            <Field label="Segment" name="segment" value={form.segment} onChange={upd} options={CUST_SEGMENTS} />
            <Field label="Join Date" name="joinDate" value={form.joinDate} onChange={upd} type="date" />
            <Field label="Notes" name="notes" value={form.notes} onChange={upd} type="textarea" full />
          </div>
        </Modal>
      )}

      {detail && (
        <div style={S.overlay} onClick={(e: any) => e.target === e.currentTarget && setDetail(null)}>
          <div style={{ ...S.modal, width: 620, borderTop: `3px solid ${C.purple}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: C.purple }}>{detail.name}</h3>
                <span style={{ fontSize: ".76rem", color: "#888" }}>
                  {detail.phone} · {detail.location}
                </span>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#aaa" }}>
                ✕
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: 14 }}>
              {[
                ["Segment", <Badge s={detail.segment} />],
                ["Source", detail.source],
                ["LTV", <b style={{ color: C.purple }}>{fmtGHS(detail.ltv)}</b>],
                ["Total Orders", detail.totalOrders],
                ["Last Purchase", detail.lastPurchase || "—"],
                ["Joined", detail.joinDate],
              ].map(([l, v]) => (
                <div key={String(l)} style={{ background: "#f7f9fb", borderRadius: 8, padding: "8px 11px" }}>
                  <div style={{ fontSize: ".68rem", color: "#aaa", fontWeight: 700 }}>{l as any}</div>
                  <div style={{ fontWeight: 600, fontSize: ".81rem", marginTop: 2 }}>{v as any}</div>
                </div>
              ))}
            </div>
            {detail.notes && (
              <div style={{ background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 8, padding: "8px 12px", fontSize: ".8rem", marginBottom: 12 }}>
                📝 {detail.notes}
              </div>
            )}
            <div style={{ fontWeight: 700, color: C.purple, marginBottom: 7, fontSize: ".83rem" }}>Purchase History</div>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Order", "Products", "Value", "Method", "Status", "Date"].map((h) => (
                    <th key={h} style={S.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {custOrders(detail).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#aaa" }}>
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  custOrders(detail).map((o: any) => (
                    <tr key={o.id}>
                      <td style={{ ...S.td, fontWeight: 700, fontSize: ".72rem", color: C.primary }}>{o.id}</td>
                      <td style={S.td}>{o.items.map((i: any) => `${getProd(i.sku).name.split(" ").slice(1, 3).join(" ")} x${i.qty}`).join(", ")}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(o.value)}</td>
                      <td style={S.td}>
                        <Badge s={o.paymentMethod} />
                      </td>
                      <td style={S.td}>
                        <Badge s={o.status} />
                      </td>
                      <td style={S.td}>{o.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

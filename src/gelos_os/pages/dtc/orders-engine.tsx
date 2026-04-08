import { useState } from "react";
import { C, MKT_CHANNELS, ORDER_STATUSES, PAY_METHODS, PRODUCTS, SKUS } from "../../constants";
import { fmtGHS, getProd, today, uid } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, Field, Modal, SearchBar } from "../../ui";

export function OrdersEngine({ data, onAdd, onDelete, onUpdate }: any) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [stF, setStF] = useState("");
  const [form, setForm] = useState<any>({
    id: "ORD-" + Date.now().toString().slice(-5),
    customerId: "",
    customerName: "",
    items: [{ sku: SKUS[0], qty: 1 }],
    paymentMethod: "Mobile Money",
    status: "Pending",
    source: MKT_CHANNELS[0],
    campaignId: "",
    date: today(),
    notes: "",
  });

  const rows = data.orders.filter((o: any) => {
    const q = search.toLowerCase();
    return (!q || (o.id + o.customerName).toLowerCase().includes(q)) && (!stF || o.status === stF);
  });

  const upd = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));
  const updItem = (idx: number, field: string, val: any) =>
    setForm((f: any) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: field === "qty" ? Number(val) : val };
      return { ...f, items };
    });
  const addItem = () => setForm((f: any) => ({ ...f, items: [...f.items, { sku: SKUS[0], qty: 1 }] }));
  const removeItem = (idx: number) => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== idx) }));
  const calcVal = () => form.items.reduce((s: number, i: any) => s + getProd(i.sku).price * i.qty, 0);

  const save = () => {
    if (!form.customerName.trim()) return alert("Customer name required");
    const val = calcVal();
    onAdd("orders", { ...form, value: val });
    const cust = data.customers.find((c: any) => c.id === form.customerId);
    if (cust) onUpdate("customers", { ...cust, totalOrders: cust.totalOrders + 1, ltv: cust.ltv + val, lastPurchase: form.date });
    form.items.forEach((item: any) => {
      const inv = data.dtcInventory.find((i: any) => i.sku === item.sku);
      if (inv) onUpdate("dtcInventory", { ...inv, stock: Math.max(0, inv.stock - item.qty) });
    });
    setModal(false);
  };

  return (
    <div>
      <div style={S.statGrid}>
        {[
          ["Total", data.orders.length, "", C.primary],
          ["Delivered", data.orders.filter((o: any) => o.status === "Delivered").length, "", C.success],
          ["In Progress", data.orders.filter((o: any) => ["Pending", "Processing", "Shipped"].includes(o.status)).length, "", C.warn],
          ["Failed", data.orders.filter((o: any) => o.status === "Failed").length, "", C.danger],
        ].map(([l, v, _s, c]) => (
          <div key={String(l)} style={S.statCard(String(c))}>
            <div style={{ fontSize: ".7rem", color: "#888" }}>{l as any}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: c as any }}>{v as any}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.cardHeader(C.primary)}>
          <span style={{ fontWeight: 700, color: C.primary, fontSize: ".85rem" }}>Orders Engine</span>
          <button onClick={() => setModal(true)} style={S.btnSm(C.accent)}>
            + New Order
          </button>
        </div>
        <SearchBar value={search} onChange={setSearch}>
          <select value={stF} onChange={(e) => setStF(e.target.value)} style={S.select}>
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </SearchBar>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Order", "Customer", "Items", "Value", "Method", "Source", "Status", "Date", ""].map((h) => (
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
                    No orders
                  </td>
                </tr>
              ) : (
                rows
                  .slice()
                  .reverse()
                  .map((o: any) => (
                    <tr key={o.id}>
                      <td style={{ ...S.td, fontWeight: 700, color: C.primary, fontSize: ".73rem" }}>{o.id}</td>
                      <td style={S.td}>{o.customerName}</td>
                      <td style={{ ...S.td, fontSize: ".74rem" }}>
                        {o.items.map((i: any) => `${getProd(i.sku).name.split(" ").slice(1, 3).join(" ")} x${i.qty}`).join(", ")}
                      </td>
                      <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(o.value)}</td>
                      <td style={S.td}>
                        <Badge s={o.paymentMethod} />
                      </td>
                      <td style={S.td}>{o.source}</td>
                      <td style={S.td}>
                        <select
                          value={o.status}
                          onChange={(e) => onUpdate("orders", { ...o, status: e.target.value })}
                          style={{ ...S.select, padding: "3px 6px", fontSize: ".73rem" }}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={S.td}>{o.date}</td>
                      <td style={S.td}>
                        <button onClick={() => onDelete("orders", o.id)} style={S.btnSm(C.danger)}>
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
      <AIBox context={{ orders: data.orders }} placeholder="e.g. What's our COD failure rate? Which orders need urgent follow-up?" color={C.primary} />
      {modal && (
        <Modal title="Create Order" onClose={() => setModal(false)} onSave={save} wide color={C.primary}>
          <div style={S.formGrid}>
            <Field label="Order ID" name="id" value={form.id} onChange={upd} readOnly />
            <Field label="Date" name="date" value={form.date} onChange={upd} type="date" />
            <Field label="Customer Name" name="customerName" value={form.customerName} onChange={upd} full placeholder="Type or link below" />
            <div style={S.fg(false)}>
              <label style={S.label}>Link Existing Customer</label>
              <select
                onChange={(e) => {
                  const c = data.customers.find((x: any) => x.id === e.target.value);
                  if (c) setForm((f: any) => ({ ...f, customerId: c.id, customerName: c.name }));
                }}
                style={S.select}
              >
                <option value="">-- select --</option>
                {data.customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Payment Method" name="paymentMethod" value={form.paymentMethod} onChange={upd} options={PAY_METHODS} />
            <Field label="Source" name="source" value={form.source} onChange={upd} options={MKT_CHANNELS} />
            <Field label="Status" name="status" value={form.status} onChange={upd} options={ORDER_STATUSES} />
            <Field label="Campaign" name="campaignId" value={form.campaignId} onChange={upd} options={[""].concat(data.campaigns.map((c: any) => c.id))} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={S.label}>ORDER ITEMS</label>
              <button onClick={addItem} style={S.btnSm(C.teal)}>
                + Item
              </button>
            </div>
            {form.items.map((item: any, idx: number) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 70px auto", gap: 8, marginBottom: 7 }}>
                <select value={item.sku} onChange={(e) => updItem(idx, "sku", e.target.value)} style={S.select}>
                  {PRODUCTS.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} — GHS {p.price}
                    </option>
                  ))}
                </select>
                <input type="number" value={item.qty} onChange={(e) => updItem(idx, "qty", e.target.value)} style={{ ...S.input, padding: "4px 8px" }} min={1} />
                <button onClick={() => removeItem(idx)} style={S.btnSm(C.danger)}>
                  ✕
                </button>
              </div>
            ))}
            <div style={{ textAlign: "right", fontWeight: 900, color: C.success, fontSize: ".95rem", marginTop: 6 }}>Total: {fmtGHS(calcVal())}</div>
          </div>
          <Field label="Notes" name="notes" value={form.notes} onChange={upd} type="textarea" full />
        </Modal>
      )}
    </div>
  );
}

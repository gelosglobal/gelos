import { useEffect, useMemo, useState } from "react";
import { C, MKT_CHANNELS, ORDER_STATUSES, PAY_METHODS, PRODUCTS, SKUS } from "../../constants";
import { fmtGHS, getProd, today, uid } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, Field, Modal, SearchBar } from "../../ui";

type ApiOrder = {
  id: string;
  externalId: string | null;
  customerName: string;
  items: any[];
  total: number;
  currency: string | null;
  paymentMethod: string;
  source: string;
  status: string;
  orderDate: string;
  notes: string | null;
};

export function OrdersEngine() {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [stF, setStF] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    customerName: "",
    items: [{ sku: SKUS[0], qty: 1 }],
    paymentMethod: "Mobile Money",
    status: "Pending",
    source: MKT_CHANNELS[0],
    orderDate: today(),
    notes: "",
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const hay = `${o.externalId ?? ""} ${o.customerName}`.toLowerCase();
      return (!q || hay.includes(q)) && (!stF || o.status === stF);
    });
  }, [orders, search, stF]);

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

  const load = async (oid?: string | null) => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (oid) qs.set("orgId", oid);
      if (search.trim()) qs.set("q", search.trim());
      if (stF) qs.set("status", stF);
      qs.set("limit", "200");
      const r = await fetch(`/api/orders?${qs.toString()}`, { credentials: "include" });
      const d = await r.json();
      setOrgId(d.orgId ?? oid ?? null);
      setOrders(
        (d.orders ?? []).map((o: any) => ({
          id: o.id,
          externalId: o.externalId ?? null,
          customerName: o.customerName,
          items: o.items ?? [],
          total: Number(o.total ?? 0),
          currency: o.currency ?? null,
          paymentMethod: o.paymentMethod ?? "",
          source: o.source ?? "",
          status: o.status ?? "Pending",
          orderDate: (o.orderDate ?? o.createdAt) as string,
          notes: o.notes ?? null,
        })),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/master/snapshot", { credentials: "include" });
        const d = await r.json();
        const oid = d?.orgId ?? null;
        setOrgId(oid);
        await load(oid);
      } catch {
        await load(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load(orgId);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stF]);

  const save = async () => {
    if (!form.customerName.trim()) return alert("Customer name required");
    const val = calcVal();
    setLoading(true);
    setErr(null);
    try {
      const payload = {
        externalId: "ORD-" + uid(),
        customerName: form.customerName,
        items: form.items,
        paymentMethod: form.paymentMethod,
        source: form.source,
        status: form.status,
        orderDate: form.orderDate,
        notes: form.notes,
        total: val,
      };
      const qs = new URLSearchParams();
      if (orgId) qs.set("orgId", orgId);
      const r = await fetch(`/api/orders?${qs.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "Failed to create order");
      setOrders((o) => [d.order, ...o] as any);
      setModal(false);
      setForm((f: any) => ({ ...f, customerName: "", items: [{ sku: SKUS[0], qty: 1 }], notes: "", orderDate: today(), status: "Pending" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      const r = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "Failed to update order");
      setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...d.order } : o)) as any);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update order");
      load(orgId);
    }
  };

  const del = async (id: string) => {
    if (!window.confirm("Delete?")) return;
    const prev = orders;
    setOrders((os) => os.filter((o) => o.id !== id));
    try {
      const r = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "Failed to delete order");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete order");
      setOrders(prev);
    }
  };

  return (
    <div>
      <div style={S.statGrid}>
        {[
          ["Total", orders.length, "", C.primary],
          ["Delivered", orders.filter((o) => o.status === "Delivered").length, "", C.success],
          ["In Progress", orders.filter((o) => ["Pending", "Processing", "Shipped"].includes(o.status)).length, "", C.warn],
          ["Failed", orders.filter((o) => o.status === "Failed").length, "", C.danger],
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
        {err && <div style={{ padding: "10px 16px", color: C.danger, fontWeight: 700, fontSize: ".85rem" }}>{err}</div>}
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
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#aaa" }}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#aaa" }}>
                    No orders
                  </td>
                </tr>
              ) : (
                rows
                  .slice()
                  .map((o: any) => (
                    <tr key={o.id}>
                      <td style={{ ...S.td, fontWeight: 700, color: C.primary, fontSize: ".73rem" }}>{o.externalId ?? o.id}</td>
                      <td style={S.td}>{o.customerName}</td>
                      <td style={{ ...S.td, fontSize: ".74rem" }}>
                        {o.items.map((i: any) => `${getProd(i.sku).name.split(" ").slice(1, 3).join(" ")} x${i.qty}`).join(", ")}
                      </td>
                      <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(o.total)}</td>
                      <td style={S.td}>
                        <Badge s={o.paymentMethod} />
                      </td>
                      <td style={S.td}>{o.source}</td>
                      <td style={S.td}>
                        <select
                          value={o.status}
                          onChange={(e) => setStatus(o.id, e.target.value)}
                          style={{ ...S.select, padding: "3px 6px", fontSize: ".73rem" }}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={S.td}>{String(o.orderDate).slice(0, 10)}</td>
                      <td style={S.td}>
                        <button onClick={() => del(o.id)} style={S.btnSm(C.danger)}>
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
      <AIBox context={{ orders }} placeholder="e.g. What's our COD failure rate? Which orders need urgent follow-up?" color={C.primary} />
      {modal && (
        <Modal title="Create Order" onClose={() => setModal(false)} onSave={save} wide color={C.primary}>
          <div style={S.formGrid}>
            <Field label="Date" name="orderDate" value={form.orderDate} onChange={upd} type="date" />
            <Field label="Customer Name" name="customerName" value={form.customerName} onChange={upd} full placeholder="Type customer name" />
            <Field label="Payment Method" name="paymentMethod" value={form.paymentMethod} onChange={upd} options={PAY_METHODS} />
            <Field label="Source" name="source" value={form.source} onChange={upd} options={MKT_CHANNELS} />
            <Field label="Status" name="status" value={form.status} onChange={upd} options={ORDER_STATUSES} />
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

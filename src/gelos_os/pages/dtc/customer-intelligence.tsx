import { useEffect, useMemo, useState } from "react";
import { C, CUST_SEGMENTS, MKT_CHANNELS } from "../../constants";
import { bc, fmtGHS, getProd, today, uid } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, Field, Modal, SearchBar } from "../../ui";

type ApiCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  source: string | null;
  segment: string;
  joinDate: string;
  notes: string | null;
  totalOrders: number;
  ltv: number;
  lastPurchase: string | null;
  favSku: string | null;
};

type ApiOrderRow = {
  id: string;
  externalId: string | null;
  items: any[];
  total: number;
  currency: string | null;
  paymentMethod: string;
  source: string;
  status: string;
  orderDate: string;
};

export function CustomerIntelligence() {
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<ApiCustomer | null>(null);
  const [detailOrders, setDetailOrders] = useState<ApiOrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [segF, setSegF] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", phone: "", email: "", location: "", source: MKT_CHANNELS[0], segment: "New", joinDate: today(), notes: "" });
  const upd = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));

  const load = async (oid?: string | null) => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (oid) qs.set("orgId", oid);
      if (search.trim()) qs.set("q", search.trim());
      if (segF) qs.set("segment", segF);
      const r = await fetch(`/api/customers?${qs.toString()}`, { credentials: "include" });
      const d = await r.json();
      setOrgId(d.orgId ?? oid ?? null);
      setCustomers(d.customers ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load customers");
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
    const t = setTimeout(() => load(orgId), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, segF]);

  const save = async () => {
    if (!form.name.trim()) return alert("Name required");
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("orgId", orgId);
      const r = await fetch(`/api/customers?${qs.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "Failed to create customer");
      setCustomers((cs) => [d.customer, ...cs]);
      setModal(false);
      setForm({ name: "", phone: "", email: "", location: "", source: MKT_CHANNELS[0], segment: "New", joinDate: today(), notes: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const hay = `${c.name} ${c.phone ?? ""} ${c.location ?? ""} ${c.email ?? ""}`.toLowerCase();
      return (!q || hay.includes(q)) && (!segF || c.segment === segF);
    });
  }, [customers, search, segF]);

  const openDetail = async (c: ApiCustomer) => {
    setDetail(c);
    setDetailOrders([]);
    try {
      const r = await fetch(`/api/customers/${encodeURIComponent(c.id)}/orders`, { credentials: "include" });
      const d = await r.json();
      setDetailOrders(d.orders ?? []);
    } catch {
      setDetailOrders([]);
    }
  };

  const del = async (id: string) => {
    if (!window.confirm("Delete?")) return;
    const prev = customers;
    setCustomers((cs) => cs.filter((c) => c.id !== id));
    try {
      const r = await fetch(`/api/customers/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "Failed to delete customer");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete customer");
      setCustomers(prev);
    }
  };

  return (
    <div>
      <div style={S.statGrid}>
        {CUST_SEGMENTS.map((seg) => {
          const [c, bg] = bc(seg);
          const count = customers.filter((x) => x.segment === seg).length;
          return (
            <div key={seg} style={{ ...S.statCard(c), background: bg }}>
              <div style={{ fontSize: ".7rem", fontWeight: 700, color: c }}>{seg.toUpperCase()}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: c }}>{count}</div>
            </div>
          );
        })}
        <div style={S.statCard(C.purple)}>
          <div style={{ fontSize: ".7rem", color: "#888" }}>Total LTV</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: C.purple }}>{fmtGHS(customers.reduce((s, c) => s + (Number(c.ltv) || 0), 0))}</div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader(C.purple)}>
          <span style={{ fontWeight: 700, color: C.purple, fontSize: ".85rem" }}>Customer Intelligence ({rows.length})</span>
          <button onClick={() => setModal(true)} style={S.btnSm(C.purple)}>
            + Add Customer
          </button>
        </div>
        {err && <div style={{ padding: "10px 16px", color: C.danger, fontWeight: 700, fontSize: ".85rem" }}>{err}</div>}
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
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#aaa" }}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {rows.map((c: any) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => openDetail(c)}>
                  <td style={{ ...S.td, fontWeight: 700, color: C.purple }}>{c.name}</td>
                  <td style={S.td}>{c.phone}</td>
                  <td style={S.td}>{c.location}</td>
                  <td style={S.td}>{c.source}</td>
                  <td style={S.td}>
                    <Badge s={c.segment} />
                  </td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{c.totalOrders}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: C.purple }}>{fmtGHS(c.ltv)}</td>
                  <td style={S.td}>{c.lastPurchase ? String(c.lastPurchase).slice(0, 10) : "—"}</td>
                  <td style={S.td} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => del(c.id)} style={S.btnSm(C.danger)}>
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
                {detailOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#aaa" }}>
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  detailOrders.map((o: any) => (
                    <tr key={o.id}>
                      <td style={{ ...S.td, fontWeight: 700, fontSize: ".72rem", color: C.primary }}>{o.externalId ?? o.id}</td>
                      <td style={S.td}>{o.items.map((i: any) => `${getProd(i.sku).name.split(" ").slice(1, 3).join(" ")} x${i.qty}`).join(", ")}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: C.success }}>{fmtGHS(o.total)}</td>
                      <td style={S.td}>
                        <Badge s={o.paymentMethod} />
                      </td>
                      <td style={S.td}>
                        <Badge s={o.status} />
                      </td>
                      <td style={S.td}>{String(o.orderDate).slice(0, 10)}</td>
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

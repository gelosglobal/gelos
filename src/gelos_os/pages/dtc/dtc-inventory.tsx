import { useEffect, useMemo, useState } from "react";
import { C, PRODUCTS, SKUS } from "../../constants";
import { fmtGHS, getProd, pctOf } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, Field, Modal } from "../../ui";

type Item = { id: string; sku: string; stock: number; reorder: number; velocity: number };

export function DTCInventory() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [stockMode, setStockMode] = useState<"set" | "adjust">("set");
  const [form, setForm] = useState<any>({
    sku: SKUS[0],
    stock: 0,
    adjustBy: 0,
    reorder: 0,
    velocity: 0,
  });

  const upd = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));

  async function safeJson(r: Response) {
    const ct = r.headers.get("content-type") || "";
    const text = await r.text();
    if (!ct.includes("application/json")) {
      throw new Error(`API error (${r.status}): expected JSON but got ${ct || "unknown"} — ${text.slice(0, 80)}`);
    }
    return JSON.parse(text);
  }

  const load = async (oid?: string | null) => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (oid) qs.set("orgId", oid);
      const r = await fetch(`/api/dtc-inventory?${qs.toString()}`, { credentials: "include" });
      const d = await safeJson(r);
      setOrgId(d.orgId ?? oid ?? null);
      setItems(d.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load inventory");
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

  const bySku = useMemo(() => new Map(items.map((i) => [i.sku, i])), [items]);
  const selectedSku = String(form.sku ?? SKUS[0]);
  const selectedProd = getProd(selectedSku);
  const selectedExisting = bySku.get(selectedSku);
  const selectedMargin =
    selectedProd.price ? Math.round(((selectedProd.price - selectedProd.cost) / selectedProd.price) * 100) : 0;
  const selectedDaysLeft =
    (((selectedExisting?.velocity ?? Number(form.velocity)) || 0) > 0)
      ? Math.round(
          (((selectedExisting?.stock ?? Number(form.stock)) || 0) /
            (((selectedExisting?.velocity ?? Number(form.velocity)) || 1) as number)) as number,
        )
      : 99;
  const rows = useMemo(() => {
    // Ensure every SKU is visible (even if not in DB yet)
    return SKUS.map((sku) => {
      const found = bySku.get(sku);
      return (
        found ?? {
          id: "",
          sku,
          stock: 0,
          reorder: 0,
          velocity: 0,
        }
      );
    });
  }, [bySku]);

  const upsertSku = async (sku: string, patch: Partial<Pick<Item, "stock" | "reorder" | "velocity">>) => {
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("orgId", orgId);
      const body = { sku, ...patch };
      const r = await fetch(`/api/dtc-inventory?${qs.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error ?? "Update failed");
      const it: Item = d.item;
      setItems((prev) => {
        const exists = prev.find((x) => x.id === it.id);
        if (exists) return prev.map((x) => (x.id === it.id ? it : x));
        return [it, ...prev].sort((a, b) => a.sku.localeCompare(b.sku));
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  };

  const addInventory = async () => {
    const sku = String(form.sku || "").trim();
    if (!sku) return;
    const reorder = Number(form.reorder) || 0;
    const velocity = Number(form.velocity) || 0;
    const nextStock =
      stockMode === "set"
        ? Number(form.stock) || 0
        : (selectedExisting?.stock ?? 0) + (Number(form.adjustBy) || 0);

    await upsertSku(sku, { stock: nextStock, reorder, velocity });
    setModal(false);
    setStockMode("set");
    setForm({ sku: SKUS[0], stock: 0, adjustBy: 0, reorder: 0, velocity: 0 });
  };

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardHeader(C.teal)}>
          <span style={{ fontWeight: 700, color: C.teal, fontSize: ".85rem" }}>DTC Inventory</span>
          <button onClick={() => setModal(true)} style={S.btnSm(C.teal)}>
            + Add / Update
          </button>
        </div>
        {err && <div style={{ padding: "10px 16px", color: C.danger, fontWeight: 700, fontSize: ".85rem" }}>{err}</div>}
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
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...S.td, textAlign: "center", color: "#aaa" }}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {rows.map((i: any) => {
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
                        onChange={(e) => upsertSku(i.sku, { reorder: Number((e.target as any).value) })}
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
      <AIBox context={{ inventory: items, products: PRODUCTS }} placeholder="e.g. Which SKUs to reorder this week?" color={C.teal} />

      {modal && (
        <Modal title="Add / Update Inventory" onClose={() => setModal(false)} onSave={addInventory} color={C.teal}>
          <div style={{ ...S.card, marginBottom: 14 }}>
            <div style={S.cardHeader(C.teal)}>
              <span style={{ fontWeight: 800, color: C.teal, fontSize: ".85rem" }}>Preview</span>
              <span style={{ fontSize: ".78rem", color: "#94a3b8" }}>
                {selectedExisting ? "Existing SKU" : "New SKU"}
              </span>
            </div>
            <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900, color: C.teal, fontSize: ".95rem" }}>{selectedProd.name}</div>
                <div style={{ color: "#64748b", fontSize: ".8rem", marginTop: 4 }}>
                  SKU <b>{selectedSku}</b> · Margin{" "}
                  <b style={{ color: selectedMargin > 40 ? C.success : C.warn }}>{selectedMargin}%</b>
                </div>
                <div style={{ color: "#94a3b8", fontSize: ".78rem", marginTop: 6 }}>
                  Cost {fmtGHS(selectedProd.cost)} · Price {fmtGHS(selectedProd.price)}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#f7f9fb", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: ".68rem", color: "#94a3b8", fontWeight: 800 }}>Current stock</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 900, color: C.primary }}>{selectedExisting?.stock ?? 0}</div>
                </div>
                <div style={{ background: "#f7f9fb", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: ".68rem", color: "#94a3b8", fontWeight: 800 }}>Days left</div>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 900,
                      color: selectedDaysLeft < 7 ? C.danger : selectedDaysLeft < 14 ? C.warn : C.success,
                    }}
                  >
                    {Number.isFinite(selectedDaysLeft) ? selectedDaysLeft : "—"}d
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={S.formGrid}>
            <Field
              label="SKU"
              name="sku"
              value={form.sku}
              onChange={(e: any) => {
                upd(e);
                const nextSku = String(e.target.value);
                const ex = bySku.get(nextSku);
                setForm((f: any) => ({
                  ...f,
                  stock: ex?.stock ?? 0,
                  reorder: ex?.reorder ?? 0,
                  velocity: ex?.velocity ?? 0,
                  adjustBy: 0,
                }));
              }}
              options={SKUS.map((s) => ({ value: s, label: `${s} · ${getProd(s).name}` }))}
              full
            />

            <div style={{ ...S.fg(false), gridColumn: "span 2" }}>
              <label style={S.label}>Stock update mode</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setStockMode("set")}
                  style={S.btn(stockMode === "set" ? "#fff" : "#555", stockMode === "set" ? C.teal : "#eee")}
                >
                  Set stock
                </button>
                <button
                  type="button"
                  onClick={() => setStockMode("adjust")}
                  style={S.btn(stockMode === "adjust" ? "#fff" : "#555", stockMode === "adjust" ? C.teal : "#eee")}
                >
                  Adjust stock (+/-)
                </button>
              </div>
            </div>

            {stockMode === "set" ? (
              <Field label="Stock (set)" name="stock" value={form.stock} onChange={upd} type="number" />
            ) : (
              <Field label="Adjust by (e.g. 12 or -3)" name="adjustBy" value={form.adjustBy} onChange={upd} type="number" />
            )}

            <Field label="Reorder threshold" name="reorder" value={form.reorder} onChange={upd} type="number" />
            <Field label="Velocity (units/day)" name="velocity" value={form.velocity} onChange={upd} type="number" />
          </div>
        </Modal>
      )}
    </div>
  );
}

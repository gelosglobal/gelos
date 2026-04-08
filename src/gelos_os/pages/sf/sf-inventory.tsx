import { useState } from "react";
import { C, REPS } from "../../constants";
import { fmtGHS, pctOf, today, uid } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, Field, Modal, SearchBar } from "../../ui";
import { useSFFilter } from "./filter";

export function SFInventory({ data, view, rep, onAdd, onDelete }: any) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>({
    product: "",
    sku: "",
    stock: 0,
    reorder: 50,
    unit: "Cases",
    rep: view === "rep" ? rep : REPS[0],
    updated: today(),
  });
  const upd = (e: any) =>
    setForm((f: any) => ({
      ...f,
      [e.target.name]: ["stock", "reorder"].includes(e.target.name) ? Number(e.target.value) : e.target.value,
    }));
  const rows = useSFFilter(data.sfInventory, view, rep).filter((i: any) => !search || (i.product + i.sku).toLowerCase().includes(search.toLowerCase()));
  const save = () => {
    if (!form.product.trim()) return alert("Product required");
    onAdd("sfInventory", { ...form, id: uid() });
    setModal(false);
  };
  return (
    <div>
      <div style={S.card}>
        <div style={S.cardHeader(C.teal)}>
          <span style={{ fontWeight: 700, color: C.teal, fontSize: ".85rem" }}>SF Inventory ({rows.length})</span>
          <button onClick={() => setModal(true)} style={S.btnSm(C.teal)}>
            + Add Product
          </button>
        </div>
        <SearchBar value={search} onChange={setSearch} />
        <table style={S.table}>
          <thead>
            <tr>
              {["Product", "SKU", "Stock", "Reorder", "Unit", "Updated", "Status", ""].map((h) => (
                <th key={h} style={S.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((i: any) => {
              const isLow = i.stock <= i.reorder;
              return (
                <tr key={i.id}>
                  <td style={{ ...S.td, fontWeight: 700 }}>{i.product}</td>
                  <td style={{ ...S.td, fontSize: ".71rem", color: "#888" }}>{i.sku}</td>
                  <td style={S.td}>
                    <span style={{ fontWeight: 700, color: isLow ? C.danger : C.success }}>{i.stock}</span>
                    <div style={{ background: "#eee", borderRadius: 3, height: 5, marginTop: 3, width: 55 }}>
                      <div style={{ background: isLow ? C.danger : C.success, width: Math.min(100, pctOf(i.stock, i.reorder * 2)) + "%", height: 5, borderRadius: 3 }} />
                    </div>
                  </td>
                  <td style={S.td}>{i.reorder}</td>
                  <td style={S.td}>{i.unit}</td>
                  <td style={S.td}>{i.updated}</td>
                  <td style={S.td}>
                    <Badge s={isLow ? "Low Stock" : "OK"} />
                  </td>
                  <td style={S.td}>
                    <button onClick={() => onDelete("sfInventory", i.id)} style={S.btnSm(C.danger)}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AIBox context={{ sfInventory: rows }} placeholder="e.g. Which products need urgent restocking?" color={C.teal} />
      {modal && (
        <Modal title="Add Product" onClose={() => setModal(false)} onSave={save} color={C.teal}>
          <div style={S.formGrid}>
            <Field label="Product Name" name="product" value={form.product} onChange={upd} full />
            <Field label="SKU" name="sku" value={form.sku} onChange={upd} />
            <Field label="Stock" name="stock" value={form.stock} onChange={upd} type="number" />
            <Field label="Reorder Level" name="reorder" value={form.reorder} onChange={upd} type="number" />
            <Field label="Unit" name="unit" value={form.unit} onChange={upd} options={["Cases", "Cartons", "Units", "Pallets"]} />
            <Field label="Rep" name="rep" value={form.rep} onChange={upd} options={view === "rep" ? [rep] : REPS} />
            <Field label="Updated" name="updated" value={form.updated} onChange={upd} type="date" />
          </div>
        </Modal>
      )}
    </div>
  );
}

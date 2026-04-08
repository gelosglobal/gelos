import { useState } from "react";
import { C } from "../../constants";
import { filterByTime, today, uid } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, Field, Modal, SearchBar, TimeFilter } from "../../ui";
import { useSFFilter } from "./filter";

export function makeSimplePage(
  title: string,
  key: string,
  color: string,
  columns: any[],
  formFields: any,
  emptyRow: any,
  btnLabel?: string,
) {
  return function SimplePage({ data, view, rep, onAdd, onDelete }: any) {
    const [modal, setModal] = useState(false);
    const [search, setSearch] = useState("");
    const [tf, setTf] = useState("All Time");
    const [form, setForm] = useState<any>({ ...emptyRow, date: today() });

    let rows = useSFFilter(data[key], view, rep);
    if (rows[0]?.date) rows = filterByTime(rows, tf);
    rows = rows.filter((r: any) => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

    const upd = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));
    const save = () => {
      onAdd(key, { ...form, id: uid() });
      setModal(false);
    };

    return (
      <div>
        {data[key][0]?.date && <TimeFilter value={tf} onChange={setTf} />}
        <div style={S.card}>
          <div style={S.cardHeader(color)}>
            <span style={{ fontWeight: 700, color, fontSize: ".85rem" }}>
              {title} ({rows.length})
            </span>
            <button onClick={() => setModal(true)} style={S.btnSm(color)}>
              {btnLabel || "+ Add"}
            </button>
          </div>
          <SearchBar value={search} onChange={setSearch} />
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {[...columns.map((c) => c.label), ""].map((h: string, i: number) => (
                    <th key={i} style={S.th}>
                        {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} style={{ ...S.td, textAlign: "center", color: "#aaa" }}>
                      No records
                    </td>
                  </tr>
                ) : (
                  rows
                    .slice()
                    .reverse()
                    .map((r: any) => (
                      <tr key={r.id}>
                        {columns.map((c: any, i: number) => (
                          <td key={i} style={S.td}>
                            {c.badge ? <Badge s={r[c.key]} /> : c.fmt ? c.fmt(r[c.key]) : r[c.key]}
                          </td>
                        ))}
                        <td style={S.td}>
                          <button onClick={() => onDelete(key, r.id)} style={S.btnSm(C.danger)}>
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
        <AIBox context={{ [key]: rows }} placeholder={`Ask AI about your ${title.toLowerCase()}...`} color={color} />
        {modal && (
          <Modal title={btnLabel || "Add Record"} onClose={() => setModal(false)} onSave={save} color={color}>
            <div style={S.formGrid}>{formFields(form, upd, data, view, rep)}</div>
          </Modal>
        )}
      </div>
    );
  };
}

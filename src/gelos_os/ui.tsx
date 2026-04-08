import { useState } from "react";
import { C, TIME_FILTERS } from "./constants";
import { askAI, bc } from "./lib";
import { S } from "./styles";

export function Badge({ s }: { s: string }) {
  const [c, bg] = bc(s);
  return <span style={S.badge(c, bg)}>{s}</span>;
}

type FieldOption = string | { value: string; label: string };

export function Field(props: {
  label: string;
  name: string;
  value: any;
  onChange: any;
  type?: string;
  options?: readonly FieldOption[];
  full?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const { label, name, value, onChange, type = "text", options, full, placeholder, readOnly } = props;
  return (
    <div style={S.fg(full)}>
      <label style={S.label}>{label}</label>
      {options ? (
        <select name={name} value={value} onChange={onChange} style={S.select}>
          {options.map((o) => (
            <option key={(o as any).value || (o as any)} value={(o as any).value || (o as any)}>
              {(o as any).label || (o as any)}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder || ""}
          style={{ ...S.input, minHeight: 72, resize: "vertical" }}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder || ""}
          readOnly={readOnly}
          style={{ ...S.input, background: readOnly ? "#f5f5f5" : "" }}
        />
      )}
    </div>
  );
}

export function Modal(props: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: any;
  wide?: boolean;
  color?: string;
}) {
  const { title, onClose, onSave, children, wide, color } = props;
  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modal, width: wide ? 700 : 600, borderTop: `3px solid ${color || C.primary}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: color || C.primary, fontSize: "1.12rem" }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "1.35rem", cursor: "pointer", color: "#aaa", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        {children}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={S.btn("#444", "#eee")}>
            Cancel
          </button>
          <button onClick={onSave} style={S.btn("#fff", color || C.primary)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AIBox({ context, placeholder, color }: { context: any; placeholder?: string; color?: string }) {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState("");
  const [load, setLoad] = useState(false);
  const ask = async () => {
    if (!q.trim()) return;
    setLoad(true);
    setAns("");
    const a = await askAI(q, context);
    setAns(a);
    setLoad(false);
  };
  return (
    <div style={S.card}>
      <div style={S.cardHeader(color || C.teal)}>
        <span style={{ fontWeight: 700, color: color || C.teal, fontSize: ".95rem" }}>🤖 AI Insights</span>
        <span style={{ fontSize: ".78rem", color: "#aaa" }}>Powered by Claude</span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder={placeholder || "Ask AI..."}
            style={{ ...S.input, flex: 1 }}
          />
          <button onClick={ask} disabled={load} style={S.btn("#fff", color || C.teal)}>
            {load ? "..." : "Ask"}
          </button>
        </div>
        {ans && (
          <div style={S.aiBox}>
            <b style={{ color: color || C.teal, fontSize: ".82rem" }}>AI RESPONSE</b>
            <br />
            <br />
            {ans}
          </div>
        )}
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, children }: { value: string; onChange: (v: string) => void; children?: any }) {
  return (
    <div style={{ padding: "11px 16px", borderBottom: "1px solid #eee", display: "flex", gap: 11, flexWrap: "wrap" }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
        style={{ ...S.input, flex: 1, minWidth: 130 }}
      />
      {children}
    </div>
  );
}

export function TimeFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {TIME_FILTERS.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          style={{
            padding: "6px 14px",
            border: `1px solid ${value === tf ? C.sfBlue : "#dde3ea"}`,
            borderRadius: 20,
            fontSize: ".84rem",
            cursor: "pointer",
            fontWeight: value === tf ? 700 : 400,
            background: value === tf ? "#e8f0fe" : "#fff",
            color: value === tf ? C.sfBlue : "#555",
          }}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, max ? Math.round((value / max) * 100) : 0);
  const c = color || (pct >= 100 ? C.success : pct >= 60 ? C.warn : C.danger);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, background: "#eee", borderRadius: 5, height: 9 }}>
        <div style={{ width: pct + "%", height: 9, borderRadius: 5, background: c, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: ".82rem", fontWeight: 700, color: c, minWidth: 38 }}>{pct}%</span>
    </div>
  );
}


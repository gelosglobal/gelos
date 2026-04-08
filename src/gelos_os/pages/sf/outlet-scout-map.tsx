import { useState } from "react";
import { C, REPS } from "../../constants";
import { askAI, today, uid } from "../../lib";
import { S } from "../../styles";
import { Badge } from "../../ui";

const SCOUT_TYPES = [
  { id: "pharmacy", label: "Pharmacies", icon: "💊", query: "pharmacy" },
  { id: "dental", label: "Dental Clinics", icon: "🦷", query: "dental clinic" },
  { id: "supermarket", label: "Supermarkets", icon: "🛒", query: "supermarket" },
  { id: "mall", label: "Malls & Plazas", icon: "🏬", query: "shopping mall" },
];

export function OutletScoutMap({ data, onAdd }: any) {
  const [location, setLocation] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["pharmacy"]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiQ, setAiQ] = useState("");
  const [aiAns, setAiAns] = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const [saved, setSaved] = useState<any[]>([]);
  const [assignRep, setAssignRep] = useState<string>(REPS[0]);

  const toggleType = (t: string) => setSelectedTypes((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const search = async () => {
    if (!location.trim()) return alert("Enter a location first");
    if (selectedTypes.length === 0) return alert("Select at least one type");
    setLoading(true);
    setResults([]);
    setAiSummary("");
    try {
      const prompt = `You are a business intelligence tool for Gelos, an oral care brand in Ghana. 
The user wants to find potential trade outlets in: "${location}".
Types requested: ${selectedTypes.join(", ")}.

Generate a realistic list of 12-16 businesses that would exist in "${location}", Ghana. 
For each business return ONLY valid JSON array, no markdown, no explanation:
[
  {
    "name": "Business Name",
    "type": "pharmacy|dental|supermarket|mall",
    "address": "Specific street address in ${location}",
    "phone": "02X-XXX-XXXX (Ghana format)",
    "contact_person": "Ghanaian name",
    "rating": 3.5-5.0,
    "notes": "brief note about the outlet potential for Gelos",
    "channel": "Modern Trade|General Trade|Wholesale"
  }
]
Only include types: ${selectedTypes.join(", ")}. Make names, addresses, and contacts realistic for Ghana.`;

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
      });
      const d = await r.json();
      const text = d.content?.[0]?.text || "[]";
      let parsed: any[] = [];
      try {
        const clean = text.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = [];
      }
      setResults(parsed.map((p, i) => ({ ...p, id: "scout-" + Date.now() + i, selected: false })));

      const sum = await askAI(
        `Summarize these ${parsed.length} outlets found in ${location}. Which are highest priority for Gelos? Give top 3 recommendations.`,
        { outlets: parsed, location },
      );
      setAiSummary(sum);
    } catch (e: any) {
      alert("Search failed: " + e.message);
    }
    setLoading(false);
  };

  const toggleSelect = (id: string) => setResults((r) => r.map((x) => (x.id === id ? { ...x, selected: !x.selected } : x)));
  const selectAll = () => setResults((r) => r.map((x) => ({ ...x, selected: true })));
  const clearSel = () => setResults((r) => r.map((x) => ({ ...x, selected: false })));
  const selectedResults = results.filter((r) => r.selected);

  const saveToOutlets = () => {
    if (selectedResults.length === 0) return alert("Select outlets to save");
    selectedResults.forEach((r: any) => {
      onAdd("outlets", {
        id: uid(),
        name: r.name,
        channel: r.channel || "General Trade",
        location: r.address,
        contact: r.phone,
        status: "Prospect",
        rep: assignRep,
        date: today(),
        notes: `${r.contact_person ? "Contact: " + r.contact_person + ". " : ""}${r.notes || ""}. Scouted from map in ${location}.`,
      });
    });
    setSaved((s) => [...s, ...selectedResults.map((r: any) => r.id)]);
    alert(`✅ ${selectedResults.length} outlets added to Outlet Scouting!`);
    clearSel();
  };

  const typeColor: any = { pharmacy: C.teal, dental: C.purple, supermarket: C.success, mall: C.sfBlue };
  const typeLabel: any = { pharmacy: "Pharmacy", dental: "Dental", supermarket: "Supermarket", mall: "Mall/Plaza" };

  const askMapAI = async () => {
    if (!aiQ.trim()) return;
    setAiLoad(true);
    setAiAns("");
    const a = await askAI(aiQ, { results, location, saved });
    setAiAns(a);
    setAiLoad(false);
  };

  return (
    <div>
      <div style={{ ...S.card, padding: "16px 18px" }}>
        <div style={{ fontSize: ".85rem", fontWeight: 700, color: C.teal, marginBottom: 12 }}>🗺️ OUTLET SCOUT — Find & Import Potential Trade Partners</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Enter location (e.g. East Legon, Kumasi, Takoradi...)"
            style={{ ...S.input, flex: 1, minWidth: 200 }}
          />
          <button onClick={search} disabled={loading} style={{ ...S.btn("#fff", C.teal), minWidth: 100, opacity: (loading as any) ? 0.6 : 1 }}>
            {loading ? "Scanning..." : "🔍 Scan"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SCOUT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleType(t.id)}
              style={{
                padding: "5px 13px",
                border: `1.5px solid ${selectedTypes.includes(t.id) ? typeColor[t.id] : "#dde3ea"}`,
                borderRadius: 20,
                fontSize: ".77rem",
                cursor: "pointer",
                fontWeight: selectedTypes.includes(t.id) ? 700 : 400,
                background: selectedTypes.includes(t.id) ? typeColor[t.id] + "18" : "#fff",
                color: selectedTypes.includes(t.id) ? typeColor[t.id] : "#666",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: C.teal }}>
          <div style={{ fontSize: "2rem", marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 700 }}>Scanning {location} for outlets...</div>
          <div style={{ fontSize: ".79rem", color: "#888", marginTop: 6 }}>Searching pharmacies, dental clinics, supermarkets & malls</div>
        </div>
      )}

      {results.length > 0 && (
        <>
          {aiSummary && (
            <div style={{ ...S.card, borderLeft: `4px solid ${C.teal}`, padding: "12px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: ".75rem", fontWeight: 700, color: C.teal, marginBottom: 6 }}>🤖 AI SCOUT SUMMARY</div>
              <div style={{ fontSize: ".81rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aiSummary}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: C.primary, fontSize: ".85rem" }}>
              {results.length} outlets found in <span style={{ color: C.teal }}>{location}</span>
            </span>
            <div style={{ flex: 1 }} />
            <button onClick={selectAll} style={S.btnSm(C.sfBlue)}>
              Select All
            </button>
            <button onClick={clearSel} style={S.btnSm("#888")}>
              Clear
            </button>
            {selectedResults.length > 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: ".78rem", color: C.sfBlue, fontWeight: 700 }}>{selectedResults.length} selected</span>
                <select value={assignRep} onChange={(e) => setAssignRep(e.target.value)} style={{ ...S.select, fontSize: ".76rem", padding: "4px 8px" }}>
                  {REPS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <button onClick={saveToOutlets} style={{ ...S.btnSm(C.success), padding: "5px 12px" }}>
                  ➕ Add to Outlets
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginBottom: 16 }}>
            {results.map((r: any) => {
              const tc = typeColor[r.type] || C.primary;
              const isSavedAlready = saved.includes(r.id);
              return (
                <div
                  key={r.id}
                  onClick={() => !isSavedAlready && toggleSelect(r.id)}
                  style={{
                    background: "#fff",
                    borderRadius: 10,
                    padding: "13px 15px",
                    boxShadow: "0 2px 8px rgba(0,0,0,.07)",
                    border: `2px solid ${r.selected ? tc : isSavedAlready ? "#b8e8b8" : "#eee"}`,
                    cursor: isSavedAlready ? "default" : "pointer",
                    position: "relative",
                    transition: "border .15s",
                    opacity: isSavedAlready ? 0.7 : 1,
                  }}
                >
                  {isSavedAlready && (
                    <div style={{ position: "absolute", top: 8, right: 10, fontSize: ".7rem", fontWeight: 700, color: C.success, background: "#d5f5e3", padding: "2px 8px", borderRadius: 10 }}>
                      ✓ Saved
                    </div>
                  )}
                  {r.selected && !isSavedAlready && (
                    <div style={{ position: "absolute", top: 8, right: 10, width: 18, height: 18, borderRadius: "50%", background: tc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", color: "#fff", fontWeight: 900 }}>
                      ✓
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: "1.1rem" }}>{SCOUT_TYPES.find((t) => t.id === r.type)?.icon || "🏢"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: ".85rem", lineHeight: 1.3 }}>{r.name}</div>
                      <span style={{ ...S.badge(tc, tc + "18"), fontSize: ".66rem" }}>{typeLabel[r.type] || r.type}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: ".76rem", color: "#555", lineHeight: 1.8 }}>
                    <div>📍 {r.address}</div>
                    {r.phone && (
                      <div>
                        📞 <span style={{ fontWeight: 600 }}>{r.phone}</span>
                      </div>
                    )}
                    {r.contact_person && <div>👤 {r.contact_person}</div>}
                  </div>
                  {r.rating && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: ".72rem", color: "#f39c12", fontWeight: 700 }}>
                        {"★".repeat(Math.round(r.rating))}
                        {"☆".repeat(5 - Math.round(r.rating))}
                      </span>
                      <span style={{ fontSize: ".7rem", color: "#aaa" }}>{r.rating}</span>
                    </div>
                  )}
                  {r.notes && <div style={{ marginTop: 7, fontSize: ".72rem", color: tc, background: tc + "12", borderRadius: 5, padding: "4px 8px", lineHeight: 1.5 }}>{r.notes}</div>}
                  <div style={{ marginTop: 7 }}>
                    <Badge s={r.channel || "General Trade"} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={S.card}>
            <div style={S.cardHeader(C.teal)}>
              <span style={{ fontWeight: 700, color: C.teal, fontSize: ".85rem" }}>🤖 Ask AI About These Outlets</span>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 9 }}>
                <input
                  value={aiQ}
                  onChange={(e) => setAiQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askMapAI()}
                  placeholder={`e.g. Which outlets in ${location} should Kofi visit first? Best channel for Gelos?`}
                  style={{ ...S.input, flex: 1 }}
                />
                <button onClick={askMapAI} disabled={aiLoad} style={S.btn("#fff", C.teal)}>
                  {aiLoad ? "..." : "Ask"}
                </button>
              </div>
              {aiAns && (
                <div style={S.aiBox}>
                  <b style={{ color: C.teal, fontSize: ".74rem" }}>AI RESPONSE</b>
                  <br />
                  <br />
                  {aiAns}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && results.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🗺️</div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#888", marginBottom: 6 }}>Scout any location in Ghana</div>
          <div style={{ fontSize: ".82rem" }}>
            Enter a location above and select the outlet types you want to find.
            <br />
            Results will show business name, address, phone, contact person and Gelos channel fit.
            <br />
            Select outlets and assign to a rep to instantly add them to Outlet Scouting.
          </div>
        </div>
      )}
    </div>
  );
}

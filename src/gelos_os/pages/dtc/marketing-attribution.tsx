import { useEffect, useMemo, useState } from "react";
import { C, MKT_CHANNELS } from "../../constants";
import { fmtGHS, pctOf, today, uid } from "../../lib";
import { S } from "../../styles";
import { AIBox, Badge, Field, Modal } from "../../ui";

type ApiCampaign = {
  id: string;
  externalId: string | null;
  name: string;
  channel: string;
  spend: number;
  status: string;
  startDate: string;
  endDate: string | null;
};

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

async function safeJson(r: Response) {
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();
  if (!ct.includes("application/json")) {
    throw new Error(`API error (${r.status}): expected JSON but got ${ct || "unknown"} — ${text.slice(0, 80)}`);
  }
  return JSON.parse(text);
}

export function MarketingAttribution() {
  const [modal, setModal] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", channel: MKT_CHANNELS[0], spend: 0, startDate: today(), endDate: "", status: "Active" });
  const upd = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));
  const save = async () => {
    if (!form.name.trim()) return alert("Name required");
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (orgId) qs.set("orgId", orgId);
      const payload = { ...form, externalId: "CAM-" + uid() };
      const r = await fetch(`/api/campaigns?${qs.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const d = await safeJson(r);
      if (!r.ok) throw new Error(d?.error ?? "Failed to create campaign");
      setCampaigns((cs) => [d.campaign, ...cs]);
      setModal(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const snap = await fetch("/api/master/snapshot", { credentials: "include" });
        const snapJson = await safeJson(snap);
        const oid = snapJson?.orgId ?? null;
        setOrgId(oid);

        const qs = new URLSearchParams();
        if (oid) qs.set("orgId", oid);

        const [cRes, oRes] = await Promise.all([
          fetch(`/api/campaigns?${qs.toString()}`, { credentials: "include" }),
          fetch(`/api/orders?${qs.toString()}&limit=200`, { credentials: "include" }),
        ]);
        const cJson = await safeJson(cRes);
        const oJson = await safeJson(oRes);
        setCampaigns(cJson.campaigns ?? []);
        setOrders(oJson.orders ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load marketing data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const delivered = useMemo(() => orders.filter((o: any) => o.status === "Delivered"), [orders]);
  const totalRev = useMemo(() => delivered.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0), [delivered]);
  const totalSpend = useMemo(() => campaigns.reduce((s: number, c: any) => s + (Number(c.spend) || 0), 0), [campaigns]);

  const chanStats = MKT_CHANNELS.map((ch) => {
    const chOrds = delivered.filter((o: any) => o.source === ch);
    const rev = chOrds.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
    const camp = campaigns.find((c: any) => c.channel === ch);
    const spend = camp?.spend || 0;
    const roas = spend ? Math.round((rev / spend) * 100) / 100 : null;
    return { ch, orders: chOrds.length, rev, spend, roas };
  })
    .filter((c: any) => c.orders > 0 || c.spend > 0)
    .sort((a: any, b: any) => b.rev - a.rev);

  const campStats = campaigns.map((c: any) => {
    // We don't have explicit campaignId on orders yet; approximate by channel.
    const ords = delivered.filter((o: any) => o.source === c.channel);
    const rev = ords.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
    return { ...c, orders: ords.length, rev, roas: c.spend ? Math.round((rev / c.spend) * 100) / 100 : 0 };
  });

  return (
    <div>
      <div style={S.statGrid}>
        {[
          ["Total Spend", fmtGHS(totalSpend), "", C.warn],
          ["Revenue Tracked", fmtGHS(totalRev), "", C.success],
          ["Blended ROAS", (totalSpend ? Math.round((totalRev / totalSpend) * 100) / 100 : 0) + "x", "", C.teal],
          ["Active Campaigns", campaigns.filter((c: any) => c.status === "Active").length, "", C.accent],
        ].map(([l, v, _s, c]) => (
          <div key={String(l)} style={S.statCard(String(c))}>
            <div style={{ fontSize: ".7rem", color: "#888" }}>{l as any}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: c as any }}>{v as any}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={S.card}>
          <div style={S.cardHeader(C.teal)}>
            <span style={{ fontWeight: 700, color: C.teal, fontSize: ".83rem" }}>Revenue by Channel</span>
          </div>
          <div style={{ padding: "12px 14px" }}>
            {chanStats.map((c: any) => (
              <div key={c.ch} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".77rem", marginBottom: 3 }}>
                  <span style={{ fontWeight: 700 }}>{c.ch}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: C.teal, fontWeight: 700 }}>{fmtGHS(c.rev)}</span>
                    {c.roas && <span style={{ color: C.warn, fontSize: ".7rem" }}>ROAS {c.roas}x</span>}
                  </div>
                </div>
                <div style={{ background: "#eee", borderRadius: 3, height: 6 }}>
                  <div style={{ background: C.teal, width: pctOf(c.rev, totalRev) + "%", height: 6, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardHeader(C.warn)}>
            <span style={{ fontWeight: 700, color: C.warn, fontSize: ".83rem" }}>Campaigns</span>
            <button onClick={() => setModal(true)} style={S.btnSm(C.warn)}>
              + Campaign
            </button>
          </div>
          {err && <div style={{ padding: "10px 14px", color: C.danger, fontWeight: 700, fontSize: ".85rem" }}>{err}</div>}
          <div style={{ padding: "10px 14px" }}>
            {campStats.map((c: any) => (
              <div
                key={c.id}
                style={{
                  background: "#f9f9f9",
                  borderRadius: 8,
                  padding: "9px 11px",
                  marginBottom: 9,
                  border: `1px solid ${c.status === "Active" ? "#b8e8b8" : "#eee"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: ".8rem" }}>{c.name}</span>
                  <Badge s={c.status} />
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: ".73rem", color: "#888", flexWrap: "wrap" }}>
                  <span>{c.channel}</span>
                  <span>
                    Spend: <b style={{ color: C.warn }}>{fmtGHS(c.spend)}</b>
                  </span>
                  <span>
                    Rev: <b style={{ color: C.success }}>{fmtGHS(c.rev)}</b>
                  </span>
                  <span>
                    ROAS: <b style={{ color: C.teal }}>{c.roas}x</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AIBox context={{ channels: chanStats, campaigns: campStats }} placeholder="e.g. Best ROAS channel? Where to put next GHS 1000?" color={C.warn} />

      {modal && (
        <Modal title="Add Campaign" onClose={() => setModal(false)} onSave={save} color={C.warn}>
          <div style={S.formGrid}>
            <Field label="Campaign Name" name="name" value={form.name} onChange={upd} full />
            <Field label="Channel" name="channel" value={form.channel} onChange={upd} options={MKT_CHANNELS} />
            <Field label="Spend (GHS)" name="spend" value={form.spend} onChange={upd} type="number" />
            <Field label="Status" name="status" value={form.status} onChange={upd} options={["Active", "Paused", "Ended"]} />
            <Field label="Start Date" name="startDate" value={form.startDate} onChange={upd} type="date" />
            <Field label="End Date" name="endDate" value={form.endDate} onChange={upd} type="date" />
          </div>
        </Modal>
      )}
    </div>
  );
}

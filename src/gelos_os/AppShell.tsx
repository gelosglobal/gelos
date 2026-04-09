import { useCallback, useEffect, useState, type ReactNode } from "react";
import { signOut, useSession } from "../lib/auth-client";
import { C, REPS } from "./constants";
import { loadD, saveD } from "./lib";
import { SEED } from "./seed";
import { S } from "./styles";
import { MasterDashboardLive } from "./pages/master";
import {
  CustomerIntelligence,
  DTCInventory,
  FinanceLayer,
  MarketingAttribution,
  OrdersEngine,
  ProductPerformance,
} from "./pages/dtc";
import {
  B2BPayments,
  OutletScoutMap,
  OutletScouting,
  POSMTracker,
  RepPerformance,
  Reports,
  SFDashboard,
  SFInventory,
  ShopVisits,
  TargetsQuotas,
} from "./pages/sf";

const PAGES = [
  { id: "master", icon: "🏠", label: "Master Dashboard", section: "master", color: C.primary },
  { id: "dtc-orders", icon: "📦", label: "Orders Engine", section: "dtc", color: C.primary },
  { id: "dtc-customers", icon: "👥", label: "Customer Intelligence", section: "dtc", color: C.purple },
  { id: "dtc-inventory", icon: "🏭", label: "DTC Inventory", section: "dtc", color: C.teal },
  { id: "dtc-products", icon: "⭐", label: "Product Performance", section: "dtc", color: C.accent },
  { id: "dtc-marketing", icon: "📡", label: "Marketing Attribution", section: "dtc", color: C.warn },
  { id: "dtc-finance", icon: "💰", label: "Finance Layer", section: "dtc", color: C.success },
  { id: "sf-dashboard", icon: "📊", label: "SF Dashboard", section: "sf", color: C.sfBlue },
  { id: "sf-scouting", icon: "🔍", label: "Outlet Scouting", section: "sf", color: C.sfBlue },
  { id: "sf-visits", icon: "🏪", label: "Shop Visits", section: "sf", color: C.sfBlue },
  { id: "sf-posm", icon: "📌", label: "POSM Tracker", section: "sf", color: C.purple },
  { id: "sf-inventory", icon: "📦", label: "SF Inventory", section: "sf", color: C.teal },
  { id: "sf-payments", icon: "💳", label: "B2B Payments", section: "sf", color: C.sfBlue },
  { id: "sf-targets", icon: "🎯", label: "Targets & Quotas", section: "sf", color: C.sfBlue },
  { id: "sf-reps", icon: "🏆", label: "Rep Leaderboard", section: "sf", color: C.sfBlue },
  { id: "sf-reports", icon: "📈", label: "SF Reports", section: "sf", color: C.sfBlue },
  { id: "sf-scout-map", icon: "🗺️", label: "Outlet Scout Map", section: "sf", color: C.teal },
] as const;

const SECTION_LABELS: any = {
  master: null,
  dtc: ["rgba(200,150,255,.7)", "DTC / SELL-OUT"],
  sf: ["rgba(100,180,255,.7)", "SALES FORCE"],
};

export default function AppShell() {
  const { data: session } = useSession();
  const [page, setPage] = useState<string>("master");
  const [sfView, setSfView] = useState<string>("manager");
  const [sfRep, setSfRep] = useState<string>("");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setData({
        customers: await loadD("gelos3:customers", SEED.customers),
        orders: await loadD("gelos3:orders", SEED.orders),
        dtcInventory: await loadD("gelos3:dtcInventory", SEED.dtcInventory),
        campaigns: await loadD("gelos3:campaigns", SEED.campaigns),
        outlets: await loadD("gelos3:outlets", SEED.outlets),
        visits: await loadD("gelos3:visits", SEED.visits),
        posm: await loadD("gelos3:posm", SEED.posm),
        sfInventory: await loadD("gelos3:sfInventory", SEED.sfInventory),
        b2bPayments: await loadD("gelos3:b2bPayments", SEED.b2bPayments),
        targets: await loadD("gelos3:targets", SEED.targets),
      });
    })();
  }, []);

  const onAdd = useCallback((key: string, record: any) => {
    setData((d: any) => {
      const nd = { ...d, [key]: [...d[key], record] };
      saveD("gelos3:" + key, nd[key]);
      return nd;
    });
  }, []);

  const onDelete = useCallback((key: string, id: string) => {
    if (!window.confirm("Delete?")) return;
    setData((d: any) => {
      const nd = { ...d, [key]: d[key].filter((r: any) => r.id !== id) };
      saveD("gelos3:" + key, nd[key]);
      return nd;
    });
  }, []);

  const onUpdate = useCallback((key: string, record: any) => {
    setData((d: any) => {
      const nd = { ...d, [key]: d[key].map((r: any) => (r.id === record.id ? record : r)) };
      saveD("gelos3:" + key, nd[key]);
      return nd;
    });
  }, []);

  if (!data) return <div style={{ padding: 48, color: C.primary, fontFamily: "'Segoe UI',system-ui,sans-serif", fontWeight: 700, fontSize: "1.1rem" }}>⏳ Loading Gelos OS...</div>;

  const isSF = PAGES.find((p) => p.id === page)?.section === "sf";
  const cp = PAGES.find((p) => p.id === page);
  const props = { data, onAdd, onDelete, onUpdate };

  const renderPage = () => {
    if (page === "master") return <MasterDashboardLive />;
    if (page === "dtc-orders") return <OrdersEngine />;
    if (page === "dtc-customers") return <CustomerIntelligence />;
    if (page === "dtc-inventory") return <DTCInventory />;
    if (page === "dtc-products") return <ProductPerformance {...props} />;
    if (page === "dtc-marketing") return <MarketingAttribution />;
    if (page === "dtc-finance") return <FinanceLayer {...props} />;
    if (page === "sf-dashboard") return <SFDashboard {...props} view={sfView} rep={sfRep} />;
    if (page === "sf-scouting") return <OutletScouting {...props} view={sfView} rep={sfRep} />;
    if (page === "sf-visits") return <ShopVisits {...props} view={sfView} rep={sfRep} />;
    if (page === "sf-posm") return <POSMTracker {...props} view={sfView} rep={sfRep} />;
    if (page === "sf-inventory") return <SFInventory {...props} view={sfView} rep={sfRep} />;
    if (page === "sf-payments") return <B2BPayments {...props} view={sfView} rep={sfRep} />;
    if (page === "sf-targets") return <TargetsQuotas {...props} />;
    if (page === "sf-reps") return <RepPerformance {...props} />;
    if (page === "sf-reports") return <Reports {...props} />;
    if (page === "sf-scout-map") return <OutletScoutMap {...props} />;
    return null;
  };

  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <div style={S.brand}>
          <h1 style={S.brandH}>GELOS</h1>
          <p style={S.brandP}>FULL OPERATING SYSTEM v2</p>
        </div>
        <nav style={S.sidebarNav}>
          {(() => {
            let lastSection: string | null = null;
            return PAGES.flatMap((p: (typeof PAGES)[number]) => {
              const sec = p.section;
              let sectionHeader: ReactNode = null;
              if (sec !== lastSection) {
                lastSection = sec;
                const sl = SECTION_LABELS[sec as keyof typeof SECTION_LABELS];
                if (sl) sectionHeader = <div key={"s-" + sec} style={S.navSection(sl[0])}>{sl[1]}</div>;
              }
              return [sectionHeader, <div key={p.id} style={S.navA(page === p.id, p.color)} onClick={() => setPage(p.id)}>
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }} aria-hidden>{p.icon}</span>
                {p.label}
              </div>].filter(Boolean);
            });
          })()}
        </nav>
        <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,.1)", fontSize: ".72rem", color: "rgba(255,255,255,.42)", letterSpacing: 0.3 }}>
          Gelos OS v2 · DTC + Sales Force
        </div>
      </div>
      <div style={S.main}>
        <div style={S.topbar}>
          <div>
            <h2 style={{ margin: 0, color: cp?.color || C.primary, fontSize: "1.15rem", fontWeight: 700 }}>{cp?.label}</h2>
            <span style={{ fontSize: ".78rem", color: "#aaa" }}>
              {cp?.section === "dtc" ? "DTC Module" : cp?.section === "sf" ? "Sales Force Module" : "Command Center"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {session?.user && (
              <span style={{ fontSize: ".78rem", color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={session.user.email ?? ""}>
                {session.user.name || session.user.email}
              </span>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              style={{
                fontSize: ".78rem",
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #dde3ea",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                color: "#64748b",
              }}
            >
              Sign out
            </button>
            {isSF && (
              <>
                <select value={sfView} onChange={(e) => { setSfView(e.target.value); setSfRep(""); }} style={S.select}>
                  <option value="manager">Manager View</option>
                  <option value="rep">Rep View</option>
                </select>
                {sfView === "rep" && (
                  <select value={sfRep} onChange={(e) => setSfRep(e.target.value)} style={S.select}>
                    <option value="">-- Select Rep --</option>
                    {REPS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            <div style={{ fontSize: ".82rem", color: "#666", background: "#f0f2f5", padding: "6px 14px", borderRadius: 20 }}>
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
        <div style={S.content}>{renderPage()}</div>
      </div>
    </div>
  );
}


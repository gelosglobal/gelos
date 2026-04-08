import { C, PRODUCTS } from "./constants";

export const BADGE_MAP: Record<string, [string, string]> = {
  New: [C.success, "#d5f5e3"],
  Repeat: ["#1a4fa0", "#dceeff"],
  "High-Value": [C.purple, "#f0e0ff"],
  "Churn Risk": [C.danger, "#fde8e8"],
  Pending: ["#a05a00", "#ffecd4"],
  Processing: [C.teal, "#e0f7fa"],
  Shipped: ["#1a4fa0", "#dceeff"],
  Delivered: [C.success, "#d5f5e3"],
  Failed: [C.danger, "#fde8e8"],
  Refunded: ["#555", "#eee"],
  COD: ["#a05a00", "#ffecd4"],
  "Mobile Money": [C.purple, "#f5e6ff"],
  Cash: ["#555", "#eee"],
  Card: ["#1a4fa0", "#dceeff"],
  "Bank Transfer": [C.teal, "#e0f7fa"],
  Active: [C.success, "#d5f5e3"],
  Deployed: [C.success, "#d5f5e3"],
  Paid: ["#1a7a45", "#d5f5e3"],
  Partial: ["#a05a00", "#ffecd4"],
  Overdue: [C.danger, "#fde8e8"],
  OK: [C.success, "#d5f5e3"],
  "Low Stock": [C.danger, "#fde8e8"],
  "Follow-up": ["#1a4fa0", "#dceeff"],
  Completed: [C.success, "#d5f5e3"],
  "Modern Trade": ["#1a4fa0", "#dceeff"],
  "General Trade": [C.success, "#d5f5e3"],
  Wholesale: ["#a05a00", "#ffecd4"],
};

export const bc = (s: string) => BADGE_MAP[s] || (["#555", "#eee"] as const);
export const fmtGHS = (n: unknown) => "GHS " + (Number(n) || 0).toLocaleString();
export const today = () => new Date().toISOString().split("T")[0];
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
export const pctOf = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const getProd = (sku: string) => PRODUCTS.find((p) => p.sku === sku) || { name: sku, cost: 0, price: 0, category: "—" };

export function filterByTime(arr: any[], tf: string, dateKey = "date") {
  const now = new Date();
  const d = dateKey;
  if (tf === "All Time") return arr;
  return arr.filter((r) => {
    const dt = new Date(r[d]);
    if (tf === "Daily") return dt.toDateString() === now.toDateString();
    if (tf === "Weekly") {
      const w = new Date(now);
      w.setDate(now.getDate() - 7);
      return dt >= w;
    }
    if (tf === "Monthly") return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    if (tf === "Quarterly") {
      const q = Math.floor(now.getMonth() / 3);
      return Math.floor(dt.getMonth() / 3) === q && dt.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

export async function askAI(prompt: string, ctx: unknown) {
  try {
    const key = (import.meta as any)?.env?.VITE_ANTHROPIC_API_KEY || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    if (key) headers["x-api-key"] = key;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are the AI brain of Gelos Operating System — a consumer oral care brand in Ghana. You cover both DTC and B2B sales force operations. Be sharp, concise, and founder-focused. Data: ${JSON.stringify(
          ctx,
        )}`,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await r.json();
    return d.content?.[0]?.text || "No response.";
  } catch {
    return "AI unavailable.";
  }
}

export async function loadD(key: string, fb: any) {
  try {
    const r = await (window as any).storage?.get(key);
    return r ? JSON.parse(r.value) : fb;
  } catch {
    return fb;
  }
}

export async function saveD(key: string, val: any) {
  try {
    await (window as any).storage?.set(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}


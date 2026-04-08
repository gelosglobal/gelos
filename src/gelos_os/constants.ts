export const REPS = ["Kofi Mensah", "Ama Owusu", "Kweku Asante", "Abena Darko", "Yaw Boateng"] as const;
export const TRADE_CHANNELS = ["Modern Trade", "General Trade", "Wholesale"] as const;
export const POSM_TYPES = ["Banner", "Shelf Talker", "Wobbler", "Poster", "Display Stand", "Flyer"] as const;
export const VISIT_PURPOSES = ["Routine", "POSM Placement", "New Listing", "Payment Collection", "Complaint"] as const;
export const VISIT_STATUSES = ["Completed", "Pending", "Follow-up"] as const;
export const OUTLET_STATUSES = ["Active", "Pending", "Follow-up"] as const;
export const B2B_PAY_STATUSES = ["Pending", "Partial", "Paid", "Overdue"] as const;

export const PRODUCTS = [
  { sku: "GEL-TP-WTML", name: "Gelos Watermelon Toothpaste", category: "Toothpaste", cost: 8, price: 22 },
  { sku: "GEL-TP-MINT", name: "Gelos Mint Toothpaste", category: "Toothpaste", cost: 7, price: 20 },
  { sku: "GEL-TP-CHAR", name: "Gelos Charcoal Toothpaste", category: "Toothpaste", cost: 9, price: 25 },
  { sku: "GEL-FL-001", name: "Gelos Flosser", category: "Accessories", cost: 12, price: 35 },
  { sku: "GEL-WK-001", name: "Gelos Whitening Kit", category: "Kits", cost: 30, price: 85 },
  { sku: "GEL-MB-001", name: "Gelos Mouthwash", category: "Mouthwash", cost: 10, price: 28 },
] as const;

export const SKUS = PRODUCTS.map((p) => p.sku);

export const MKT_CHANNELS = [
  "TikTok",
  "Instagram",
  "WhatsApp",
  "Influencer",
  "Walk-in",
  "Referral",
  "Website",
  "Event",
] as const;

export const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Failed", "Refunded"] as const;
export const PAY_METHODS = ["Mobile Money", "Cash", "Card", "Bank Transfer", "COD"] as const;
export const CUST_SEGMENTS = ["New", "Repeat", "High-Value", "Churn Risk"] as const;
export const TIME_FILTERS = ["Daily", "Weekly", "Monthly", "Quarterly", "All Time"] as const;

export const C = {
  primary: "#1a3c5e",
  accent: "#e8a020",
  success: "#27ae60",
  danger: "#e74c3c",
  warn: "#f39c12",
  purple: "#8e44ad",
  teal: "#0097a7",
  sfBlue: "#1565c0",
} as const;


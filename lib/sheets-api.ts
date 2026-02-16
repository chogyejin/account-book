// Typed client for the internal /api/sheets Next.js route.

interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string | null;
}

// ─── Entity types ─────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  date: string;
  category: string;
  memo: string;
  amount: string;
  createdAt: string;
}

export interface IncomeItem {
  id: string;
  date: string;
  category: string;
  amount: string;
  memo: string;
  createdAt: string;
}

export interface SavingsItem {
  id: string;
  date: string;
  category: string;
  account: string;
  amount: string;
  memo: string;
  createdAt: string;
}

export interface InvestmentTransaction {
  id: string;
  date: string;
  assetId: string;
  assetName: string;
  type: string;        // "매수" | "매도"
  quantity: string;
  amount: string;
  currency: string;    // "KRW" | "USD"
  memo: string;
  createdAt: string;
  market: string;      // "KR" | "US"
}

// ─── Low-level helpers ────────────────────────────────────────────────────────

async function sheetsGet<T>(sheet: string): Promise<ApiResponse<T>> {
  const res = await fetch(`/api/sheets?sheet=${sheet}&action=list`);
  return res.json();
}

async function sheetsPost(body: Record<string, unknown>): Promise<ApiResponse> {
  const res = await fetch("/api/sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const SheetsAPI = {
  expenses: {
    list: () => sheetsGet<Expense[]>("expenses"),

    update: (original: Expense, patch: Partial<Omit<Expense, "id" | "createdAt">>) =>
      sheetsPost({ sheet: "expenses", action: "update", ...original, ...patch }),

    delete: (id: string) =>
      sheetsPost({ sheet: "expenses", action: "delete", id }),
  },

  income: {
    list: () => sheetsGet<IncomeItem[]>("income"),

    create: (data: Omit<IncomeItem, "id" | "createdAt">) =>
      sheetsPost({ sheet: "income", action: "create", ...data }),

    update: (original: IncomeItem, patch: Partial<Omit<IncomeItem, "id" | "createdAt">>) =>
      sheetsPost({ sheet: "income", action: "update", ...original, ...patch }),

    delete: (id: string) =>
      sheetsPost({ sheet: "income", action: "delete", id }),
  },

  savings: {
    list: () => sheetsGet<SavingsItem[]>("savings"),

    create: (data: Omit<SavingsItem, "id" | "createdAt">) =>
      sheetsPost({ sheet: "savings", action: "create", ...data }),

    update: (original: SavingsItem, patch: Partial<Omit<SavingsItem, "id" | "createdAt">>) =>
      sheetsPost({ sheet: "savings", action: "update", ...original, ...patch }),

    delete: (id: string) =>
      sheetsPost({ sheet: "savings", action: "delete", id }),
  },

  investments: {
    list: () => sheetsGet<InvestmentTransaction[]>("investments_transactions"),

    create: (data: Omit<InvestmentTransaction, "id" | "createdAt">) =>
      sheetsPost({ sheet: "investments_transactions", action: "create", ...data }),

    update: (original: InvestmentTransaction, patch: Partial<Omit<InvestmentTransaction, "id" | "createdAt">>) =>
      sheetsPost({ sheet: "investments_transactions", action: "update", ...original, ...patch }),

    delete: (id: string) =>
      sheetsPost({ sheet: "investments_transactions", action: "delete", id }),
  },
};

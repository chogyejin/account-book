"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

export interface SheetItem {
  id: string;
  date: string;
  category: string;
  amount: string;
}

export interface InvestmentItem {
  id: string;
  date: string;
  type: string;
  amount: string;
  name: string;
}

interface SheetsData {
  expenses: SheetItem[];
  incomes: SheetItem[];
  savings: SheetItem[];
  investments: InvestmentItem[];
  loading: boolean;
  refresh: () => void;
}

const SheetsDataContext = createContext<SheetsData | null>(null);

export function SheetsDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expenses, setExpenses] = useState<SheetItem[]>([]);
  const [incomes, setIncomes] = useState<SheetItem[]>([]);
  const [savings, setSavings] = useState<SheetItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, incRes, savRes, invRes] = await Promise.all([
        fetch("/api/sheets?sheet=expenses&action=list"),
        fetch("/api/sheets?sheet=income&action=list"),
        fetch("/api/sheets?sheet=savings&action=list"),
        fetch("/api/sheets?sheet=investments_transactions&action=list"),
      ]);
      const [expData, incData, savData, invData] = await Promise.all([
        expRes.json(),
        incRes.json(),
        savRes.json(),
        invRes.json(),
      ]);
      if (expData.success)
        setExpenses((expData.data as SheetItem[]).filter((i) => i.id));
      if (incData.success)
        setIncomes((incData.data as SheetItem[]).filter((i) => i.id));
      if (savData.success)
        setSavings((savData.data as SheetItem[]).filter((i) => i.id));
      if (invData.success)
        setInvestments((invData.data as InvestmentItem[]).filter((i) => i.id));
    } catch {
      // silently fail - show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchAll();
  }, [fetchAll]);

  return (
    <SheetsDataContext.Provider
      value={{
        expenses,
        incomes,
        savings,
        investments,
        loading,
        refresh: fetchAll,
      }}
    >
      {children}
    </SheetsDataContext.Provider>
  );
}

export function useSheetsData() {
  const ctx = useContext(SheetsDataContext);
  if (!ctx)
    throw new Error("useSheetsData must be used within SheetsDataProvider");
  return ctx;
}

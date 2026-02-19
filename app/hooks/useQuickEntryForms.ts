import { useState } from "react";
import API from "../../lib/api";
import { SheetsAPI } from "../../lib/sheets-api";
import { getTodayString } from "../../lib/utils";

interface ToastFunction {
  (message: string, type: "success" | "error" | "warning"): void;
}

interface ExpenseFormData {
  date: string;
  amount: string;
  memo: string;
}

interface IncomeFormData {
  date: string;
  amount: string;
  memo: string;
}

interface SavingsFormData {
  date: string;
  amount: string;
  account: string;
  memo: string;
}

interface InvestmentFormData {
  date: string;
  type: string;
  assetId: string;
  assetName: string;
  quantity: string;
  amount: string;
  currency: string;
  market: string;
  memo: string;
}

export function useExpenseForm(showToast: ToastFunction) {
  const today = getTodayString();
  const [form, setForm] = useState<ExpenseFormData>({
    date: today,
    amount: "",
    memo: "",
  });
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      showToast("카테고리를 선택해주세요 ⚠️", "warning");
      return;
    }
    if (!form.date || !form.amount) {
      showToast("날짜와 금액을 입력해주세요 ⚠️", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await API.createExpense({ ...form, category });
      setLoading(false);

      if (res.success) {
        showToast("지출이 기록되었습니다 ✅", "success");
        setForm({ date: today, amount: "", memo: "" });
        setCategory("");
      } else {
        showToast("저장에 실패했습니다 ❌", "error");
      }
    } catch {
      setLoading(false);
      showToast("저장에 실패했습니다 ❌", "error");
    }
  };

  return { form, setForm, category, setCategory, loading, handleSubmit };
}

export function useIncomeForm(showToast: ToastFunction) {
  const today = getTodayString();
  const [form, setForm] = useState<IncomeFormData>({
    date: today,
    amount: "",
    memo: "",
  });
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      showToast("카테고리를 선택해주세요 ⚠️", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await API.createIncome({ ...form, category });
      setLoading(false);

      if (res.success) {
        showToast("Income이 기록되었습니다 ✅", "success");
        setForm({ date: today, amount: "", memo: "" });
        setCategory("");
      } else {
        showToast("저장에 실패했습니다 ❌", "error");
      }
    } catch {
      setLoading(false);
      showToast("저장에 실패했습니다 ❌", "error");
    }
  };

  return { form, setForm, category, setCategory, loading, handleSubmit };
}

export function useSavingsForm(showToast: ToastFunction) {
  const today = getTodayString();
  const [form, setForm] = useState<SavingsFormData>({
    date: today,
    amount: "",
    account: "",
    memo: "",
  });
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      showToast("Savings 종류를 선택해주세요 ⚠️", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await API.createSavings({ ...form, category });
      setLoading(false);

      if (res.success) {
        showToast("Savings이 기록되었습니다 ✅", "success");
        setForm({ date: today, amount: "", account: "", memo: "" });
        setCategory("");
      } else {
        showToast("저장에 실패했습니다 ❌", "error");
      }
    } catch {
      setLoading(false);
      showToast("저장에 실패했습니다 ❌", "error");
    }
  };

  return { form, setForm, category, setCategory, loading, handleSubmit };
}

export function useInvestmentForm(showToast: ToastFunction) {
  const today = getTodayString();
  const [form, setForm] = useState<InvestmentFormData>({
    date: today,
    type: "",
    assetId: "",
    assetName: "",
    quantity: "",
    amount: "",
    currency: "KRW",
    market: "KR",
    memo: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCashType = form.type === "입금" || form.type === "출금";
    if (!isCashType && (!form.assetId.trim() || !form.assetName.trim())) {
      showToast("종목 ID와 종목명을 모두 입력해주세요 ⚠️", "warning");
      return;
    }

    try {
      setLoading(true);
      const res = await SheetsAPI.investments.create(form);
      setLoading(false);

      if (res.success) {
        showToast("Invest가 기록되었습니다 ✅", "success");
        setForm({
          date: today,
          type: "",
          assetId: "",
          assetName: "",
          quantity: "",
          amount: "",
          currency: "KRW",
          market: "KR",
          memo: "",
        });
      } else {
        showToast("저장에 실패했습니다 ❌", "error");
      }
    } catch {
      setLoading(false);
      showToast("저장에 실패했습니다 ❌", "error");
    }
  };

  return { form, setForm, loading, handleSubmit };
}

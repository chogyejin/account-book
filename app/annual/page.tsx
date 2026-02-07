"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import Nav from "../components/Nav";
import { Card, CardHeader, CardBody } from "../components/Card";
import Button from "../components/Button";
import { formatAmount } from "../../lib/utils";
import styles from "./Annual.module.css";

function getIncomeData(): { date: string; amount: number; category: string }[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("incomeData");
  return data ? JSON.parse(data) : [];
}

function getExpenseData(): {
  date: string;
  amount: number;
  category: string;
}[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("expenseData");
  return data ? JSON.parse(data) : [];
}

function getSavingsTransactions(): { date: string; amount: number }[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("savingsTransactions");
  return data ? JSON.parse(data) : [];
}

function getInvestmentAssets(): { id: string; currentPrice: string }[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("investmentAssets");
  return data ? JSON.parse(data) : [];
}

function getInvestmentTransactions(): {
  assetId: string;
  type: string;
  quantity: number;
  amount: number;
  date: string;
}[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("investmentTransactions");
  return data ? JSON.parse(data) : [];
}

function getInvestmentSnapshots(): {
  yearMonth: string;
  totalValue: number;
  profitRate: string;
  createdAt: string;
}[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("monthlySnapshots");
  return data ? JSON.parse(data) : [];
}

function calculateInvestmentPerformance() {
  const assets = getInvestmentAssets();
  const transactions = getInvestmentTransactions();
  let totalValue = 0;
  let totalCost = 0;
  assets.forEach((asset) => {
    let quantity = 0;
    let invested = 0;
    transactions
      .filter((t) => t.assetId === asset.id)
      .forEach((t) => {
        if (t.type === "매수") {
          quantity += t.quantity;
          invested += t.amount;
        } else if (t.type === "매도") {
          quantity -= t.quantity;
          invested -= t.amount;
        }
      });
    totalValue += quantity * (parseFloat(asset.currentPrice) || 0);
    totalCost += invested;
  });
  const profit = totalValue - totalCost;
  const profitRate = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  return { totalValue, totalCost, profit, profitRate };
}

function calculateAccumulatedCash(year: number, month: number): number {
  let total = 0;
  for (let m = 1; m <= month; m++) {
    const monthStr = `${year}-${String(m).padStart(2, "0")}`;
    const income = getIncomeData()
      .filter((i) => i.date && i.date.startsWith(monthStr))
      .reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0);
    const expense = getExpenseData()
      .filter((i) => i.date && i.date.startsWith(monthStr))
      .reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0);
    const savings = getSavingsTransactions()
      .filter((i) => i.date && i.date.startsWith(monthStr))
      .reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0);
    const investments = getInvestmentTransactions()
      .filter((i) => i.date && i.date.startsWith(monthStr) && i.type === "매수")
      .reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0);
    total += income - expense - savings - investments;
  }
  return total;
}

function calculateTotalSavings(year: number, month: number): number {
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  return getSavingsTransactions()
    .filter((i) => i.date && i.date <= yearMonth + "-31")
    .reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0);
}

function getInvestmentValue(year: number, month: number): number {
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const snap = getInvestmentSnapshots().find((s) => s.yearMonth === yearMonth);
  return snap ? parseFloat(String(snap.totalValue)) || 0 : 0;
}

export default function Annual() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"summary" | "networth">("summary");

  const [annualTotals, setAnnualTotals] = useState({
    income: 0,
    expense: 0,
    savings: 0,
    netWorth: 0,
  });
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<
    {
      month: string;
      income: number;
      expense: number;
      savings: number;
      investmentValue: number;
      balance: number;
      savingsRate: string;
    }[]
  >([]);
  const [expenseCategories, setExpenseCategories] = useState<
    { category: string; amount: number }[]
  >([]);
  const [incomeCategories, setIncomeCategories] = useState<
    { category: string; amount: number }[]
  >([]);
  const [investment, setInvestment] = useState({
    totalValue: 0,
    totalCost: 0,
    profit: 0,
    profitRate: 0,
  });
  const [investmentSnapshots, setInvestmentSnapshots] = useState<
    { yearMonth: string; totalValue: number }[]
  >([]);
  const [insights, setInsights] = useState<{ icon: string; text: string }[]>(
    [],
  );

  const [networthStats, setNetworthStats] = useState({
    total: 0,
    change: 0,
    changeRate: 0,
    targetProgress: 0,
  });
  const [networthAssets, setNetworthAssets] = useState({
    cash: 0,
    savings: 0,
    investment: 0,
    total: 0,
  });
  const [networthMonthly, setNetworthMonthly] = useState<
    {
      month: number;
      cash: number;
      savings: number;
      investment: number;
      netWorth: number;
    }[]
  >([]);
  const [networthInsights, setNetworthInsights] = useState<
    { icon: string; text: string }[]
  >([]);

  const loadSummaryData = useCallback(() => {
    const yearStr = currentYear.toString();
    const incomeData = getIncomeData().filter(
      (i) => i.date && i.date.startsWith(yearStr),
    );
    const totalIncome = incomeData.reduce(
      (s, i) => s + (parseFloat(String(i.amount)) || 0),
      0,
    );
    const expenseData = getExpenseData().filter(
      (i) => i.date && i.date.startsWith(yearStr),
    );
    const totalExpense = expenseData.reduce(
      (s, i) => s + (parseFloat(String(i.amount)) || 0),
      0,
    );
    const savingsData = getSavingsTransactions().filter(
      (i) => i.date && i.date.startsWith(yearStr),
    );
    const totalSavings = savingsData.reduce(
      (s, i) => s + (parseFloat(String(i.amount)) || 0),
      0,
    );

    setAnnualTotals({
      income: totalIncome,
      expense: totalExpense,
      savings: totalSavings,
      netWorth: totalIncome - totalExpense - totalSavings,
    });

    // Monthly breakdown
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${currentYear}-${String(m).padStart(2, "0")}`;
      const inc = getIncomeData()
        .filter((i) => i.date && i.date.startsWith(monthStr))
        .reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0);
      const exp = getExpenseData()
        .filter((i) => i.date && i.date.startsWith(monthStr))
        .reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0);
      const sav = getSavingsTransactions()
        .filter((i) => i.date && i.date.startsWith(monthStr))
        .reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0);
      const snap = getInvestmentSnapshots().find(
        (s) => s.yearMonth === monthStr,
      );
      const invVal = snap ? parseFloat(String(snap.totalValue)) || 0 : 0;
      months.push({
        month: m + "월",
        income: inc,
        expense: exp,
        savings: sav,
        investmentValue: invVal,
        balance: inc - exp - sav,
        savingsRate: inc > 0 ? ((sav / inc) * 100).toFixed(1) : "0.0",
      });
    }
    setMonthlyBreakdown(months);

    // Category analysis
    const expCats: Record<string, number> = {};
    expenseData.forEach((i) => {
      const cat = i.category || "기타";
      expCats[cat] = (expCats[cat] || 0) + (parseFloat(String(i.amount)) || 0);
    });
    setExpenseCategories(
      Object.entries(expCats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount })),
    );

    const incCats: Record<string, number> = {};
    incomeData.forEach((i) => {
      const cat = i.category || "기타수입";
      incCats[cat] = (incCats[cat] || 0) + (parseFloat(String(i.amount)) || 0);
    });
    setIncomeCategories(
      Object.entries(incCats)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({ category, amount })),
    );

    // Investment
    const inv = calculateInvestmentPerformance();
    setInvestment(inv);
    const snaps = getInvestmentSnapshots()
      .filter((s) => s.yearMonth.startsWith(yearStr))
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    setInvestmentSnapshots(
      snaps.map((s) => ({
        yearMonth: s.yearMonth,
        totalValue: parseFloat(String(s.totalValue)) || 0,
      })),
    );

    // Insights
    const generatedInsights: { icon: string; text: string }[] = [];
    const savingsRate =
      totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
    if (savingsRate >= 30)
      generatedInsights.push({
        icon: "🎉",
        text: `저축률 ${savingsRate.toFixed(1)}%로 목표를 초과 달성했습니다! 훌륭한 재무 습관이에요.`,
      });
    else if (savingsRate >= 20)
      generatedInsights.push({
        icon: "👍",
        text: `저축률 ${savingsRate.toFixed(1)}%로 양호한 수준입니다. 조금만 더 노력하면 30% 달성 가능해요!`,
      });
    else
      generatedInsights.push({
        icon: "💪",
        text: `저축률 ${savingsRate.toFixed(1)}%입니다. 지출을 조금 줄이거나 수입을 늘려보는 건 어떨까요?`,
      });

    const expMonths = months.filter((m) => m.expense > 0);
    if (expMonths.length >= 3) {
      const recent = expMonths.slice(-3);
      const avgRecent = recent.reduce((s, m) => s + m.expense, 0) / 3;
      const earlier = expMonths.slice(0, -3);
      const avgEarlier =
        earlier.length > 0
          ? earlier.reduce((s, m) => s + m.expense, 0) / earlier.length
          : avgRecent;
      if (avgRecent < avgEarlier * 0.9)
        generatedInsights.push({
          icon: "📉",
          text: "최근 3개월 지출이 감소 추세입니다. 좋은 흐름이에요!",
        });
      else if (avgRecent > avgEarlier * 1.1)
        generatedInsights.push({
          icon: "📈",
          text: "최근 3개월 지출이 증가 추세입니다. 지출을 점검해보세요.",
        });
    }
    if (inv.profitRate > 0)
      generatedInsights.push({
        icon: "🚀",
        text: `투자 수익률 ${inv.profitRate.toFixed(2)}%로 플러스를 기록했습니다!`,
      });

    const topCat = Object.entries(expCats).sort((a, b) => b[1] - a[1])[0];
    if (topCat && totalExpense > 0)
      generatedInsights.push({
        icon: "🔍",
        text: `가장 많이 지출한 카테고리는 "${topCat[0]}"로 전체의 ${((topCat[1] / totalExpense) * 100).toFixed(1)}%를 차지합니다.`,
      });

    setInsights(generatedInsights);
  }, [currentYear]);

  const loadNetworthData = useCallback(() => {
    const yearEndCash = calculateAccumulatedCash(currentYear, 12);
    const yearEndSavings = calculateTotalSavings(currentYear, 12);
    const yearEndInvestment = getInvestmentValue(currentYear, 12);
    const yearEndTotal = yearEndCash + yearEndSavings + yearEndInvestment;

    const prevYearTotal =
      calculateAccumulatedCash(currentYear - 1, 12) +
      calculateTotalSavings(currentYear - 1, 12) +
      getInvestmentValue(currentYear - 1, 12);
    const change = yearEndTotal - prevYearTotal;
    const changeRate = prevYearTotal > 0 ? (change / prevYearTotal) * 100 : 0;
    const target = 50000000;

    setNetworthStats({
      total: yearEndTotal,
      change,
      changeRate,
      targetProgress: target > 0 ? (yearEndTotal / target) * 100 : 0,
    });
    setNetworthAssets({
      cash: yearEndCash,
      savings: yearEndSavings,
      investment: yearEndInvestment,
      total: yearEndTotal,
    });

    // Monthly net worth
    const monthlyData = [];
    for (let m = 1; m <= 12; m++) {
      const cash = calculateAccumulatedCash(currentYear, m);
      const sav = calculateTotalSavings(currentYear, m);
      const inv = getInvestmentValue(currentYear, m);
      monthlyData.push({
        month: m,
        cash,
        savings: sav,
        investment: inv,
        netWorth: cash + sav + inv,
      });
    }
    setNetworthMonthly(monthlyData);

    // Net worth insights
    const nwInsights: { icon: string; text: string }[] = [];
    if (changeRate > 20)
      nwInsights.push({
        icon: "🚀",
        text: `전년 대비 순자산이 ${changeRate.toFixed(1)}% 증가했습니다! 훌륭한 성과입니다.`,
      });
    else if (changeRate > 10)
      nwInsights.push({
        icon: "📈",
        text: `전년 대비 순자산이 ${changeRate.toFixed(1)}% 증가했습니다. 꾸준한 성장세를 보이고 있어요.`,
      });
    else if (changeRate > 0)
      nwInsights.push({
        icon: "👍",
        text: `전년 대비 순자산이 ${changeRate.toFixed(1)}% 증가했습니다.`,
      });
    else
      nwInsights.push({
        icon: "💪",
        text: `순자산이 ${Math.abs(changeRate).toFixed(1)}% 감소했습니다. 지출 관리가 필요해 보여요.`,
      });

    const cashPct = yearEndTotal > 0 ? (yearEndCash / yearEndTotal) * 100 : 0;
    const invPct =
      yearEndTotal > 0 ? (yearEndInvestment / yearEndTotal) * 100 : 0;
    if (cashPct > 50)
      nwInsights.push({
        icon: "💵",
        text: `현금성 자산이 ${cashPct.toFixed(1)}%로 비중이 높습니다. 저축이나 투자를 고려해보세요.`,
      });
    if (invPct > 30)
      nwInsights.push({
        icon: "📈",
        text: `투자 자산 비중이 ${invPct.toFixed(1)}%입니다. 균형잡힌 포트폴리오를 유지하고 있어요.`,
      });

    const recentMonths = monthlyData.slice(-3);
    const allPositive = recentMonths.every(
      (m, i) => i === 0 || m.netWorth > recentMonths[i - 1].netWorth,
    );
    if (allPositive && recentMonths.length === 3)
      nwInsights.push({
        icon: "✨",
        text: "최근 3개월 연속 순자산이 증가하고 있습니다. 좋은 흐름이에요!",
      });

    setNetworthInsights(nwInsights);
  }, [currentYear]);

  useEffect(() => {
    if (activeTab === "summary") loadSummaryData();
    else loadNetworthData();
  }, [activeTab, currentYear, loadSummaryData, loadNetworthData]);

  const handlePrevYear = () => setCurrentYear((y) => y - 1);
  const handleNextYear = () => setCurrentYear((y) => y + 1);

  const expTotal = expenseCategories.reduce((s, c) => s + c.amount, 0);
  const incTotal = incomeCategories.reduce((s, c) => s + c.amount, 0);

  const savingsTarget = 6000000;
  const savingsProgress = Math.min(
    (annualTotals.savings / savingsTarget) * 100,
    100,
  );
  const expenseTarget = 2000000;
  const activeMonths = monthlyBreakdown.filter((m) => m.expense > 0);
  const avgExpense =
    activeMonths.length > 0
      ? activeMonths.reduce((s, m) => s + m.expense, 0) / activeMonths.length
      : 0;
  const expenseProgress = Math.min((avgExpense / expenseTarget) * 100, 100);

  const maxSnapshotValue =
    investmentSnapshots.length > 0
      ? Math.max(...investmentSnapshots.map((s) => s.totalValue))
      : 0;
  const maxNetworthValue =
    networthMonthly.length > 0
      ? Math.max(...networthMonthly.map((m) => m.netWorth))
      : 0;

  return (
    <>
      <Nav />
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        <header className="page-header">
          <h1 className="page-title">📊 Annual Report</h1>
          <p className="page-subtitle">1년간의 재무 흐름을 한눈에 확인하세요</p>
        </header>

        <Card>
          <CardBody className="flex items-center justify-center gap-4 flex-wrap p-6">
            <Button size="sm" onClick={handlePrevYear}>
              ◀ 이전 연도
            </Button>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "var(--medium-pink)",
              }}
            >
              {currentYear}년
            </div>
            <Button size="sm" onClick={handleNextYear}>
              다음 연도 ▶
            </Button>
          </CardBody>
        </Card>

        <div className="tabs">
          <button
            className={clsx("tab", activeTab === "summary" && "active")}
            onClick={() => setActiveTab("summary")}
          >
            📋 Annual Summary
          </button>
          <button
            className={clsx("tab", activeTab === "networth" && "active")}
            onClick={() => setActiveTab("networth")}
          >
            💎 Net Worth
          </button>
        </div>

        {activeTab === "summary" && (
          <>
            <div className="stats-grid mt-6">
              <div className="stat-card">
                <div className="stat-value">
                  {formatAmount(annualTotals.income)}
                </div>
                <div className="stat-label">연간 총 수입</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {formatAmount(annualTotals.expense)}
                </div>
                <div className="stat-label">연간 총 지출</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {formatAmount(annualTotals.savings)}
                </div>
                <div className="stat-label">연간 총 저축</div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-value"
                  style={{
                    color: annualTotals.netWorth >= 0 ? "#22c55e" : "#ef4444",
                  }}
                >
                  {formatAmount(annualTotals.netWorth)}
                </div>
                <div className="stat-label">순자산 증감</div>
              </div>
            </div>

            <Card className="mt-6">
              <CardHeader title="월별 요약" icon="📅" />
              <CardBody className="p-6">
                <div className="data-table" style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>월</th>
                        <th>수입</th>
                        <th>지출</th>
                        <th>저축</th>
                        <th>투자 평가</th>
                        <th>잔액</th>
                        <th>저축률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyBreakdown.map((m) => (
                        <tr key={m.month}>
                          <td>{m.month}</td>
                          <td
                            style={{
                              color: "var(--medium-pink)",
                              fontWeight: 600,
                            }}
                          >
                            {formatAmount(m.income)}
                          </td>
                          <td>{formatAmount(m.expense)}</td>
                          <td>{formatAmount(m.savings)}</td>
                          <td>{formatAmount(m.investmentValue)}</td>
                          <td
                            style={{
                              fontWeight: 600,
                              color: m.balance >= 0 ? "#22c55e" : "#ef4444",
                            }}
                          >
                            {formatAmount(m.balance)}
                          </td>
                          <td>{m.savingsRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <div className="grid grid-2 gap-6 mt-6">
              <Card>
                <CardHeader title="지출 카테고리 Top 5" icon="💸" />
                <CardBody className="p-6">
                  {expenseCategories.map((c) => {
                    const pct = expTotal > 0 ? (c.amount / expTotal) * 100 : 0;
                    return (
                      <div key={c.category} className={styles.categoryBarContainer}>
                        <div className={styles.categoryBarItem}>
                          <div className={styles.categoryBarLabel}>
                            {c.category}
                          </div>
                          <div className={styles.categoryBarWrapper}>
                            <div
                              className={styles.categoryBarWrapperFill}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className={styles.categoryBarValue}>
                            {formatAmount(c.amount)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="수입 카테고리" icon="💰" />
                <CardBody className="p-6">
                  {incomeCategories.map((c) => {
                    const pct = incTotal > 0 ? (c.amount / incTotal) * 100 : 0;
                    return (
                      <div key={c.category} className={styles.categoryBarContainer}>
                        <div className={styles.categoryBarItem}>
                          <div className={styles.categoryBarLabel}>
                            {c.category}
                          </div>
                          <div className={styles.categoryBarWrapper}>
                            <div
                              className={styles.categoryBarWrapperFill}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className={styles.categoryBarValue}>
                            {formatAmount(c.amount)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader title="투자 성과" icon="📈" />
              <CardBody className="p-6">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">
                      {formatAmount(investment.totalValue)}
                    </div>
                    <div className="stat-label">현재 평가금액</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {formatAmount(investment.totalCost)}
                    </div>
                    <div className="stat-label">총 투자금</div>
                  </div>
                  <div className="stat-card">
                    <div
                      className="stat-value"
                      style={{
                        color: investment.profit >= 0 ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {formatAmount(investment.profit)}
                    </div>
                    <div className="stat-label">수익금</div>
                  </div>
                  <div className="stat-card">
                    <div
                      className="stat-value"
                      style={{
                        color:
                          investment.profitRate >= 0 ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {investment.profitRate.toFixed(2)}%
                    </div>
                    <div className="stat-label">수익률</div>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="mb-4">월별 투자 평가액 추이</h3>
                  <div className={styles.chartContainer}>
                    {investmentSnapshots.length === 0 ? (
                      <div
                        style={{ margin: "auto", color: "var(--gray-light)" }}
                      >
                        투자 스냅샷이 없습니다
                      </div>
                    ) : (
                      investmentSnapshots.map((s) => {
                        const height =
                          maxSnapshotValue > 0
                            ? (s.totalValue / maxSnapshotValue) * 100
                            : 0;
                        const month = s.yearMonth.split("-")[1] + "월";
                        return (
                          <div
                            key={s.yearMonth}
                            className={styles.chartBar}
                            style={{ height: `${height}%` }}
                            title={`${month}: ${formatAmount(s.totalValue)}`}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="mt-6">
              <CardHeader title="재무 목표 달성도" icon="🎯" />
              <CardBody className="p-6">
                <div className="goal-list">
                  <div className="goal-item">
                    <div className="goal-header">
                      <span className="goal-label">💰 연간 저축 목표</span>
                      <span
                        className={clsx(
                          "goal-status",
                          savingsProgress >= 100 && "achieved",
                        )}
                      >
                        {savingsProgress >= 100 ? "달성 ✅" : "진행 중 ⏳"}
                      </span>
                    </div>
                    <div className="goal-progress">
                      <div className="goal-bar">
                        <div
                          className="goal-bar-fill"
                          style={{ width: `${savingsProgress}%` }}
                        />
                      </div>
                      <div className="goal-numbers">
                        <span>{formatAmount(annualTotals.savings)}</span>
                        <span style={{ color: "var(--gray)" }}>
                          {" "}
                          / {formatAmount(savingsTarget)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="goal-item mt-4">
                    <div className="goal-header">
                      <span className="goal-label">💸 월 평균 지출 목표</span>
                      <span
                        className={clsx(
                          "goal-status",
                          avgExpense <= expenseTarget && "achieved",
                        )}
                      >
                        {avgExpense <= expenseTarget ? "달성 ✅" : "초과 ⚠️"}
                      </span>
                    </div>
                    <div className="goal-progress">
                      <div className="goal-bar">
                        <div
                          className="goal-bar-fill"
                          style={{ width: `${expenseProgress}%` }}
                        />
                      </div>
                      <div className="goal-numbers">
                        <span>{formatAmount(avgExpense)}</span>
                        <span style={{ color: "var(--gray)" }}>
                          {" "}
                          / {formatAmount(expenseTarget)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="mt-6">
              <CardHeader title="주요 인사이트" icon="💡" />
              <CardBody className="p-6">
                <div className="grid gap-3">
                  {insights.map((insight, i) => (
                    <div key={i} className={styles.insightCard}>
                      <span className={styles.insightIcon}>{insight.icon}</span>
                      <span className={styles.insightText}>{insight.text}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </>
        )}

        {activeTab === "networth" && (
          <>
            <div className="stats-grid mt-6">
              <div className="stat-card">
                <div className="stat-value">
                  {formatAmount(networthStats.total)}
                </div>
                <div className="stat-label">연말 순자산</div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-value"
                  style={{
                    color: networthStats.change >= 0 ? "#22c55e" : "#ef4444",
                  }}
                >
                  {formatAmount(networthStats.change)}
                </div>
                <div className="stat-label">전년 대비 증감</div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-value"
                  style={{
                    color:
                      networthStats.changeRate >= 0 ? "#22c55e" : "#ef4444",
                  }}
                >
                  {networthStats.changeRate.toFixed(2)}%
                </div>
                <div className="stat-label">전년 대비 증감률</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {networthStats.targetProgress.toFixed(1)}%
                </div>
                <div className="stat-label">목표 달성률</div>
              </div>
            </div>

            <Card className="mt-6">
              <CardHeader title="자산 구성 (연말 기준)" icon="🏦" />
              <CardBody className="p-6">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">
                      {formatAmount(networthAssets.cash)}
                    </div>
                    <div className="stat-label">현금성 자산</div>
                    <div className={styles.statPercentage}>
                      {networthAssets.total > 0
                        ? (
                            (networthAssets.cash / networthAssets.total) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {formatAmount(networthAssets.savings)}
                    </div>
                    <div className="stat-label">저축</div>
                    <div className={styles.statPercentage}>
                      {networthAssets.total > 0
                        ? (
                            (networthAssets.savings / networthAssets.total) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {formatAmount(networthAssets.investment)}
                    </div>
                    <div className="stat-label">투자</div>
                    <div className={styles.statPercentage}>
                      {networthAssets.total > 0
                        ? (
                            (networthAssets.investment / networthAssets.total) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="mt-6">
              <CardHeader title="월별 순자산 변화" icon="📅" />
              <CardBody className="p-6">
                <div className="data-table" style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>월</th>
                        <th>현금성 자산</th>
                        <th>저축</th>
                        <th>투자</th>
                        <th>순자산 총액</th>
                        <th>전월 대비</th>
                        <th>증감률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networthMonthly.map((m, i) => {
                        const prev =
                          i > 0 ? networthMonthly[i - 1].netWorth : 0;
                        const change = m.netWorth - prev;
                        const changeRate = prev > 0 ? (change / prev) * 100 : 0;
                        return (
                          <tr key={m.month}>
                            <td>{m.month}월</td>
                            <td>{formatAmount(m.cash)}</td>
                            <td>{formatAmount(m.savings)}</td>
                            <td>{formatAmount(m.investment)}</td>
                            <td
                              style={{
                                fontWeight: 600,
                                color: "var(--medium-pink)",
                              }}
                            >
                              {formatAmount(m.netWorth)}
                            </td>
                            <td
                              style={{
                                fontWeight: 600,
                                color: change >= 0 ? "#22c55e" : "#ef4444",
                              }}
                            >
                              {i > 0 ? formatAmount(change) : "-"}
                            </td>
                            <td
                              style={{
                                color: changeRate >= 0 ? "#22c55e" : "#ef4444",
                              }}
                            >
                              {i > 0 ? changeRate.toFixed(2) + "%" : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card className="mt-6">
              <CardHeader title="순자산 추이" icon="📈" />
              <CardBody className="p-6">
                <div className={styles.networthChart}>
                  {maxNetworthValue === 0 ? (
                    <div style={{ margin: "auto", color: "var(--gray-light)" }}>
                      순자산 데이터가 없습니다
                    </div>
                  ) : (
                    networthMonthly.map((m) => {
                      const height =
                        maxNetworthValue > 0
                          ? (m.netWorth / maxNetworthValue) * 100
                          : 0;
                      return (
                        <div
                          key={m.month}
                          className={styles.networthBar}
                          style={{ height: `${height}%` }}
                          title={`${m.month}월: ${formatAmount(m.netWorth)}`}
                        >
                          <div className={styles.networthBarLabel}>
                            {m.month}월
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardBody>
            </Card>

            <Card className="mt-6">
              <CardHeader title="순자산 인사이트" icon="💡" />
              <CardBody className="p-6">
                <div className="grid gap-3">
                  {networthInsights.map((insight, i) => (
                    <div key={i} className={styles.insightCard}>
                      <span className={styles.insightIcon}>{insight.icon}</span>
                      <span className={styles.insightText}>{insight.text}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

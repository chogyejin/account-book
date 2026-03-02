"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Card, CardHeader, CardBody } from "../components/Card";
import Button from "../components/Button";
import { formatAmount } from "../../lib/utils";
import {
  SheetsAPI,
  type Expense,
  type IncomeItem,
  type SavingsItem,
  type InvestmentTransaction,
} from "../../lib/sheets-api";
import styles from "./Summary.module.css";
import statStyles from "@/app/components/StatCard.module.css";
import catStyles from "@/app/components/CategoryTag.module.css";

type ViewType = "monthly" | "annual";
type AnnualTab = "summary" | "networth";

export default function SummaryClient() {
  const [viewType, setViewType] = useState<ViewType>("monthly");

  // Monthly state
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Annual state
  const [annualYear, setAnnualYear] = useState(new Date().getFullYear());
  const [annualTab, setAnnualTab] = useState<AnnualTab>("summary");

  // Data
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [savings, setSavings] = useState<SavingsItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentTransaction[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [expData, incData, savData, invData] = await Promise.all([
          SheetsAPI.expenses.list(),
          SheetsAPI.income.list(),
          SheetsAPI.savings.list(),
          SheetsAPI.investments.list(),
        ]);
        if (expData.success && expData.data)
          setExpenses(expData.data.filter((i) => i.id));
        if (incData.success && incData.data)
          setIncomes(incData.data.filter((i) => i.id));
        if (savData.success && savData.data)
          setSavings(savData.data.filter((i) => i.id));
        if (invData.success && invData.data)
          setInvestments(invData.data.filter((i) => i.id));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ─── Monthly computations ────────────────────────────────────────────────
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };

  const monthExpenses = expenses.filter((e) => e.date.startsWith(monthStr));
  const monthIncomes = incomes.filter((i) => i.date.startsWith(monthStr));
  const monthSavings = savings.filter((s) => s.date.startsWith(monthStr));
  const monthInvestments = investments.filter(
    (i) => i.date.startsWith(monthStr) && i.type === "매수",
  );

  const mTotalIncome = monthIncomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  );
  const mTotalExpense = monthExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const mTotalSavings = monthSavings.reduce(
    (sum, s) => sum + Number(s.amount),
    0,
  );
  const mTotalInvestments = monthInvestments.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  );
  const mBalance = mTotalIncome - mTotalExpense - mTotalSavings - mTotalInvestments;
  const mExpenseRate =
    mTotalIncome > 0
      ? ((mTotalExpense / mTotalIncome) * 100).toFixed(1)
      : "0.0";

  const mCategoryTotals = monthExpenses.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    },
    {},
  );
  const mCategoryBreakdown = Object.entries(mCategoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount,
      pct: mTotalExpense > 0 ? Math.round((amount / mTotalExpense) * 100) : 0,
    }));

  const weeks = [1, 2, 3, 4].map((w) => {
    const startDay = (w - 1) * 7 + 1;
    const endDay = w === 4 ? 31 : w * 7;
    const weekExpenses = monthExpenses.filter((e) => {
      const day = parseInt(e.date.split("-")[2]);
      return day >= startDay && day <= endDay;
    });
    const amount = weekExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    return { label: `${w}주차`, amount };
  });
  const maxWeekAmount = Math.max(...weeks.map((w) => w.amount), 1);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const prevExpenses = expenses.filter((e) => e.date.startsWith(prevMonthStr));
  const prevIncomes = incomes.filter((i) => i.date.startsWith(prevMonthStr));
  const prevSavings = savings.filter((s) => s.date.startsWith(prevMonthStr));
  const prevTotalExpense = prevExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const prevTotalIncome = prevIncomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  );
  const prevTotalSavings = prevSavings.reduce(
    (sum, s) => sum + Number(s.amount),
    0,
  );

  const comparisons = [
    { label: "총 지출", current: mTotalExpense, prev: prevTotalExpense },
    { label: "총 수입", current: mTotalIncome, prev: prevTotalIncome },
    { label: "저축액", current: mTotalSavings, prev: prevTotalSavings },
  ].map((c) => ({
    ...c,
    diff: c.current - c.prev,
    positive: c.label === "저축액" ? c.current >= c.prev : c.current <= c.prev,
  }));

  // ─── Annual computations ─────────────────────────────────────────────────
  const yearStr = annualYear.toString();

  const yearExpenses = expenses.filter((i) => i.date.startsWith(yearStr));
  const yearIncomes = incomes.filter((i) => i.date.startsWith(yearStr));
  const yearSavings = savings.filter((i) => i.date.startsWith(yearStr));
  const yearInvestments = investments.filter(
    (i) => i.date.startsWith(yearStr) && i.type === "매수",
  );

  const aTotalIncome = yearIncomes.reduce((s, i) => s + Number(i.amount), 0);
  const aTotalExpense = yearExpenses.reduce((s, i) => s + Number(i.amount), 0);
  const aTotalSavings = yearSavings.reduce((s, i) => s + Number(i.amount), 0);
  const aTotalInvestments = yearInvestments.reduce(
    (s, i) => s + Number(i.amount),
    0,
  );

  const monthlyBreakdown = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const mStr = `${annualYear}-${String(m).padStart(2, "0")}`;
    const inc = yearIncomes
      .filter((i) => i.date.startsWith(mStr))
      .reduce((s, i) => s + Number(i.amount), 0);
    const exp = yearExpenses
      .filter((i) => i.date.startsWith(mStr))
      .reduce((s, i) => s + Number(i.amount), 0);
    const sav = yearSavings
      .filter((i) => i.date.startsWith(mStr))
      .reduce((s, i) => s + Number(i.amount), 0);
    const inv = yearInvestments
      .filter((i) => i.date.startsWith(mStr))
      .reduce((s, i) => s + Number(i.amount), 0);
    return {
      month: `${m}월`,
      income: inc,
      expense: exp,
      savings: sav,
      investment: inv,
      balance: inc - exp - sav - inv,
      savingsRate: inc > 0 ? ((sav / inc) * 100).toFixed(1) : "0.0",
    };
  });

  const expCats = yearExpenses.reduce<Record<string, number>>((acc, i) => {
    const cat = i.category || "기타";
    acc[cat] = (acc[cat] || 0) + Number(i.amount);
    return acc;
  }, {});
  const topExpenseCategories = Object.entries(expCats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  const incCats = yearIncomes.reduce<Record<string, number>>((acc, i) => {
    const cat = i.category || "기타수입";
    acc[cat] = (acc[cat] || 0) + Number(i.amount);
    return acc;
  }, {});
  const incomeCategories = Object.entries(incCats)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));

  const insights: { icon: string; text: string }[] = [];
  const savingsRate =
    aTotalIncome > 0 ? (aTotalSavings / aTotalIncome) * 100 : 0;
  if (savingsRate >= 30)
    insights.push({
      icon: "🎉",
      text: `저축률 ${savingsRate.toFixed(1)}%로 훌륭한 재무 습관이에요!`,
    });
  else if (savingsRate >= 20)
    insights.push({
      icon: "👍",
      text: `저축률 ${savingsRate.toFixed(1)}%로 양호한 수준입니다.`,
    });
  else if (aTotalIncome > 0)
    insights.push({
      icon: "💪",
      text: `저축률 ${savingsRate.toFixed(1)}%입니다. 지출을 줄여보는 건 어떨까요?`,
    });
  const topCat = Object.entries(expCats).sort((a, b) => b[1] - a[1])[0];
  if (topCat && aTotalExpense > 0)
    insights.push({
      icon: "🔍",
      text: `가장 많이 지출한 카테고리는 "${topCat[0]}"로 전체의 ${((topCat[1] / aTotalExpense) * 100).toFixed(1)}%를 차지합니다.`,
    });
  if (aTotalInvestments > 0)
    insights.push({
      icon: "📈",
      text: `올해 총 ${formatAmount(aTotalInvestments)}을 투자했습니다.`,
    });

  const networthMonthly = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const mStr = `${annualYear}-${String(m).padStart(2, "0")}`;
    const cumSavings = savings
      .filter((i) => i.date <= mStr + "-31")
      .reduce((s, i) => s + Number(i.amount), 0);
    const cumInvestments = investments
      .filter((i) => i.date <= mStr + "-31" && i.type === "매수")
      .reduce((s, i) => s + Number(i.amount), 0);
    const cumSold = investments
      .filter((i) => i.date <= mStr + "-31" && i.type === "매도")
      .reduce((s, i) => s + Number(i.amount), 0);
    return {
      month: `${m}월`,
      savings: cumSavings,
      investment: cumInvestments - cumSold,
      total: cumSavings + cumInvestments - cumSold,
    };
  });

  const yearEndNetworth = networthMonthly[11]?.total || 0;
  const prevYearEnd = (() => {
    const py = annualYear - 1;
    const prevStr = `${py}-12`;
    const prevSav = savings
      .filter((i) => i.date <= prevStr + "-31")
      .reduce((s, i) => s + Number(i.amount), 0);
    const prevInv = investments
      .filter((i) => i.date <= prevStr + "-31" && i.type === "매수")
      .reduce((s, i) => s + Number(i.amount), 0);
    const prevSold = investments
      .filter((i) => i.date <= prevStr + "-31" && i.type === "매도")
      .reduce((s, i) => s + Number(i.amount), 0);
    return prevSav + prevInv - prevSold;
  })();
  const networthChange = yearEndNetworth - prevYearEnd;
  const networthChangeRate =
    prevYearEnd > 0
      ? ((networthChange / prevYearEnd) * 100).toFixed(1)
      : "0.0";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* View type selector */}
      <Card>
        <div className="card-body">
          <div className={styles.viewTypeBar}>
            <button
              className={`${styles.viewTypeBtn}${viewType === "monthly" ? ` ${styles.active}` : ""}`}
              onClick={() => setViewType("monthly")}
            >
              📖 Monthly
            </button>
            <button
              className={`${styles.viewTypeBtn}${viewType === "annual" ? ` ${styles.active}` : ""}`}
              onClick={() => setViewType("annual")}
            >
              📅 Annual
            </button>
          </div>

          {viewType === "monthly" ? (
            <div className={styles.periodSelector}>
              <Button size="sm" onClick={handlePrevMonth}>
                ◀ 이전 달
              </Button>
              <span className={styles.periodLabel}>
                {year}년 {month}월
              </span>
              <Button size="sm" onClick={handleNextMonth}>
                다음 달 ▶
              </Button>
            </div>
          ) : (
            <div className={styles.periodSelector}>
              <Button size="sm" onClick={() => setAnnualYear((y) => y - 1)}>
                ◀
              </Button>
              <span className={styles.periodLabel}>{annualYear}년</span>
              <Button size="sm" onClick={() => setAnnualYear((y) => y + 1)}>
                ▶
              </Button>
            </div>
          )}
        </div>
      </Card>

      {loading ? (
        <div
          className="text-center py-10 text-gray-light"
          style={{ marginTop: "24px" }}
        >
          불러오는 중...
        </div>
      ) : viewType === "monthly" ? (
        // ── Monthly view ──────────────────────────────────────────────────
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginTop: "24px" }}>
            <div>
              <Card className="envelope">
                <CardHeader title="이번 달 요약" icon="💰" />
                <div className="card-body">
                  <div className="monthly-stat">
                    <div className="stat-row">
                      <span className="stat-label-text">💵 총 수입</span>
                      <span className="stat-value-text text-pink font-bold">
                        {formatAmount(mTotalIncome)}
                      </span>
                    </div>
                    <div className="stat-row" style={{ marginTop: "8px" }}>
                      <span className="stat-label-text">💸 총 지출</span>
                      <span className="stat-value-text text-pink font-bold">
                        {formatAmount(mTotalExpense)}
                      </span>
                    </div>
                    <div className="stat-row" style={{ marginTop: "8px" }}>
                      <span className="stat-label-text">🏦 저축</span>
                      <span className="stat-value-text text-pink font-bold">
                        {formatAmount(mTotalSavings)}
                      </span>
                    </div>
                    <div className="stat-row" style={{ marginTop: "8px" }}>
                      <span className="stat-label-text">📈 투자 매수</span>
                      <span className="stat-value-text text-pink font-bold">
                        {formatAmount(mTotalInvestments)}
                      </span>
                    </div>
                    <hr
                      style={{
                        margin: "16px 0",
                        border: "1px dashed var(--beige)",
                      }}
                    />
                    <div className="stat-row">
                      <span className="stat-label-text font-bold">
                        💛 잔액
                      </span>
                      <span
                        className="stat-value-text text-pink font-bold"
                        style={{ fontSize: "1.5rem" }}
                      >
                        {formatAmount(mBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
              <div className={statStyles.statsGrid} style={{ marginTop: "16px" }}>
                <div className={statStyles.statCard}>
                  <div className={statStyles.statValue}>{mExpenseRate}%</div>
                  <div className={statStyles.statLabel}>지출률</div>
                </div>
                <div className={statStyles.statCard}>
                  <div className={clsx(statStyles.statValue, mBalance >= 0 ? "" : "text-red-500")} style={{ fontSize: "1.1rem" }}>
                    {formatAmount(mBalance)}
                  </div>
                  <div className={statStyles.statLabel}>가용 금액</div>
                </div>
              </div>
            </div>

            <div>
              <Card className="envelope">
                <CardHeader title="카테고리별 지출" icon="🏷️" />
                <div className="card-body">
                  {mCategoryBreakdown.length === 0 ? (
                    <div className="text-center text-gray-light py-4">
                      지출 내역이 없습니다
                    </div>
                  ) : (
                    <div className="category-breakdown">
                      {mCategoryBreakdown.map((cat, i) => (
                        <div
                          key={cat.name}
                          className="category-item"
                          style={{
                            marginBottom:
                              i < mCategoryBreakdown.length - 1 ? "12px" : 0,
                          }}
                        >
                          <div className="category-item-header">
                            <span className={clsx(catStyles.categoryTag, catStyles.selected)}>
                              {cat.name}
                            </span>
                            <span className="text-pink font-bold">
                              {cat.amount.toLocaleString("ko-KR")}원
                            </span>
                          </div>
                          <div className="category-bar">
                            <div
                              className="category-bar-fill"
                              style={{
                                width: `${cat.pct}%`,
                                background: "var(--medium-pink)",
                              }}
                            />
                          </div>
                          <small style={{ color: "var(--gray)" }}>
                            {cat.pct}%
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          <Card className="mt-6">
            <CardHeader title="주간 지출 흐름" icon="📅" />
            <div className="card-body">
              {weeks.every((w) => w.amount === 0) ? (
                <div className="text-center text-gray-light py-4">
                  지출 내역이 없습니다
                </div>
              ) : (
                <div className={styles.weeklyChart}>
                  {weeks.map((week) => {
                    const heightPct =
                      maxWeekAmount > 0
                        ? (week.amount / maxWeekAmount) * 100
                        : 0;
                    return (
                      <div key={week.label} className={styles.weekItem}>
                        <div className={styles.weekHeader}>
                          <span className={styles.weekLabel}>
                            {week.label}
                          </span>
                        </div>
                        <div className={styles.weekBarContainer}>
                          <div
                            className={styles.weekBar}
                            style={{
                              height: `${heightPct}%`,
                              background: "var(--medium-pink)",
                            }}
                          />
                        </div>
                        <div className={styles.weekAmount}>
                          {week.amount.toLocaleString("ko-KR")}원
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card className="mt-6">
            <CardHeader title="지난 달과 비교" icon="📊" />
            <div className="card-body">
              <div className={styles.comparisonGrid}>
                {comparisons.map((comp) => (
                  <div key={comp.label} className={styles.comparisonItem}>
                    <div className={styles.comparisonLabel}>{comp.label}</div>
                    <div className={styles.comparisonValues}>
                      <span className={styles.comparisonCurrent}>
                        {formatAmount(comp.current)}
                      </span>
                      <span
                        className={
                          comp.diff === 0
                            ? styles.comparisonChange
                            : comp.positive
                              ? `${styles.comparisonChange} ${styles.positive}`
                              : `${styles.comparisonChange} ${styles.negative}`
                        }
                      >
                        {comp.diff > 0 ? "▲" : comp.diff < 0 ? "▼" : "-"}{" "}
                        {comp.diff !== 0
                          ? formatAmount(Math.abs(comp.diff))
                          : "변동 없음"}
                      </span>
                    </div>
                    <small style={{ color: "var(--gray)" }}>
                      지난 달: {formatAmount(comp.prev)}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      ) : (
        // ── Annual view ───────────────────────────────────────────────────
        <>
          <div className={styles.tabBar} style={{ marginTop: "16px" }}>
            <button
              className={`${styles.tabBtn}${annualTab === "summary" ? ` ${styles.active}` : ""}`}
              onClick={() => setAnnualTab("summary")}
            >
              요약
            </button>
            <button
              className={`${styles.tabBtn}${annualTab === "networth" ? ` ${styles.active}` : ""}`}
              onClick={() => setAnnualTab("networth")}
            >
              자산 현황
            </button>
          </div>

          {annualTab === "summary" ? (
            <>
              <div className={statStyles.statsGrid}>
                <div className={statStyles.statCard}>
                  <div className={statStyles.statValue}>{formatAmount(aTotalIncome)}</div>
                  <div className={statStyles.statLabel}>연간 총 수입</div>
                </div>
                <div className={statStyles.statCard}>
                  <div className={statStyles.statValue}>
                    {formatAmount(aTotalExpense)}
                  </div>
                  <div className={statStyles.statLabel}>연간 총 지출</div>
                </div>
                <div className={statStyles.statCard}>
                  <div className={statStyles.statValue}>
                    {formatAmount(aTotalSavings)}
                  </div>
                  <div className={statStyles.statLabel}>연간 저축</div>
                </div>
                <div className={statStyles.statCard}>
                  <div className={statStyles.statValue}>
                    {formatAmount(aTotalInvestments)}
                  </div>
                  <div className={statStyles.statLabel}>연간 투자</div>
                </div>
              </div>

              <Card>
                <CardHeader title="월별 내역" icon="📅" />
                <CardBody>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-3 text-left text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            월
                          </th>
                          <th className="p-3 text-right text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            수입
                          </th>
                          <th className="p-3 text-right text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            지출
                          </th>
                          <th className="p-3 text-right text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            저축
                          </th>
                          <th className="p-3 text-right text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            투자
                          </th>
                          <th className="p-3 text-right text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            잔액
                          </th>
                          <th className="p-3 text-right text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            저축률
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyBreakdown.map((row) => (
                          <tr
                            key={row.month}
                            className="border-b border-beige-light hover:bg-light-pink"
                          >
                            <td className="p-3 text-sm font-medium text-gray">
                              {row.month}
                            </td>
                            <td className="p-3 text-right text-sm text-gray">
                              {row.income > 0 ? formatAmount(row.income) : "-"}
                            </td>
                            <td className="p-3 text-right text-sm text-medium-pink">
                              {row.expense > 0
                                ? formatAmount(row.expense)
                                : "-"}
                            </td>
                            <td className="p-3 text-right text-sm text-gray">
                              {row.savings > 0
                                ? formatAmount(row.savings)
                                : "-"}
                            </td>
                            <td className="p-3 text-right text-sm text-gray">
                              {row.investment > 0
                                ? formatAmount(row.investment)
                                : "-"}
                            </td>
                            <td
                              className={`p-3 text-right text-sm font-semibold ${row.balance >= 0 ? "text-medium-pink" : "text-red-500"}`}
                            >
                              {row.income > 0 || row.expense > 0
                                ? formatAmount(row.balance)
                                : "-"}
                            </td>
                            <td className="p-3 text-right text-sm text-gray">
                              {row.income > 0 ? `${row.savingsRate}%` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Card>
                  <CardHeader title="지출 카테고리 TOP 5" icon="💸" />
                  <CardBody>
                    {topExpenseCategories.length === 0 ? (
                      <div className="text-center text-gray-light py-4">
                        데이터 없음
                      </div>
                    ) : (
                      topExpenseCategories.map(({ category, amount }) => (
                        <div key={category} className={styles.categoryRow}>
                          <span className={catStyles.categoryTag}>{category}</span>
                          <span className={styles.categoryAmount}>
                            {formatAmount(amount)}
                          </span>
                          <div className={styles.categoryBarWrap}>
                            <div
                              className={styles.categoryBarFill}
                              style={{
                                width: `${aTotalExpense > 0 ? (amount / aTotalExpense) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className={styles.categoryPct}>
                            {aTotalExpense > 0
                              ? ((amount / aTotalExpense) * 100).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>
                      ))
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="수입 카테고리" icon="💵" />
                  <CardBody>
                    {incomeCategories.length === 0 ? (
                      <div className="text-center text-gray-light py-4">
                        데이터 없음
                      </div>
                    ) : (
                      incomeCategories.map(({ category, amount }) => (
                        <div key={category} className={styles.categoryRow}>
                          <span className={catStyles.categoryTag}>{category}</span>
                          <span className={styles.categoryAmount}>
                            {formatAmount(amount)}
                          </span>
                          <div className={styles.categoryBarWrap}>
                            <div
                              className={styles.categoryBarFill}
                              style={{
                                width: `${aTotalIncome > 0 ? (amount / aTotalIncome) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className={styles.categoryPct}>
                            {aTotalIncome > 0
                              ? ((amount / aTotalIncome) * 100).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>
                      ))
                    )}
                  </CardBody>
                </Card>
              </div>

              {insights.length > 0 && (
                <Card className="mt-6">
                  <CardHeader title="연간 인사이트" icon="💡" />
                  <CardBody>
                    <div className={styles.insightList}>
                      {insights.map((insight, i) => (
                        <div key={i} className={styles.insightItem}>
                          <span className={styles.insightIcon}>
                            {insight.icon}
                          </span>
                          <span className={styles.insightText}>
                            {insight.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <>
              <div className={statStyles.statsGrid}>
                <div className={statStyles.statCard}>
                  <div className={statStyles.statValue}>
                    {formatAmount(yearEndNetworth)}
                  </div>
                  <div className={statStyles.statLabel}>연말 순자산</div>
                </div>
                <div className={statStyles.statCard}>
                  <div
                    className={clsx(statStyles.statValue, networthChange >= 0 ? "text-medium-pink" : "text-red-500")}
                  >
                    {networthChange >= 0 ? "+" : ""}
                    {formatAmount(networthChange)}
                  </div>
                  <div className={statStyles.statLabel}>전년 대비</div>
                </div>
                <div className={statStyles.statCard}>
                  <div
                    className={clsx(statStyles.statValue, Number(networthChangeRate) >= 0 ? "text-medium-pink" : "text-red-500")}
                  >
                    {networthChangeRate}%
                  </div>
                  <div className={statStyles.statLabel}>자산 증가율</div>
                </div>
                <div className={statStyles.statCard}>
                  <div className={statStyles.statValue}>
                    {networthMonthly[11]?.savings > 0
                      ? formatAmount(networthMonthly[11].savings)
                      : "-"}
                  </div>
                  <div className={statStyles.statLabel}>누적 저축</div>
                </div>
              </div>

              <Card className="mt-6">
                <CardHeader title="월별 자산 현황" icon="📈" />
                <CardBody>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-3 text-left text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            월
                          </th>
                          <th className="p-3 text-right text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            누적 저축
                          </th>
                          <th className="p-3 text-right text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            순 투자
                          </th>
                          <th className="p-3 text-right text-sm font-semibold border-b-2 border-beige text-gray bg-cream">
                            합계
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {networthMonthly.map((row) => (
                          <tr
                            key={row.month}
                            className="border-b border-beige-light hover:bg-light-pink"
                          >
                            <td className="p-3 text-sm font-medium text-gray">
                              {row.month}
                            </td>
                            <td className="p-3 text-right text-sm text-gray">
                              {row.savings > 0
                                ? formatAmount(row.savings)
                                : "-"}
                            </td>
                            <td className="p-3 text-right text-sm text-gray">
                              {row.investment !== 0
                                ? formatAmount(row.investment)
                                : "-"}
                            </td>
                            <td className="p-3 text-right text-sm font-semibold text-medium-pink">
                              {row.total > 0 ? formatAmount(row.total) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader } from "../components/Card";
import Button from "../components/Button";
import { formatAmount } from "../../lib/utils";
import styles from "./Monthly.module.css";

interface SheetItem {
  id: string;
  date: string;
  category: string;
  amount: string;
}

interface InvestmentItem {
  id: string;
  date: string;
  type: string;
  amount: string;
}

export default function Monthly() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const [expenses, setExpenses] = useState<SheetItem[]>([]);
  const [incomes, setIncomes] = useState<SheetItem[]>([]);
  const [savings, setSavings] = useState<SheetItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  useEffect(() => {
    const fetchAll = async () => {
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
          setInvestments(
            (invData.data as InvestmentItem[]).filter((i) => i.id),
          );
      } catch {
        // silently fail - show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

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

  // Filter by selected month
  const monthExpenses = expenses.filter((e) => e.date.startsWith(monthStr));
  const monthIncomes = incomes.filter((i) => i.date.startsWith(monthStr));
  const monthSavings = savings.filter((s) => s.date.startsWith(monthStr));
  const monthInvestments = investments.filter(
    (i) => i.date.startsWith(monthStr) && i.type === "매수",
  );

  const totalIncome = monthIncomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  );
  const totalExpense = monthExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const totalSavings = monthSavings.reduce(
    (sum, s) => sum + Number(s.amount),
    0,
  );
  const totalInvestments = monthInvestments.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  );
  const balance = totalIncome - totalExpense - totalSavings - totalInvestments;
  const expenseRate =
    totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : "0.0";

  // Category breakdown for expenses
  const categoryTotals = monthExpenses.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    },
    {},
  );
  const categoryBreakdown = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount,
      pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }));

  // Weekly breakdown
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

  // Prev month data for comparison
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
    { label: "총 지출", current: totalExpense, prev: prevTotalExpense },
    { label: "총 수입", current: totalIncome, prev: prevTotalIncome },
    { label: "저축액", current: totalSavings, prev: prevTotalSavings },
  ].map((c) => ({
    ...c,
    diff: c.current - c.prev,
    positive: c.label === "저축액" ? c.current >= c.prev : c.current <= c.prev,
  }));

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">📖 Monthly</h1>
        <p className="page-subtitle">한 달의 재무 이야기를 담아보세요</p>
      </header>

      <Card>
        <div className="card-body">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <Button size="sm" onClick={handlePrevMonth}>
              ◀ 이전 달
            </Button>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "var(--medium-pink)",
              }}
            >
              {year}년 {month}월
            </div>
            <Button size="sm" onClick={handleNextMonth}>
              다음 달 ▶
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div
          className="text-center py-10 text-gray-light"
          style={{ marginTop: "24px" }}
        >
          불러오는 중...
        </div>
      ) : (
        <>
          <div className="grid grid-2" style={{ marginTop: "24px" }}>
            <div>
              <Card className="envelope">
                <CardHeader title="이번 달 요약" icon="💰" />
                <div className="card-body">
                  <div className="monthly-stat">
                    <div className="stat-row">
                      <span className="stat-label-text">💵 총 수입</span>
                      <span className="stat-value-text text-pink font-bold">
                        {formatAmount(totalIncome)}
                      </span>
                    </div>
                    <div className="stat-row" style={{ marginTop: "8px" }}>
                      <span className="stat-label-text">💸 총 지출</span>
                      <span className="stat-value-text text-pink font-bold">
                        {formatAmount(totalExpense)}
                      </span>
                    </div>
                    <div className="stat-row" style={{ marginTop: "8px" }}>
                      <span className="stat-label-text">🏦 저축</span>
                      <span className="stat-value-text text-pink font-bold">
                        {formatAmount(totalSavings)}
                      </span>
                    </div>
                    <div className="stat-row" style={{ marginTop: "8px" }}>
                      <span className="stat-label-text">📈 투자 매수</span>
                      <span className="stat-value-text text-pink font-bold">
                        {formatAmount(totalInvestments)}
                      </span>
                    </div>
                    <hr
                      style={{
                        margin: "16px 0",
                        border: "1px dashed var(--beige)",
                      }}
                    />
                    <div className="stat-row">
                      <span className="stat-label-text font-bold">💛 잔액</span>
                      <span
                        className="stat-value-text text-pink font-bold"
                        style={{ fontSize: "1.5rem" }}
                      >
                        {formatAmount(balance)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
              <div className="stats-grid" style={{ marginTop: "16px" }}>
                <div className="stat-card">
                  <div className="stat-value">{expenseRate}%</div>
                  <div className="stat-label">지출률</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{monthExpenses.length}건</div>
                  <div className="stat-label">지출 횟수</div>
                </div>
              </div>
            </div>

            <div>
              <Card className="envelope">
                <CardHeader title="카테고리별 지출" icon="🏷️" />
                <div className="card-body">
                  {categoryBreakdown.length === 0 ? (
                    <div className="text-center text-gray-light py-4">
                      지출 내역이 없습니다
                    </div>
                  ) : (
                    <div className="category-breakdown">
                      {categoryBreakdown.map((cat, i) => (
                        <div
                          key={cat.name}
                          className="category-item"
                          style={{
                            marginBottom:
                              i < categoryBreakdown.length - 1 ? "12px" : 0,
                          }}
                        >
                          <div className="category-item-header">
                            <span className="category-tag selected">
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
                          <span className={styles.weekLabel}>{week.label}</span>
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
      )}
    </>
  );
}

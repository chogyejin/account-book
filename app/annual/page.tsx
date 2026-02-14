"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "../components/Card";
import Button from "../components/Button";
import { formatAmount } from "../../lib/utils";
import styles from "./Annual.module.css";

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
  name: string;
}

export default function Annual() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"summary" | "networth">("summary");
  const [loading, setLoading] = useState(true);

  const [allExpenses, setAllExpenses] = useState<SheetItem[]>([]);
  const [allIncomes, setAllIncomes] = useState<SheetItem[]>([]);
  const [allSavings, setAllSavings] = useState<SheetItem[]>([]);
  const [allInvestments, setAllInvestments] = useState<InvestmentItem[]>([]);

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
          setAllExpenses((expData.data as SheetItem[]).filter((i) => i.id));
        if (incData.success)
          setAllIncomes((incData.data as SheetItem[]).filter((i) => i.id));
        if (savData.success)
          setAllSavings((savData.data as SheetItem[]).filter((i) => i.id));
        if (invData.success)
          setAllInvestments(
            (invData.data as InvestmentItem[]).filter((i) => i.id),
          );
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const yearStr = currentYear.toString();

  // Filter by year
  const yearExpenses = allExpenses.filter((i) => i.date.startsWith(yearStr));
  const yearIncomes = allIncomes.filter((i) => i.date.startsWith(yearStr));
  const yearSavings = allSavings.filter((i) => i.date.startsWith(yearStr));
  const yearInvestments = allInvestments.filter(
    (i) => i.date.startsWith(yearStr) && i.type === "매수",
  );

  const totalIncome = yearIncomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpense = yearExpenses.reduce((s, i) => s + Number(i.amount), 0);
  const totalSavings = yearSavings.reduce((s, i) => s + Number(i.amount), 0);
  const totalInvestments = yearInvestments.reduce(
    (s, i) => s + Number(i.amount),
    0,
  );

  // Monthly breakdown
  const monthlyBreakdown = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const mStr = `${currentYear}-${String(m).padStart(2, "0")}`;
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

  // Top expense categories
  const expCats = yearExpenses.reduce<Record<string, number>>((acc, i) => {
    const cat = i.category || "기타";
    acc[cat] = (acc[cat] || 0) + Number(i.amount);
    return acc;
  }, {});
  const topExpenseCategories = Object.entries(expCats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  // Income categories
  const incCats = yearIncomes.reduce<Record<string, number>>((acc, i) => {
    const cat = i.category || "기타수입";
    acc[cat] = (acc[cat] || 0) + Number(i.amount);
    return acc;
  }, {});
  const incomeCategories = Object.entries(incCats)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));

  // Insights
  const insights: { icon: string; text: string }[] = [];
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
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
  else if (totalIncome > 0)
    insights.push({
      icon: "💪",
      text: `저축률 ${savingsRate.toFixed(1)}%입니다. 지출을 줄여보는 건 어떨까요?`,
    });
  const topCat = Object.entries(expCats).sort((a, b) => b[1] - a[1])[0];
  if (topCat && totalExpense > 0)
    insights.push({
      icon: "🔍",
      text: `가장 많이 지출한 카테고리는 "${topCat[0]}"로 전체의 ${((topCat[1] / totalExpense) * 100).toFixed(1)}%를 차지합니다.`,
    });
  if (totalInvestments > 0)
    insights.push({
      icon: "📈",
      text: `올해 총 ${formatAmount(totalInvestments)}을 투자했습니다.`,
    });

  // Networth: cumulative savings + investments over the year
  const networthMonthly = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const mStr = `${currentYear}-${String(m).padStart(2, "0")}`;
    const cumSavings = allSavings
      .filter((i) => i.date <= mStr + "-31")
      .reduce((s, i) => s + Number(i.amount), 0);
    const cumInvestments = allInvestments
      .filter((i) => i.date <= mStr + "-31" && i.type === "매수")
      .reduce((s, i) => s + Number(i.amount), 0);
    const cumSold = allInvestments
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
    const prevYear = currentYear - 1;
    const prevStr = `${prevYear}-12`;
    const prevSav = allSavings
      .filter((i) => i.date <= prevStr + "-31")
      .reduce((s, i) => s + Number(i.amount), 0);
    const prevInv = allInvestments
      .filter((i) => i.date <= prevStr + "-31" && i.type === "매수")
      .reduce((s, i) => s + Number(i.amount), 0);
    const prevSold = allInvestments
      .filter((i) => i.date <= prevStr + "-31" && i.type === "매도")
      .reduce((s, i) => s + Number(i.amount), 0);
    return prevSav + prevInv - prevSold;
  })();
  const networthChange = yearEndNetworth - prevYearEnd;
  const networthChangeRate =
    prevYearEnd > 0 ? ((networthChange / prevYearEnd) * 100).toFixed(1) : "0.0";

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">📊 Annual Review</h1>
        <p className="page-subtitle">한 해의 재무를 돌아보세요</p>
      </header>

      <div className={styles.yearSelector}>
        <Button size="sm" onClick={() => setCurrentYear((y) => y - 1)}>
          ◀
        </Button>
        <span className={styles.yearLabel}>{currentYear}년</span>
        <Button size="sm" onClick={() => setCurrentYear((y) => y + 1)}>
          ▶
        </Button>
      </div>

      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn}${activeTab === "summary" ? ` ${styles.active}` : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          요약
        </button>
        <button
          className={`${styles.tabBtn}${activeTab === "networth" ? ` ${styles.active}` : ""}`}
          onClick={() => setActiveTab("networth")}
        >
          자산 현황
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-light">불러오는 중...</div>
      ) : activeTab === "summary" ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{formatAmount(totalIncome)}</div>
              <div className="stat-label">연간 총 수입</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatAmount(totalExpense)}</div>
              <div className="stat-label">연간 총 지출</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatAmount(totalSavings)}</div>
              <div className="stat-label">연간 저축</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatAmount(totalInvestments)}</div>
              <div className="stat-label">연간 투자</div>
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
                          {row.expense > 0 ? formatAmount(row.expense) : "-"}
                        </td>
                        <td className="p-3 text-right text-sm text-gray">
                          {row.savings > 0 ? formatAmount(row.savings) : "-"}
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

          <div className="grid grid-2 mt-6">
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
                      <span className="category-tag">{category}</span>
                      <span className={styles.categoryAmount}>
                        {formatAmount(amount)}
                      </span>
                      <div className={styles.categoryBarWrap}>
                        <div
                          className={styles.categoryBarFill}
                          style={{
                            width: `${totalExpense > 0 ? (amount / totalExpense) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className={styles.categoryPct}>
                        {totalExpense > 0
                          ? ((amount / totalExpense) * 100).toFixed(1)
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
                      <span className="category-tag">{category}</span>
                      <span className={styles.categoryAmount}>
                        {formatAmount(amount)}
                      </span>
                      <div className={styles.categoryBarWrap}>
                        <div
                          className={styles.categoryBarFill}
                          style={{
                            width: `${totalIncome > 0 ? (amount / totalIncome) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className={styles.categoryPct}>
                        {totalIncome > 0
                          ? ((amount / totalIncome) * 100).toFixed(1)
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
                      <span className={styles.insightIcon}>{insight.icon}</span>
                      <span className={styles.insightText}>{insight.text}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{formatAmount(yearEndNetworth)}</div>
              <div className="stat-label">연말 순자산</div>
            </div>
            <div className="stat-card">
              <div
                className={`stat-value ${networthChange >= 0 ? "text-medium-pink" : "text-red-500"}`}
              >
                {networthChange >= 0 ? "+" : ""}
                {formatAmount(networthChange)}
              </div>
              <div className="stat-label">전년 대비</div>
            </div>
            <div className="stat-card">
              <div
                className={`stat-value ${Number(networthChangeRate) >= 0 ? "text-medium-pink" : "text-red-500"}`}
              >
                {networthChangeRate}%
              </div>
              <div className="stat-label">자산 증가율</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {networthMonthly[11]?.savings > 0
                  ? formatAmount(networthMonthly[11].savings)
                  : "-"}
              </div>
              <div className="stat-label">누적 저축</div>
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
                          {row.savings > 0 ? formatAmount(row.savings) : "-"}
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
  );
}

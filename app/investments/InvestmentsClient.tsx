"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import clsx from "clsx";
import { Card, CardHeader, CardBody } from "../components/Card";
import CurrencyInput from "../components/CurrencyInput";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import FormTextarea from "../components/FormTextarea";
import Modal, { ModalClose } from "../components/Modal";
import { useToast } from "../components/ToastProvider";
import {
  formatDate,
  formatAmount,
  formatCurrency,
  getTodayString,
} from "../../lib/utils";
import { SheetsAPI, type InvestmentTransaction } from "../../lib/sheets-api";
import {
  calculatePortfolio,
  type AssetHolding,
} from "../../lib/investment-calculator";
import styles from "./Investments.module.css";
import statStyles from "@/app/components/StatCard.module.css";

const profitClass = (value: number) =>
  value >= 0 ? styles.profitPositive : styles.profitNegative;

const formatProfitRate = (rate: number) =>
  `${rate >= 0 ? "+" : ""}${rate.toFixed(2)}%`;

const emptyTxnForm = () => ({
  date: getTodayString(),
  type: "",
  assetId: "",
  assetName: "",
  quantity: "",
  amount: "",
  currency: "KRW",
  market: "KR",
  memo: "",
});

export default function InvestmentsClient() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [cashKRW, setCashKRW] = useState(0);
  const [cashUSD, setCashUSD] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>(
    {},
  );

  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesInitialized, setPricesInitialized] = useState(false);
  const [errorAssets, setErrorAssets] = useState<Set<string>>(new Set());

  const [txnFilter, setTxnFilter] = useState("전체");
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [editTxnId, setEditTxnId] = useState("");
  const [txnForm, setTxnForm] = useState(emptyTxnForm);

  const fetchExchangeRate = useCallback(async () => {
    try {
      const res = await fetch("/api/market/exchange-rate");
      const data = await res.json();
      if (data.success && data.rate) setExchangeRate(Math.round(data.rate));
    } catch {
      // 실패 시 기본값 유지
    }
  }, []);

  const fetchAllPrices = useCallback(async (txns: InvestmentTransaction[]) => {
    const uniqueAssets = [
      ...new Map(
        txns.map((t) => [
          t.assetId,
          { assetId: String(t.assetId), market: t.market },
        ]),
      ).values(),
    ];
    if (uniqueAssets.length === 0) {
      setPricesInitialized(true);
      return;
    }
    setPricesLoading(true);
    try {
      const res = await fetch("/api/market/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uniqueAssets),
      });
      const data = await res.json();
      if (data.success) {
        if (data.prices) setCurrentPrices(data.prices);
        if (data.errors) setErrorAssets(new Set<string>(data.errors));
      }
    } catch {
      // 무시
    } finally {
      setPricesLoading(false);
      setPricesInitialized(true);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const result = await SheetsAPI.accounts.list();
      if (result.success && result.data) {
        const acc002 = result.data.find((a) => a.id === "ACC_002");
        setCashKRW(acc002 ? Number(acc002.balance) || 0 : 0);
        const usd = result.data
          .filter((a) => a.currency === "USD")
          .reduce((s, a) => s + (Number(a.balance) || 0), 0);
        setCashUSD(usd);
      }
    } catch {
      // 실패 시 기본값(0) 유지
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await SheetsAPI.investments.list();
      if (result.success && result.data) {
        const data = result.data.filter((t) => t.id);
        data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setTransactions(data);
        fetchAllPrices(data);
      }
    } catch {
      showToast("데이터를 불러오지 못했습니다 ❌", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, fetchAllPrices]);

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchExchangeRate();
  }, [fetchTransactions, fetchAccounts, fetchExchangeRate]);

  const portfolio = useMemo(
    () =>
      calculatePortfolio(
        transactions,
        currentPrices,
        exchangeRate ?? 0,
        cashKRW,
        cashUSD,
      ),
    [transactions, currentPrices, exchangeRate, cashKRW, cashUSD],
  );

  const filteredTransactions = useMemo(
    () =>
      txnFilter === "전체"
        ? transactions
        : transactions.filter((t) => t.type === txnFilter),
    [transactions, txnFilter],
  );

  const isCash = txnForm.type === "입금" || txnForm.type === "출금";

  const openTxnModal = (txn?: InvestmentTransaction) => {
    setEditTxnId(txn?.id ?? "");
    setTxnForm(
      txn
        ? {
            date: txn.date,
            type: txn.type,
            assetId: txn.assetId,
            assetName: txn.assetName,
            quantity: txn.quantity,
            amount: txn.amount,
            currency: txn.currency || "KRW",
            market: txn.market || "KR",
            memo: txn.memo || "",
          }
        : emptyTxnForm(),
    );
    setTxnModalOpen(true);
  };

  const handleTxnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCash && (!txnForm.assetId.trim() || !txnForm.assetName.trim())) {
      showToast("종목 ID와 종목명을 모두 입력해주세요 ⚠️", "warning");
      return;
    }
    try {
      if (editTxnId) {
        const txn = transactions.find((t) => t.id === editTxnId);
        if (!txn) return;
        const result = await SheetsAPI.investments.update(txn, txnForm);
        if (result.success) {
          setTransactions((prev) =>
            prev.map((t) => (t.id === editTxnId ? { ...t, ...txnForm } : t)),
          );
          showToast("거래가 수정되었습니다 ✅", "success");
        } else {
          showToast("수정 실패 ❌", "error");
        }
      } else {
        const result = await SheetsAPI.investments.create(txnForm);
        if (result.success) {
          showToast("거래가 기록되었습니다 ✅", "success");
          await Promise.all([fetchTransactions(), fetchAccounts()]);
        } else {
          showToast("저장 실패 ❌", "error");
        }
      }
    } catch {
      showToast("오류가 발생했습니다 ❌", "error");
    }
    setTxnModalOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const result = await SheetsAPI.investments.delete(id);
      if (result.success) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        showToast("거래가 삭제되었습니다 🗑️", "success");
        await fetchAccounts();
      } else {
        showToast("삭제 실패 ❌", "error");
      }
    } catch {
      showToast("삭제 실패 ❌", "error");
    }
  };

  const txnModalTitle = editTxnId ? "거래 수정" : "거래 기록";

  return (
    <>
      {/* Stats Grid */}
      <div className={clsx(statStyles.statsGrid, statStyles.statsGrid5)}>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>
            {pricesInitialized && portfolio.totalPortfolioKRW > 0
              ? formatAmount(portfolio.totalPortfolioKRW)
              : "-"}
          </div>
          <div className={statStyles.statLabel}>총 포트폴리오</div>
        </div>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>
            {formatAmount(portfolio.cashKRW)}
          </div>
          <div className={statStyles.statLabel}>현금 잔고</div>
        </div>
        <div className={statStyles.statCard}>
          <div
            className={clsx(
              statStyles.statValue,
              pricesInitialized && portfolio.totalInvestedKRW > 0
                ? profitClass(portfolio.totalProfit)
                : "",
            )}
          >
            {pricesInitialized && portfolio.totalInvestedKRW > 0
              ? formatAmount(portfolio.totalProfit)
              : "-"}
          </div>
          {pricesInitialized && portfolio.totalInvestedKRW > 0 && (
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--gray-light)",
                textAlign: "center",
                marginTop: 2,
              }}
            >
              실현 {formatAmount(portfolio.realizedProfit)} / 미실현{" "}
              {formatAmount(portfolio.unrealizedProfit)}
            </div>
          )}
          <div className={statStyles.statLabel}>총 수익</div>
        </div>
        <div className={statStyles.statCard}>
          <div
            className={clsx(
              statStyles.statValue,
              pricesInitialized && portfolio.totalInvestedKRW > 0
                ? profitClass(portfolio.totalProfitRate)
                : "",
            )}
          >
            {pricesInitialized && portfolio.totalInvestedKRW > 0
              ? formatProfitRate(portfolio.totalProfitRate)
              : "-"}
          </div>
          <div className={statStyles.statLabel}>수익률</div>
        </div>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue} style={{ fontSize: "1.1rem" }}>
            {exchangeRate === null ? (
              "-"
            ) : (
              <input
                type="number"
                value={exchangeRate}
                min={0}
                step={1}
                onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                className={styles.exchangeRateInput}
              />
            )}
          </div>
          <div className={statStyles.statLabel}>환율 (원/달러)</div>
        </div>
      </div>

      {/* Currency Ratio Card */}
      {portfolio.totalValueKRW > 0 && (
        <Card className="mb-6">
          <CardHeader title="통화별 비중" icon="💱" />
          <CardBody>
            <div className={styles.stackedBar}>
              <div
                className={styles.stackedBarKRW}
                style={{ width: `${portfolio.currencyRatio.KRW.percentage}%` }}
              />
              <div
                className={styles.stackedBarUSD}
                style={{ width: `${portfolio.currencyRatio.USD.percentage}%` }}
              />
            </div>
            <div className={styles.stackedLegend}>
              <div className={styles.stackedLegendItem}>
                <div className={styles.stackedLegendLabel}>
                  <span
                    className={styles.stackedLegendDot}
                    style={{ background: "#22c55e" }}
                  />
                  🇰🇷 KRW
                </div>
                <div className={styles.stackedLegendPercent}>
                  {portfolio.currencyRatio.KRW.percentage.toFixed(1)}%
                </div>
                <div className={styles.stackedLegendAmount}>
                  {formatAmount(portfolio.currencyRatio.KRW.amount)}
                </div>
              </div>
              <div
                className={styles.stackedLegendItem}
                style={{ alignItems: "flex-end" }}
              >
                <div className={styles.stackedLegendLabel}>
                  🇺🇸 USD
                  <span
                    className={styles.stackedLegendDot}
                    style={{ background: "#3b82f6" }}
                  />
                </div>
                <div className={styles.stackedLegendPercent}>
                  {portfolio.currencyRatio.USD.percentage.toFixed(1)}%
                </div>
                <div className={styles.stackedLegendAmount}>
                  {formatAmount(portfolio.currencyRatio.USD.amount)}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Holdings Table */}
      {portfolio.holdings.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="보유 종목" icon="💼">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                fetchExchangeRate();
                fetchAllPrices(transactions);
              }}
              disabled={pricesLoading}
            >
              {pricesLoading ? "조회 중..." : "🔄 시세 갱신"}
            </Button>
          </CardHeader>
          <CardBody>
            <div style={{ overflowX: "auto" }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                      종목명
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">
                      통화
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">
                      수량
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">
                      평균단가
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">
                      현재가
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">
                      평가금액
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">
                      수익률
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.holdings.map((holding: AssetHolding) => (
                    <tr
                      key={holding.assetId}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm">
                          {holding.assetName || (
                            <span className="text-gray-400">이름 없음</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {holding.assetId || (
                            <span className="text-red-400">ID 없음</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={clsx(
                            "inline-block px-2 py-1 rounded-full text-xs font-medium",
                            holding.currency === "USD"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-green-50 text-green-700",
                          )}
                        >
                          {holding.currency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {holding.totalQuantity.toLocaleString("ko-KR", {
                          maximumFractionDigits: 4,
                        })}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {holding.avgPrice.toLocaleString("ko-KR", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {currentPrices[holding.assetId] != null ? (
                          currentPrices[holding.assetId].toLocaleString(
                            "ko-KR",
                            {
                              maximumFractionDigits: 2,
                            },
                          )
                        ) : pricesLoading ? (
                          <span className="text-gray-400 text-xs">
                            조회 중...
                          </span>
                        ) : errorAssets.has(holding.assetId) ? (
                          <span
                            className="text-xs text-orange-500 font-medium"
                            title="구글 시트 _prices 탭의 수식을 확인해주세요"
                          >
                            ⚠️ 수식 오류
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-pink-600">
                        {holding.currentPrice > 0
                          ? formatAmount(holding.currentValue)
                          : "-"}
                      </td>
                      <td
                        className={clsx(
                          "py-3 px-4 text-right text-sm font-semibold",
                          holding.currentPrice > 0
                            ? profitClass(holding.profitRate)
                            : "text-gray-400",
                        )}
                      >
                        {holding.currentPrice > 0
                          ? formatProfitRate(holding.profitRate)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Transactions Table */}
      <Card className="mb-6">
        <CardHeader title="거래 내역" icon="📋">
          <div
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {["전체", "매수", "매도", "입금", "출금"].map((f) => (
              <button
                key={f}
                onClick={() => setTxnFilter(f)}
                style={{
                  padding: "4px 14px",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: txnFilter === f ? 600 : 400,
                  border: `1.5px solid ${txnFilter === f ? "var(--medium-pink)" : "var(--beige)"}`,
                  background:
                    txnFilter === f ? "var(--medium-pink)" : "transparent",
                  color: txnFilter === f ? "#5a3040" : "var(--gray)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow:
                    txnFilter === f
                      ? "0 1px 4px rgba(232,180,188,0.4)"
                      : "none",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={() => openTxnModal()}>
            ➕ 거래 기록
          </Button>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "var(--gray-light)",
              }}
            >
              불러오는 중...
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                      날짜
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                      종목
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">
                      유형
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">
                      수량
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">
                      금액
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">
                      통화
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">
                      시장
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                      메모
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "var(--gray-light)",
                        }}
                      >
                        {txnFilter === "전체"
                          ? "거래 내역이 없습니다 📭"
                          : `${txnFilter} 내역이 없습니다 📭`}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-sm">
                            {t.assetName || (
                              <span className="text-gray-400">이름 없음</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {t.assetId || (
                              <span className="text-red-400">ID 없음</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={clsx(
                              "inline-block px-3 py-1 rounded-full text-sm font-medium",
                              t.type === "매수"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-orange-50 text-orange-700",
                            )}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm">
                          {Number(t.quantity).toLocaleString("ko-KR", {
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-pink-600">
                          {formatCurrency(t.amount, t.currency || "KRW")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={clsx(
                              "inline-block px-2 py-1 rounded-full text-xs font-medium",
                              t.currency === "USD"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-green-50 text-green-700",
                            )}
                          >
                            {t.currency || "KRW"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={clsx(
                              "inline-block px-2 py-1 rounded-full text-xs font-medium",
                              t.market === "US"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-yellow-50 text-yellow-700",
                            )}
                          >
                            {t.market || "KR"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {t.memo || "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" onClick={() => openTxnModal(t)}>
                              수정
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDeleteTransaction(t.id)}
                            >
                              삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Transaction Modal */}
      <Modal isOpen={txnModalOpen} onClose={() => setTxnModalOpen(false)}>
        <Card>
          <CardHeader title={txnModalTitle} icon="💰">
            <ModalClose onClick={() => setTxnModalOpen(false)} />
          </CardHeader>
          <CardBody>
            <form onSubmit={handleTxnSubmit}>
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="📅 날짜"
                    type="date"
                    value={txnForm.date}
                    onChange={(e) =>
                      setTxnForm({ ...txnForm, date: e.target.value })
                    }
                    required
                  />
                  <FormSelect
                    label="📊 거래유형"
                    value={txnForm.type}
                    onChange={(e) =>
                      setTxnForm({ ...txnForm, type: e.target.value })
                    }
                    required
                  >
                    <option value="">선택하세요</option>
                    <option value="매수">매수</option>
                    <option value="매도">매도</option>
                    <option value="입금">💵 입금</option>
                    <option value="출금">💸 출금</option>
                  </FormSelect>
                </div>
                {!isCash && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormInput
                        label="🔑 종목 ID"
                        type="text"
                        placeholder="예: AAPL, 005930"
                        value={txnForm.assetId}
                        onChange={(e) =>
                          setTxnForm({
                            ...txnForm,
                            assetId: e.target.value,
                          })
                        }
                        required
                      />
                      <FormInput
                        label="🏷️ 종목명"
                        type="text"
                        placeholder="예: 애플, 삼성전자"
                        value={txnForm.assetName}
                        onChange={(e) =>
                          setTxnForm({
                            ...txnForm,
                            assetName: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormInput
                        label="📦 수량"
                        type="number"
                        placeholder="10"
                        min="0"
                        step="0.0001"
                        value={txnForm.quantity}
                        onChange={(e) =>
                          setTxnForm({
                            ...txnForm,
                            quantity: e.target.value,
                          })
                        }
                        required
                      />
                      <FormSelect
                        label="💱 통화"
                        value={txnForm.currency}
                        onChange={(e) =>
                          setTxnForm({
                            ...txnForm,
                            currency: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="KRW">KRW (원)</option>
                        <option value="USD">USD (달러)</option>
                      </FormSelect>
                      <FormSelect
                        label="🌍 시장"
                        value={txnForm.market}
                        onChange={(e) =>
                          setTxnForm({ ...txnForm, market: e.target.value })
                        }
                        required
                      >
                        <option value="KR">🇰🇷 한국</option>
                        <option value="US">🇺🇸 미국</option>
                      </FormSelect>
                    </div>
                  </>
                )}
                {isCash && (
                  <FormSelect
                    label="💱 통화"
                    value={txnForm.currency}
                    onChange={(e) =>
                      setTxnForm({ ...txnForm, currency: e.target.value })
                    }
                    required
                  >
                    <option value="KRW">KRW (원)</option>
                    <option value="USD">USD (달러)</option>
                  </FormSelect>
                )}
                {txnForm.currency === "KRW" ? (
                  <CurrencyInput
                    label="💵 금액"
                    placeholder="1,000,000"
                    value={txnForm.amount}
                    onChange={(e) =>
                      setTxnForm({ ...txnForm, amount: e.target.value })
                    }
                    required
                  />
                ) : (
                  <FormInput
                    label="💵 금액"
                    type="number"
                    placeholder="1000.00"
                    min="0"
                    step="0.01"
                    value={txnForm.amount}
                    onChange={(e) =>
                      setTxnForm({ ...txnForm, amount: e.target.value })
                    }
                    required
                  />
                )}
                <FormTextarea
                  label="📝 메모"
                  placeholder="거래 메모"
                  value={txnForm.memo}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, memo: e.target.value })
                  }
                />
              </>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" block>
                  💾 저장하기
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTxnModalOpen(false)}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </Modal>
    </>
  );
}

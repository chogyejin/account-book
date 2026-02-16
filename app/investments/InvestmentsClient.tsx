"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import clsx from "clsx";
import { Card, CardHeader, CardBody } from "../components/Card";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import FormTextarea from "../components/FormTextarea";
import Modal, { ModalClose } from "../components/Modal";
import { useToast } from "../components/ToastProvider";
import { formatDate, formatAmount, getTodayString } from "../../lib/utils";
import { SheetsAPI, type InvestmentTransaction } from "../../lib/sheets-api";
import {
  calculatePortfolio,
  type AssetHolding,
} from "../../lib/investment-calculator";
import styles from "./Investments.module.css";

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
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(1300);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [txnModalTitle, setTxnModalTitle] = useState("거래 기록");
  const [editTxnId, setEditTxnId] = useState("");
  const [txnForm, setTxnForm] = useState(emptyTxnForm);

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
      }
    } catch {
      showToast("데이터를 불러오지 못했습니다 ❌", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const portfolio = useMemo(
    () => calculatePortfolio(transactions, currentPrices, exchangeRate),
    [transactions, currentPrices, exchangeRate],
  );

  const openAddTransaction = () => {
    setTxnModalTitle("거래 기록");
    setEditTxnId("");
    setTxnForm(emptyTxnForm());
    setTxnModalOpen(true);
  };

  const openEditTransaction = (txn: InvestmentTransaction) => {
    setTxnModalTitle("거래 수정");
    setEditTxnId(txn.id);
    setTxnForm({
      date: txn.date,
      type: txn.type,
      assetId: txn.assetId,
      assetName: txn.assetName,
      quantity: txn.quantity,
      amount: txn.amount,
      currency: txn.currency || "KRW",
      market: txn.market || "KR",
      memo: txn.memo || "",
    });
    setTxnModalOpen(true);
  };

  const handleTxnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          await fetchTransactions();
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
      } else {
        showToast("삭제 실패 ❌", "error");
      }
    } catch {
      showToast("삭제 실패 ❌", "error");
    }
  };

  const handleCurrentPriceChange = (assetId: string, value: string) => {
    const parsed = parseFloat(value);
    setCurrentPrices((prev) => ({
      ...prev,
      [assetId]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const profitClass = (value: number) =>
    value >= 0 ? styles.profitPositive : styles.profitNegative;

  const formatProfitRate = (rate: number) =>
    `${rate >= 0 ? "+" : ""}${rate.toFixed(2)}%`;

  return (
    <>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">
            {portfolio.totalValueKRW > 0 ? formatAmount(portfolio.totalValueKRW) : "-"}
          </div>
          <div className="stat-label">총 평가금액</div>
        </div>
        <div className="stat-card">
          <div
            className={clsx("stat-value", portfolio.totalValueKRW > 0 ? profitClass(portfolio.totalProfit) : "")}
          >
            {portfolio.totalValueKRW > 0 ? formatAmount(portfolio.totalProfit) : "-"}
          </div>
          <div className="stat-label">총 수익</div>
        </div>
        <div className="stat-card">
          <div
            className={clsx(
              "stat-value",
              portfolio.totalValueKRW > 0 ? profitClass(portfolio.totalProfitRate) : "",
            )}
          >
            {portfolio.totalValueKRW > 0 ? formatProfitRate(portfolio.totalProfitRate) : "-"}
          </div>
          <div className="stat-label">수익률</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: "1.1rem" }}>
            <input
              type="number"
              value={exchangeRate}
              min={0}
              step={1}
              onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
              className={styles.exchangeRateInput}
            />
          </div>
          <div className="stat-label">환율 (원/달러)</div>
        </div>
      </div>

      {/* Currency Ratio Card */}
      {portfolio.totalValueKRW > 0 && (
        <Card className="mb-6">
          <CardHeader title="통화별 비중" icon="💱" />
          <CardBody>
            <div className={styles.currencyRatioContainer}>
              <div className={styles.currencyItem}>
                <div className={styles.currencyLabel}>
                  <span>🇰🇷 KRW</span>
                  <span>
                    {portfolio.currencyRatio.KRW.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className={styles.currencyBar}>
                  <div
                    className={styles.currencyBarFillKRW}
                    style={{
                      width: `${portfolio.currencyRatio.KRW.percentage}%`,
                    }}
                  />
                </div>
                <div className={styles.currencyAmount}>
                  {formatAmount(portfolio.currencyRatio.KRW.amount)}
                </div>
              </div>
              <div className={styles.currencyItem}>
                <div className={styles.currencyLabel}>
                  <span>🇺🇸 USD</span>
                  <span>
                    {portfolio.currencyRatio.USD.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className={styles.currencyBar}>
                  <div
                    className={styles.currencyBarFillUSD}
                    style={{
                      width: `${portfolio.currencyRatio.USD.percentage}%`,
                    }}
                  />
                </div>
                <div className={styles.currencyAmount}>
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
          <CardHeader title="보유 종목" icon="💼" />
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
                          {holding.assetName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {holding.assetId}
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
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="현재가 입력"
                          value={currentPrices[holding.assetId] ?? ""}
                          onChange={(e) =>
                            handleCurrentPriceChange(
                              holding.assetId,
                              e.target.value,
                            )
                          }
                          className={styles.holdingInput}
                        />
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
          <Button variant="primary" size="sm" onClick={openAddTransaction}>
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
                  {transactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "var(--gray-light)",
                        }}
                      >
                        거래 내역이 없습니다 📭
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-sm">
                            {t.assetName}
                          </div>
                          <div className="text-xs text-gray-400">{t.assetId}</div>
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
                          {formatAmount(Number(t.amount))}
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
                            <Button
                              size="sm"
                              onClick={() => openEditTransaction(t)}
                            >
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
                </FormSelect>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="🔑 종목 ID"
                  type="text"
                  placeholder="예: AAPL, 005930"
                  value={txnForm.assetId}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, assetId: e.target.value })
                  }
                  required
                />
                <FormInput
                  label="🏷️ 종목명"
                  type="text"
                  placeholder="예: 애플, 삼성전자"
                  value={txnForm.assetName}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, assetName: e.target.value })
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
                    setTxnForm({ ...txnForm, quantity: e.target.value })
                  }
                  required
                />
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
              <FormInput
                label="💵 거래금액"
                type="number"
                placeholder="1000000"
                min="0"
                step="0.01"
                value={txnForm.amount}
                onChange={(e) =>
                  setTxnForm({ ...txnForm, amount: e.target.value })
                }
                required
              />
              <FormTextarea
                label="📝 메모"
                placeholder="거래 메모"
                value={txnForm.memo}
                onChange={(e) =>
                  setTxnForm({ ...txnForm, memo: e.target.value })
                }
              />
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

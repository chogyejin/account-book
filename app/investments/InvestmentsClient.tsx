"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { Card, CardHeader, CardBody } from "../components/Card";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import FormTextarea from "../components/FormTextarea";
import Modal, { ModalClose } from "../components/Modal";
import { useToast } from "../components/ToastProvider";
import { formatDate, formatAmount, getTodayString } from "../../lib/utils";
import styles from "./Investments.module.css";

interface InvestmentTransaction {
  id: string;
  date: string;
  type: string;
  name: string;
  investmentType: string;
  amount: string;
  currentPrice: string;
  memo: string;
  createdAt: string;
}

interface AssetSummary {
  name: string;
  investmentType: string;
  totalBuy: number;
  totalSell: number;
  netInvested: number;
  latestPrice: string;
}

export default function InvestmentsClient() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [txnModalTitle, setTxnModalTitle] = useState("거래 기록");
  const [editTxnId, setEditTxnId] = useState("");
  const [txnForm, setTxnForm] = useState({
    date: getTodayString(),
    type: "",
    name: "",
    investmentType: "",
    amount: "",
    currentPrice: "",
    memo: "",
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/sheets?sheet=investments_transactions&action=list",
      );
      const result = await res.json();
      if (result.success) {
        const data: InvestmentTransaction[] = (
          result.data as InvestmentTransaction[]
        ).filter((t) => t.id);
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

  const totalInvested = transactions
    .filter((t) => t.type === "매수")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSold = transactions
    .filter((t) => t.type === "매도")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const netInvested = totalInvested - totalSold;

  const assetMap = transactions.reduce<Record<string, AssetSummary>>(
    (acc, t) => {
      if (!acc[t.name]) {
        acc[t.name] = {
          name: t.name,
          investmentType: t.investmentType,
          totalBuy: 0,
          totalSell: 0,
          netInvested: 0,
          latestPrice: "",
        };
      }
      if (t.type === "매수") acc[t.name].totalBuy += Number(t.amount);
      if (t.type === "매도") acc[t.name].totalSell += Number(t.amount);
      acc[t.name].netInvested = acc[t.name].totalBuy - acc[t.name].totalSell;
      if (t.currentPrice) acc[t.name].latestPrice = t.currentPrice;
      return acc;
    },
    {},
  );
  const assetSummaries = Object.values(assetMap).sort(
    (a, b) => b.netInvested - a.netInvested,
  );

  const openAddTransaction = () => {
    setTxnModalTitle("거래 기록");
    setEditTxnId("");
    setTxnForm({
      date: getTodayString(),
      type: "",
      name: "",
      investmentType: "",
      amount: "",
      currentPrice: "",
      memo: "",
    });
    setTxnModalOpen(true);
  };

  const openEditTransaction = (txn: InvestmentTransaction) => {
    setTxnModalTitle("거래 수정");
    setEditTxnId(txn.id);
    setTxnForm({
      date: txn.date,
      type: txn.type,
      name: txn.name,
      investmentType: txn.investmentType,
      amount: txn.amount,
      currentPrice: txn.currentPrice || "",
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
        const res = await fetch("/api/sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "investments_transactions",
            action: "update",
            ...txn,
            ...txnForm,
            id: editTxnId,
          }),
        });
        const result = await res.json();
        if (result.success) {
          setTransactions((prev) =>
            prev.map((t) => (t.id === editTxnId ? { ...t, ...txnForm } : t)),
          );
          showToast("거래가 수정되었습니다 ✅", "success");
        } else {
          showToast("수정 실패 ❌", "error");
        }
      } else {
        const res = await fetch("/api/sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "investments_transactions",
            action: "create",
            ...txnForm,
          }),
        });
        const result = await res.json();
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
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "investments_transactions",
          action: "delete",
          id,
        }),
      });
      const result = await res.json();
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

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{formatAmount(totalInvested)}</div>
          <div className="stat-label">총 매수금액</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatAmount(totalSold)}</div>
          <div className="stat-label">총 매도금액</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatAmount(netInvested)}</div>
          <div className="stat-label">순 투자금액</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{assetSummaries.length}개</div>
          <div className="stat-label">투자 종목</div>
        </div>
      </div>

      {assetSummaries.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="종목별 현황" icon="💼" />
          <CardBody>
            <div className={styles.assetsContainer}>
              {assetSummaries.map((asset) => (
                <div key={asset.name} className={styles.assetCard}>
                  <div className={styles.assetHeader}>
                    <div className={styles.assetInfo}>
                      <h3>{asset.name}</h3>
                      <span className={styles.assetType}>
                        {asset.investmentType}
                      </span>
                    </div>
                  </div>
                  <div className={styles.assetStats}>
                    <div className={styles.assetStat}>
                      <div className={styles.assetStatLabel}>매수금액</div>
                      <div className={styles.assetStatValue}>
                        {formatAmount(asset.totalBuy)}
                      </div>
                    </div>
                    <div className={styles.assetStat}>
                      <div className={styles.assetStatLabel}>매도금액</div>
                      <div className={styles.assetStatValue}>
                        {formatAmount(asset.totalSell)}
                      </div>
                    </div>
                    <div className={styles.assetStat}>
                      <div className={styles.assetStatLabel}>순 투자</div>
                      <div
                        className={clsx(
                          styles.assetStatValue,
                          asset.netInvested >= 0
                            ? styles.profitPositive
                            : styles.profitNegative,
                        )}
                      >
                        {formatAmount(asset.netInvested)}
                      </div>
                    </div>
                    {asset.latestPrice && (
                      <div className={styles.assetStat}>
                        <div className={styles.assetStatLabel}>최근 기록가</div>
                        <div className={styles.assetStatValue}>
                          {Number(asset.latestPrice).toLocaleString("ko-KR")}원
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

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
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                      유형
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                      분류
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">
                      금액
                    </th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">
                      기록가
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
                        colSpan={8}
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
                          <span className="inline-block px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm font-medium">
                            {t.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {t.investmentType}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-pink-600">
                          {formatAmount(Number(t.amount))}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-600">
                          {t.currentPrice
                            ? `${Number(t.currentPrice).toLocaleString("ko-KR")}원`
                            : "-"}
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
                  label="🏷️ 종목명"
                  type="text"
                  placeholder="예: 삼성전자, S&P500"
                  value={txnForm.name}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, name: e.target.value })
                  }
                  required
                />
                <FormSelect
                  label="📊 투자유형"
                  value={txnForm.investmentType}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, investmentType: e.target.value })
                  }
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="주식">주식</option>
                  <option value="ETF">ETF</option>
                  <option value="펀드">펀드</option>
                  <option value="채권">채권</option>
                  <option value="코인">코인</option>
                </FormSelect>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="💵 거래금액"
                  type="number"
                  placeholder="1000000"
                  min="0"
                  step="1000"
                  value={txnForm.amount}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, amount: e.target.value })
                  }
                  required
                />
                <FormInput
                  label="💹 현재가 (선택)"
                  type="number"
                  placeholder="75000"
                  min="0"
                  step="0.01"
                  value={txnForm.currentPrice}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, currentPrice: e.target.value })
                  }
                />
              </div>
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

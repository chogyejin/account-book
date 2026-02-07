"use client";

import { useState, useEffect, useCallback } from "react";
import Nav from "../components/Nav";
import { Card, CardHeader } from "../components/Card";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import FormTextarea from "../components/FormTextarea";
import Modal, { ModalClose } from "../components/Modal";
import { useToast } from "../components/ToastProvider";
import {
  formatDate,
  formatAmount,
  generateId,
  getTodayString,
} from "../../lib/utils";
import styles from "./Savings.module.css";

interface SavingsAccount {
  id: string;
  name: string;
  type: string;
  target: string;
  startDate: string;
  memo: string;
  active: boolean;
  createdAt: string;
}

interface SavingsTransaction {
  id: string;
  date: string;
  amount: number;
  accountId: string;
  memo: string;
  createdAt: string;
}

function getAccounts(): SavingsAccount[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("savingsAccounts");
  return data ? JSON.parse(data) : [];
}

function saveAccounts(accounts: SavingsAccount[]) {
  localStorage.setItem("savingsAccounts", JSON.stringify(accounts));
}

function getTransactions(): SavingsTransaction[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("savingsTransactions");
  return data ? JSON.parse(data) : [];
}

function saveTransactions(transactions: SavingsTransaction[]) {
  localStorage.setItem("savingsTransactions", JSON.stringify(transactions));
}

function calculateAccountBalance(accountId: string): number {
  const transactions = getTransactions();
  return transactions
    .filter((t) => t.accountId === accountId)
    .reduce((sum, t) => sum + t.amount, 0);
}

export default function Savings() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [accountFilter, setAccountFilter] = useState("all");

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalTitle, setAccountModalTitle] = useState("저축 계좌 추가");
  const [editAccountId, setEditAccountId] = useState("");
  const [accountForm, setAccountForm] = useState({
    name: "",
    type: "",
    target: "",
    startDate: getTodayString(),
    memo: "",
  });

  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [txnModalTitle, setTxnModalTitle] = useState("저축 기록");
  const [editTxnId, setEditTxnId] = useState("");
  const [txnForm, setTxnForm] = useState({
    date: getTodayString(),
    amount: "",
    accountId: "",
    memo: "",
  });

  const loadData = useCallback(() => {
    setAccounts(getAccounts());
    let txns = getTransactions();
    if (accountFilter !== "all") {
      txns = txns.filter((t) => t.accountId === accountFilter);
    }
    txns.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    setTransactions(txns);
  }, [accountFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allAccounts = getAccounts();
  const allTransactions = getTransactions();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const totalSavings = allAccounts.reduce(
    (sum, acc) => sum + calculateAccountBalance(acc.id),
    0,
  );
  const activeCount = allAccounts.filter((acc) => acc.active).length;
  const totalTarget = allAccounts.reduce(
    (sum, acc) => sum + (parseFloat(acc.target) || 0),
    0,
  );
  const targetProgress =
    totalTarget > 0 ? ((totalSavings / totalTarget) * 100).toFixed(1) : "0";
  const monthlyTotal = allTransactions
    .filter((t) => t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  const openAddAccount = () => {
    setAccountModalTitle("저축 계좌 추가");
    setEditAccountId("");
    setAccountForm({
      name: "",
      type: "",
      target: "",
      startDate: getTodayString(),
      memo: "",
    });
    setAccountModalOpen(true);
  };

  const openEditAccount = (acc: SavingsAccount) => {
    setAccountModalTitle("저축 계좌 수정");
    setEditAccountId(acc.id);
    setAccountForm({
      name: acc.name,
      type: acc.type,
      target: acc.target || "",
      startDate: acc.startDate || "",
      memo: acc.memo || "",
    });
    setAccountModalOpen(true);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = getAccounts();
    if (editAccountId) {
      const idx = data.findIndex((a) => a.id === editAccountId);
      if (idx !== -1) {
        data[idx] = { ...data[idx], ...accountForm };
        saveAccounts(data);
        showToast("계좌가 수정되었습니다 ✅", "success");
      }
    } else {
      const newAcc: SavingsAccount = {
        id: generateId("ACC"),
        ...accountForm,
        active: true,
        createdAt: new Date().toISOString(),
      };
      data.push(newAcc);
      saveAccounts(data);
      showToast("계좌가 추가되었습니다 ✅", "success");
    }
    setAccountModalOpen(false);
    loadData();
  };

  const handleDeleteAccount = (id: string) => {
    if (
      confirm(
        "계좌를 삭제하면 관련된 모든 거래 내역도 삭제됩니다. 정말 삭제하시겠습니까?",
      )
    ) {
      const accs = getAccounts().filter((a) => a.id !== id);
      saveAccounts(accs);
      const txns = getTransactions().filter((t) => t.accountId !== id);
      saveTransactions(txns);
      showToast("계좌가 삭제되었습니다 🗑️", "success");
      loadData();
    }
  };

  const openAddTransaction = () => {
    if (allAccounts.length === 0) {
      showToast("먼저 저축 계좌를 추가해주세요 ⚠️", "warning");
      return;
    }
    setTxnModalTitle("저축 기록");
    setEditTxnId("");
    setTxnForm({ date: getTodayString(), amount: "", accountId: "", memo: "" });
    setTxnModalOpen(true);
  };

  const openEditTransaction = (txn: SavingsTransaction) => {
    setTxnModalTitle("저축 수정");
    setEditTxnId(txn.id);
    setTxnForm({
      date: txn.date,
      amount: String(txn.amount),
      accountId: txn.accountId,
      memo: txn.memo || "",
    });
    setTxnModalOpen(true);
  };

  const handleTxnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = getTransactions();
    if (editTxnId) {
      const idx = data.findIndex((t) => t.id === editTxnId);
      if (idx !== -1) {
        data[idx] = {
          ...data[idx],
          date: txnForm.date,
          amount: parseFloat(txnForm.amount),
          accountId: txnForm.accountId,
          memo: txnForm.memo,
        };
        saveTransactions(data);
        showToast("저축이 수정되었습니다 ✅", "success");
      }
    } else {
      const newTxn: SavingsTransaction = {
        id: generateId("TXN"),
        date: txnForm.date,
        amount: parseFloat(txnForm.amount),
        accountId: txnForm.accountId,
        memo: txnForm.memo,
        createdAt: new Date().toISOString(),
      };
      data.push(newTxn);
      saveTransactions(data);
      showToast("저축이 기록되었습니다 ✅", "success");
    }
    setTxnModalOpen(false);
    loadData();
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      const data = getTransactions().filter((t) => t.id !== id);
      saveTransactions(data);
      showToast("저축 내역이 삭제되었습니다 🗑️", "success");
      loadData();
    }
  };

  return (
    <>
      <Nav />
      <div className="max-w-[1100px] mx-auto px-8 py-12 relative z-[1]">
        <header className="page-header">
          <h1 className="page-title">🏦 Savings Dashboard</h1>
          <p className="page-subtitle">
            저축 계좌를 관리하고 목표를 달성하세요
          </p>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{formatAmount(totalSavings)}</div>
            <div className="stat-label">총 저축액</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{activeCount}개</div>
            <div className="stat-label">활성 저축 계좌</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{targetProgress}%</div>
            <div className="stat-label">목표 달성률</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatAmount(monthlyTotal)}</div>
            <div className="stat-label">이번 달 저축</div>
          </div>
        </div>

        <Card>
          <CardHeader title="저축 계좌" icon="🏦">
            <Button variant="primary" size="sm" onClick={openAddAccount}>
              ➕ 계좌 추가
            </Button>
          </CardHeader>
          <div className={styles.accountsContainer}>
            {accounts.length === 0 ? (
              <div className="text-center py-10 text-gray-light">
                저축 계좌가 없습니다. 계좌를 추가해보세요! 🏦
              </div>
            ) : (
              accounts.map((acc) => {
                const balance = calculateAccountBalance(acc.id);
                const target = parseFloat(acc.target) || 0;
                const progress =
                  target > 0 ? Math.min((balance / target) * 100, 100) : 0;
                return (
                  <div key={acc.id} className={styles.accountCard}>
                    <div className={styles.accountHeader}>
                      <div className={styles.accountInfo}>
                        <h3>{acc.name}</h3>
                        <span className={styles.accountType}>{acc.type}</span>
                      </div>
                      <div className={styles.accountActions}>
                        <Button
                          size="sm"
                          onClick={() => openEditAccount(acc)}
                          className="mr-1"
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDeleteAccount(acc.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                    <div className={styles.accountBalance}>
                      {formatAmount(balance)}
                    </div>
                    {target > 0 && (
                      <div className={styles.accountProgress}>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className={styles.progressText}>
                          목표: {formatAmount(target)} ({progress.toFixed(1)}%
                          달성)
                        </div>
                      </div>
                    )}
                    {acc.startDate && (
                      <div className="mt-3 text-sm text-gray-light">
                        시작일: {formatDate(acc.startDate)}
                      </div>
                    )}
                    {acc.memo && (
                      <div className="mt-2 text-sm text-gray">{acc.memo}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="저축 내역" icon="📋">
            <Button variant="primary" size="sm" onClick={openAddTransaction}>
              ➕ 저축 기록
            </Button>
          </CardHeader>
          <FormSelect
            label="계좌 필터"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="all">전체 계좌</option>
            {allAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </FormSelect>
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    날짜
                  </th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    계좌
                  </th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    금액
                  </th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    메모
                  </th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-gray-light"
                    >
                      저축 내역이 없습니다 📭
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const acc = allAccounts.find((a) => a.id === t.accountId);
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-beige-light hover:bg-light-pink"
                      >
                        <td className="p-3 text-gray">{formatDate(t.date)}</td>
                        <td className="p-3">
                          <span className="category-tag">
                            {acc ? acc.name : "알 수 없음"}
                          </span>
                        </td>
                        <td className="p-3 text-medium-pink font-semibold">
                          {formatAmount(t.amount)}
                        </td>
                        <td className="p-3 text-gray">{t.memo || "-"}</td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            onClick={() => openEditTransaction(t)}
                            className="mr-1"
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Account Modal */}
      <Modal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
      >
        <Card>
          <CardHeader title={accountModalTitle} icon="🏦">
            <ModalClose onClick={() => setAccountModalOpen(false)} />
          </CardHeader>
          <form onSubmit={handleAccountSubmit}>
            <FormInput
              type="text"
              label="🏷️ 저축명"
              placeholder="예: 주택청약, 비상금"
              value={accountForm.name}
              onChange={(e) =>
                setAccountForm({ ...accountForm, name: e.target.value })
              }
              required
            />
            <div className="grid grid-2">
              <FormSelect
                label="📊 유형"
                value={accountForm.type}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, type: e.target.value })
                }
                required
              >
                <option value="">선택하세요</option>
                <option value="적금">적금</option>
                <option value="예금">예금</option>
                <option value="청약">청약</option>
                <option value="비상금">비상금</option>
                <option value="기타">기타</option>
              </FormSelect>
              <FormInput
                type="number"
                label="🎯 목표금액 (선택)"
                placeholder="10000000"
                min="0"
                step="10000"
                value={accountForm.target}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, target: e.target.value })
                }
              />
            </div>
            <FormInput
              type="date"
              label="📅 시작일 (선택)"
              value={accountForm.startDate}
              onChange={(e) =>
                setAccountForm({ ...accountForm, startDate: e.target.value })
              }
            />
            <FormTextarea
              label="📝 메모"
              placeholder="계좌에 대한 메모"
              value={accountForm.memo}
              onChange={(e) =>
                setAccountForm({ ...accountForm, memo: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">
                💾 저장하기
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAccountModalOpen(false)}
              >
                취소
              </Button>
            </div>
          </form>
        </Card>
      </Modal>

      {/* Transaction Modal */}
      <Modal isOpen={txnModalOpen} onClose={() => setTxnModalOpen(false)}>
        <Card>
          <CardHeader title={txnModalTitle} icon="💰">
            <ModalClose onClick={() => setTxnModalOpen(false)} />
          </CardHeader>
          <form onSubmit={handleTxnSubmit}>
            <div className="grid grid-2">
              <FormInput
                type="date"
                label="📅 날짜"
                value={txnForm.date}
                onChange={(e) =>
                  setTxnForm({ ...txnForm, date: e.target.value })
                }
                required
              />
              <FormInput
                type="number"
                label="💵 금액"
                placeholder="500000"
                min="0"
                step="1000"
                value={txnForm.amount}
                onChange={(e) =>
                  setTxnForm({ ...txnForm, amount: e.target.value })
                }
                required
              />
            </div>
            <FormSelect
              label="🏦 저축 계좌"
              value={txnForm.accountId}
              onChange={(e) =>
                setTxnForm({ ...txnForm, accountId: e.target.value })
              }
              required
            >
              <option value="">선택하세요</option>
              {allAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </FormSelect>
            <FormTextarea
              label="📝 메모"
              placeholder="저축 메모"
              value={txnForm.memo}
              onChange={(e) => setTxnForm({ ...txnForm, memo: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">
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
        </Card>
      </Modal>
    </>
  );
}

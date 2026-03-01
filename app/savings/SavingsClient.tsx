"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader } from "../components/Card";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import FormTextarea from "../components/FormTextarea";
import Modal, { ModalClose } from "../components/Modal";
import { useToast } from "../components/ToastProvider";
import { formatDate, formatAmount, getTodayString } from "../../lib/utils";
import { SheetsAPI, type SavingsItem } from "../../lib/sheets-api";
import styles from "./Savings.module.css";
import statStyles from "@/app/components/StatCard.module.css";
import catStyles from "@/app/components/CategoryTag.module.css";

export default function SavingsClient() {
  const { showToast } = useToast();
  const [allItems, setAllItems] = useState<SavingsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountFilter, setAccountFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [modalTitle, setModalTitle] = useState("저축 기록");
  const [form, setForm] = useState({
    date: getTodayString(),
    category: "",
    account: "",
    amount: "",
    memo: "",
  });

  const fetchSavings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await SheetsAPI.savings.list();
      if (result.success && result.data) {
        const data = result.data.filter((i) => i.id);
        data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setAllItems(data);
      }
    } catch {
      showToast("데이터를 불러오지 못했습니다 ❌", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSavings();
  }, [fetchSavings]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalSavings = allItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const monthlyTotal = allItems
    .filter((i) => i.date.startsWith(currentMonth))
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const uniqueAccounts = [
    ...new Set(allItems.map((i) => i.account).filter(Boolean)),
  ];

  const accountTotals = allItems.reduce<Record<string, number>>((acc, i) => {
    const key = i.account || i.category;
    acc[key] = (acc[key] || 0) + Number(i.amount);
    return acc;
  }, {});

  const filteredItems =
    accountFilter === "all"
      ? allItems
      : allItems.filter((i) => (i.account || i.category) === accountFilter);

  const openAddModal = () => {
    setModalTitle("저축 기록");
    setEditId("");
    setForm({
      date: getTodayString(),
      category: "",
      account: "",
      amount: "",
      memo: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (item: SavingsItem) => {
    setModalTitle("저축 수정");
    setEditId(item.id);
    setForm({
      date: item.date,
      category: item.category,
      account: item.account || "",
      amount: item.amount,
      memo: item.memo || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) {
      showToast("카테고리를 선택해주세요 ⚠️", "warning");
      return;
    }
    try {
      if (editId) {
        const item = allItems.find((i) => i.id === editId);
        if (!item) return;
        const result = await SheetsAPI.savings.update(item, form);
        if (result.success) {
          setAllItems((prev) =>
            prev.map((i) => (i.id === editId ? { ...i, ...form } : i)),
          );
          showToast("저축이 수정되었습니다 ✅", "success");
        } else {
          showToast("수정 실패 ❌", "error");
        }
      } else {
        const result = await SheetsAPI.savings.create(form);
        if (result.success) {
          showToast("저축이 기록되었습니다 ✅", "success");
          await fetchSavings();
        } else {
          showToast("저장 실패 ❌", "error");
        }
      }
    } catch {
      showToast("오류가 발생했습니다 ❌", "error");
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const result = await SheetsAPI.savings.delete(id);
      if (result.success) {
        setAllItems((prev) => prev.filter((i) => i.id !== id));
        showToast("저축 내역이 삭제되었습니다 🗑️", "success");
      } else {
        showToast("삭제 실패 ❌", "error");
      }
    } catch {
      showToast("삭제 실패 ❌", "error");
    }
  };

  return (
    <>
      <div className={statStyles.statsGrid}>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>{formatAmount(totalSavings)}</div>
          <div className={statStyles.statLabel}>총 저축액</div>
        </div>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>{uniqueAccounts.length}개</div>
          <div className={statStyles.statLabel}>저축 계좌 수</div>
        </div>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>{allItems.length}건</div>
          <div className={statStyles.statLabel}>총 저축 횟수</div>
        </div>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>{formatAmount(monthlyTotal)}</div>
          <div className={statStyles.statLabel}>이번 달 저축</div>
        </div>
      </div>

      {Object.keys(accountTotals).length > 0 && (
        <Card>
          <CardHeader title="계좌별 저축 현황" icon="🏦" />
          <div className={styles.accountsContainer}>
            {Object.entries(accountTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([name, amount]) => (
                <div key={name} className={styles.accountCard}>
                  <div className={styles.accountHeader}>
                    <div className={styles.accountInfo}>
                      <h3>{name}</h3>
                    </div>
                  </div>
                  <div className={styles.accountBalance}>
                    {formatAmount(amount)}
                  </div>
                  {totalSavings > 0 && (
                    <div className={styles.accountProgress}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${Math.min((amount / totalSavings) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className={styles.progressText}>
                        전체의 {Math.round((amount / totalSavings) * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="저축 내역" icon="📋">
          <Button variant="primary" size="sm" onClick={openAddModal}>
            ➕ 저축 기록
          </Button>
        </CardHeader>
        <FormSelect
          label="계좌 필터"
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
        >
          <option value="all">전체</option>
          {[
            ...new Set(
              allItems.map((i) => i.account || i.category).filter(Boolean),
            ),
          ].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </FormSelect>
        {loading ? (
          <div className="text-center py-10 text-gray-light">
            불러오는 중...
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    날짜
                  </th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    카테고리
                  </th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    계좌명
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
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 text-gray-light"
                    >
                      저축 내역이 없습니다 📭
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-beige-light hover:bg-light-pink"
                    >
                      <td className="p-3 text-gray">{formatDate(item.date)}</td>
                      <td className="p-3">
                        <span className={catStyles.categoryTag}>{item.category}</span>
                      </td>
                      <td className="p-3 text-gray">{item.account || "-"}</td>
                      <td className="p-3 text-medium-pink font-semibold">
                        {formatAmount(Number(item.amount))}
                      </td>
                      <td className="p-3 text-gray">{item.memo || "-"}</td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          onClick={() => openEditModal(item)}
                          className="mr-1"
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDelete(item.id)}
                        >
                          삭제
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <Card>
          <CardHeader title={modalTitle} icon="🏦">
            <ModalClose onClick={() => setModalOpen(false)} />
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                type="date"
                label="📅 날짜"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
              <FormInput
                type="number"
                label="💵 금액"
                placeholder="500000"
                min="0"
                step="1000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="📊 카테고리"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                <option value="">선택하세요</option>
                <option value="적금">적금</option>
                <option value="예금">예금</option>
                <option value="청약">청약</option>
                <option value="비상금">비상금</option>
                <option value="목돈">목돈</option>
              </FormSelect>
              <FormInput
                type="text"
                label="🏦 계좌명 (선택)"
                placeholder="예: 청년적금, 비상금통장"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              />
            </div>
            <FormTextarea
              label="📝 메모"
              placeholder="저축 메모"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">
                💾 저장하기
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
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

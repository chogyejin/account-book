"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader } from "../components/Card";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import FormTextarea from "../components/FormTextarea";
import Modal, { ModalClose } from "../components/Modal";
import { useToast } from "../components/ToastProvider";
import { CONFIG } from "../../lib/config";
import { formatAmount, getTodayString } from "../../lib/utils";
import { SheetsAPI, type Expense } from "../../lib/sheets-api";
import clsx from "clsx";
import styles from "./Spending.module.css";
import statStyles from "@/app/components/StatCard.module.css";
import catStyles from "@/app/components/CategoryTag.module.css";

export default function SpendingClient() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({
    date: getTodayString(),
    amount: "",
    category: "",
    memo: "",
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const result = await SheetsAPI.expenses.list();
        if (result.success && result.data) {
          const data = result.data.filter((e) => e.id);
          data.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
          setExpenses(data);
        }
      } catch {
        showToast("데이터를 불러오지 못했습니다 ❌", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [showToast]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthExpenses = expenses.filter((e) =>
    e.date.startsWith(currentMonth),
  );
  const totalThisMonth = thisMonthExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0,
  );
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const dailyAvg =
    daysInMonth > 0 ? Math.round(totalThisMonth / daysInMonth) : 0;

  const categoryTotals = thisMonthExpenses.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    },
    {},
  );
  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const categoryBreakdown = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount,
      pct: totalThisMonth > 0 ? Math.round((amount / totalThisMonth) * 100) : 0,
    }));

  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory =
      categoryFilter === "all" || exp.category === categoryFilter;
    const matchesSearch = exp.memo
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const result = await SheetsAPI.expenses.delete(id);
      if (result.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        showToast("지출이 삭제되었습니다 🗑️", "success");
      } else {
        showToast("삭제 실패 ❌", "error");
      }
    } catch {
      showToast("삭제 실패 ❌", "error");
    }
  };

  const handleEdit = (exp: Expense) => {
    setEditId(exp.id);
    setEditForm({
      date: exp.date,
      amount: exp.amount,
      category: exp.category,
      memo: exp.memo,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expense = expenses.find((ex) => ex.id === editId);
    if (!expense) return;
    try {
      const result = await SheetsAPI.expenses.update(expense, editForm);
      if (result.success) {
        setExpenses((prev) =>
          prev.map((ex) => (ex.id === editId ? { ...ex, ...editForm } : ex)),
        );
        showToast("지출이 수정되었습니다 ✅", "success");
        setEditModalOpen(false);
      } else {
        showToast("수정 실패 ❌", "error");
      }
    } catch {
      showToast("수정 실패 ❌", "error");
    }
  };

  return (
    <>
      <div className={statStyles.statsGrid}>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>{formatAmount(totalThisMonth)}</div>
          <div className={statStyles.statLabel}>이번 달 총 지출</div>
        </div>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>{formatAmount(dailyAvg)}</div>
          <div className={statStyles.statLabel}>일 평균 지출</div>
        </div>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>{topCategory}</div>
          <div className={statStyles.statLabel}>최다 지출 카테고리</div>
        </div>
        <div className={statStyles.statCard}>
          <div className={statStyles.statValue}>{thisMonthExpenses.length}건</div>
          <div className={statStyles.statLabel}>이번 달 지출 횟수</div>
        </div>
      </div>

      <Card>
        <CardHeader title="필터 & 검색" icon="🔍" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormSelect
            label="카테고리"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">전체</option>
            {CONFIG.DEFAULT_CATEGORIES.expense.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </FormSelect>
          <FormInput
            type="text"
            label="검색"
            placeholder="메모 내용 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader title="이번 달 카테고리별 지출" icon="📊" />
          <div className={styles.categoryBreakdown}>
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className={styles.categoryItem}>
                <div className={styles.categoryItemHeader}>
                  <span className={clsx(catStyles.categoryTag, catStyles.selected)}>{cat.name}</span>
                  <span className="text-medium-pink font-semibold">
                    {cat.amount.toLocaleString("ko-KR")}원
                  </span>
                </div>
                <div className={styles.categoryBar}>
                  <div
                    className={styles.categoryBarFill}
                    style={{
                      width: `${cat.pct}%`,
                      background: "var(--medium-pink)",
                    }}
                  />
                </div>
                <small className="text-gray-light">전체의 {cat.pct}%</small>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="지출 내역" icon="📝" />
        {loading ? (
          <div className="text-center py-10 text-gray-light">
            불러오는 중...
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    메모
                  </th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    금액
                  </th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-gray-light"
                    >
                      지출 내역이 없습니다 📭
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="border-b border-beige-light hover:bg-light-pink"
                    >
                      <td className="p-3 text-gray">{exp.date}</td>
                      <td className="p-3">
                        <span className={catStyles.categoryTag}>{exp.category}</span>
                      </td>
                      <td className="p-3 text-gray">{exp.memo || "-"}</td>
                      <td className="p-3 text-medium-pink font-semibold">
                        {Number(exp.amount).toLocaleString("ko-KR")}원
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(exp)}
                          className="mr-1"
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDelete(exp.id)}
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

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <Card>
          <CardHeader title="지출 수정하기" icon="✏️">
            <ModalClose onClick={() => setEditModalOpen(false)} />
          </CardHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                type="date"
                label="📅 날짜"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm({ ...editForm, date: e.target.value })
                }
                required
              />
              <FormInput
                type="number"
                label="💵 금액"
                value={editForm.amount}
                onChange={(e) =>
                  setEditForm({ ...editForm, amount: e.target.value })
                }
                required
              />
            </div>
            <FormSelect
              label="🏷️ 카테고리"
              value={editForm.category}
              onChange={(e) =>
                setEditForm({ ...editForm, category: e.target.value })
              }
              required
            >
              {CONFIG.DEFAULT_CATEGORIES.expense.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </FormSelect>
            <FormTextarea
              label="📝 메모"
              value={editForm.memo}
              onChange={(e) =>
                setEditForm({ ...editForm, memo: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">
                💾 저장하기
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditModalOpen(false)}
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

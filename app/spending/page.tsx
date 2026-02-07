'use client';

import { useState } from 'react';
import Nav from '../components/Nav';
import { Card, CardHeader } from '../components/Card';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormTextarea from '../components/FormTextarea';
import Modal, { ModalClose } from '../components/Modal';
import { useToast } from '../components/ToastProvider';
import { CONFIG } from '../../lib/config';
import styles from './Spending.module.css';

interface Expense {
  id: string;
  date: string;
  category: string;
  memo: string;
  amount: string;
}

const DEMO_DATA: Expense[] = [
  { id: '1', date: '2026-01-27', category: '카페', memo: '아이스 아메리카노', amount: '4500' },
  { id: '2', date: '2026-01-27', category: '식비', memo: '점심 - 파스타', amount: '13000' },
  { id: '3', date: '2026-01-26', category: '간식', memo: '편의점 과자', amount: '3500' },
  { id: '4', date: '2026-01-26', category: '데이트', memo: '영화 관람', amount: '28000' },
  { id: '5', date: '2026-01-25', category: '쇼핑', memo: '청바지', amount: '78500' },
  { id: '6', date: '2026-01-24', category: '고정지출', memo: '통신비', amount: '65000' },
  { id: '7', date: '2026-01-23', category: '식비', memo: '저녁 - 삼겹살', amount: '32000' },
  { id: '8', date: '2026-01-22', category: '카페', memo: '스타벅스 라떼', amount: '5900' },
  { id: '9', date: '2026-01-21', category: '취미(운동)', memo: '헬스장 회비', amount: '120000' },
  { id: '10', date: '2026-01-20', category: '모임', memo: '친구들과 저녁', amount: '45000' },
];

const CATEGORIES = [
  { name: '식비', amount: 485000, pct: 33 },
  { name: '카페', amount: 156000, pct: 11 },
  { name: '쇼핑', amount: 324800, pct: 22 },
  { name: '데이트', amount: 245000, pct: 17 },
  { name: '기타', amount: 246000, pct: 17 },
];

export default function Spending() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>(DEMO_DATA);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ date: '2026-01-27', amount: '4500', category: '카페', memo: '아이스 아메리카노' });

  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    const matchesSearch = exp.memo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      showToast('지출이 삭제되었습니다 🗑️', 'success');
    }
  };

  const handleEdit = (exp: Expense) => {
    setEditForm({ date: exp.date, amount: exp.amount, category: exp.category, memo: exp.memo });
    setEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('지출이 수정되었습니다 ✅', 'success');
    setEditModalOpen(false);
  };

  return (
    <>
      <Nav />
      <div className="max-w-[1100px] mx-auto px-8 py-12 relative z-[1]">
        <header className="page-header">
          <h1 className="page-title">💸 Spending Dashboard</h1>
          <p className="page-subtitle">내가 쓴 돈, 한눈에 보고 분석하기</p>
        </header>

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">1,456,800원</div><div className="stat-label">이번 달 총 지출</div></div>
          <div className="stat-card"><div className="stat-value">48,560원</div><div className="stat-label">일 평균 지출</div></div>
          <div className="stat-card"><div className="stat-value">식비</div><div className="stat-label">최다 지출 카테고리</div></div>
          <div className="stat-card"><div className="stat-value">543,200원</div><div className="stat-label">예산 남음 (27%)</div></div>
        </div>

        <Card>
          <CardHeader title="필터 & 검색" icon="🔍" />
          <div className="grid grid-3">
            <FormSelect label="카테고리" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">전체</option>
              {CONFIG.DEFAULT_CATEGORIES.expense.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
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

        <Card>
          <CardHeader title="카테고리별 지출 현황" icon="📊" />
          <div className={styles.categoryBreakdown}>
            {CATEGORIES.map((cat) => (
              <div key={cat.name} className={styles.categoryItem}>
                <div className={styles.categoryItemHeader}>
                  <span className="category-tag selected">{cat.name}</span>
                  <span className="text-medium-pink font-semibold">{cat.amount.toLocaleString('ko-KR')}원</span>
                </div>
                <div className={styles.categoryBar}>
                  <div className={styles.categoryBarFill} style={{ width: `${cat.pct}%`, background: 'var(--medium-pink)' }} />
                </div>
                <small className="text-gray-light">전체의 {cat.pct}%</small>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="지출 내역" icon="📝">
            <Button size="sm" onClick={() => showToast('엑셀 파일이 다운로드되었습니다 📊', 'success')}>
              📊 엑셀 다운로드
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">날짜</th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">카테고리</th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">메모</th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">금액</th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-cream">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-beige-light hover:bg-light-pink">
                    <td className="p-3 text-gray">{exp.date}</td>
                    <td className="p-3"><span className="category-tag">{exp.category}</span></td>
                    <td className="p-3 text-gray">{exp.memo}</td>
                    <td className="p-3 text-medium-pink font-semibold">{Number(exp.amount).toLocaleString('ko-KR')}원</td>
                    <td className="p-3">
                      <Button size="sm" onClick={() => handleEdit(exp)} className="mr-1">수정</Button>
                      <Button size="sm" variant="secondary" onClick={() => handleDelete(exp.id)}>삭제</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className={styles.pagination}>
          <Button size="sm">◀ 이전</Button>
          <div className={styles.paginationNumbers}>
            <Button size="sm" variant="primary">1</Button>
            <Button size="sm">2</Button>
            <Button size="sm">3</Button>
          </div>
          <Button size="sm">다음 ▶</Button>
        </div>
      </div>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <Card>
          <CardHeader title="지출 수정하기" icon="✏️">
            <ModalClose onClick={() => setEditModalOpen(false)} />
          </CardHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid grid-2">
              <FormInput
                type="date"
                label="📅 날짜"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                required
              />
              <FormInput
                type="number"
                label="💵 금액"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                required
              />
            </div>
            <FormSelect label="🏷️ 카테고리" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} required>
              {CONFIG.DEFAULT_CATEGORIES.expense.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </FormSelect>
            <FormTextarea
              label="📝 메모"
              value={editForm.memo}
              onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">💾 저장하기</Button>
              <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>취소</Button>
            </div>
          </form>
        </Card>
      </Modal>
    </>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Nav from '../components/Nav';
import { Card, CardHeader } from '../components/Card';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormTextarea from '../components/FormTextarea';
import Modal, { ModalClose } from '../components/Modal';
import { useToast } from '../components/ToastProvider';
import { formatDate, formatAmount, generateId, getTodayString } from '../../lib/utils';

interface IncomeItem {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  memo: string;
  createdAt: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'incomeData';

function getIncomeData(): IncomeItem[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveIncomeData(data: IncomeItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function Income() {
  const { showToast } = useToast();
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [periodFilter, setPeriodFilter] = useState('this-month');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [modalTitle, setModalTitle] = useState('수입 추가');
  const [form, setForm] = useState({ date: getTodayString(), amount: '', type: '', category: '', memo: '' });

  const loadData = useCallback(() => {
    let data = getIncomeData();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    if (periodFilter === 'this-month') data = data.filter((i) => i.date.startsWith(currentMonth));
    else if (periodFilter === 'last-month') data = data.filter((i) => i.date.startsWith(lastMonthStr));
    else if (periodFilter === 'this-year') data = data.filter((i) => i.date.startsWith(now.getFullYear().toString()));

    if (typeFilter !== 'all') data = data.filter((i) => i.type === typeFilter);
    if (categoryFilter !== 'all') data = data.filter((i) => i.category === categoryFilter);

    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setIncomes(data);
  }, [periodFilter, typeFilter, categoryFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const allData = getIncomeData();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthData = allData.filter((i) => i.date.startsWith(currentMonth));
  const totalIncome = thisMonthData.reduce((sum, i) => sum + i.amount, 0);
  const salary = thisMonthData.filter((i) => i.type === '월급').reduce((sum, i) => sum + i.amount, 0);
  const additional = thisMonthData.filter((i) => i.type === '추가수입').reduce((sum, i) => sum + i.amount, 0);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const recentData = allData.filter((i) => new Date(i.date) >= threeMonthsAgo);
  const avgIncome = recentData.length > 0 ? recentData.reduce((sum, i) => sum + i.amount, 0) / 3 : 0;

  const openAddModal = () => {
    setModalTitle('수입 추가');
    setEditId('');
    setForm({ date: getTodayString(), amount: '', type: '', category: '', memo: '' });
    setModalOpen(true);
  };

  const openEditModal = (item: IncomeItem) => {
    setModalTitle('수입 수정');
    setEditId(item.id);
    setForm({ date: item.date, amount: String(item.amount), type: item.type, category: item.category, memo: item.memo || '' });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = getIncomeData();
    if (editId) {
      const idx = data.findIndex((i) => i.id === editId);
      if (idx !== -1) {
        data[idx] = { ...data[idx], date: form.date, amount: parseFloat(form.amount), type: form.type, category: form.category, memo: form.memo, updatedAt: new Date().toISOString() };
        saveIncomeData(data);
        showToast('수입이 수정되었습니다 ✅', 'success');
      }
    } else {
      const newItem: IncomeItem = { id: generateId('INC'), date: form.date, type: form.type, category: form.category, amount: parseFloat(form.amount), memo: form.memo, createdAt: new Date().toISOString() };
      data.push(newItem);
      saveIncomeData(data);
      showToast('수입이 추가되었습니다 ✅', 'success');
    }
    setModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      const data = getIncomeData().filter((i) => i.id !== id);
      saveIncomeData(data);
      showToast('수입이 삭제되었습니다 🗑️', 'success');
      loadData();
    }
  };

  return (
    <>
      <Nav />
      <div className="max-w-[1100px] mx-auto px-8 py-12 relative z-[1]">
        <header className="page-header">
          <h1 className="page-title">💰 Income Dashboard</h1>
          <p className="page-subtitle">모든 수입을 기록하고 관리하세요</p>
        </header>

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{formatAmount(totalIncome)}</div><div className="stat-label">이번 달 총 수입</div></div>
          <div className="stat-card"><div className="stat-value">{formatAmount(salary)}</div><div className="stat-label">월급</div></div>
          <div className="stat-card"><div className="stat-value">{formatAmount(additional)}</div><div className="stat-label">추가 수입</div></div>
          <div className="stat-card"><div className="stat-value">{formatAmount(Math.round(avgIncome))}</div><div className="stat-label">월 평균 (3개월)</div></div>
        </div>

        <Card>
          <Button variant="primary" block onClick={openAddModal}>
            ➕ 새 수입 추가
          </Button>
        </Card>

        <Card>
          <CardHeader title="필터 & 검색" icon="🔍" />
          <div className="grid grid-3">
            <FormSelect label="기간" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
              <option value="this-month">이번 달</option>
              <option value="last-month">지난 달</option>
              <option value="this-year">올해</option>
              <option value="all">전체</option>
            </FormSelect>
            <FormSelect label="유형" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">전체</option>
              <option value="월급">월급</option>
              <option value="추가수입">추가수입</option>
            </FormSelect>
            <FormSelect label="카테고리" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">전체</option>
              <option value="급여">급여</option>
              <option value="보너스">보너스</option>
              <option value="부수입">부수입</option>
              <option value="용돈">용돈</option>
              <option value="환급">환급</option>
              <option value="기타수입">기타수입</option>
            </FormSelect>
          </div>
        </Card>

        <Card>
          <CardHeader title="수입 내역" icon="📋" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-light-gray">날짜</th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-light-gray">유형</th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-light-gray">카테고리</th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-light-gray">금액</th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-light-gray">메모</th>
                  <th className="p-3 text-left font-semibold border-b-2 border-beige text-gray bg-light-gray">작업</th>
                </tr>
              </thead>
              <tbody>
                {incomes.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-light">수입 내역이 없습니다 📭</td></tr>
                ) : incomes.map((item) => (
                  <tr key={item.id} className="border-b border-beige-light">
                    <td className="p-3 text-gray">{formatDate(item.date)}</td>
                    <td className="p-3"><span className={clsx('category-tag', item.type === '월급' && 'selected')}>{item.type}</span></td>
                    <td className="p-3"><span className="category-tag">{item.category}</span></td>
                    <td className="p-3 text-medium-pink font-semibold">{formatAmount(item.amount)}</td>
                    <td className="p-3 text-gray">{item.memo || '-'}</td>
                    <td className="p-3">
                      <Button size="sm" onClick={() => openEditModal(item)} className="mr-1">수정</Button>
                      <Button size="sm" variant="secondary" onClick={() => handleDelete(item.id)}>삭제</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <Card>
          <CardHeader title={modalTitle} icon="💰">
            <ModalClose onClick={() => setModalOpen(false)} />
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2">
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
                placeholder="3500000"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-2">
              <FormSelect label="📊 수입 유형" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                <option value="">선택하세요</option>
                <option value="월급">월급</option>
                <option value="추가수입">추가수입</option>
              </FormSelect>
              <FormSelect label="🏷️ 카테고리" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">선택하세요</option>
                <option value="급여">급여</option>
                <option value="보너스">보너스</option>
                <option value="부수입">부수입</option>
                <option value="용돈">용돈</option>
                <option value="환급">환급</option>
                <option value="기타수입">기타수입</option>
              </FormSelect>
            </div>
            <FormTextarea
              label="📝 메모"
              placeholder="수입에 대한 메모를 입력하세요"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1">💾 저장하기</Button>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>취소</Button>
            </div>
          </form>
        </Card>
      </Modal>
    </>
  );
}

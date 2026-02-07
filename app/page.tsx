'use client';

import { useState } from 'react';
import Nav from './components/Nav';
import { Card, CardHeader } from './components/Card';
import Button from './components/Button';
import FormInput from './components/FormInput';
import FormSelect from './components/FormSelect';
import FormTextarea from './components/FormTextarea';
import CategoryTag from './components/CategoryTag';
import { useToast } from './components/ToastProvider';
import { CONFIG } from '../lib/config';
import API from '../lib/api';
import { getTodayString } from '../lib/utils';

const TABS = [
  { id: 'expense', label: '💸 지출' },
  { id: 'income', label: '💰 Income' },
  { id: 'savings', label: '🏦 Savings' },
  { id: 'investment', label: '📈 Invest' },
];

export default function QuickEntry() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('expense');
  const [loading, setLoading] = useState(false);
  const today = getTodayString();

  const [expenseForm, setExpenseForm] = useState({ date: today, amount: '', memo: '' });
  const [expenseCategory, setExpenseCategory] = useState('');

  const [incomeForm, setIncomeForm] = useState({ date: today, amount: '', memo: '' });
  const [incomeCategory, setIncomeCategory] = useState('');

  const [savingsForm, setSavingsForm] = useState({ date: today, amount: '', memo: '' });
  const [savingsCategory, setSavingsCategory] = useState('');

  const [investmentForm, setInvestmentForm] = useState({ date: today, type: '', name: '', amount: '', memo: '' });
  const [investmentCategory, setInvestmentCategory] = useState('');

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseCategory) { showToast('카테고리를 선택해주세요 ⚠️', 'warning'); return; }
    if (!expenseForm.date || !expenseForm.amount) { showToast('날짜와 금액을 입력해주세요 ⚠️', 'warning'); return; }
    try {
      setLoading(true);
      const res = await API.createExpense({ ...expenseForm, category: expenseCategory });
      setLoading(false);
      if (res.success) {
        showToast('지출이 기록되었습니다 ✅', 'success');
        setExpenseForm({ date: today, amount: '', memo: '' });
        setExpenseCategory('');
      } else {
        showToast(`저장에 실패했습니다 ❌`, 'error');
      }
    } catch { setLoading(false); showToast('저장에 실패했습니다 ❌', 'error'); }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeCategory) { showToast('카테고리를 선택해주세요 ⚠️', 'warning'); return; }
    try {
      setLoading(true);
      const res = await API.createIncome({ ...incomeForm, category: incomeCategory });
      setLoading(false);
      if (res.success) {
        showToast('Income이 기록되었습니다 ✅', 'success');
        setIncomeForm({ date: today, amount: '', memo: '' });
        setIncomeCategory('');
      } else { showToast('저장에 실패했습니다 ❌', 'error'); }
    } catch { setLoading(false); showToast('저장에 실패했습니다 ❌', 'error'); }
  };

  const handleSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savingsCategory) { showToast('Savings 종류를 선택해주세요 ⚠️', 'warning'); return; }
    try {
      setLoading(true);
      const res = await API.createSavings({ ...savingsForm, category: savingsCategory });
      setLoading(false);
      if (res.success) {
        showToast('Savings이 기록되었습니다 ✅', 'success');
        setSavingsForm({ date: today, amount: '', memo: '' });
        setSavingsCategory('');
      } else { showToast('저장에 실패했습니다 ❌', 'error'); }
    } catch { setLoading(false); showToast('저장에 실패했습니다 ❌', 'error'); }
  };

  const handleInvestmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investmentCategory) { showToast('Invest 종류를 선택해주세요 ⚠️', 'warning'); return; }
    try {
      setLoading(true);
      const res = await API.createInvestment({
        date: investmentForm.date, type: investmentForm.type, name: investmentForm.name,
        investmentType: investmentCategory, amount: investmentForm.amount, memo: investmentForm.memo,
      });
      setLoading(false);
      if (res.success) {
        showToast('Invest가 기록되었습니다 ✅', 'success');
        setInvestmentForm({ date: today, type: '', name: '', amount: '', memo: '' });
        setInvestmentCategory('');
      } else { showToast('저장에 실패했습니다 ❌', 'error'); }
    } catch { setLoading(false); showToast('저장에 실패했습니다 ❌', 'error'); }
  };

  return (
    <>
      <Nav />
      <div className="max-w-[1100px] mx-auto px-8 py-12 relative z-[1]">
        <header className="page-header">
          <h1 className="page-title">💰 Quick Entry</h1>
          <p className="page-subtitle">스티커처럼 간편하게, 편지처럼 정성스럽게</p>
        </header>

        <div className="tabs">
          {TABS.map((tab) => (
            <button key={tab.id} className={`tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'expense' && (
          <Card>
            <CardHeader title="지출 기록하기" icon="💸">
              <span className="text-gray-light font-light">오늘 쓴 돈을 기록해보세요</span>
            </CardHeader>
            <form onSubmit={handleExpenseSubmit}>
              <div className="grid grid-2">
                <FormInput
                  type="date"
                  label="📅 날짜"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  required
                />
                <FormInput
                  type="number"
                  label="💵 금액"
                  placeholder="15000"
                  min="0"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">🏷️ 카테고리</label>
                <CategoryTag
                  categories={CONFIG.DEFAULT_CATEGORIES.expense}
                  selectedCategory={expenseCategory}
                  onSelectCategory={setExpenseCategory}
                />
              </div>
              <FormTextarea
                label="📝 메모"
                placeholder="무엇을 구매하셨나요?"
                value={expenseForm.memo}
                onChange={(e) => setExpenseForm({ ...expenseForm, memo: e.target.value })}
              />
              <Button type="submit" variant="primary" block>
                ✍️ 지출 기록하기
              </Button>
            </form>
          </Card>
        )}

        {activeTab === 'income' && (
          <Card>
            <CardHeader title="Income 기록하기" icon="💰">
              <span className="text-gray-light font-light">들어온 돈을 기록해보세요</span>
            </CardHeader>
            <form onSubmit={handleIncomeSubmit}>
              <div className="grid grid-2">
                <FormInput
                  type="date"
                  label="📅 날짜"
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                  required
                />
                <FormInput
                  type="number"
                  label="💵 금액"
                  placeholder="3500000"
                  min="0"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">🏷️ 카테고리</label>
                <CategoryTag
                  categories={CONFIG.DEFAULT_CATEGORIES.income}
                  selectedCategory={incomeCategory}
                  onSelectCategory={setIncomeCategory}
                />
              </div>
              <FormTextarea
                label="📝 메모"
                placeholder="어디서 받으셨나요?"
                value={incomeForm.memo}
                onChange={(e) => setIncomeForm({ ...incomeForm, memo: e.target.value })}
              />
              <Button type="submit" variant="primary" block>
                ✍️ Income 기록하기
              </Button>
            </form>
          </Card>
        )}

        {activeTab === 'savings' && (
          <Card>
            <CardHeader title="Savings 기록하기" icon="🏦">
              <span className="text-gray-light font-light">모은 돈을 기록해보세요</span>
            </CardHeader>
            <form onSubmit={handleSavingsSubmit}>
              <div className="grid grid-2">
                <FormInput
                  type="date"
                  label="📅 날짜"
                  value={savingsForm.date}
                  onChange={(e) => setSavingsForm({ ...savingsForm, date: e.target.value })}
                  required
                />
                <FormInput
                  type="number"
                  label="💵 금액"
                  placeholder="500000"
                  min="0"
                  value={savingsForm.amount}
                  onChange={(e) => setSavingsForm({ ...savingsForm, amount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">🏷️ Savings 종류</label>
                <CategoryTag
                  categories={CONFIG.DEFAULT_CATEGORIES.savings}
                  selectedCategory={savingsCategory}
                  onSelectCategory={setSavingsCategory}
                />
              </div>
              <FormTextarea
                label="📝 메모"
                placeholder="어디에 Savings하셨나요?"
                value={savingsForm.memo}
                onChange={(e) => setSavingsForm({ ...savingsForm, memo: e.target.value })}
              />
              <Button type="submit" variant="primary" block>
                ✍️ Savings 기록하기
              </Button>
            </form>
          </Card>
        )}

        {activeTab === 'investment' && (
          <Card>
            <CardHeader title="Invest 기록하기" icon="📈">
              <span className="text-gray-light font-light">Invest 내역을 기록해보세요</span>
            </CardHeader>
            <form onSubmit={handleInvestmentSubmit}>
              <div className="grid grid-2">
                <FormInput
                  type="date"
                  label="📅 날짜"
                  value={investmentForm.date}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, date: e.target.value })}
                  required
                />
                <FormSelect
                  label="📊 거래 유형"
                  value={investmentForm.type}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, type: e.target.value })}
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="매수">매수</option>
                  <option value="매도">매도</option>
                </FormSelect>
              </div>
              <div className="grid grid-2">
                <FormInput
                  type="text"
                  label="🏢 종목명"
                  placeholder="삼성전자"
                  value={investmentForm.name}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, name: e.target.value })}
                />
                <FormInput
                  type="number"
                  label="💰 금액"
                  placeholder="1000000"
                  min="0"
                  value={investmentForm.amount}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">🏷️ Invest 종류</label>
                <CategoryTag
                  categories={CONFIG.DEFAULT_CATEGORIES.investment}
                  selectedCategory={investmentCategory}
                  onSelectCategory={setInvestmentCategory}
                />
              </div>
              <FormTextarea
                label="📝 메모"
                placeholder="Invest 이유나 전략을 적어보세요"
                value={investmentForm.memo}
                onChange={(e) => setInvestmentForm({ ...investmentForm, memo: e.target.value })}
              />
              <Button type="submit" variant="primary" block>
                ✍️ Invest 기록하기
              </Button>
            </form>
          </Card>
        )}
      </div>

      {loading && <div className="spinner" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 9999 }} />}
    </>
  );
}

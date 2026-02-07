'use client';

import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Nav from '../components/Nav';
import { Card, CardHeader, CardBody } from '../components/Card';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import FormTextarea from '../components/FormTextarea';
import Modal, { ModalClose } from '../components/Modal';
import { useToast } from '../components/ToastProvider';
import { formatDate, formatAmount, formatCurrency, generateId, getTodayString } from '../../lib/utils';
import styles from './Investments.module.css';

interface InvestmentAsset {
  id: string;
  name: string;
  type: string;
  currency: string;
  currentPrice: string;
  targetPrice: string;
  createdAt: string;
}

interface InvestmentTransaction {
  id: string;
  date: string;
  type: string;
  assetId: string;
  quantity: number;
  amount: number;
  memo: string;
  createdAt: string;
}

interface Snapshot {
  yearMonth: string;
  totalValue: number;
  profitRate: string;
  createdAt: string;
  assets: { assetId: string; name: string; quantity: number; avgPrice: number; currentPrice: number; value: number }[];
}

function getAssets(): InvestmentAsset[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('investmentAssets');
  return data ? JSON.parse(data) : [];
}

function saveAssets(assets: InvestmentAsset[]) {
  localStorage.setItem('investmentAssets', JSON.stringify(assets));
}

function getTransactions(): InvestmentTransaction[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('investmentTransactions');
  return data ? JSON.parse(data) : [];
}

function saveTransactions(transactions: InvestmentTransaction[]) {
  localStorage.setItem('investmentTransactions', JSON.stringify(transactions));
}

function getSnapshots(): Snapshot[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('monthlySnapshots');
  return data ? JSON.parse(data) : [];
}

function saveSnapshots(snapshots: Snapshot[]) {
  localStorage.setItem('monthlySnapshots', JSON.stringify(snapshots));
}

function calculateAssetHoldings(assetId: string) {
  const transactions = getTransactions();
  let totalQuantity = 0;
  let totalInvested = 0;
  transactions.filter((t) => t.assetId === assetId).forEach((t) => {
    if (t.type === '매수') { totalQuantity += t.quantity; totalInvested += t.amount; }
    else if (t.type === '매도') { totalQuantity -= t.quantity; totalInvested -= t.amount; }
  });
  const avgPrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;
  return { quantity: totalQuantity, totalInvested, avgPrice };
}

export default function Investments() {
  const { showToast } = useToast();
  const [assets, setAssets] = useState<InvestmentAsset[]>([]);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetModalTitle, setAssetModalTitle] = useState('자산 추가');
  const [editAssetId, setEditAssetId] = useState('');
  const [assetForm, setAssetForm] = useState({ name: '', type: '', currency: 'KRW', currentPrice: '', targetPrice: '' });

  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [txnModalTitle, setTxnModalTitle] = useState('거래 기록');
  const [editTxnId, setEditTxnId] = useState('');
  const [txnForm, setTxnForm] = useState({ date: getTodayString(), type: '', assetId: '', quantity: '', amount: '', memo: '' });

  const loadData = useCallback(() => {
    setAssets(getAssets());
    const txns = getTransactions();
    txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(txns);
    const snaps = getSnapshots();
    snaps.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    setSnapshots(snaps);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const allAssets = getAssets();

  let totalValue = 0;
  let totalInvested = 0;
  allAssets.forEach((asset) => {
    const holdings = calculateAssetHoldings(asset.id);
    const currentPrice = parseFloat(asset.currentPrice) || 0;
    totalValue += holdings.quantity * currentPrice;
    totalInvested += holdings.totalInvested;
  });
  const totalProfit = totalValue - totalInvested;
  const profitRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const openAddAsset = () => {
    setAssetModalTitle('자산 추가');
    setEditAssetId('');
    setAssetForm({ name: '', type: '', currency: 'KRW', currentPrice: '', targetPrice: '' });
    setAssetModalOpen(true);
  };

  const openEditAsset = (asset: InvestmentAsset) => {
    setAssetModalTitle('자산 수정');
    setEditAssetId(asset.id);
    setAssetForm({ name: asset.name, type: asset.type, currency: asset.currency, currentPrice: asset.currentPrice || '', targetPrice: asset.targetPrice || '' });
    setAssetModalOpen(true);
  };

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = getAssets();
    if (editAssetId) {
      const idx = data.findIndex((a) => a.id === editAssetId);
      if (idx !== -1) {
        data[idx] = { ...data[idx], ...assetForm };
        saveAssets(data);
        showToast('자산이 수정되었습니다 ✅', 'success');
      }
    } else {
      const newAsset: InvestmentAsset = { id: generateId('AST'), ...assetForm, createdAt: new Date().toISOString() };
      data.push(newAsset);
      saveAssets(data);
      showToast('자산이 추가되었습니다 ✅', 'success');
    }
    setAssetModalOpen(false);
    loadData();
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm('자산을 삭제하면 관련된 모든 거래 내역도 삭제됩니다. 정말 삭제하시겠습니까?')) {
      saveAssets(getAssets().filter((a) => a.id !== id));
      saveTransactions(getTransactions().filter((t) => t.assetId !== id));
      showToast('자산이 삭제되었습니다 🗑️', 'success');
      loadData();
    }
  };

  const openAddTransaction = () => {
    if (allAssets.length === 0) {
      showToast('먼저 자산을 추가해주세요 ⚠️', 'warning');
      return;
    }
    setTxnModalTitle('거래 기록');
    setEditTxnId('');
    setTxnForm({ date: getTodayString(), type: '', assetId: '', quantity: '', amount: '', memo: '' });
    setTxnModalOpen(true);
  };

  const openEditTransaction = (txn: InvestmentTransaction) => {
    setTxnModalTitle('거래 수정');
    setEditTxnId(txn.id);
    setTxnForm({ date: txn.date, type: txn.type, assetId: txn.assetId, quantity: String(txn.quantity), amount: String(txn.amount), memo: txn.memo || '' });
    setTxnModalOpen(true);
  };

  const handleTxnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = getTransactions();
    if (editTxnId) {
      const idx = data.findIndex((t) => t.id === editTxnId);
      if (idx !== -1) {
        data[idx] = { ...data[idx], date: txnForm.date, type: txnForm.type, assetId: txnForm.assetId, quantity: parseFloat(txnForm.quantity), amount: parseFloat(txnForm.amount), memo: txnForm.memo };
        saveTransactions(data);
        showToast('거래가 수정되었습니다 ✅', 'success');
      }
    } else {
      const newTxn: InvestmentTransaction = {
        id: generateId('TXN'), date: txnForm.date, type: txnForm.type, assetId: txnForm.assetId,
        quantity: parseFloat(txnForm.quantity), amount: parseFloat(txnForm.amount), memo: txnForm.memo, createdAt: new Date().toISOString(),
      };
      data.push(newTxn);
      saveTransactions(data);
      showToast('거래가 기록되었습니다 ✅', 'success');
    }
    setTxnModalOpen(false);
    loadData();
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      saveTransactions(getTransactions().filter((t) => t.id !== id));
      showToast('거래가 삭제되었습니다 🗑️', 'success');
      loadData();
    }
  };

  const handleCreateSnapshot = () => {
    if (confirm('현재 포트폴리오 상태로 스냅샷을 생성하시겠습니까?')) {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentAssets = getAssets();
      const snaps = getSnapshots();
      const existingIdx = snaps.findIndex((s) => s.yearMonth === yearMonth);

      let snapTotalValue = 0;
      let snapTotalInvested = 0;
      const assetData = currentAssets.map((asset) => {
        const holdings = calculateAssetHoldings(asset.id);
        const cp = parseFloat(asset.currentPrice) || 0;
        const value = holdings.quantity * cp;
        snapTotalValue += value;
        snapTotalInvested += holdings.totalInvested;
        return { assetId: asset.id, name: asset.name, quantity: holdings.quantity, avgPrice: holdings.avgPrice, currentPrice: cp, value };
      });
      const snapProfitRate = snapTotalInvested > 0 ? ((snapTotalValue - snapTotalInvested) / snapTotalInvested * 100) : 0;

      const snapshot: Snapshot = { yearMonth, totalValue: snapTotalValue, profitRate: snapProfitRate.toFixed(2), createdAt: new Date().toISOString(), assets: assetData };
      if (existingIdx !== -1) { snaps[existingIdx] = snapshot; } else { snaps.push(snapshot); }
      saveSnapshots(snaps);
      showToast(`${yearMonth} 스냅샷이 생성되었습니다 📸`, 'success');
      loadData();
    }
  };

  const handleDeleteSnapshot = (yearMonth: string) => {
    if (confirm(`${yearMonth} 스냅샷을 삭제하시겠습니까?`)) {
      saveSnapshots(getSnapshots().filter((s) => s.yearMonth !== yearMonth));
      showToast('스냅샷이 삭제되었습니다 🗑️', 'success');
      loadData();
    }
  };

  return (
    <>
      <Nav />
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-3 text-gray-800">📈 Investment Portfolio</h1>
          <p className="text-gray-500">투자 자산을 관리하고 수익률을 추적하세요</p>
        </header>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 text-center">
            <div className="text-2xl font-bold text-gray-800 mb-2">{formatAmount(totalValue)}</div>
            <div className="text-sm text-gray-500">총 평가금액</div>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 text-center">
            <div className="text-2xl font-bold text-gray-800 mb-2">{formatAmount(totalInvested)}</div>
            <div className="text-sm text-gray-500">총 투자금액</div>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 text-center">
            <div className={clsx('text-2xl font-bold mb-2', totalProfit >= 0 ? styles.profitPositive : styles.profitNegative)}>
              {formatAmount(totalProfit)}
            </div>
            <div className="text-sm text-gray-500">수익금</div>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 text-center">
            <div className={clsx('text-2xl font-bold mb-2', profitRate >= 0 ? styles.profitPositive : styles.profitNegative)}>
              {profitRate.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-500">수익률</div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader title="보유 자산" icon="💼">
            <Button variant="primary" size="sm" onClick={openAddAsset}>➕ 자산 추가</Button>
          </CardHeader>
          <CardBody>
            <div className={styles.assetsContainer}>
              {assets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-light)' }}>보유 자산이 없습니다. 자산을 추가해보세요! 💎</div>
              ) : assets.map((asset) => {
                const holdings = calculateAssetHoldings(asset.id);
                const currentPrice = parseFloat(asset.currentPrice) || 0;
                const currentValue = holdings.quantity * currentPrice;
                const profit = currentValue - holdings.totalInvested;
                const pRate = holdings.totalInvested > 0 ? (profit / holdings.totalInvested * 100) : 0;
                return (
                  <div key={asset.id} className={styles.assetCard}>
                    <div className={styles.assetHeader}>
                      <div className={styles.assetInfo}>
                        <h3>{asset.name}</h3>
                        <span className={styles.assetType}>{asset.type} • {asset.currency}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openEditAsset(asset)}>수정</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleDeleteAsset(asset.id)}>삭제</Button>
                      </div>
                    </div>
                    <div className={styles.assetStats}>
                      <div className={styles.assetStat}>
                        <div className={styles.assetStatLabel}>보유수량</div>
                        <div className={styles.assetStatValue}>{holdings.quantity.toFixed(2)}</div>
                      </div>
                      <div className={styles.assetStat}>
                        <div className={styles.assetStatLabel}>평균단가</div>
                        <div className={styles.assetStatValue}>{formatCurrency(holdings.avgPrice, asset.currency)}</div>
                      </div>
                      <div className={styles.assetStat}>
                        <div className={styles.assetStatLabel}>현재가</div>
                        <div className={styles.assetStatValue}>{formatCurrency(currentPrice, asset.currency)}</div>
                      </div>
                      <div className={styles.assetStat}>
                        <div className={styles.assetStatLabel}>평가금액</div>
                        <div className={styles.assetStatValue}>{formatCurrency(currentValue, asset.currency)}</div>
                      </div>
                      <div className={styles.assetStat}>
                        <div className={styles.assetStatLabel}>수익금</div>
                        <div className={clsx(styles.assetStatValue, profit >= 0 ? styles.profitPositive : styles.profitNegative)}>
                          {formatCurrency(profit, asset.currency)}
                        </div>
                      </div>
                      <div className={styles.assetStat}>
                        <div className={styles.assetStatLabel}>수익률</div>
                        <div className={clsx(styles.assetStatValue, pRate >= 0 ? styles.profitPositive : styles.profitNegative)}>
                          {pRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card className="mb-6">
          <CardHeader title="거래 내역" icon="📋">
            <Button variant="primary" size="sm" onClick={openAddTransaction}>➕ 거래 기록</Button>
          </CardHeader>
          <CardBody>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">날짜</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">자산</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">유형</th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">수량</th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">금액</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">메모</th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-light)' }}>거래 내역이 없습니다 📭</td></tr>
                  ) : transactions.map((t) => {
                    const asset = allAssets.find((a) => a.id === t.assetId);
                    return (
                      <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{formatDate(t.date)}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-sm font-medium">
                            {asset ? asset.name : '알 수 없음'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium',
                            t.type === '매수' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700')}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm">{t.quantity.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-pink-600">{formatAmount(t.amount)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{t.memo || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" onClick={() => openEditTransaction(t)}>수정</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleDeleteTransaction(t.id)}>삭제</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="월말 스냅샷" icon="📸">
            <Button variant="primary" size="sm" onClick={handleCreateSnapshot}>📸 현재 스냅샷 생성</Button>
          </CardHeader>
          <CardBody>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">연월</th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">총 평가금액</th>
                    <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">수익률</th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">생성일시</th>
                    <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-light)' }}>스냅샷이 없습니다. 스냅샷을 생성해보세요! 📸</td></tr>
                  ) : snapshots.map((s) => (
                    <tr key={s.yearMonth} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{s.yearMonth}</td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-pink-600">{formatAmount(s.totalValue)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={clsx('text-sm font-semibold', parseFloat(s.profitRate) >= 0 ? styles.profitPositive : styles.profitNegative)}>
                          {s.profitRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm">{new Date(s.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td className="py-3 px-4 text-center">
                        <Button size="sm" variant="secondary" onClick={() => handleDeleteSnapshot(s.yearMonth)}>삭제</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={assetModalOpen} onClose={() => setAssetModalOpen(false)}>
        <Card>
          <CardHeader title={assetModalTitle} icon="💎">
            <ModalClose onClick={() => setAssetModalOpen(false)} />
          </CardHeader>
          <CardBody>
            <form onSubmit={handleAssetSubmit}>
              <FormInput
                label="🏷️ 자산명"
                type="text"
                placeholder="예: 삼성전자, S&P500"
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="📊 유형"
                  value={assetForm.type}
                  onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="국내주식">국내주식</option>
                  <option value="해외주식">해외주식</option>
                  <option value="ETF">ETF</option>
                  <option value="코인">코인</option>
                  <option value="채권">채권</option>
                  <option value="기타">기타</option>
                </FormSelect>
                <FormSelect
                  label="💱 통화"
                  value={assetForm.currency}
                  onChange={(e) => setAssetForm({ ...assetForm, currency: e.target.value })}
                  required
                >
                  <option value="KRW">KRW (원)</option>
                  <option value="USD">USD (달러)</option>
                  <option value="EUR">EUR (유로)</option>
                </FormSelect>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="💵 현재가 (선택)"
                  type="number"
                  placeholder="75000"
                  min="0"
                  step="0.01"
                  value={assetForm.currentPrice}
                  onChange={(e) => setAssetForm({ ...assetForm, currentPrice: e.target.value })}
                />
                <FormInput
                  label="📈 목표가 (선택)"
                  type="number"
                  placeholder="100000"
                  min="0"
                  step="0.01"
                  value={assetForm.targetPrice}
                  onChange={(e) => setAssetForm({ ...assetForm, targetPrice: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" block>💾 저장하기</Button>
                <Button type="button" variant="secondary" onClick={() => setAssetModalOpen(false)}>취소</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </Modal>

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
                  onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })}
                  required
                />
                <FormSelect
                  label="📊 거래유형"
                  value={txnForm.type}
                  onChange={(e) => setTxnForm({ ...txnForm, type: e.target.value })}
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="매수">매수</option>
                  <option value="매도">매도</option>
                </FormSelect>
              </div>
              <FormSelect
                label="💎 자산"
                value={txnForm.assetId}
                onChange={(e) => setTxnForm({ ...txnForm, assetId: e.target.value })}
                required
              >
                <option value="">선택하세요</option>
                {allAssets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </FormSelect>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="📦 수량"
                  type="number"
                  placeholder="10"
                  min="0"
                  step="0.01"
                  value={txnForm.quantity}
                  onChange={(e) => setTxnForm({ ...txnForm, quantity: e.target.value })}
                  required
                />
                <FormInput
                  label="💵 총 금액"
                  type="number"
                  placeholder="750000"
                  min="0"
                  step="1000"
                  value={txnForm.amount}
                  onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
                  required
                />
              </div>
              <FormTextarea
                label="📝 메모"
                placeholder="거래 메모"
                value={txnForm.memo}
                onChange={(e) => setTxnForm({ ...txnForm, memo: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit" variant="primary" block>💾 저장하기</Button>
                <Button type="button" variant="secondary" onClick={() => setTxnModalOpen(false)}>취소</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </Modal>
    </>
  );
}

'use client';

import { useState } from 'react';
import clsx from 'clsx';
import Nav from '../components/Nav';
import { Card, CardHeader } from '../components/Card';
import Button from '../components/Button';
import FormInput from '../components/FormInput';
import FormTextarea from '../components/FormTextarea';
import { useToast } from '../components/ToastProvider';
import styles from './Monthly.module.css';

const CATEGORIES = [
  { name: '식비', amount: 485000, pct: 33, color: 'var(--medium-pink)' },
  { name: '쇼핑', amount: 324800, pct: 22, color: 'var(--pink-light)' },
  { name: '데이트', amount: 245000, pct: 17, color: 'var(--medium-pink)' },
  { name: '카페', amount: 156000, pct: 11, color: 'var(--pink-light)' },
  { name: '기타', amount: 246000, pct: 17, color: 'var(--brown-light)' },
];

const WEEKS = [
  { label: '1주차', date: '1/1 - 1/7', amount: 287500, heightPct: 70 },
  { label: '2주차', date: '1/8 - 1/14', amount: 345200, heightPct: 85 },
  { label: '3주차', date: '1/15 - 1/21', amount: 438900, heightPct: 95 },
  { label: '4주차', date: '1/22 - 1/27', amount: 385200, heightPct: 100 },
];

const GOALS = [
  { icon: '💰', label: '지출 목표', current: 1456800, target: 2000000, status: 'achieved' as const },
  { icon: '🏦', label: 'Savings 목표', current: 500000, target: 500000, status: 'achieved' as const },
  { icon: '📈', label: 'Invest 목표', current: 300000, target: 400000, status: 'in-progress' as const },
  { icon: '☕', label: '카페 지출 줄이기', current: 156000, target: 120000, status: 'failed' as const },
];

const COMPARISONS = [
  { label: '총 지출', current: '1,456,800원', change: '▼ 85,200원', changeType: 'positive' as const, prev: '지난 달: 1,542,000원' },
  { label: '일 평균 지출', current: '48,560원', change: '▼ 2,830원', changeType: 'positive' as const, prev: '지난 달: 51,390원' },
  { label: 'Savings액', current: '500,000원', change: '▲ 50,000원', changeType: 'positive' as const, prev: '지난 달: 450,000원' },
  { label: '카페 지출', current: '156,000원', change: '▲ 23,000원', changeType: 'negative' as const, prev: '지난 달: 133,000원' },
];

const DIARY_DEFAULT_TITLE = '1월의 재무 회고';
const DIARY_DEFAULT_CONTENT = `이번 달은 식비 지출이 많았던 것 같다. 외식이 잦았고, 특히 주말마다 맛집 투어를 다니면서 예상보다 많이 썼다. 다음 달부터는 주 1회 정도로 외식을 줄이고, 집에서 요리하는 횟수를 늘려야겠다.

쇼핑 지출도 눈에 띈다. 겨울 세일 기간이라 옷을 많이 샀는데, 정말 필요한 것만 샀는지 돌이켜보면 아닌 것 같다. 충동구매를 줄이기 위해 24시간 고민 규칙을 만들어야겠다.

긍정적인 점은 Savings과 Invest를 꾸준히 했다는 것! 매달 초에 자동이체로 먼저 떼어놓으니까 확실히 Savings이 잘 된다. 이 습관은 꼭 유지하자.

다음 달 목표: 외식 주 1회, 충동구매 NO, Savings률 30% 달성!`;

export default function Monthly() {
  const { showToast } = useToast();
  const [diaryEditing, setDiaryEditing] = useState(false);
  const [diaryTitle, setDiaryTitle] = useState(DIARY_DEFAULT_TITLE);
  const [diaryContent, setDiaryContent] = useState(DIARY_DEFAULT_CONTENT);
  const [editTitle, setEditTitle] = useState(DIARY_DEFAULT_TITLE);
  const [editContent, setEditContent] = useState(DIARY_DEFAULT_CONTENT);

  const handlePrevMonth = () => showToast('지난 달로 이동합니다 📅', 'success');
  const handleNextMonth = () => showToast('다음 달로 이동합니다 📅', 'success');

  const openDiaryEdit = () => {
    setEditTitle(diaryTitle);
    setEditContent(diaryContent);
    setDiaryEditing(true);
  };

  const saveDiary = () => {
    setDiaryTitle(editTitle);
    setDiaryContent(editContent);
    setDiaryEditing(false);
    showToast('일기가 저장되었습니다 ✍️', 'success');
  };

  const cancelDiaryEdit = () => {
    setDiaryEditing(false);
  };

  const getGoalBarColor = (status: string, current: number, target: number) => {
    if (status === 'failed') return '#ef4444';
    if (status === 'achieved' && current >= target) return '#4ade80';
    if (status === 'achieved') return 'var(--medium-pink)';
    return 'var(--pink-light)';
  };

  return (
    <>
      <Nav />
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        <header className="page-header">
          <h1 className="page-title">📖 Monthly</h1>
          <p className="page-subtitle">한 달의 재무 이야기를 담아보세요</p>
        </header>

        <Card>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <Button size="sm" onClick={handlePrevMonth}>◀ 이전 달</Button>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--medium-pink)' }}>2026년 1월</div>
              <Button size="sm" onClick={handleNextMonth}>다음 달 ▶</Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-2" style={{ marginTop: '24px' }}>
          <div>
            <Card className="envelope">
              <CardHeader title="이번 달 요약" icon="💰" />
              <div className="card-body">
                <div className="monthly-stat">
                  <div className="stat-row">
                    <span className="stat-label-text">💵 총 Income</span>
                    <span className="stat-value-text text-pink font-bold">3,500,000원</span>
                  </div>
                  <div className="stat-row" style={{ marginTop: '8px' }}>
                    <span className="stat-label-text">💸 총 지출</span>
                    <span className="stat-value-text text-pink font-bold">1,456,800원</span>
                  </div>
                  <div className="stat-row" style={{ marginTop: '8px' }}>
                    <span className="stat-label-text">🏦 총 Savings</span>
                    <span className="stat-value-text text-pink font-bold">500,000원</span>
                  </div>
                  <div className="stat-row" style={{ marginTop: '8px' }}>
                    <span className="stat-label-text">📈 Invest 입금</span>
                    <span className="stat-value-text text-pink font-bold">300,000원</span>
                  </div>
                  <hr style={{ margin: '16px 0', border: '1px dashed var(--beige)' }} />
                  <div className="stat-row">
                    <span className="stat-label-text font-bold">💛 잔액</span>
                    <span className="stat-value-text text-pink font-bold" style={{ fontSize: '1.5rem' }}>1,243,200원</span>
                  </div>
                </div>
              </div>
            </Card>
            <div className="stats-grid" style={{ marginTop: '16px' }}>
              <div className="stat-card"><div className="stat-value">41.6%</div><div className="stat-label">지출률</div></div>
              <div className="stat-card"><div className="stat-value">35.5%</div><div className="stat-label">목표 달성</div></div>
            </div>
          </div>

          <div>
            <Card className="envelope">
              <CardHeader title="카테고리별 지출" icon="🏷️" />
              <div className="card-body">
                <div className="category-breakdown">
                  {CATEGORIES.map((cat, i) => (
                    <div key={cat.name} className="category-item" style={{ marginBottom: i < CATEGORIES.length - 1 ? '12px' : 0 }}>
                      <div className="category-item-header">
                        <span className="category-tag selected">{cat.name}</span>
                        <span className="text-pink font-bold">{cat.amount.toLocaleString('ko-KR')}원</span>
                      </div>
                      <div className="category-bar">
                        <div className="category-bar-fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
                      </div>
                      <small style={{ color: 'var(--gray)' }}>{cat.pct}%</small>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader title="주간 지출 흐름" icon="📅" />
          <div className="card-body">
            <div className={styles.weeklyChart}>
              {WEEKS.map((week) => (
                <div key={week.label} className={styles.weekItem}>
                  <div className={styles.weekHeader}>
                    <span className={styles.weekLabel}>{week.label}</span>
                    <span className={styles.weekDate}>{week.date}</span>
                  </div>
                  <div className={styles.weekBarContainer}>
                    <div className={styles.weekBar} style={{ height: `${week.heightPct}%`, background: 'var(--medium-pink)' }} />
                  </div>
                  <div className={styles.weekAmount}>{week.amount.toLocaleString('ko-KR')}원</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="envelope mt-6">
          <CardHeader title="이번 달 재무 일기" icon="✍️">
            {!diaryEditing && <Button size="sm" variant="primary" onClick={openDiaryEdit}>수정하기</Button>}
          </CardHeader>
          <div className="card-body">
            {!diaryEditing ? (
              <div className={styles.diaryContent}>
                <h3 className={styles.diaryTitle}>{diaryTitle}</h3>
                <div className={styles.diaryText}>
                  {diaryContent.split('\n\n').map((p, i) => <p key={i} style={i > 0 ? { marginTop: '16px' } : {}}>{p}</p>)}
                </div>
                <div className={styles.diaryMeta}>
                  <small style={{ color: 'var(--gray)' }}>마지막 수정: 2026년 1월 27일</small>
                </div>
              </div>
            ) : (
              <div>
                <FormInput
                  label="제목"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <FormTextarea
                  label="내용"
                  style={{ minHeight: '300px' }}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="primary" onClick={saveDiary}>💾 저장하기</Button>
                  <Button variant="secondary" onClick={cancelDiaryEdit}>취소</Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader title="이번 달 목표 달성도" icon="🎯" />
          <div className="card-body">
            <div className={styles.goalList}>
              {GOALS.map((goal, i) => {
                const pct = Math.min((goal.current / goal.target) * 100, 130);
                const statusLabel = goal.status === 'achieved' ? '달성 ✅' : goal.status === 'in-progress' ? '진행 중 ⏳' : '미달성 ❌';
                return (
                  <div key={goal.label} className={styles.goalItem} style={i > 0 ? { marginTop: '16px' } : {}}>
                    <div className={styles.goalHeader}>
                      <div>
                        <span className={styles.goalIcon}>{goal.icon}</span>
                        <span className={styles.goalLabel}>{goal.label}</span>
                      </div>
                      <span className={clsx(
                        styles.goalStatus,
                        goal.status === 'achieved' && styles.achieved,
                        goal.status === 'in-progress' && styles.inProgress,
                        goal.status === 'failed' && styles.failed
                      )}>{statusLabel}</span>
                    </div>
                    <div className={styles.goalProgress}>
                      <div className={styles.goalBar}>
                        <div className={styles.goalBarFill} style={{ width: `${pct}%`, background: getGoalBarColor(goal.status, goal.current, goal.target) }} />
                      </div>
                      <div className={styles.goalNumbers}>
                        <span>{goal.current.toLocaleString('ko-KR')}원</span>
                        <span style={{ color: 'var(--gray)' }}> / {goal.target.toLocaleString('ko-KR')}원</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader title="지난 달과 비교" icon="📊" />
          <div className="card-body">
            <div className={styles.comparisonGrid}>
              {COMPARISONS.map((comp) => (
                <div key={comp.label} className={styles.comparisonItem}>
                  <div className={styles.comparisonLabel}>{comp.label}</div>
                  <div className={styles.comparisonValues}>
                    <span className={styles.comparisonCurrent}>{comp.current}</span>
                    <span className={clsx(
                      styles.comparisonChange,
                      comp.changeType === 'positive' && styles.positive,
                      comp.changeType === 'negative' && styles.negative
                    )}>{comp.change}</span>
                  </div>
                  <small style={{ color: 'var(--gray)' }}>{comp.prev}</small>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

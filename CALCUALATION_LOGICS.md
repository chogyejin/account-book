### 시트 구성 (6개)

```
1. income              - 수입 거래 내역
2. spending            - 지출 거래 내역
3. savings             - 저축 거래 내역
4. investments         - 투자 거래 내역 (거래 단위로 저장)
5. investment_snapshots - 투자 월말 스냅샷 (고정값)
6. accounts            - 계좌/자산 정보
```

### 1. investments 시트 (거래 단위)

**컬럼**:

```
id | date | assetId | assetName | type | quantity | amount | currency | memo | createdAt
```

**예시 데이터**:

```
ID_001 | 2026-01-15 | AAPL | Apple Inc. | 매수 | 10 | 1500 | USD | | 2026-01-15T10:00:00Z
ID_002 | 2026-01-20 | AAPL | Apple Inc. | 매수 | 5  | 780  | USD | | 2026-01-20T14:30:00Z
ID_003 | 2026-01-25 | AAPL | Apple Inc. | 매도 | 3  | 480  | USD | | 2026-01-25T16:00:00Z
ID_004 | 2026-01-15 | SAMSUNG | 삼성전자 | 매수 | 20 | 1500000 | KRW | | 2026-01-15T11:00:00Z
```

**특징**:

- 같은 종목(assetId)이 여러 줄로 존재
- 매수/매도를 거래 단위로만 저장
- 통화는 KRW 또는 USD

### 2. investment_snapshots 시트 (월말 고정)

**컬럼**:

```
id | yearMonth | assetId | assetName | quantity | avgPrice | currentPrice | value | currency | createdAt
```

**예시 데이터**:

```
SNAP_001 | 2026-01 | AAPL | Apple Inc. | 12 | 152 | 160 | 2496000 | USD | 2026-01-31T23:59:00Z
SNAP_002 | 2026-01 | SAMSUNG | 삼성전자 | 20 | 75000 | 78000 | 1560000 | KRW | 2026-01-31T23:59:00Z
```

**특징**:

- 월말에만 생성 (수동 버튼 클릭)
- 한 달에 한 번만 저장 (같은 yearMonth는 덮어쓰기)
- 종목별로 통합된 데이터
- Monthly / Annual / Net Worth 페이지에서 사용

---

## 💰 Invest 페이지 - 핵심 계산 로직

### 기본 원칙

```
investments 시트 (거래 단위)
    ↓
프론트엔드에서 종목별로 자동 통합
    ↓
화면에 종목별 요약 정보 표시
```

### 계산 흐름

#### Step 1: 거래 내역 그룹화

```typescript
// 같은 assetId의 거래를 하나로 묶기
const grouped = {
  AAPL: [거래1, 거래2, 거래3],
  SAMSUNG: [거래4],
};
```

#### Step 2: 종목별 계산

**2-1. 보유 수량 계산**

```typescript
let totalQuantity = 0;

거래.forEach((tx) => {
  if (tx.type === "매수") {
    totalQuantity += tx.quantity; // 10 + 5 = 15
  } else if (tx.type === "매도") {
    totalQuantity -= tx.quantity; // 15 - 3 = 12
  }
});

// 결과: 12주
```

**2-2. 투자금 계산**

```typescript
let totalInvested = 0;

거래.forEach((tx) => {
  if (tx.type === "매수") {
    totalInvested += tx.amount; // 1500 + 780 = 2280
  } else if (tx.type === "매도") {
    totalInvested -= tx.amount; // 2280 - 480 = 1800
  }
});

// 결과: $1,800
```

**2-3. 평균 단가**

```typescript
const avgPrice = totalInvested / totalQuantity;
// 1800 / 12 = 150

// 결과: $150
```

**2-4. 최저/최고 매수가**

```typescript
const buyPrices = [];

거래.forEach((tx) => {
  if (tx.type === "매수") {
    const pricePerUnit = tx.amount / tx.quantity;
    buyPrices.push(pricePerUnit);
  }
});

// buyPrices = [150, 156] (1500/10=150, 780/5=156)

const minBuyPrice = Math.min(...buyPrices); // 150
const maxBuyPrice = Math.max(...buyPrices); // 156
```

**2-5. 평가금액 (원본 통화)**

```typescript
// 현재가는 사용자가 직접 입력 (또는 외부 API)
const currentPrice = 160; // $160

const currentValueOriginal = totalQuantity * currentPrice;
// 12 × 160 = 1920

// 결과: $1,920
```

**2-6. 원화 환산**

```typescript
const exchangeRate = 1300; // USD → KRW

const toKRW = (amount, currency) => {
  if (currency === "USD") {
    return amount * exchangeRate;
  }
  return amount; // KRW는 그대로
};

const totalInvestedKRW = toKRW(1800, "USD");
// 1800 × 1300 = 2,340,000원

const currentValueKRW = toKRW(1920, "USD");
// 1920 × 1300 = 2,496,000원
```

**2-7. 수익/수익률**

```typescript
const profit = currentValueKRW - totalInvestedKRW;
// 2,496,000 - 2,340,000 = 156,000원

const profitRate = (profit / totalInvestedKRW) * 100;
// (156,000 / 2,340,000) × 100 = 6.67%
```

#### Step 3: 전체 포트폴리오 계산

**3-1. 통화별 합계**

```typescript
// KRW 자산
const krwAssets = holdings.filter((h) => h.currency === "KRW");
const krwValue = krwAssets.reduce((sum, h) => sum + h.currentValue, 0);
// 삼성전자: 1,560,000원

// USD 자산 (원화 환산)
const usdAssets = holdings.filter((h) => h.currency === "USD");
const usdValue = usdAssets.reduce((sum, h) => sum + h.currentValue, 0);
// AAPL: 2,496,000원

// 전체
const totalValueKRW = krwValue + usdValue;
// 1,560,000 + 2,496,000 = 4,056,000원
```

**3-2. 통화별 비중**

```typescript
const krwPercentage = (krwValue / totalValueKRW) * 100;
// (1,560,000 / 4,056,000) × 100 = 38.5%

const usdPercentage = (usdValue / totalValueKRW) * 100;
// (2,496,000 / 4,056,000) × 100 = 61.5%
```

### 최종 결과 예시

```typescript
portfolio = {
  // 전체 요약
  totalValueKRW: 4056000,
  totalInvestedKRW: 3900000,
  totalProfit: 156000,
  totalProfitRate: 4.0,

  // 통화별 비중
  currencyRatio: {
    KRW: { amount: 1560000, percentage: 38.5 },
    USD: { amount: 2496000, percentage: 61.5 },
  },

  // 종목별 보유 현황
  holdings: [
    {
      assetId: "AAPL",
      assetName: "Apple Inc.",
      currency: "USD",
      totalQuantity: 12,
      totalInvested: 2340000,
      avgPrice: 150,
      minBuyPrice: 148,
      maxBuyPrice: 156,
      currentPrice: 160,
      currentValue: 2496000,
      currentValueOriginal: 1920,
      profit: 156000,
      profitRate: 6.67,
    },
    {
      assetId: "SAMSUNG",
      assetName: "삼성전자",
      currency: "KRW",
      totalQuantity: 20,
      totalInvested: 1500000,
      avgPrice: 75000,
      minBuyPrice: 75000,
      maxBuyPrice: 75000,
      currentPrice: 78000,
      currentValue: 1560000,
      currentValueOriginal: 1560000,
      profit: 60000,
      profitRate: 4.0,
    },
  ],

  exchangeRate: 1300,
};
```

---

## 📸 월말 스냅샷 생성 로직

### 왜 필요한가?

```
Invest 페이지: 실시간 계산 (현재가가 계속 변함)
    ↓
Monthly/Annual 페이지: 과거 데이터 필요 (고정된 값)
    ↓
해결: 매월 말일에 스냅샷 생성
```

### 생성 과정

**1. 트리거**: 사용자가 "📸 스냅샷 생성" 버튼 클릭

**2. 계산 시점 설정**

```typescript
const now = new Date();
const yearMonth = "2026-01"; // YYYY-MM
const lastDay = "2026-01-31"; // 월말

// 월말까지의 거래만 필터링
const filteredTransactions = allTransactions.filter((tx) => tx.date <= lastDay);
```

**3. 해당 시점 기준으로 포트폴리오 계산**

```typescript
const portfolio = calculatePortfolio(
  filteredTransactions,
  currentPrices, // 사용자가 입력한 현재가
  exchangeRate, // 사용자가 입력한 환율
);
```

**4. investment_snapshots 시트에 저장**

```typescript
// 기존 같은 월 데이터 삭제 (덮어쓰기)
DELETE FROM investment_snapshots
WHERE yearMonth = '2026-01';

// 새 스냅샷 저장
portfolio.holdings.forEach(holding => {
  INSERT INTO investment_snapshots {
    yearMonth: '2026-01',
    assetId: holding.assetId,
    assetName: holding.assetName,
    quantity: holding.totalQuantity,
    avgPrice: holding.avgPrice,
    currentPrice: holding.currentPrice,
    value: holding.currentValue,  // 원화 환산값
    currency: holding.currency
  }
});
```

**5. 결과**

```
investment_snapshots 시트에 저장됨:
2026-01 | AAPL    | 12주 | $150 | $160 | 2,496,000원 | USD
2026-01 | SAMSUNG | 20주 | 75,000원 | 78,000원 | 1,560,000원 | KRW
```

### 스냅샷 사용

**Monthly 페이지**:

```typescript
// 2026년 1월 데이터
const snapshots = await getSnapshotsList({ yearMonth: "2026-01" });

// 투자 평가액 = 스냅샷의 value 합계
const investmentValue = snapshots.reduce((sum, s) => sum + s.value, 0);
// 4,056,000원
```

**Annual 페이지**:

```typescript
// 2026년 전체 스냅샷
const snapshots = await getSnapshotsList({ year: '2026' });

// 월별로 그룹화
const monthly = {
  '2026-01': 4056000,
  '2026-02': 4120000,
  ...
}
```

---

## 🔄 데이터 흐름 전체 구조

### 입력 → 저장 → 계산 → 표시

```
[사용자 입력]
├─ Quick Entry 페이지
├─ Invest 페이지
└─ Income/Savings 페이지
      ↓
[Google Sheets에 저장]
├─ investments (거래 단위)
├─ income
├─ spending
├─ savings
└─ accounts
      ↓
[프론트엔드에서 실시간 계산]
└─ Invest 페이지
    ├─ 종목별 통합
    ├─ 수익률 계산
    └─ 통화별 비중
      ↓
[월말 스냅샷 생성]
└─ investment_snapshots 시트
    (고정된 값 저장)
      ↓
[읽기 전용 페이지에서 조회]
├─ Monthly (월간 요약)
├─ Annual (연간 리포트)
└─ Net Worth (순자산)
```

---

## 🎯 페이지별 역할

### 1. Invest 페이지

- **역할**: 투자 거래 입력 및 실시간 포트폴리오 확인
- **데이터**: investments 시트 읽기/쓰기
- **계산**: 모든 계산을 프론트엔드에서 수행
- **특징**: 현재가와 환율을 사용자가 직접 입력

### 2. Monthly 페이지

- **역할**: 월간 재무 요약
- **데이터**:
  - income, spending, savings 시트 (해당 월 필터링)
  - investment_snapshots (월말 고정값)
- **특징**: 읽기 전용, 수정 불가

### 3. Annual 페이지

- **역할**: 연간 재무 리포트
- **데이터**:
  - 모든 시트 (해당 연도 필터링)
  - investment_snapshots (12개월 스냅샷)
- **특징**: 완전 읽기 전용

### 4. Net Worth 탭 (Annual 내)

- **역할**: 순자산 추이
- **계산**:

  ```
  현금 = 수입 - 지출 - 저축 - 투자입금
  저축 = savings 시트 누적 합계
  투자 = investment_snapshots의 12월 value

  순자산 = 현금 + 저축 + 투자
  ```

---

## 🚨 핵심 주의사항

### 1. 계산 위치

```
✅ 프론트엔드에서 계산:
- 종목별 통합
- 평균단가
- 수익률
- 통화별 비중

❌ Google Sheets에 저장 안 함:
- 계산된 값들
- 현재가
- 환율
```

### 2. 스냅샷 생성 시점

```
✅ 월말에만 생성
✅ 수동 버튼 클릭
✅ 같은 월은 덮어쓰기

❌ 자동 생성 안 함
❌ 월 중간에 생성 안 함
```

### 3. 매도 처리

```typescript
// ❌ 잘못된 방법
if (tx.type === "매도") {
  totalQuantity += tx.quantity; // 증가시키면 안 됨!
}

// ✅ 올바른 방법
if (tx.type === "매수") {
  totalQuantity += tx.quantity;
  totalInvested += tx.amount;
} else if (tx.type === "매도") {
  totalQuantity -= tx.quantity; // 감소
  totalInvested -= tx.amount; // 투자금도 감소
}
```

### 4. 보유 수량 0 이하 처리

```typescript
// 매도로 인해 보유 수량이 0 이하가 되면 제외
if (totalQuantity <= 0) {
  return null; // 화면에 표시 안 함
}
```

### 5. useMemo 사용

```typescript
// ✅ 필수! 계산 비용이 높으므로
const portfolio = useMemo(() => {
  return calculatePortfolio(transactions, currentPrices, exchangeRate);
}, [transactions, currentPrices, exchangeRate]);
```

---

## 🛠️ 기술적 구현 세부사항

### Google Apps Script (Backend)

**역할**: REST API 서버

```javascript
// GET: 데이터 조회
GET /exec?sheet=investments&action=list

// POST: 데이터 추가/수정/삭제
POST /exec
{
  "sheet": "investments",
  "action": "create",
  "data": { ... }
}
```

**특징**:

- CORS 자동 처리
- JSON 응답
- 시트별 CRUD 지원
- 스냅샷 생성 전용 엔드포인트

### Next.js (Frontend)

**App Router 구조**:

```
app/
├── layout.tsx          (루트 레이아웃)
├── page.tsx            (홈 - Quick Entry)
├── invest/
│   ├── page.tsx        (Server Component - 데이터 fetch)
│   └── InvestClient.tsx (Client Component - 계산 & UI)
```

**Server Component**:

```typescript
// 서버에서 초기 데이터 로드
export default async function InvestPage() {
  const transactions = await getInvestmentsList();
  return;
}
```

**Client Component**:

```typescript
'use client';

export default function InvestClient({ initialTransactions }) {
  // useState로 상태 관리
  const [transactions, setTransactions] = useState(initialTransactions);
  const [currentPrices, setCurrentPrices] = useState(new Map());
  const [exchangeRate, setExchangeRate] = useState(1300);

  // useMemo로 계산 최적화
  const portfolio = useMemo(() => {
    return calculatePortfolio(transactions, currentPrices, exchangeRate);
  }, [transactions, currentPrices, exchangeRate]);

  return ...;
}
```

### 계산 로직 모듈화

**investment-calculator.ts**:

```typescript
// 1. 종목별 그룹화
function groupTransactionsByAsset(transactions): Map;

// 2. 단일 종목 계산
function calculateAssetHolding(
  assetId,
  transactions,
  prices,
  rate,
): AssetHolding;

// 3. 전체 포트폴리오 계산
export function calculatePortfolio(
  transactions,
  prices,
  rate,
): PortfolioSummary;

// 4. 특정 시점 계산 (스냅샷용)
export function calculatePortfolioAsOf(
  transactions,
  prices,
  rate,
  date,
): PortfolioSummary;
```

---

## 📊 화면 구성

### Invest 페이지 레이아웃

```
┌─────────────────────────────────────────┐
│ 📈 Invest                               │
│ 투자 내역을 기록하고 수익률을 확인하세요    │
└─────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│총 평가금액 │  총 수익  │  수익률  │ 환율 입력 │
│4,056,000원│ 156,000원│  4.0%   │ 1300    │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────┐
│ 💱 통화별 자산 비중      📸 스냅샷 생성    │
├─────────────────────────────────────────┤
│ KRW ███████████░░░░░░ 38.5% 1,560,000원│
│ USD ████████████████░ 61.5% 2,496,000원│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📊 보유 종목                            │
├─────────────────────────────────────────┤
│ 종목명 │통화│수량│평균단가│현재가│평가금액│수익률│
│ AAPL  │USD│ 12│  $150 │$160 │2.5M원│+6.7%│
│삼성전자│KRW│ 20│75,000원│78K원│1.6M원│+4.0%│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📝 거래 내역                            │
├─────────────────────────────────────────┤
│ 날짜    │종목│유형│수량│금액  │통화│삭제│
│01-15   │AAPL│매수│10 │$1,500│USD│🗑️ │
│01-20   │AAPL│매수│ 5 │  $780│USD│🗑️ │
│01-25   │AAPL│매도│ 3 │  $480│USD│🗑️ │
└─────────────────────────────────────────┘
```

---

## 🎯 요약

### 핵심 개념

1. **거래 단위 저장**: investments 시트에는 개별 거래만 저장
2. **프론트엔드 계산**: 종목별 통합은 화면에서 실시간 계산
3. **월말 고정**: 스냅샷으로 과거 데이터 보존
4. **통화 환산**: USD ↔ KRW 자동 변환
5. **매수/매도 처리**: 수량과 투자금 모두 증감

### 계산 순서

```
1. 거래 내역 로드 (Google Sheets)
   ↓
2. 종목별 그룹화 (같은 assetId)
   ↓
3. 각 종목 계산
   - 보유수량 = 매수 합계 - 매도 합계
   - 투자금 = 매수 금액 - 매도 금액
   - 평균단가 = 투자금 ÷ 보유수량
   ↓
4. 원화 환산 (USD → KRW)
   ↓
5. 수익률 계산
   - 평가금액 = 보유수량 × 현재가
   - 수익 = 평가금액 - 투자금
   - 수익률 = (수익 ÷ 투자금) × 100
   ↓
6. 통화별 비중 계산
   ↓
7. 화면 표시
```

---

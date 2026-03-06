# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고할 가이드를 제공합니다.

## 프로젝트 개요

Next.js 15, React 19, TypeScript로 구축된 개인 재무 관리 앱("My Money Insights")입니다. 지출, 수입, 저축, 투자를 추적하며 한국어 인터페이스와 감성적인 디자인을 특징으로 합니다. 데이터는 Google Sheets API v4(Service Account 인증)를 통해 Google Sheets에 저장됩니다.

## 개발 명령어

```bash
# 개발 서버 실행 (http://localhost:3000)
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 시작
pnpm start

# 린팅
pnpm lint
```

**패키지 매니저**: 이 프로젝트는 `pnpm`을 사용합니다. npm이나 yarn을 사용하지 마세요.

## 아키텍처

### 핵심 구조

- **Next.js App Router**: 파일 기반 라우팅을 사용하는 `app/` 디렉토리 구조
- **Server/Client 컴포넌트 분리**: `page.tsx`는 Server Component (PageHeader 렌더링), `*Client.tsx`는 Client Component (데이터 fetch 및 상태 관리)
- **Google Sheets 백엔드**: 전통적인 데이터베이스 없음 - 모든 데이터는 Google Sheets에 저장

### 주요 디렉토리

- `app/` - Next.js 페이지 및 레이아웃
  - `page.tsx` + `QuickEntryClient.tsx` - Quick Entry (메인 랜딩), 지출/수입/저축/투자 입력 탭
  - `spending/` - 지출 대시보드 (필터링, 검색, 카테고리별 분석, 수정/삭제)
  - `income/`, `savings/`, `investments/` - 유사한 대시보드 페이지들
  - `summary/` - 월별/연간 요약 페이지
  - `components/` - 공유 React 컴포넌트
  - `hooks/` - 커스텀 훅 (`useQuickEntryForms.ts`)
  - `constants/` - 상수 (`quickEntry.ts` - 탭 정의)
  - `api/sheets/route.ts` - Google Sheets CRUD API Route
  - `api/market/prices/route.ts` - 시세 조회 API Route
  - `api/market/exchange-rate/route.ts` - 환율 조회 API Route
- `lib/` - 공유 유틸리티 및 API 클라이언트
  - `api.ts` - Google Apps Script 직접 통신 클라이언트 (Quick Entry 생성에 사용)
  - `sheets-api.ts` - `/api/sheets` Route용 typed 클라이언트 (대시보드 조회/수정/삭제에 사용)
  - `google-sheets-client.ts` - googleapis Service Account 인증 클라이언트
  - `investment-calculator.ts` - 포트폴리오 계산 로직 (실현/미실현 수익, 환율 변환)
  - `config.ts` - API URL 및 기본 카테고리 설정
  - `utils.ts` - 날짜/금액 포맷팅 유틸리티

### 데이터 흐름 패턴 (두 가지 경로)

**경로 A - Quick Entry 생성** (`lib/api.ts` 경유):
1. `QuickEntryClient` → `useQuickEntryForms` 훅
2. `API.createExpense()` / `API.createIncome()` / `API.createSavings()` 호출
3. Google Apps Script 웹 앱에 직접 POST (`NEXT_PUBLIC_API_URL`)
4. 투자 생성은 예외: `SheetsAPI.investments.create()` → `/api/sheets` 경유

**경로 B - 대시보드 조회/수정/삭제** (`lib/sheets-api.ts` 경유):
1. `*Client.tsx` → `SheetsAPI.expenses.list()` 등 호출
2. `/api/sheets` Next.js API Route로 요청
3. `lib/google-sheets-client.ts`의 Service Account로 Google Sheets API v4 직접 호출
4. 응답이 `{ success: boolean, data?: T, error?: string | null }` 형식으로 반환

### 환경 변수

```bash
# Google Sheets API (Service Account - 대시보드 조회/수정/삭제)
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_SHEETS_SPREADSHEET_ID=...

# Google Apps Script (Quick Entry 생성, fallback URL 내장)
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/.../exec
```

### Google Sheets 시트 구조

| 시트명 | 컬럼 |
|--------|------|
| `expenses` | id, date, category, amount, memo, createdAt |
| `income` | id, date, category, amount, memo, createdAt |
| `savings` | id, date, category, account, amount, memo, createdAt |
| `investments_transactions` | id, date, assetId, assetName, type, quantity, amount, currency, memo, createdAt, market |
| `accounts` | id, name, balance, currency, updatedAt |

### 카테고리 시스템

카테고리는 `lib/config.ts`의 `DEFAULT_CATEGORIES`에 정의됩니다:

- **expense**: 생필품, 고정지출, 간식, 식비, 모임, 카페, 데이트, 취미(운동), 쇼핑, 계절성지출, 낭비, 기타
- **income**: 급여, 부수입, 용돈, 환급, 보너스, 기타수입
- **savings**: 예금, 적금, 청약, 비상금, 목돈
- **investment**: 주식, 펀드, ETF, 채권, 코인

### 공유 컴포넌트 (`app/components/`)

- `Button` - 버튼 (variant: primary/secondary, size: sm/md)
- `Card`, `CardHeader`, `CardBody` - 카드 레이아웃
- `CategoryTag` - 클릭 가능한 카테고리 태그
- `CurrencyInput` - 한국 원화 포맷 입력 (자동 콤마)
- `FormInput`, `FormSelect`, `FormTextarea` - 폼 입력 컴포넌트
- `Modal`, `ModalClose` - 모달 다이얼로그
- `Nav` - 내비게이션 바 (`NAV_LINKS`로 경로 정의)
- `PageHeader` - 페이지 제목/부제목
- `ToastProvider` - 전역 Toast 알림

### Toast 알림

```typescript
const { showToast } = useToast();
showToast("메시지", "success" | "error" | "warning");
```

### 스타일링

- Tailwind CSS v4 사용 (`@tailwindcss/postcss` 포함)
- CSS Modules (`*.module.css`) - 컴포넌트별 스타일
- `globals.css`에 커스텀 CSS 변수 및 공통 클래스
- `next/font`를 통한 한글 폰트 최적화

### 유틸리티 (`lib/utils.ts`)

- `formatDate(dateStr)` - 한국 로케일 날짜 포맷 (YYYY. MM. DD.)
- `formatAmount(amount)` - 원화 포맷 (1,000원)
- `formatCurrency(amount, currency)` - 통화별 포맷 (KRW/USD/EUR)
- `getTodayString()` - 오늘 날짜 ISO 문자열 (YYYY-MM-DD)

## 중요한 패턴

### 폼 상태 관리

Quick Entry는 `app/hooks/useQuickEntryForms.ts`의 커스텀 훅으로 관리합니다. 각 대시보드 Client 컴포넌트는 자체 `useState`로 폼 상태를 관리합니다.

### 로딩 상태

폼 제출 중 `loading` 상태로 스피너 오버레이를 표시합니다.

### 투자 기능 특이사항

- KR(한국)/US(미국) 시장, KRW/USD 통화 지원
- 거래 유형: 매수, 매도, 입금, 출금
- 포트폴리오 계산: `lib/investment-calculator.ts`의 `calculatePortfolio()` 사용
- 현재가는 `/api/market/prices`를 통해 실시간 조회
- 환율은 `/api/market/exchange-rate`를 통해 조회, 사용자가 직접 수정 가능
- 계좌 잔고는 `accounts` 시트의 ACC_002(KRW) 및 USD 통화 계좌에서 읽음

### TypeScript

- Strict 모드 활성화
- 경로 별칭 `@/*`가 프로젝트 루트에 매핑됨
- `lib/sheets-api.ts`에 엔티티 타입 정의: `Expense`, `IncomeItem`, `SavingsItem`, `InvestmentTransaction`, `Account`

## 새 기능 추가하기

### 새로운 금융 카테고리

1. `lib/config.ts` > `DEFAULT_CATEGORIES`의 해당 배열에 추가
2. 코드 변경 불필요 - 카테고리는 자동으로 렌더링됨

### 새로운 데이터 타입 페이지

1. `app/spending/` 패턴을 따라 `app/[type]/page.tsx` + `app/[type]/[Type]Client.tsx` 생성
2. `app/components/Nav.tsx` > `NAV_LINKS`에 내비게이션 링크 추가
3. `lib/sheets-api.ts`에 엔티티 타입 및 `SheetsAPI.[type]` 메서드 추가
4. `app/api/sheets/route.ts`에 해당 시트의 헤더 컬럼 추가
5. Google Sheets에 일치하는 시트 탭이 있는지 확인

### 유틸리티 함수

공유 포맷팅/헬퍼 함수는 `lib/utils.ts`에 배치합니다.

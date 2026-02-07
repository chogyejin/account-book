# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고할 가이드를 제공합니다.

## 프로젝트 개요

Next.js 16, React 19, TypeScript로 구축된 개인 재무 관리 앱("감성 재무 다이어리" / "My Money Insights")입니다. 지출, 수입, 저축, 투자를 추적하며 한국어 인터페이스와 감성적인 디자인을 특징으로 합니다. 데이터는 Google Apps Script API를 통해 Google Sheets에 저장됩니다.

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

**패키지 매니저**: 이 프로젝트는 `pnpm` (버전 8.7.6+)을 사용합니다. npm이나 yarn을 사용하지 마세요.

## 아키텍처

### 핵심 구조

- **Next.js App Router**: 파일 기반 라우팅을 사용하는 `app/` 디렉토리 구조
- **React Server Components**: 모든 페이지는 기본적으로 서버 컴포넌트를 사용하고, 사용자 상호작용이 필요한 부분은 클라이언트 컴포넌트(`'use client'`)로 import 한다.
- **Google Sheets 백엔드**: 전통적인 데이터베이스 없음 - 모든 데이터 작업은 Google Apps Script API 엔드포인트를 통해 처리

### 주요 디렉토리`

- `app/` - Next.js 페이지 및 레이아웃
  - `page.tsx` - Quick Entry 페이지 (메인 랜딩), 지출/수입/저축/투자 입력을 위한 탭 인터페이스
  - `spending/page.tsx` - 지출 대시보드 (필터링, 검색, 카테고리별 분석)
  - `income/`, `savings/`, `investments/`, `monthly/`, `annual/` - 유사한 대시보드 페이지들
  - `components/` - 공유 React 컴포넌트 (Nav, ToastProvider)
- `lib/` - 공유 유틸리티 및 API 클라이언트
  - `api.ts` - Google Sheets 통합을 위한 중앙 집중식 API 클라이언트
  - `config.ts` - API URL 및 기본 카테고리를 포함한 앱 설정
  - `utils.ts` - 날짜/금액 포맷팅 유틸리티 함수

### 데이터 흐름 패턴

1. 사용자가 페이지 컴포넌트에서 폼을 제출
2. 페이지 컴포넌트가 `API.createExpense()` / `API.createIncome()` 등을 호출
3. API 클라이언트가 `{ sheet, action, ...data }`로 Google Apps Script에 POST 요청
4. 응답이 `{ success: boolean, data?: unknown, error?: string }` 형식으로 반환
5. Toast 알림으로 사용자에게 결과 표시

### API 통합

앱은 `lib/config.ts`에 있는 URL에 배포된 Google Apps Script 웹 앱과 통신합니다. API는 다음을 기대합니다:

**POST 요청**:

```typescript
{
  sheet: 'expenses' | 'income' | 'savings' | 'investments_transactions',
  action: 'create' | 'update' | 'delete',
  ...data  // 시트 타입에 따라 다름
}
```

**GET 요청**: 쿼리 파라미터를 위해 URLSearchParams 사용

모든 API 호출은 `{ success: boolean, data?: unknown, error?: string }` 형식으로 반환됩니다.

### 카테고리 시스템

카테고리는 `lib/config.ts`의 `DEFAULT_CATEGORIES`에 정의되어 있습니다:

- **expense**: 생필품, 고정지출, 간식, 식비, 모임, 카페, 데이트, 취미(운동), 쇼핑, 계절성지출, 낭비, 기타
- **income**: 급여, 부수입, 용돈, 환급, 보너스, 기타수입
- **savings**: 예금, 적금, 청약, 비상금, 목돈
- **investment**: 주식, 펀드, ETF, 채권, 코인

이 카테고리들은 폼에서 클릭 가능한 태그로 렌더링됩니다.

### Toast 알림

`ToastProvider` 컨텍스트를 통한 전역 Toast 시스템:

```typescript
const { showToast } = useToast();
showToast("메시지 ✅", "success" | "error" | "warning");
```

### 스타일링

- Tailwind CSS v4 사용 (`@tailwindcss/postcss` 포함)
- `globals.css`에 커스텀 CSS 변수 및 클래스
- 감성적인 "편지봉투" 카드 디자인 시스템
- `next/font`를 통한 한글 폰트 최적화

## 중요한 패턴

### 폼 상태 관리

각 데이터 입력 페이지는 React useState로 자체 폼 상태를 관리합니다. 폼에는 날짜(오늘 날짜 기본값), 금액, 카테고리 선택, 메모 필드가 포함됩니다.

### 로딩 상태

폼은 API 호출 중 `loading` 상태 변수를 사용하여 로딩 스피너 오버레이를 표시합니다.

### 내비게이션

`Nav` 컴포넌트는 Next.js의 `Link`와 `usePathname`을 사용하여 활성 경로를 강조 표시합니다. 모든 페이지에 이 nav 컴포넌트가 포함됩니다.

### TypeScript

- Strict 모드 활성화
- 경로 별칭 `@/*`가 프로젝트 루트에 매핑됨
- Target ES2017, JSX 모드 `react-jsx`

## 새 기능 추가하기

### 새로운 금융 카테고리

1. `lib/config.ts` > `DEFAULT_CATEGORIES`의 해당 배열에 추가
2. 코드 변경 불필요 - 카테고리는 자동으로 렌더링됨

### 새로운 데이터 타입 페이지

1. `spending/page.tsx`의 패턴을 따라 `app/[type]/page.tsx` 생성
2. `app/components/Nav.tsx` > `NAV_LINKS`에 내비게이션 링크 추가
3. `lib/api.ts`에 해당 API 메서드 추가
4. Google Sheets 백엔드에 일치하는 시트 이름이 있는지 확인

### 유틸리티 함수

공유 포맷팅/헬퍼 함수는 `lib/utils.ts`에 배치하세요. 현재 유틸리티는 날짜 포맷팅(한국 로케일), 금액 포맷팅(원 접미사 포함), ID 생성을 처리합니다.

# Google Sheets 신규 설정 가이드

이 앱은 Google Sheets API v4와 Service Account 인증 방식을 사용해 데이터를 읽고 씁니다.
새 스프레드시트를 만들어 연동하려면 아래 단계를 순서대로 진행하세요.

---

## 1. Google Cloud 프로젝트 준비

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 (또는 기존 프로젝트 선택)
3. 왼쪽 메뉴 > **API 및 서비스 > 라이브러리** 이동
4. `Google Sheets API` 검색 후 **사용 설정(Enable)**

---

## 2. Service Account 생성

1. **API 및 서비스 > 사용자 인증 정보** 이동
2. **+ 사용자 인증 정보 만들기 > 서비스 계정** 선택
3. 이름 입력 후 생성 완료 (역할은 지정 불필요)
4. 생성된 서비스 계정 클릭 > **키** 탭 > **키 추가 > 새 키 만들기 > JSON** 선택
5. JSON 파일이 다운로드됨 - 안전한 곳에 보관

JSON 파일 내 필요한 값:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

---

## 3. Google Spreadsheet 생성

1. [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
2. 제목 설정 (예: "Account Book")
3. URL에서 Spreadsheet ID 복사
   ```
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```
4. **공유** 버튼 클릭 > 2단계에서 생성한 서비스 계정 이메일 추가
   - 역할: **편집자(Editor)**
   - "알림 보내기" 체크 해제 후 공유

---

## 4. 시트 구성

스프레드시트에 아래 시트(탭)를 이름 그대로 생성하고, 1행에 헤더를 입력합니다.

### `expenses` (지출)

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| id | date | category | amount | memo | createdAt |

### `income` (수입)

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| id | date | category | amount | memo | createdAt |

### `savings` (저축)

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| id | date | category | account | amount | memo | createdAt |

### `investments_transactions` (투자 거래)

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| id | date | assetId | assetName | type | quantity | amount | currency | memo | createdAt | market |

- `type`: `매수` 또는 `매도`
- `currency`: `KRW` 또는 `USD`
- `market`: `KR` 또는 `US`

### `accounts` (현금 계좌, 선택사항)

| A | B | C | D | E |
|---|---|---|---|---|
| id | name | balance | currency | updatedAt |

---

## 5. 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 내용 입력:

```env
# Spreadsheet ID (URL에서 복사한 값)
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here

# Service Account 이메일 (JSON 파일의 client_email)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Service Account 개인키 (JSON 파일의 private_key, 따옴표 포함)
# \n 문자를 그대로 유지해야 합니다
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# API 경로 (변경 불필요)
NEXT_PUBLIC_API_URL=/api/sheets
```

> **주의**: `.env.local`은 절대 git에 커밋하지 마세요. `.gitignore`에 이미 포함되어 있습니다.

---

## 6. 동작 확인 (로컬)

```bash
pnpm dev
```

개발 서버 실행 후 각 페이지(지출, 수입, 저축, 투자)에서 데이터 입력 및 조회가 정상 동작하는지 확인합니다.

---

## 7. 프로덕션 배포 (Vercel)

### 7-1. 프로젝트 연결

1. [Vercel](https://vercel.com)에 GitHub 저장소 연결
2. Framework Preset: **Next.js** (자동 감지)
3. Build Command: `pnpm build` (또는 Vercel 기본값 사용)
4. Install Command: `pnpm install`

### 7-2. 환경변수 등록

Vercel 대시보드 > 프로젝트 > **Settings > Environment Variables**에서 아래 4개 변수를 추가합니다.

| 변수명 | 값 | 환경 |
|---|---|---|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Spreadsheet ID | Production, Preview, Development |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 서비스 계정 이메일 | Production, Preview, Development |
| `GOOGLE_PRIVATE_KEY` | 개인키 (아래 주의사항 참고) | Production, Preview, Development |
| `NEXT_PUBLIC_API_URL` | `/api/sheets` | Production, Preview, Development |

#### GOOGLE_PRIVATE_KEY 입력 방법 (중요)

Vercel의 환경변수 입력창에 값을 붙여넣을 때 개행 처리 방식에 주의해야 합니다.

**방법 A - 권장**: JSON 파일의 `private_key` 값을 그대로 복사해서 붙여넣습니다.
- 따옴표(`"`) 제외
- `\n`이 literal 문자 두 개(`\`+`n`)인 상태로 붙여넣기
- 코드에서 `.replace(/\\n/g, "\n")`으로 자동 변환됨

```
-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n
```

**방법 B**: Vercel CLI로 `.env.local`을 직접 업로드

```bash
pnpm dlx vercel env pull   # 기존 환경변수 확인
pnpm dlx vercel env add GOOGLE_PRIVATE_KEY  # 대화형으로 추가
```

> 배포 후 함수가 `Error: error:09091064:PEM routines` 같은 에러를 내면 개인키 개행 처리가 잘못된 것입니다. 방법 A를 다시 시도하세요.

### 7-3. 배포 확인

배포 완료 후 프로덕션 URL에서 데이터 조회/입력이 정상 동작하는지 확인합니다.

Vercel 대시보드 > **Functions** 탭에서 `/api/sheets` Route Handler의 로그를 확인할 수 있습니다.

### 7-4. 보안 고려사항

- Service Account의 권한은 해당 Spreadsheet 한 개에만 부여되어 있어야 합니다 (최소 권한 원칙)
- `GOOGLE_PRIVATE_KEY`는 절대 코드나 git에 포함시키지 마세요
- Spreadsheet를 공개(Public) 상태로 두지 마세요 - 서비스 계정 공유만으로 충분합니다
- API Route(`/api/sheets`)는 서버 사이드에서만 실행되므로 키가 브라우저에 노출되지 않습니다

---

## 참고: 데이터 흐름

```
브라우저 → /api/sheets (Next.js Route Handler) → Google Sheets API v4 → Spreadsheet
```

- `GET /api/sheets?sheet=expenses&action=list` - 데이터 목록 조회
- `POST /api/sheets` `{ sheet, action: "create" | "update" | "delete", ...data }` - 데이터 변경

인증은 Service Account 방식으로 서버 사이드에서만 처리됩니다.

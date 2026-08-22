---
topic: frontend
last_compiled: 2026-08-22
sources: 16
---

# 프론트엔드 구조 (Frontend)

[coverage: high -- 16 sources: CLAUDE.md, docs/TECHNICAL-STATUS-REPORT.md, docs/03-analysis/vestra-v2-commercialization.analysis.md, docs/02-design/features/prediction-enhancement.design.md, docs/02-design/features/feasibility-scr-upgrade.design.md, app/(personal-home)/renewal/listing-new/*, app/(personal-home)/profile/components/*, app/(personal-home)/renewal/monitoring/*, app/(app)/e-contract/*, app/(app)/feasibility/page.tsx, lib/pdf/contract-template.tsx, app/(personal-home)/renewal/listing-db-detail/ListingDbDetailContent.tsx]

---

## Purpose [coverage: high -- 2 sources]

Next.js 16 App Router 기반 풀스택 UI. 한국어 UI, 모바일 반응형, 카카오/리플릿 지도, Recharts 시각화를 제공한다.

두 개의 UI 계열이 공존한다.
- **`(app)` 레거시 UI** — 기존 분석 도구(전세/권리/세금/시세전망/사업성분석/가계약서 등). Tailwind 유틸리티 클래스 중심.
- **`(personal-home)/renewal` 리뉴얼 UI** — 개인 사용자용 신규 디자인 계열. CSS Module(`*.module.css`) 중심, `RenewalGnb`/서브히어로 공통 레이아웃. 매물 마켓플레이스(등록/목록/상세/의향서), 등기감시, 마이페이지 등을 담당하며, 로직·훅은 기존 `(app)` 구현을 재사용한다.

---

## Architecture [coverage: high -- 3 sources]

### 라우트 그룹

```
app/
├── (app)/              # 인증 필요 페이지 그룹 (sidebar + footer 레이아웃)
│   ├── jeonse/         # 전세 관련 (analysis, transfer, fixed-date, jeonse-right, lease-registration, lease-report)
│   ├── contract/       # 계약서 분석
│   ├── tax/            # 세금 계산 (취득세/양도세/종부세)
│   ├── prediction/     # 시세전망 (5모델 앙상블)
│   ├── rights/         # 권리분석
│   ├── assistant/      # AI 어시스턴트 챗봇
│   ├── registry/       # 등기부등본 분석
│   ├── dashboard/      # 포트폴리오 대시보드
│   ├── verification/   # 임대인/임차인 상호검증
│   ├── report/         # 분석보고서
│   ├── profile/        # 프로필 설정
│   ├── feasibility/    # 사업성분석 (SCR 보고서, 기업 회원 전용)
│   ├── e-contract/     # 가계약서 작성 (4스텝 + 손글씨 서명)
│   ├── listings/       # 매물 등록/목록 (레거시, renewal이 로직 재사용)
│   ├── monitoring/     # 등기감시 (레거시, renewal이 훅 재사용)
│   ├── expert-connect/ # 전문가 연결
│   └── admin/          # 관리자 대시보드
├── (personal-home)/    # 리뉴얼 UI 그룹 (RenewalGnb 레이아웃)
│   └── renewal/
│       ├── listing-new/       # 매물 등록 (renewal 디자인, useListingForm 재사용)
│       ├── listings-list/     # 매물 목록
│       ├── listing-db-detail/ # 매물 상세 (CTA: 의향서/권리분석/등기감시)
│       ├── monitoring/        # 등기감시 (물건추가 모달)
│       ├── rights/ contract/ jeonse/ ...  # 개인용 분석 뷰
│       └── _shared/           # RenewalGnb, RenewalLoginModal, renewal-config
├── (landing)/          # 랜딩 페이지 (header + footer 레이아웃)
├── (map)/              # 지도 관련 (/price-map)
├── api/                # API Route Handlers
├── legal/ privacy/ terms/  # 법적 페이지
```

라우트 그룹 분리는 GAP 분석에서 100% 구현 완료로 확인됨. `(landing)` 그룹은 header+footer 레이아웃, `(app)` 그룹은 Sidebar+Footer 레이아웃, `(personal-home)/renewal`은 `RenewalGnb`+리뉴얼 푸터 레이아웃으로 독립. 미들웨어는 인증 상태에 따라 `/` 접근 시 `/dashboard` 또는 `/admin`으로 리다이렉트.

### 리뉴얼 UI의 로직 재사용 패턴

`(personal-home)/renewal`의 신규 화면은 **UI만 새로 만들고 상태·API 로직은 기존 `(app)` 훅을 그대로 import**한다.

| 리뉴얼 화면 | 재사용하는 로직 |
|-------------|-----------------|
| `renewal/listing-new/components/ListingNewForm.tsx` | `@/app/(app)/listings/new/hooks/useListingForm` |
| `renewal/listing-new/.../RenewalSafetySection.tsx` | `@/app/(app)/listings/new/components/SafetySection`의 `SafetyDoc` 타입 |
| `renewal/monitoring/MonitoringRenewalClient.tsx` | `@/app/(app)/monitoring/hooks/useMonitoringData` |

`useListingForm`은 `successPath` 콜백을 인자로 받아, 등록 성공 시 리뉴얼 상세 경로(`/renewal/listing-db-detail?id=...`)로 이동하도록 주입한다. 디자인은 CSS Module(`listing-new.module.css`, `monitoring-renewal.module.css`)로 완전히 리뉴얼 계열에 맞춘다.

### 컴포넌트 구조

```
components/
├── common/             # Button, Card, Badge, CategoryHero, AiDisclaimer, PdfDownloadButton 등
├── forms/              # FormInput, SliderInput 등
├── results/            # ScoreGauge, KpiCard, VScoreRadar, IntegratedReport 등
├── loading/            # LoadingSpinner, StepIndicator (스텝 위저드 공통)
├── auth/               # AuthGuard (featureName 기반 인증 게이팅)
├── jeonse/ prediction/ feasibility/ tax/ rights/ verification/
├── admin/ layout/ expert/ landlord/ pwa/
```

라우트별 전용 컴포넌트는 해당 라우트 아래 `components/`, `hooks/`로 배치(파일 분리 원칙). 예: `e-contract/components/{SignaturePad,PartyForm,SpecialTermsEditor}`, `e-contract/hooks/useContractForm`, `renewal/monitoring/components/*`.

---

## Features [coverage: high -- 5 sources]

### 매물 등록 (renewal) — `/renewal/listing-new` [신규]

기존 `(app)/listings/new`의 로직을 재사용해 renewal 디자인으로 이식한 매물 등록 화면.

- **접근 게이팅** (`ListingNewClient.tsx`): 세션 로딩 → 미로그인 → 사업자 미인증 → 권한 없음 순으로 안내 화면(`gate`)을 분기. 등록 자격은 **임대인(LANDLORD) / 인증 완료(`verifyStatus === "verified"`)된 사업자 / 관리자**만 허용. 사업자 계열(`RENTAL_BIZ`/`BUSINESS`/`REALESTATE`)은 인증 전이면 "사업자 인증 후 등록" 안내. 클라이언트 게이팅은 서버 가드(`POST /api/listings`)와 일치시킨 UX 레이어.
- **폼** (`ListingNewForm.tsx`): 거래유형(전세/매매) 토글로 라벨 전환(보증금↔매매가, 전세일 때만 계약기간), Daum 우편번호 스크립트 동적 로드 주소검색, 금액 3자리 콤마 + 한글 금액 변환(`toKorean`), 사진 최대 10장 업로드(`uploadPhoto`), 전용면적·층수·관리비·입주가능일·상세설명(2000자).
- **안전 증명** (`RenewalSafetySection.tsx`, 선택): AI 권리분석 결과 연동(`/api/user/my-analyses` 조회 후 select), 건축물대장·전입세대열람 확인서 첨부(`POST /api/listings/temp-doc`로 임시 업로드). "임차인에게 신뢰를 줍니다" 신뢰 시그널 목적.

마이페이지 `ProfileListingsPanel`의 빈 상태·CTA에서 `/renewal/listing-new`로 진입한다.

### 가계약서 작성 — `/e-contract` [신규]

4스텝 위저드(`StepIndicator`)로 가계약서를 만들어 PDF로 출력하는 화면. `AuthGuard`로 보호.

**스텝 흐름** (`page.tsx` + `useContractForm.ts`): `type`(계약유형) → `info`(계약정보) → `parties`(당사자·서명) → `confirm`(확인) → `done`(PDF 다운로드).

1. **계약유형**: 전세(JEONSE) / 월세(MONTHLY) / 매매(SALE) 카드 선택. 유형별 금액 라벨(보증금/매매가)과 월세·계약기간 필드 노출 조건이 달라짐.
2. **계약정보**: 목적물 주소, 금액(콤마 포맷), 월세(MONTHLY만), 계약 시작/만료일(매매 제외), 잔금·잔금지급일, 특약사항. 특약은 3개 표준 조항을 칩 버튼(`+ 표준특약 N`)으로 텍스트영역에 append(`appendSpecialTerm`).
3. **당사자·서명** (`PartyForm.tsx` × 2, 임대인/임차인): 이름·전화번호·**주민번호 앞자리(생년월일 6자리 + 성별 1자리, 뒷 6자리는 받지 않음)**·손글씨 서명. `formatRrn`이 숫자만 남겨 `YYMMDD-G` 형태로 포맷.
4. **확인·출력**: 정의목록으로 내용 요약, "오프라인 본계약으로 확정" 고지 후 `submit`.

**서명 패드** (`SignaturePad.tsx`): HTML canvas에 PointerEvent로 마우스·터치 서명을 받아 `toDataURL("image/png")`로 상위에 전달. `devicePixelRatio`(최대 2배)로 고해상도 대응, `touchAction: "none"`으로 스크롤 차단, 지우기 버튼 제공.

**검증** (`useContractForm.validateParties`): 금액 필수, 당사자별 이름·전화번호(`\d{2,3}-?\d{3,4}-?\d{4}`)·주민 앞자리(`^\d{6}-[1-4]$`)·서명 존재를 클라이언트에서 검사한 뒤 `POST /api/e-contracts` 호출. 응답의 `pdfUrl`(또는 `/api/e-contracts/{id}/pdf`)을 새 탭으로 연다.

**의향서 연계 프리필**: URL 쿼리 `applicationId`가 있으면 마운트 시 `address`/`deposit`/`type`을 폼에 프리필하고 곧바로 `info` 스텝으로 이동, 제출 시 `applicationId`를 함께 전송해 의향서와 계약을 연결.

### 가계약서 PDF 템플릿 — `lib/pdf/contract-template.tsx` [신규]

`@react-pdf/renderer` 기반 A4 **1페이지** 서버 렌더링 문서(`ContractPdf`). Paperlogy TTF 폰트(`public/fonts/`)를 등록해 한글 렌더링.

- **구성**: 제목("부동산 {유형} 가계약서") → 부동산의 표시(소재지·계약유형) → 계약 내용(보증금/월차임/계약기간/계약일) → **계약 조항 요약(국토부 표준 주택임대차계약서 기준 제1~10조)** → 특약사항 → 서명란.
- **10개 조항**(`ARTICLES`): 목적/존속기간/용도변경·전대/유지관리/계약해제/채무불이행·손해배상/계약해지/갱신요구·거절/확정일자·전입신고/중개보수. 각 조항을 한 줄 요약해 소형 폰트(7.5pt)로 압축, 1페이지에 맞춤.
- **서명란**(`SignBox`): 임대인·임차인(공인중개사 선택)별로 성명·생년월일·성별·연락처 + 서명 이미지(`PdfImage`, 없으면 "(서명 대기)"). 폰트·여백을 조정해 조항+특약+서명이 한 페이지 안에 들어가도록 설계.
- 하단 푸터에 "오프라인 본계약으로 확정" 고지 + 계약번호 + 도메인 표기.

### 매물 상세 CTA & 의향서 연계 [신규]

- **매물 상세** (`renewal/listing-db-detail/ListingDbDetailContent.tsx`): CTA 3개 — "의향서 보내기", "AI 권리분석 해보기"(`/renewal/rights`), **"이 매물 등기감시"** (`/renewal/monitoring?address=...&listingId=...`). 등기감시 CTA는 주소·매물ID를 쿼리로 넘겨 감시 등록 모달을 프리필 상태로 자동 오픈시킨다.
- **받은 의향서** (`profile/components/ProfileApplicationsPanel.tsx`): 수락(ACCEPTED)된 의향서에 **"전자계약 작성"** 링크(`FileSignature` 아이콘) 노출 → `/e-contract?applicationId=...&address=...&deposit=...&type=...`로 이동해 가계약서 스텝을 프리필. 보낸/받은 의향서 탭 분리, 상태 필터, 채팅·수락·거절·철회·삭제 액션 포함.

### 등기감시 물건 추가 (renewal) — `/renewal/monitoring` [신규]

- **자동 오픈**(`MonitoringRenewalClient.tsx`): `initialAddress`(쿼리 유래)가 있으면 마운트 후 로그인 상태에 따라 감시 등록 모달 또는 로그인 모달을 1회 자동 오픈. 감시 데이터·KPI는 `useMonitoringData` 훅 재사용.
- **물건 추가 모달**(`AddPropertyModalRenewal.tsx`): "주소 검색" / "등기부 PDF" 두 탭. 주소 검색은 프리필 주소가 있으면 검색 완료 상태로 시작, 집합건물이면 동·호수 입력 노출(`isCollectiveBuilding`, 토지·임야 제외). 계약정보(소유자명·보증금·계약일·전입예정일) 선택 입력 시 **계약갭 강화감시 모드** 자동 전환. PDF 탭은 `POST /api/monitoring/parse-pdf`로 주소·소유자 자동 인식 후 `POST /api/monitoring` 등록. `initialListingId`가 있으면 매물과 감시를 연결.

### 사업성분석 게이팅 — `/feasibility` [변경]

`FeasibilityPage`는 `AuthGuard` 하위에서 **기업(BUSINESS)·관리자만** 본 기능에 접근 가능하도록 클라이언트 게이팅을 추가. 비-기업 회원에게는 SCR 위저드 대신 "기업 회원 전용 기능입니다" 안내 화면(`Building2` 아이콘 + 마이페이지 전환 CTA)을 렌더링. 서버 가드(`lib/feasibility-guard`)와 role 조건을 일치시킨 UX 레이어. 접근 허용 시 기존 3단계 위저드(문서 업로드 → 검증 분석 → 보고서 생성)를 표시.

### SCR 보고서 UI 흐름

SCR 서울신용평가 사업성평가보고서와 동일한 5장+부록 구조 보고서를 자동 생성. 3단계 위저드(파일 업로드 → 데이터 검토 → 보고서 생성, SSE 진행률)로 구성. 렌더링 이중화: React 컴포넌트(`ScrChapter*.tsx`, 미리보기) + 서버사이드 HTML(`scr-report-html.ts`, PDF). 차트는 Recharts SSR로 SVG 생성 후 HTML 인라인 삽입.

### 관리자 대시보드 주요 탭

사용자 관리, 분석 이력, 시스템 통계(Recharts), OAuth 키 관리(AES-256-GCM), ML 학습관리(`MlTrainingTab.tsx` — 등기부등본 업로드·파싱·검수·JSONL 내보내기, 도메인 용어 사전), 공지사항 CRUD, 감사 로그.

---

## Data Models [coverage: high -- 2 sources]

### 가계약서 폼 상태 (`useContractForm.ts`)

```ts
type ContractType = "JEONSE" | "MONTHLY" | "SALE";
type Step = "type" | "info" | "parties" | "confirm" | "done";

interface Party {
  name: string;
  phone: string;
  rrn: string;   // 생년월일+성별 1자리 (예: "890101-1")
  sign: string;  // 손글씨 서명 PNG data URL
}

interface ProvisionalContractState {
  contractType, address, deposit, monthlyRent,
  contractDate, startDate, endDate, balance, balanceDate,
  specialTerms, landlord: Party, tenant: Party
}
```

### PDF 렌더 데이터 (`contract-template.tsx`)

`EContractPdfData` — 금액은 `bigint`(deposit/monthlyRent), 서명은 `signatureUrl`(data URL), 당사자는 landlord/tenant + broker(선택). API가 폼 상태를 이 모델로 매핑해 서버에서 렌더.

---

## Key Decisions [coverage: high -- 5 sources]

- **App Router 단독 사용**: `pages/` 미사용. RSC/SSR 자동 최적화, 미들웨어 기반 라우트 보호.
- **리뉴얼 UI는 UI만 신규, 로직은 재사용**: `(personal-home)/renewal`은 CSS Module 기반 새 디자인이지만 상태·API 훅(`useListingForm`, `useMonitoringData` 등)은 기존 `(app)` 구현을 import해 중복 구현을 피함. 리뉴얼과 레거시가 동일 API·검증 로직을 공유.
- **가계약서는 canvas 손글씨 서명 + 서버 PDF**: 공인인증/PKI가 아닌 **손글씨 이미지 서명** 방식. 법적 지위는 "가계약서(주요 조건 합의 문서)"로 한정하고, PDF 곳곳에 "오프라인 본계약으로 확정" 고지를 명시.
- **주민번호는 앞 7자리만 수집**: 당사자 식별용으로 생년월일 6자리 + 성별 1자리만 받고 뒷 6자리는 폼·PDF 어디에도 저장/표시하지 않음(PII 최소 수집).
- **가계약서 PDF는 A4 1페이지 고정**: 표준계약 10개 조항을 요약(한 줄)하고 폰트(7.5~8pt)·여백을 압축해 조항+특약+서명을 한 페이지에 배치.
- **기능 게이팅은 서버 가드와 일치**: 매물 등록(임대인/인증 사업자/관리자), 사업성분석(기업/관리자)의 클라이언트 게이팅은 각각 `POST /api/listings`, `lib/feasibility-guard` 서버 조건과 동일하게 맞춘 UX 레이어(보안은 서버 검증이 담당).
- **VScoreRadar 순수 SVG 직접 구현** (외부 차트 라이브러리 미사용, 173줄).
- **카카오 지도 키**: 클라이언트 전용(`NEXT_PUBLIC_KAKAO_MAP_KEY`), SSR 로드 불가.
- **SCR 보고서 렌더링 이중화**: React 컴포넌트와 서버사이드 HTML이 동일 `ScrReportData` 공유.

---

## Gotchas [coverage: high -- 5 sources]

### 가계약서 서명 패드 주의

- `SignaturePad`는 canvas + PointerEvent 기반. `touchAction: "none"`을 반드시 유지해야 터치 서명 중 페이지 스크롤이 막힌다.
- 캔버스 초기화는 마운트 시 1회(`useEffect [] `)만 실행되며 `devicePixelRatio`로 스케일링. 캔버스 크기가 반응형으로 바뀌면 재초기화 로직이 없어 서명 좌표가 어긋날 수 있음(고정 높이 120px 사용).
- 서명 값은 PNG data URL. 서버 전송 시 payload 크기가 커질 수 있으므로 선 두께·해상도(ratio 최대 2)를 제한.

### 가계약서 PDF 1페이지 오버플로 위험

`contract-template.tsx`는 10개 조항 + 특약 + 서명을 A4 1페이지에 맞추도록 폰트·여백이 정밀 조정되어 있음. **특약사항이 길거나 조항 문구를 늘리면 2페이지로 넘어가 서명란 배치가 깨질 수 있음.** 조항 수정 시 미리보기로 1페이지 유지 확인 필요.

### 리뉴얼 로직 재사용 시 크로스 그룹 import

`(personal-home)/renewal` 컴포넌트가 `@/app/(app)/...`의 훅·타입을 import함. `(app)` 쪽 훅 시그니처(예: `useListingForm`의 반환값, `SafetyDoc` 타입)를 변경하면 리뉴얼 화면이 함께 깨지므로, 레거시 훅 수정 시 renewal 사용처를 반드시 함께 점검할 것.

### 기능 게이팅은 UX 전용 — 서버 검증 필수

매물 등록·사업성분석의 클라이언트 role/verify 게이팅은 안내 UX일 뿐 보안 경계가 아니다. 실제 권한 검증은 반드시 서버(`POST /api/listings`, `POST /api/e-contracts`, `lib/feasibility-guard`)에서 수행해야 하며, 클라이언트 게이팅만으로 끝내지 않는다.

### Tailwind CSS v4 arbitrary/responsive value 미적용 이슈

v4 JIT에서 `w-[123px]`, `lg:sticky`, `lg:flex-row` 등이 생성되지 않는 경우가 있음. **우회: 동적 크기는 인라인 `style`, responsive는 `globals.css`의 `@media` 블록**(`.two-col-flex`, `.col-sticky` 등 커스텀 클래스). 리뉴얼 화면은 이를 피해 CSS Module을 채택.

### `overflow-x: hidden` on body → `position: sticky` 차단

`overflow-x: hidden`/`clip`을 html/body에 적용하면 body가 스크롤 컨테이너가 되어 뷰포트 기준 sticky가 차단됨(crbug.com/1090435). **해결: `@media (max-width: 1023px)`에만 적용.**

### 카카오 지도 SDK SSR 주의

카카오 지도 SDK는 클라이언트 전용. `KakaoMap.tsx`, `LeafletMap.tsx` 모두 `dynamic(..., { ssr: false })` 필요.

### AiDisclaimer / PdfDownloadButton 미연결

두 컴포넌트 모두 구현·export되어 있으나 분석 페이지에서 렌더링되지 않는 상태(GAP 분석 기준). 법적 고지·PDF 다운로드 노출 필요.

### PWA 서비스 워커 부재

`manifest.json`·아이콘은 완비(홈 화면 추가 가능)하나 서비스 워커(`public/sw.js`) 부재로 오프라인 미지원.

---

## Sources [coverage: high -- 16 sources]

- [[CLAUDE.md]]
- [[docs/TECHNICAL-STATUS-REPORT.md]]
- [[docs/03-analysis/vestra-v2-commercialization.analysis.md]]
- [[docs/02-design/features/prediction-enhancement.design.md]]
- [[docs/02-design/features/feasibility-scr-upgrade.design.md]]
- [[app/(personal-home)/renewal/listing-new/page.tsx]]
- [[app/(personal-home)/renewal/listing-new/ListingNewClient.tsx]]
- [[app/(personal-home)/renewal/listing-new/components/ListingNewForm.tsx]]
- [[app/(personal-home)/renewal/listing-new/components/RenewalSafetySection.tsx]]
- [[app/(personal-home)/profile/components/ProfileApplicationsPanel.tsx]]
- [[app/(personal-home)/profile/components/ProfileListingsPanel.tsx]]
- [[app/(personal-home)/renewal/monitoring/MonitoringRenewalClient.tsx]]
- [[app/(personal-home)/renewal/monitoring/components/AddPropertyModalRenewal.tsx]]
- [[app/(personal-home)/renewal/listing-db-detail/ListingDbDetailContent.tsx]]
- [[app/(app)/e-contract/page.tsx]]
- [[app/(app)/e-contract/hooks/useContractForm.ts]]
- [[app/(app)/e-contract/components/SignaturePad.tsx]]
- [[app/(app)/e-contract/components/PartyForm.tsx]]
- [[app/(app)/feasibility/page.tsx]]
- [[lib/pdf/contract-template.tsx]]

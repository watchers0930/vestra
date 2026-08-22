---
topic: features
last_compiled: 2026-08-22
sources: 20
---

# 주요 기능 (Features)

---

## Purpose [coverage: high — 4 sources]

VESTRA는 AI 기반 부동산 자산관리 플랫폼으로, 등기부등본 권리분석부터 전세 보호, 시세전망, 계약서 검토, 세무 시뮬레이션, 사업성 분석까지 부동산 거래 전 과정에 걸쳐 AI 분석을 제공한다. 여기에 매물 등록·탐색, 계약 의향서 제출·수락, 가계약서 작성·출력까지 이어지는 **거래 실행 흐름**이 renewal UI로 통합되어 있다. 핵심 분석 기능 7종(FR-001~FR-007), 부가 기능 다수, 그리고 향후 구현 예정인 경쟁우위 강화 기능 5단계(Phase)로 구성된다.

---

## Architecture [coverage: high — 5 sources]

### 시스템 구성

```
클라이언트 (React 19 + Next.js 16 App Router + Tailwind v4)
    │ HTTPS
Next.js 서버 (Vercel Serverless)
    ├── API Routes (/api/*)
    ├── SSR/RSC 페이지
    └── Middleware (Auth + Rate Limit)
         │
    비즈니스 로직 엔진 (lib/)
    ├── registry-parser     validation-engine
    ├── risk-scoring         tax-calculator
    ├── contract-analyzer    prediction-engine
    ├── fraud-risk-model     v-score
    ├── anomaly-detector     adaptive-weight-tuner
    └── guarantee-insurance  news-collector
         │
    ┌────────────┐  ┌──────────────┐  ┌───────────────────┐
    │ Neon       │  │ OpenAI API   │  │ 공공데이터 API      │
    │ PostgreSQL │  │ GPT-4.1-mini │  │ MOLIT/건축물대장    │
    │ + Prisma   │  │              │  │ 대법원/한국은행     │
    └────────────┘  └──────────────┘  └───────────────────┘
```

### 거래 실행 흐름 (renewal → 의향서 → 가계약서)

```
매물 등록 (/renewal/listing-new)   ─ 임대인/인증사업자/ADMIN
        │
매물 탐색·상세 (/renewal/listings-list, listing-db-detail)
        │  ├─ "의향서 보내기"       → POST /api/contract-applications  → 소유자에 Web Push
        │  ├─ "이 매물 등기감시"     → /renewal/monitoring?address=…&listingId=…  (프리필)
        │  └─ "AI 권리분석 해보기"   → /renewal/rights
        │
받은 의향서 (프로필) 수락/거절     ─ PATCH /api/contract-applications/[id]
        │  ├─ ACCEPTED → 매물 CONTRACTED + 신청자에 Web Push(수락)
        │  └─ REJECTED → 신청자에 Web Push(거절)
        │
"전자계약 작성" (ACCEPTED 카드)    → /e-contract?applicationId=…&address=…&deposit=…&type=…
        │
가계약서 작성 (/e-contract)        ─ 임대인+임차인 양측 손글씨 서명 → POST /api/e-contracts
        │  └─ 즉시 COMPLETED + 매물 COMPLETED 동기화
        │
PDF 출력 (/api/e-contracts/[id]/pdf)  ─ A4 1페이지, 표준계약 10개 조항 요약
        │
오프라인 본계약 확정 (당사자 간)
```

### 외부 API 연동 현황

| API | 제공기관 | 용도 | 환경변수 |
|-----|---------|------|---------|
| OpenAI GPT-4.1-mini | OpenAI | 자연어 분석, 계약서 해석, AI 채팅 | `OPENAI_API_KEY` |
| MOLIT 실거래가 | 국토교통부 | 아파트/전세 실거래 데이터 | `MOLIT_API_KEY` |
| 건축물대장 / K-apt | 국토교통부 | 건물·단지 정보 조회 | `KAPT_API_KEY` |
| VWorld NED | 국토교통부 | 공시가격(개별공시지가/공동주택/개별주택) | `VWORLD_API_KEY` |
| 대법원 판례 | 법제처 | 부동산 판례 검색 | `LAW_API_KEY` |
| 한국은행 ECOS | 한국은행 | 기준금리 (24시간 캐시) | `BOK_API_KEY` |
| Kakao Maps SDK | 카카오 | 지도 시각화, 지오코딩 | `NEXT_PUBLIC_KAKAO_MAP_KEY` |
| KOSIS / DART / REPS / MOIS | 통계청·전자공시·부동산원·행안부 | SCR 사업성 데이터 | `KOSIS_API_KEY` 외 |

### Cron 스케줄

| Cron 경로 | 스케줄 | 기능 |
|----------|--------|------|
| `/api/cron/registry-monitor` | 매일 09:00 | 등기 변동 감시 (배치 50건) |
| `/api/cron/fraud-import` | 매주 월 03:00 | 전세사기 사례 데이터 갱신 |
| `/api/cron/news-collector` | 매일 06:00 | 뉴스/정책 RSS 수집 |
| `/api/cron/guarantee-monitor` | 매주 월 09:00 | 보증보험 공식 사이트 변경 감지 |

---

## Algorithm [coverage: medium — 4 sources]

핵심 분석 엔진의 알고리즘 상세는 `algorithm` 토픽 참조. 기능 관점 요약:

- **권리분석 위험도**: 13팩터 + 6상호작용 스코어링(`risk-scoring.ts`), 4단계 유효성 검증(`validation-engine.ts`), 신뢰도 전파(`confidence-engine.ts`)
- **시세전망 앙상블**: 선형회귀/평균회귀/모멘텀/ARIMA(1,1,1)/ETS(A,A,A) 5모델, R² 기반 동적 가중치, 데이터 건수 기반 자동 폴백
- **전세사기 위험**: 15피처 SHAP 유사 그래디언트 부스팅(`fraud-risk-model.ts`)
- **V-Score**: 5소스 + 6상호작용 통합 점수(`v-score.ts`)
- **가계약서**: 알고리즘성 계산 없음. 입력값 검증 후 표준계약서 10개 조항을 결정적으로 렌더링. 외부 전자서명 API·AI 미호출.

---

## API Surface [coverage: high — 6 sources]

### 분석 API

`POST /api/analyze-rights`, `POST /api/parse-registry`, `POST /api/analyze-contract`, `POST /api/analyze-unified`, `POST /api/predict-value`(+`/compare`), `GET /api/real-price`, `POST /api/fraud-risk`, `GET /api/fraud-cases`, `POST /api/chat`, `GET /api/scholar/search`, `POST /api/generate-document`

### 거래/계약 API (이번 개편 반영)

| 엔드포인트 | 메서드 | 역할 | 인증·보안 |
|-----------|--------|------|----------|
| `/api/contract-applications` | GET | 임대인: 내 매물로 온 의향서 목록(status 필터) | `auth()` 필수, `listing.ownerId` 스코프 |
| `/api/contract-applications` | POST | 임차인/매수인: 의향서 제출 | `auth()` + `validateOrigin`(CSRF), zod 검증, 본인 매물 제외, PENDING 중복 방지, ACTIVE 매물만 |
| `/api/contract-applications/mine` | GET | 신청자: 내가 보낸 의향서 | `auth()` 필수 |
| `/api/contract-applications/[id]` | GET | 채팅방 진입용 단건 조회 | 당사자(신청자·소유자)만 |
| `/api/contract-applications/[id]` | PATCH | 수락/거절(임대인) · 철회(신청자) | `auth()` + CSRF, 역할 가드, PENDING만 처리 |
| `/api/contract-applications/[id]` | DELETE | 신청자: WITHDRAWN / 임대인: REJECTED·WITHDRAWN 삭제 | 당사자 + 상태 가드 |
| `/api/e-contracts` | POST | 가계약서 생성(양측 서명 즉시 COMPLETED) | `auth()` + CSRF, 금액 상한 1조, RRN 형식·서명 data URL 검증 |
| `/api/e-contracts` | GET | 내 가계약 목록(임대인/작성자/임차인/브로커) | `auth()` 필수, 페이지네이션 |
| `/api/e-contracts/[id]/pdf` | GET | 최종 가계약서 PDF 다운로드 | **로그인한 계약 당사자만** (ID 열거 유출 차단) |

**의향서 상태 전이**: `PENDING → ACCEPTED | REJECTED | WITHDRAWN`. ACCEPTED 시 매물 `CONTRACTED`, 가계약서 생성 시 매물 `COMPLETED`.

### 기타 API

`/api/auth/[...nextauth]`, `/api/user/*`, `/api/subscription`(+`/cancel`), `/api/feasibility/*`(BUSINESS 전용), Cron 4종

---

## Data Models [coverage: medium — 3 sources]

거래 흐름 관련 핵심 모델:

| 모델 | 주요 필드 | 비고 |
|------|----------|------|
| `Listing` | `status`(ACTIVE/CONTRACTED/COMPLETED …), `ownerId`, `listingType`, `deposit` | 의향서 수락 시 CONTRACTED, 가계약 완료 시 COMPLETED |
| `ContractApplication` | `listingId`, `applicantId`, `moveInDate`, `duration`, `memo`, `proposedDeposit`(BigInt), `visitDateTime`, `status`, `rejectionReason` | 의향서 |
| `EContract` | `contractType`, `status`(COMPLETED), `address`, `deposit`(BigInt), `monthlyRent`, `startDate`/`endDate`, `specialTerms`, `landlordId`/`tenantId`/`creatorId`, `listingId`/`applicationId` FK, `tenantEmail`/`brokerEmail`, `completedAt` | 가계약서. 이메일 서명 링크 미사용(`tenantEmail: ""`) |
| `EContractSignature` | `role`(LANDLORD/TENANT/BROKER), `signerName`, `signerPhone`, `signerRrnPrefix`, `signatureUrl`(PNG data URL), `method`(HANDWRITING), `signedAt`, `ipAddress` | 양측 손글씨 서명 즉시 생성 |

기타 21개 테이블(인증 4 / 핵심 비즈니스 5 / 사용량 2 / 알림·모니터링 4 / 시스템 4 / 공유·검증 2)은 `platform-overview` 토픽 참조.

---

## Security [coverage: high — 4 sources]

- **가계약서 PDF**: 실명·서명·보증금·주소 등 개인정보가 포함되므로 `/api/e-contracts/[id]/pdf`는 COMPLETED 상태여도 **비로그인·비당사자 접근을 금지**한다. 당사자 판정은 `landlordId`/`creatorId`/`tenantId`/`tenantEmail`/`brokerEmail` 매칭.
- **의향서 변이(POST/PATCH/DELETE)**: 모두 `validateOrigin`(CSRF) + `auth()` + zod 검증. 수락/거절은 매물 소유자만, 철회는 신청자만.
- **가계약서 생성 검증**: 계약유형 화이트리스트, 주소 최소 길이, 양측 이름·서명 필수, 서명은 `data:image` prefix 확인, RRN 앞자리 형식(`\d{6}-[1-4]`), 금액 상한 1조 원.
- **역할 기반 접근 제어**: GUEST/PERSONAL/BUSINESS/REALESTATE/ADMIN 5단계 + 일일 분석 한도. **사업성분석(SCR)은 BUSINESS·ADMIN 전용**(페이지 가드 + `lib/feasibility-guard.ts` 서버 가드 이중화).
- **매물 등록 자격**: 임대인(LANDLORD) / 인증완료(`verifyStatus === "verified"`) 사업자 / ADMIN만. 클라이언트 게이트와 `POST /api/listings` 서버 가드 일치.

---

## Features (기능 목록) [coverage: high — 10 sources]

### 구현 완료

---

#### FR-001: 권리분석 (`/rights`, `/renewal/rights`)

등기부등본(PDF/텍스트) 업로드 → 자동 파싱 → 권리 상태 분석 → 위험도 산정

| 컴포넌트 | 역할 |
|---------|------|
| `registry-parser.ts` | 등기부등본 파싱 (598줄) |
| `validation-engine.ts` | 4단계 유효성 검증 (1,233줄) |
| `risk-scoring.ts` | 13팩터 + 6상호작용 위험도 스코어링 (938줄) |
| `confidence-engine.ts` | 신뢰도 전파 (263줄) |
| `ScoreGauge`, `KpiCard` | 결과 시각화 |

**관련 API**: `POST /api/analyze-rights`, `POST /api/parse-registry`

---

#### FR-002: 계약서 분석 (`/contract`)

매매/임대차 계약서 업로드 → AI 특약사항/불리한 조항/누락 항목 분석 → 법적 검토 의견

| 컴포넌트 | 역할 |
|---------|------|
| `contract-analyzer.ts` | AI 기반 조항 분석 (597줄) |
| `court-api.ts` | 대법원 판례 연동 |
| OpenAI GPT-4.1-mini | 법률 조언 생성 |

- 계약 분석 시 뉴스·정책 수집기에서 최근 30일 정책(전세, 규제지역, 대출규제 태그) 컨텍스트 자동 주입

**관련 API**: `POST /api/analyze-contract`

---

#### FR-003: 세무 시뮬레이션 (`/tax`)

취득세, 양도소득세, 종합부동산세를 물건 정보 및 보유 현황에 따라 자동 계산 (`tax-calculator.ts`, 335줄 — 세율은 한국 세법 기반 검증 완료)

**관련 API**: `POST /api/analyze-unified`

---

#### FR-004: 시세전망 (`/prediction`) — v2.4.0

국토교통부 실거래가 + AI → 낙관/중립/비관 3시나리오 시세전망 (1년/5년/10년)

**예측 엔진 (`prediction-engine.ts`, 902줄)**: 선형회귀 / 평균회귀 / 모멘텀 / ARIMA(1,1,1) / ETS(A,A,A). R² 기반 동적 가중치(최소 5%), 데이터 건수 기반 자동 폴백(24건+ → 5모델, 12~23건 → 3~5모델, 3~11건 → 2~3모델)

**외부 데이터**: MOLIT 36개월 실거래가(배치 6건 병렬), 한국은행 ECOS 기준금리(24h 캐시, 폴백 2.75%), 입주물량(정적 추정)

**추가**: 월별 12개월 세분화 예측, 시장 사이클 탐지, Rolling Window 백테스팅(MAPE/RMSE), 지역 비교(최대 3개), 뉴스·정책 컨텍스트 자동 주입. UI 5탭 + 7개 컴포넌트.

**관련 API**: `POST /api/predict-value`, `POST /api/predict-value/compare`, `GET /api/real-price`

---

#### FR-005: 전세 보호 서비스 (`/jeonse/*`, `/renewal/jeonse`)

전세 계약의 보증금 반환 위험도 분석 및 보호 조치 안내 (절차 안내, 전세 안전 분석, 전입신고, 확정일자, 전세권설정등기, 임차권등기명령, 주택임대차 신고)

- 전세 분석 결과에 보증보험 가입 카드(`GuaranteeInsuranceCard`) 통합 — HUG/HF/SGI 3기관 자동 판정 + 예상 보증료 + 신청 딥링크
- 법원 공식 양식 자동 생성: 임차권등기명령 신청서, 전세권설정등기 신청서 (등기부 파싱 결과 자동 입력)

**관련 API**: `POST /api/generate-document` (`type=jeonse`, `type=lease`) — OpenAI 미호출, 결정적 템플릿

---

#### FR-006: AI 어시스턴트 (`/assistant`)

부동산 법률·세금·시세 실시간 AI 챗봇. OpenAI GPT-4.1-mini + 도메인 프롬프트, 대법원 판례 자동 검색, 최근 7일 뉴스/정책 컨텍스트 주입.

**관련 API**: `POST /api/chat`, `GET /api/scholar/search`

---

#### FR-007: 관리자 대시보드 (`/admin`)

ADMIN 전용 — 사용자 관리, 분석 현황, 공지 CRUD, OAuth 설정(AES-256-GCM), 학습 데이터, 도메인 용어, 감사 로그, 보증보험 규칙 버전 관리, 뉴스·정책 관리

---

#### FR-008: 인증 및 계정 관리

NextAuth v5 소셜 로그인(Google, 네이버 — 카카오 설정 중) + 5단계 RBAC

| 역할 | 일일 분석 한도 |
|------|:------:|
| GUEST | 2회 |
| PERSONAL | 5회 |
| BUSINESS | 50회 |
| REALESTATE | 100회 |
| ADMIN | 무제한 |

사용자 유형(userType) `LANDLORD`/`TENANT`, 사업자 인증 상태(`verifyStatus`)로 매물 등록·거래 권한을 세분한다.

**관련 API**: `/api/auth/[...nextauth]`, `/api/user/profile`, `/api/user/usage`, `/api/user/setup-role`

---

#### FR-011: 매물 등록·탐색 (renewal 이식)

기존 `/listings` 기능이 renewal UI(`/renewal/*`)로 이식됨.

| 페이지 | 기능 |
|--------|------|
| `/renewal/listing-new` | 매물 등록 (PC). 임대인/인증사업자/ADMIN만. `RenewalSafetySection`로 안심인증 서류 안내 |
| `/renewal/listings-list`(+`-mobile`) | 매물 목록 |
| `/renewal/listings-map`(+`-mobile`) | 지도 탐색 |
| `/renewal/listing-detail`(+`-mobile`) | 국토부 데이터 상세 |
| `/renewal/listing-db-detail`(+`-mobile`) | 등록 매물 DB 상세 — `DetailTabs`(위치·인프라·학군·시세) 재사용, 안심인증 3종 서류·등기부 확인 결과(등록임대주택/명의변경) 표시 |

**매물 상세 CTA 3종**: `의향서 보내기`(로그인 필요 → `ApplicationModal`), `AI 권리분석 해보기`(→ `/renewal/rights`), **`이 매물 등기감시`**(→ `/renewal/monitoring?address=…&listingId=…` 프리필).

---

#### FR-012: 계약 의향서 (Contract Application)

임차인/매수인이 관심 매물에 의향서를 제출하고, 임대인이 수락/거절하는 워크플로우.

- **제출**: `ApplicationModal`(입주 희망일·기간·메모·제안 보증금·방문 일시) → `POST /api/contract-applications`. 입주 희망일 오늘 이후, ACTIVE 매물만, 본인 매물 제외, PENDING 중복 방지. 소유자에게 **Web Push** 알림.
- **수락/거절**: 프로필 `ProfileApplicationsPanel` → `PATCH /api/contract-applications/[id]`. 수락 시 매물 `CONTRACTED` + 신청자에 Web Push(수락, url `/chat/[id]`), 거절 시 Web Push(거절).
- **후속**: 수락된(ACCEPTED) 의향서 카드에 **"전자계약 작성"** 버튼 → `/e-contract?applicationId=…&address=…&deposit=…&type=…`로 가계약서 프리필 연결.

**관련 API**: `/api/contract-applications`, `/api/contract-applications/mine`, `/api/contract-applications/[id]`

---

#### FR-013: 가계약서 (E-Contract) — v5.87~5.90.2 전면 개편

**개편 핵심**: 기존 이메일 링크 기반 전자서명 방식을 폐기하고, **임대인+임차인 양측이 한 자리에서 손글씨로 서명하면 즉시 완료(COMPLETED)**되는 방식으로 전환. **외부 전자서명 API는 미연동**이며, PDF 출력 후 당사자 간 **오프라인 본계약 체결로 확정**하는 것을 전제로 한다.

**작성 흐름 (`/e-contract`, 4스텝 위저드)**
1. 계약유형 — 전세(JEONSE) / 월세(MONTHLY) / 매매(SALE)
2. 계약정보 — 목적물 주소, 보증금/매매가, 월세, 계약기간, 잔금·잔금일, 특약(표준특약 3종 원클릭 추가)
3. 당사자·서명 — 임대인/임차인 각각 이름·전화·생년월일+성별(RRN 앞자리)·**손글씨 서명**(`SignaturePad` canvas, PointerEvent, PNG data URL)
4. 확인·출력 — 요약 확인 → `POST /api/e-contracts` → 완료 화면에서 PDF 열기

**서버 처리 (`POST /api/e-contracts`)**
- 검증: 계약유형 화이트리스트, 주소 길이, 양측 이름·서명(data URL) 필수, RRN 형식, 금액 상한 1조 원
- `EContract` 생성 시 `status: "COMPLETED"`, `completedAt` 기록, 양측 `EContractSignature`(method `HANDWRITING`) 즉시 생성
- 잔금 일정은 특약 상단에 합쳐 저장
- **의향서 연결(`applicationId`)** 시: 본인 매물 의향서만 허용, `listingId`/`applicationId`/`tenantId` FK 연결 후 **매물을 `COMPLETED`로 동기화**

**PDF 출력 (`GET /api/e-contracts/[id]/pdf`)**
- `@react-pdf/renderer` + Paperlogy 폰트, **A4 1페이지**
- 국토부 표준 주택임대차계약서 기준 **10개 조항(제1조~제10조)** 요약 + 당사자 서명 이미지 렌더링
- **접근 제어**: 로그인한 계약 당사자만 (개인정보 유출 차단)

**관련 컴포넌트**: `e-contract/page.tsx`, `hooks/useContractForm.ts`, `components/{PartyForm,SignaturePad,SpecialTermsEditor}.tsx`, `lib/pdf/contract-template.tsx`
**관련 API**: `POST/GET /api/e-contracts`, `GET /api/e-contracts/[id]/pdf`, `/api/e-contracts/[id]`

---

#### FR-014: 등기 모니터링 (`/renewal/monitoring`)

등기 변동 감시 등록·조회. 매물 상세 "이 매물 등기감시"에서 **`?address=`(주소 프리필) + `?listingId=`**로 진입하면 감시 등록 모달(`AddPropertyModalRenewal`)이 자동 오픈되고 주소가 채워진다. 등록 시 `listingId`를 함께 전송해 매물-감시 연결.

Cron `/api/cron/registry-monitor` — 매일 09:00, 배치 50건, SHA-256 해시 비교(현재 실제 등기부 API 미연동 시뮬레이션 구조).

---

#### FR-010: 구독 및 결제

FREE(0원, 일 5회) / PRO(50,000원, 일 50회, 계약서 AI 검토·PDF·AI 무제한) / BUSINESS(100,000원, PRO+일 100회, 포트폴리오·우선지원)

**관련 API**: `GET/POST /api/subscription`, `POST /api/subscription/cancel`

---

#### 추가 구현 완료 기능

| 기능 | 경로/모듈 | 설명 |
|------|-----------|------|
| 전세사기 위험 진단 | `fraud-risk-model.ts` (488줄) | 15피처 SHAP 유사 GB, `/api/fraud-risk` |
| V-Score 통합 평가 | `v-score.ts` (427줄) | 5소스 + 6상호작용 |
| 이상 탐지 | `anomaly-detector.ts` | Holt/CUSUM/Bollinger Band |
| 가중치 튜닝 | `adaptive-weight-tuner.ts` | Thompson Sampling |
| 사기사례 DB | `/api/fraud-cases` | 지도 히트맵(Leaflet + leaflet.heat) |
| 동적 체크리스트 | `checklist-generator.ts` (467줄) | risk factors → 서류/행동, 13카테고리 |
| 분석보고서 | `/report` | 통합 리스크 PDF, 7섹션 |
| 시세지도 | `/price-map`, `/renewal/price-map` | MOLIT 실거래 + 카카오 지오코딩 |
| 신용 조회 | `credit-api.ts` | KCB/NICE Strategy, Mock 우선 |
| 보증보험 안내 | `guarantee-insurance.ts` | HUG/HF/SGI 규칙 엔진 + 보증료 + DB 규칙 + 딥링크 |
| 상호검증 | `/verification` | 임대인/임차인 교차 검증, 공유 리포트 |
| 알림 인프라 | `notification-sender.ts` (217줄) + Web Push | 카카오 알림톡(Bizm) + VAPID Web Push(`lib/push-subscriptions`) |
| 뉴스·정책 수집 | `news-collector.ts` + Cron 06:00 | RSS 5피드, 키워드 분류, 90일 보관 |
| 대시보드 | `/dashboard` | 보유 자산 포트폴리오 |
| 문서 생성 | `/api/generate-document` | 법원 공식 양식(임차권등기명령·전세권설정등기) |
| API 데이터 허브 | `/api-hub` | 공공 API 통합 대시보드 |
| 임대인 추적 | `landlord-profiler.ts` | 동일 임대인 물건 수집, 안전 등급(A~F) |

---

### 기업(BUSINESS) 회원 전용

#### 사업성 분석 보고서 (`/feasibility`) — SCR 업그레이드 (v4.2.0, ~77%)

> **접근 제한**: BUSINESS·ADMIN 역할만. 그 외 역할은 "기업 회원 전용 기능입니다" 안내 화면. 페이지 가드 + `lib/feasibility-guard.ts` 서버 가드로 이중 차단.

SCR 서울신용평가 사업성평가보고서 동일 구조(5장+부록, 표 64개, 그림 23개, 60~80p) 자동 생성.

| Phase | 내용 | 완성도 |
|-------|------|:------:|
| Phase 1 | 데이터 수집 인프라 (KOSIS/DART/REPS/MOIS + 정적DB) | 90% |
| Phase 2 | 파싱 엔진 (45개+ 항목, 정규식+NER) | 80% |
| Phase 3 | 계산 엔진 (사업수지/48개월 자금수지/시나리오/BEP/DSCR/민감도) | 85% |
| Phase 4 | 보고서 렌더링 이중화(React 미리보기 + 서버 HTML→PDF) | 70% |
| Phase 5 | UI/UX(3단계 위저드, SSE 스트리밍, PDF 다운로드) | 60% |

**핵심 API**: `POST /api/feasibility/scr-parse`, `scr-calculate`, `scr-report`(+`/stream`), `parse`, `merge`, `verify` — 모두 BUSINESS 가드 적용.

---

### 계획 중 (설계 완료, 구현 대기)

#### 경쟁우위 강화 5단계 (competitive-advantage, v4.8.0)

| Phase | 내용 | 주요 항목 |
|-------|------|----------|
| Phase 1 | PWA 전환 | serwist SW, manifest, Web Push(VAPID), 오프라인 최근 분석 3건 캐시 |
| Phase 2 | 보증보험 + 임대인 추적 | `/api/guarantee/check`, `/api/landlord/track` |
| Phase 3 | 대출 가심사 + 건당 과금 | `loan-simulator.ts`, 통합 리포트, 포트원 결제(4,900원/건) |
| Phase 4 | 임대인 프로파일 | `LandlordProfile`, `UserReport`, 안전 등급 6항목 100점 |
| Phase 5 | AI+전문가 하이브리드 | `ExpertRequest` 워크플로우, AI 정확도 배지 |

**신규 Prisma 모델(설계)**: `LandlordProfile`, `UserReport`, `LoanCondition`, `SinglePurchase`, `ExpertRequest`

#### dgon 등기연계 (기획 완료, 구현 대기)

VESTRA 분석 → dgon 등기 실행 PG사 패턴 통합. 위험도 기반 등기 유형 추천(≥85 셀프 / 60~84 전자 / <60 프리미엄). 필요 API: `POST /api/dgon/create-token`, `verify-token`.

---

## External Integrations [coverage: high — 4 sources]

- **OpenAI GPT-4.1-mini**: 계약서 분석·AI 채팅·문서 해석. 서버사이드 호출.
- **공공데이터 API**: MOLIT 실거래가, K-apt/건축물대장, VWorld 공시가격, 대법원 판례, 한국은행 ECOS, KOSIS/DART/REPS/MOIS(SCR).
- **Kakao Maps SDK**: 지도·지오코딩. Leaflet + leaflet.heat: 사기사례 히트맵.
- **Web Push (VAPID)**: 의향서 제출/수락/거절 실시간 알림(`lib/push-subscriptions`, `sendPushToUser`).
- **카카오 알림톡 (Bizm)**: `notification-sender.ts`, Mock 모드 폴백.
- **전자서명**: **외부 전자서명 API 미연동**. 가계약서는 앱 내 손글씨 canvas 서명으로 완결하며 법적 확정은 오프라인 본계약에 위임.
- **결제(포트원)**: 건당 과금(계획).

---

## Deployment [coverage: medium — 3 sources]

- **테스트**: `test` 브랜치 → `t-vestra.vercel.app` (`deploy vestra`)
- **운영**: `main` → `vestra-plum.vercel.app` (테스트 확인 후 `deploy vestra promote`, 재빌드 없이 alias 이동)
- **절대 규칙**: 모든 변경은 테스트 선배포 후 승격 지시가 있을 때만 운영 반영. smoke check(`/`, `/login`, `/api/health`) 필수.
- 상세는 `deployment` 토픽 참조.

---

## Key Decisions [coverage: high — 6 sources]

### 가계약서 아키텍처 전환 (v5.87~5.90.2)

이메일 서명 링크 기반 비동기 전자계약을 폐기하고, **양측 대면 손글씨 서명 → 즉시 COMPLETED → PDF 출력 → 오프라인 본계약 확정** 모델을 채택. 이유: 외부 전자서명 API 연동·비용·법적 효력 리스크를 회피하고, 가계약(예약) 단계의 신속성을 우선. `EContract.tenantEmail`은 빈 문자열로 두어 이메일 서명 경로를 사용하지 않음. 법적 확정은 명시적으로 오프라인 본계약에 위임(UI·특약·PDF에 고지).

### 거래 상태 동기화

의향서 수락 → 매물 `CONTRACTED`, 가계약서 생성 → 매물 `COMPLETED`. 상태 업데이트는 `.catch(() => {})`로 감싸 부수 효과 실패가 주 트랜잭션(의향서/계약 생성)을 막지 않도록 함(가용성 우선).

### 사업성분석 기업 전용화

SCR 사업성 보고서는 고비용·전문 기능이므로 BUSINESS·ADMIN으로 제한. 클라이언트 페이지 가드와 `lib/feasibility-guard.ts` 서버 가드를 이중으로 두어 우회 방지.

### renewal 통합

분석 기능(rights/jeonse/price-map 등)과 거래 기능(매물·의향서)을 `/renewal/*` UI로 통합하고, 매물 상세에서 권리분석·등기감시로 딥링크(주소·listingId 프리필)하여 "탐색 → 검증 → 계약"을 하나의 동선으로 연결.

### AI/ML 파라미터 검증 현황

자체 설계 파라미터(가중치·감점·증폭계수)는 도메인 휴리스틱 초기값이며 실증 캘리브레이션 미완료. 검증 완료: 세율/공제(한국 세법), ARIMA/ETS/Holt 통계 방법론. 미검증: 감점 수치, 증폭계수, V-Score·15피처 가중치.

### 보증보험 규칙 관리

코드 기본 상수(`DEFAULT_GUARANTEE_RULES`) fallback + 관리자 DB 동적 갱신 + 버전 이력/롤백.

---

## Gotchas [coverage: high — 5 sources]

- **가계약서 PDF는 당사자·로그인 필수** — ID를 알아도 비당사자·비로그인은 403/401. 열거 유출 차단.
- **가계약서는 법적 본계약이 아니다** — 앱 내 서명은 손글씨 canvas 이미지이며, 확정은 오프라인 본계약. UI/특약/PDF에 명시.
- **외부 전자서명 API 미연동** — 서명 진위·부인방지는 서명 이미지 + IP + 시각 기록 수준. 공인 전자서명 아님.
- **의향서 상태 가드** — PENDING 상태만 수락/거절 가능. 이미 처리된 의향서는 409.
- **매물 상태 동기화 실패는 조용히 무시** — `listing.update(...).catch(() => {})`. 계약은 생성되었으나 매물 상태가 어긋날 가능성 존재(정합성 주의).
- **가계약서 클라이언트/서버 POST 경로 주의** — `useContractForm.submit()`은 `/api/e-contracts`로 POST(가계약서 생성)하며, `/api/contract-applications`(의향서)와 별개 엔드포인트.
- **대법원 판례 API**(`LAW_API_KEY`) 미설정 시 빈 배열 반환 — 서비스 중단 없음.
- **전세가율**은 MOLIT 실거래가 기반 — 데이터 없는 지역은 `estimatedPriceSource: "none"`.
- **등기 모니터링 Cron**은 실제 등기부 API 미연동(시뮬레이션 구조).
- **카카오 로그인**은 개발자 콘솔 설정 미완료로 비활성화.
- **입주물량 데이터**(`supply-api.ts`)는 정적 하드코딩.
- **KCB/NICE 신용 Provider**는 스켈레톤(throw), 키 없으면 MockCreditProvider.
- **이메일 발송**은 Mock 모드만 구현.
- **Rate Limit DB 오류** 시 요청 허용(가용성 우선).
- **listing-db-detail 샘플 매물** — 사진 없는 매물/테스트 fixture는 임의 실내 예시 이미지 노출(안심인증 등록 시 실제 사진 대체).

---

## Sources

- [[../../app/(app)/e-contract/page.tsx]]
- [[../../app/(app)/e-contract/hooks/useContractForm.ts]]
- [[../../app/(app)/e-contract/components/SignaturePad.tsx]]
- [[../../app/api/e-contracts/route.ts]]
- [[../../app/api/e-contracts/[id]/pdf/route.ts]]
- [[../../lib/pdf/contract-template.tsx]]
- [[../../app/api/contract-applications/route.ts]]
- [[../../app/api/contract-applications/[id]/route.ts]]
- [[../../app/(personal-home)/profile/components/ProfileApplicationsPanel.tsx]]
- [[../../app/(personal-home)/renewal/listing-db-detail/ListingDbDetailContent.tsx]]
- [[../../app/(personal-home)/renewal/listing-new/ListingNewClient.tsx]]
- [[../../app/(personal-home)/renewal/monitoring/MonitoringRenewalClient.tsx]]
- [[../../app/(personal-home)/renewal/monitoring/components/AddPropertyModalRenewal.tsx]]
- [[../../app/(app)/feasibility/page.tsx]]
- [[../../lib/feasibility-guard.ts]]
- [[../../docs/VESTRA-플랫폼-완료보고서.md]]
- [[../../docs/01-SRS.md]]
- [[../../docs/02-design/features/feasibility-scr-upgrade.design.md]]
- [[../../docs/02-design/features/competitive-advantage.design.md]]
- [[../../docs/02-design/registry-monitoring-hybrid.md]]
</content>
</invoke>

---
topic: platform-overview
last_compiled: 2026-08-22
sources: 4
---

# 플랫폼 전체 개요 (Platform Overview)

---

## Purpose
[coverage: high -- 3 sources]

VESTRA는 LLM 기반 통합 AI 부동산 자산관리 플랫폼이다. 전세사기 예방, 등기부등본 권리분석, 계약서 AI 검토, 세금 시뮬레이션, 시세전망을 넘어, 이제 **매물 등록 → 계약의향서 → 채팅 → 전자계약(가계약서)** 으로 이어지는 부동산 직거래·중개 거래 흐름 전체를 아우른다.

**핵심 가치**:
- 비전문가도 부동산 권리관계를 이해할 수 있는 직관적 AI 리포트 생성
- 핵심 분석 엔진은 LLM에 의존하지 않는 순수 TypeScript 구현 (비용 예측 가능성 + 결과 일관성 확보)
- 전세사기 등 부동산 거래 피해를 사전에 예방하는 AI 위험 진단
- 매물부터 계약까지 거래 데이터를 하나의 무결성 체인으로 연결 (매물↔의향서↔계약↔등기감시)

**운영사**: BMI C&S (대표이사 김동의)
**배포 URL(운영)**: https://vestra-plum.vercel.app
**테스트 URL**: https://t-vestra.vercel.app
**GitHub**: bmicns/vestra (Private)
**현재 버전**: **v5.90.2** (package.json 기준)
**사업자**: (주)비엠아이씨엔에스, 초기창업패키지 신청 대상 아이템

> ⚠️ **[절대 규칙]** 모든 변경은 `t-vestra.vercel.app`에 먼저 배포·검증한 뒤, 대장 승격 지시가 있을 때만 운영에 반영한다. 운영은 재빌드 없이 동일 deployment를 alias 승격한다.

---

## Architecture
[coverage: high -- 3 sources]

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                     │
│  React 19 + Tailwind CSS v4 + Kakao Maps + Recharts     │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│              Vercel Edge Network (CDN)                    │
│  ┌─────────────────────────────────────────────────┐     │
│  │  middleware.ts — JWT 검증, 경로 보호, RBAC        │     │
│  └─────────────────────┬───────────────────────────┘     │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│               Next.js App Router (Serverless)            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  페이지        │  │  API Routes  │  │  서버 컴포넌트│  │
│  └──────────────┘  └──────┬───────┘  └──────────────┘  │
│                           │                              │
│  ┌────────────────────────▼─────────────────────────┐   │
│  │              lib/ (비즈니스 로직)                   │   │
│  │  핵심 엔진 (LLM 비의존, 순수 TypeScript):          │   │
│  │  registry-parser / validation-engine / risk-scoring│  │
│  │  v-score / fraud-risk-model / prediction-engine   │   │
│  │  integrity-chain / adaptive-weight-tuner 등        │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
    ┌──────────▼──┐  ┌───────▼────┐  ┌──────▼──────────┐
    │  Neon DB    │  │  OpenAI    │  │  외부 공공 API   │
    │  PostgreSQL │  │  gpt-4.1   │  │  (MOLIT, BOK,    │
    │  (41 모델)  │  │  -mini     │  │  REB, KOSIS,     │
    └─────────────┘  └────────────┘  │  VWorld, K-apt,  │
                                     │  건축물대장, 판례,│
                                     │  Tilko/CODEF 등) │
                                     └──────────────────┘
```

### 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| 언어 | TypeScript (strict) | 5.x |
| UI | React | 19.2.3 |
| 스타일링 | Tailwind CSS | v4 (PostCSS) |
| DB | PostgreSQL (Neon Serverless) | - |
| ORM | Prisma | 6.19.2 |
| 인증 | NextAuth v5 | beta.30 |
| AI | OpenAI API | gpt-4.1-mini |
| 지도 | Kakao Maps SDK, Leaflet | - |
| 차트 | Recharts | 3.7.0 |
| 결제 | Toss Payments SDK | 2.7.1 |
| 파일 저장 | Vercel Blob | 2.6.1 |
| 알림 | Resend(메일), Solapi(SMS/알림톡), web-push | - |
| 테스트 | Vitest | 4.0.18 |
| PWA | Serwist | 9.5.7 |
| 배포 | Vercel | Serverless |
| 암호화 | AES-256-GCM | Node.js crypto |

---

## Algorithm
[coverage: high -- 2 sources]

핵심 분석 엔진은 LLM에 의존하지 않는 순수 TypeScript 구현이다. 특허 출원 대상 독자 알고리즘:

| # | 알고리즘 | 파일 | 설명 |
|---|----------|------|------|
| 1 | **V-Score** | v-score.ts | 5개 소스 비선형 결합 통합 위험 지수 |
| 2 | **리스크 스코어링** | risk-scoring.ts | 12개 위험 요소 기반 100점 스케일 |
| 3 | **사기 위험 모델** | fraud-risk-model.ts | 15-피처 예측 + SHAP 유사 기여도 |
| 4 | **등기부 파서** | registry-parser.ts | 순수 TypeScript 등기부등본 파싱 |
| 5 | **검증 엔진** | validation-engine.ts | 4계층 23개 검증기 |
| 6 | **시세 예측** | prediction-engine.ts | 5-모델 앙상블 3시나리오 |
| 7 | **이상 탐지** | anomaly-detector.ts | Holt/CUSUM/Bollinger 기반 |
| 8 | **가중치 튜닝** | adaptive-weight-tuner.ts | Thompson Sampling 자동 캘리브레이션 |
| 9 | **SCR 오케스트레이터** | scr-orchestrator.ts | 사업성 분석 파이프라인 |

알고리즘 상세는 → [[algorithm]]

---

## API Surface
[coverage: medium -- 2 sources]

주요 API 그룹:

| 그룹 | 대표 엔드포인트 | 설명 |
|------|----------------|------|
| 통합 분석 | /api/analyze-unified | 권리분석·전세 안전 8대 진단 |
| 계약서 검토 | /api/analyze-contract | 조항별 위험도, 판례 인용 |
| 시세 예측 | /api/predict-value | 5모델 앙상블 3시나리오 |
| 사기 진단 | /api/fraud-risk | 15-피처 예측 모델 |
| 사업성 분석 | /api/feasibility/* | SCR 파이프라인 |
| 매물/거래 | /api/listings, /api/applications, /api/messages | 매물·계약의향서·채팅 |
| 전자계약 | /api/econtracts/* | 가계약서 생성·서명·PDF |
| 등기감시 | /api/monitoring/* | 등기 변동 감지, 무결성 증명 |

인증 정책: API는 기본 공개(진입 장벽 최소화)이며 Rate Limit + Cost Guard로 비용을 보호한다. 단, 매물·거래·전자계약 등 소유·당사자 데이터를 다루는 변이(mutation) 핸들러는 세션 인증 및 소유자/당사자 가드를 적용한다.

API 상세는 → [[api]]

---

## Data Models
[coverage: high -- 1 source]

Prisma 기반 **41개 모델** (PostgreSQL / Neon):

| 카테고리 | 모델 | 설명 |
|----------|------|------|
| 인증 | Account, Session, VerificationToken | NextAuth v5 표준 스키마 |
| 사용자 | User | 역할 계층 기반 사용자 (아래 참조) |
| 핵심 비즈니스 | Analysis, Asset | 분석 결과, 사용자 자산 포트폴리오 |
| 구독/결제 | Subscription, Payment, RegistryIssueOrder | 플랜, 결제(Toss), 등기 발급 주문 |
| 사용량 관리 | RateLimit, DailyUsage | 슬라이딩 윈도우, 역할별 일일 카운터 |
| 알림/모니터링 | NotificationSetting, MonitoredProperty, MonitoringAlert, RegistrySnapshot, Announcement, PushSubscription | 등기 변동 감시, Web Push |
| 검증/공유 | VerificationRequest, SharedReport | P2P 교차 검증 |
| ML/사기 데이터 | FraudCase, TrainingData, DomainVocabulary, SystemSetting | 사기 사례 DB, NLP 학습 데이터 |
| 감사 | AuditLog, WithdrawnEmail | 감사 추적, 탈퇴 이메일 |
| 사업성 | FeasibilityReport, FeasibilityFile, BenchmarkCache | SCR 보고서·벤치마크 |
| 적응형 | WeightConfig, WeightFeedback | 가중치 자동 튜닝 |
| 무결성 | IntegrityRecord | Merkle 트리 무결성 체인 |
| 뉴스/정책 | NewsArticle, NewsUsageLog | 뉴스 자동 수집, AI 컨텍스트 |
| 보증보험 | GuaranteeRule | HUG/HF/SGI 규칙 버전 관리 |
| 중개관리(CRM) | AgentClient, AgentClientProperty | 부동산 중개사 고객·물건 관리 |
| **거래 플로우** | **Listing, ContractApplication, Message, EContract, EContractSignature** | **매물 → 의향서 → 채팅 → 전자계약** |

### 회원 역할 계층 (User.role / userType)

| role | 대상 | userType | 기능 범위 |
|------|------|----------|-----------|
| GUEST | 미인증 (IP 기반) | - | 제한적 조회 (일일 2회) |
| **PERSONAL** | 개인 회원 | TENANT(임차/매수인) / LANDLORD(임대/매도인) | 개인용 분석·매물·계약 |
| **REALESTATE** | 부동산(공인중개사) | - | **사업자 기본 기능** (중개관리 CRM, 매물, 전자계약 중개서명) |
| **RENTAL_BIZ** | 임대사업자 | - | **사업자 기본 기능** (등록임대주택 관리, 매물, 계약) |
| **BUSINESS** | 기업 회원 | - | **사업자 기본 기능 + 사업성분석(SCR)** |
| ADMIN | 관리자 | - | 전체 관리 (일일 9,999회) |

- **부동산(REALESTATE)·임대사업자(RENTAL_BIZ)** = 사업자 기본 기능 세트
- **기업(BUSINESS)** = 사업자 기본 기능 + 사업성분석(Feasibility/SCR)
- `businessNumber`, `companyName`, `representName`, `verifyStatus`(none/pending/verified/rejected)로 사업자 인증 심사 관리
- 역할별 일일 분석 한도는 `dailyLimit`(User 컬럼)으로 관리

### 거래 플로우 데이터 모델 & FK 무결성

이번 세션에서 거래 데이터의 참조 무결성을 확보하기 위해 nullable FK(onDelete: SetNull)를 추가했다. 전체 흐름:

```
Listing (매물)
   │  1:N
   ▼
ContractApplication (계약의향서)  ──1:N──►  Message (채팅)
   │  1:N
   ▼
EContract (전자계약/가계약서)  ──1:N──►  EContractSignature (서명)

Listing ──1:N(SetNull)──► MonitoredProperty (등기감시)
```

- **EContract**에 신규 FK 3종 추가 (모두 nullable, onDelete: SetNull):
  - `listingId` → Listing (계약 대상 매물)
  - `applicationId` → ContractApplication (근거 계약의향서)
  - `tenantId` → User (임차인이 가입회원인 경우)
  - 의향서 기반 생성 시 채워지고, 직접 작성 계약이면 비어 있음. 매물/의향서/임차인이 삭제돼도 계약 기록은 보존됨.
- **MonitoredProperty**에 `listingId` 추가 (nullable FK, onDelete: SetNull, `@@index([listingId])`):
  - 매물과 연결된 감시면 Listing과 연동, 없으면 주소 직접 등록. 매물 삭제 시 감시 기록은 SetNull로 보존.
- **Listing**은 `applications`(ContractApplication), `monitors`(MonitoredProperty, "ListingMonitors"), `econtracts`(EContract, "ListingEContracts") 역방향 관계를 보유.

**인증 방식**: NextAuth v5, JWT(JWE 암호화) + httpOnly 쿠키
**소셜 로그인**: Google, Naver OAuth (카카오는 콘솔 설정 대기)
**비밀번호**: bcryptjs 해싱

데이터 모델 상세는 → [[api]] / [[security]]

---

## Security
[coverage: medium -- 2 sources]

| 항목 | 방식 |
|------|------|
| 인증 | NextAuth v5, JWE 암호화 JWT + httpOnly 쿠키, Edge middleware RBAC |
| 비밀번호 | bcryptjs 해싱 |
| 민감데이터 암호화 | AES-256-GCM (학습 원문, SystemSetting API 키, CRM 전화번호) |
| Rate Limit / Cost Guard | DB 기반 슬라이딩 윈도우 + 역할별 일일 한도 |
| 감사 추적 | AuditLog (LOGIN/ROLE_CHANGE/ADMIN_* 등) |
| 무결성 | IntegrityRecord(Merkle), RegistrySnapshot(Ed25519 서명 체인) |
| 개인정보 최소수집 | 가계약서 서명 시 주민 뒷6자리 미저장, `signerRrnPrefix`(생년월일+성별 1자리)만 보관 |
| 거래 데이터 접근제어 | 매물/의향서/전자계약 변이는 세션 인증 + 소유자·당사자 가드 |

보안 상세는 → [[security]]

---

## Features
[coverage: high -- 2 sources]

### 핵심 분석 기능 (AI 기반)

| 기능 | 경로 | 주요 API | 설명 |
|------|------|----------|------|
| 권리분석 | /rights | /api/analyze-unified | 등기부등본 업로드 → 8대 안전진단, 권원보험 평가, 특약 자동 생성 |
| 계약서 AI 검토 | /contract | /api/analyze-contract | 조항별 위험도, 누락 조항 감지, 판례 인용 |
| 세무 시뮬레이션 | /tax | 내부 계산 | 취득세/양도세/종부세 시나리오 비교 |
| 시세전망 | /prediction | /api/predict-value | 5모델 앙상블, 1년/5년/10년 3시나리오, 이상탐지, 백테스팅 |
| 전세 안전 분석 | /jeonse | /api/analyze-unified | V-Score 기반 전세사기 위험도 |
| 사업성분석 (SCR) | /feasibility | /api/feasibility/* | V-Score 기반 사업성 종합 평가 (기업 회원 전용) |
| 전세사기 위험 진단 | - | /api/fraud-risk | 15-피처 예측 모델 |

### 거래 플로우 (매물 → 계약)

| 기능 | 설명 |
|------|------|
| 매물 등록/조회 (Listing) | 전세/매매 매물, 안전인증(등기·건축물대장·재산세납부확인서), 전세가율·선순위채권 자동 계산, 카카오 geocoding |
| 계약의향서 (ContractApplication) | 입주일·기간·제안 보증금(네고)·임장 방문 희망일 → 임대인 수락/거절 |
| 채팅 (Message) | 의향서 단위 임대인↔지원자 실시간 메시지 |
| 전자계약 = 가계약서 (EContract) | **외부 전자서명 기관 없이** 양측(+선택적 중개사) 손글씨 서명 → PDF 생성 → 오프라인 본계약 확정. 서명 전 PDF 해시로 무결성 검증 |
| 등기감시 연동 (MonitoredProperty) | 매물↔감시 연결. 계약~전입 강화 감시(contract_gap 모드), 등기 변동 시 알림 |

**가계약서 방식**: 공인 전자서명(KCP 등)은 추후 과제. 현재는 당사자 손글씨 서명 이미지(Vercel Blob) + 서명 링크 토큰으로 양측 서명 → 최종 PDF 확정 → 오프라인 본계약으로 이어지는 "가계약서" 모델이다.

### 도구 기능

| 기능 | 경로 | 설명 |
|------|------|------|
| 시세지도 | /price-map | 카카오 지도 위 아파트별 시세 색상 마커, 가격변화 Top 10 |
| 공시가격 조회 | /official-price | 개별공시지가/공동주택/개별주택 3종 통합 (VWorld API) |
| 등기감시 | /monitoring | 등기부 변동 실시간 감시, Ed25519 서명 무결성 증명서 |
| API 데이터 허브 | /api-hub | 공공 API 연동 현황 대시보드 |
| 대출 가심사 | /loan-check | 7대 은행 전세대출 조건 비교 시뮬레이션 |
| 의사결정 리포트 | /decision-report | 대출+시세+세금+보증보험+임대인 프로파일 통합 Go/NoGo 판정 |
| 임대인 프로파일 | /landlord-profile | 소유부동산, 근저당 비율, 소송 이력 → 안전등급(A~F) |
| 상호검증 | /verification | 임대인/임차인 분석 결과 교차 검증 |
| AI 신뢰도 | /ai-trust | 모델 정확도/전문가 검증 결과 투명 공개 |

### 전세 보호 허브 (/jeonse, 하위 메뉴)

전세 안전 분석 / 전입신고 가이드 / 확정일자 가이드 / 전세권설정등기 / 임차권등기명령 / 주택임대차 신고 / 계약 체크리스트 / 전세 vs 월세 비교 / 이사비용 계산기

### AI 어시스턴트 / 전문가 연결

| 기능 | 경로 | 설명 |
|------|------|------|
| AI 어시스턴트 | /assistant | 최근 분석 이력을 컨텍스트로 활용한 부동산 AI Q&A |
| 전문가 연결 | /expert-connect | 공인중개사/법무사 상담 예약, AI 분석 전문가 검증 |
| 중개관리 CRM | - | 부동산(REALESTATE) 회원용 고객·물건 관리, 초대 링크, 감시 연동 |

### 관리자 기능 (ADMIN 전용)

현황(개요 KPI) / 회원 관리(역할 변경·한도) / 인증 관리(사업자 심사 → 역할 업그레이드) / 분석 이력 / 공지사항 / 뉴스·정책 / ML 학습관리(PII AES-256, JSONL) / 가중치 튜닝(베이지안) / 무결성 감사(SHA-256 체인) / API KEY(AES-256-GCM) / 보증보험 규칙 / 대출 금리 / 계정 설정

기능 상세는 → [[features]]

---

## External Integrations
[coverage: high -- 2 sources]

| API | 제공기관 | 용도 |
|-----|---------|------|
| OpenAI (gpt-4.1-mini) | OpenAI | 자연어 분석, 계약서 해석, AI 채팅 |
| MOLIT 실거래가 | 국토교통부 | 아파트/전세 실거래 데이터 |
| BOK 기준금리 | 한국은행 | 거시경제 지표 |
| REB 가격지수 | 한국부동산원 | 매매/전세 가격지수 |
| 건축물대장 | 건축물대장 API (KAPT 키) | 건물 상세 정보 |
| 대법원 판례 | 법제처 | 부동산 관련 판례 검색 |
| VWorld NED | 공간정보 오픈플랫폼 | 공시가격 (개별공시지가/공동주택/개별주택) |
| K-apt | 국토교통부 | 공동주택 단지목록/기본정보/상세정보 |
| KOSIS 통계 | 통계청 | 인구 동향, 주택 공급 |
| Tilko / CODEF | 등기 스크래핑 | 등기부 원문 조회, 등기신청사건 감지 |
| Kakao Maps SDK | 카카오 | 지도 시각화, 지오코딩 |
| Toss Payments | 토스페이먼츠 | 구독/결제 |
| Resend / Solapi / web-push | - | 메일 / SMS·알림톡 / 브라우저 푸시 |

---

## Deployment
[coverage: high -- 2 sources]

| 항목 | 설정 |
|------|------|
| 호스팅 플랫폼 | Vercel (Serverless Functions + Edge Network CDN) |
| 런타임 | Node.js Serverless + Edge (middleware) |
| DB 호스팅 | Neon Serverless PostgreSQL (Connection Pooling 자동 관리) |
| 프로덕션 도메인 | vestra-plum.vercel.app |
| 테스트 도메인 | t-vestra.vercel.app |
| CI/CD | `deploy vestra`(preview→t-vestra alias) → 대장 확인 → `deploy vestra promote`(동일 deployment 승격, 재빌드 없음) |

> ⚠️ **절대 규칙**: `vestra`는 절대 바로 운영 배포하지 않는다. 항상 t-vestra 검증 후 승격 지시가 있을 때만 운영 반영.

자세한 배포 절차는 → [[deployment]]

---

## Key Decisions
[coverage: high -- 2 sources]

| 결정 | 근거 |
|------|------|
| 핵심 분석에 LLM 미사용 | 비용 예측 가능성, 응답 일관성, 오프라인 가용성 확보 |
| App Router Only | pages/ 미사용, 서버 컴포넌트 초기 로딩 최적화 |
| DB 기반 Rate Limit | 서버리스 인스턴스 간 정확한 카운트 보장 |
| JWT 암호화 (JWE) | Edge 미들웨어에서 Prisma 없이 인증 처리 |
| AES-256-GCM | 민감 학습 데이터·시스템 설정·CRM 개인정보 보호 |
| 규칙 기반 Gradient Boosting | ML 라이브러리 의존성 없이 설명 가능한 사기 탐지 |
| 2단계 배포 모델 | t-vestra에서 검증 후 동일 deployment를 운영 승격 |
| **역할 계층 세분화** | 개인/부동산/임대사업자/기업/관리자로 분리 — 사업성분석은 기업 전용, 사업자 기본 기능은 부동산·임대사업자 공통 |
| **거래 FK 무결성(SetNull)** | 매물↔의향서↔계약↔감시를 연결하되, 상위 삭제 시에도 계약·감시 기록은 보존(법적 증빙) |
| **가계약서 방식 채택** | 외부 공인 전자서명 미연동 상태에서, 양측 손글씨 서명→PDF→오프라인 본계약으로 실사용 가능한 거래 완결 |

---

## Gotchas
[coverage: medium -- 2 sources]

**운영 환경**:
- Vercel 함수 타임아웃: 60초. AI 분석 API는 타임아웃 발생 가능성 있음
- Neon Serverless 연결 제한: 동시 연결 수 초과 시 에러 가능. `DIRECT_URL`은 마이그레이션 전용
- Rate Limit DB 오류 시 요청 허용 (가용성 우선 정책)
- `AUTH_SECRET` 미설정 시 서버 시작 차단

**DB 마이그레이션 주의**:
- 운영 DB는 현재 Prisma Migrate로 관리되지 않음 (`prisma/migrations` 없음, baseline 미설정)
- 이번 세션의 FK 추가(EContract.listingId/applicationId/tenantId, MonitoredProperty.listingId)는 스키마 반영이며, 운영 적용은 baseline/preview 검증/백업/승격 절차를 거쳐 별도 DB 변경 작업으로 진행해야 함
- 운영 DB에 `prisma migrate dev/deploy`, `db push` 임의 실행 금지

**알고리즘 파라미터 미검증 경고**:
- V-Score 가중치, 15-피처 가중치, 증폭계수(1.3~1.7)는 도메인 전문가 휴리스틱 기반 초기값
- 실증 데이터(HUG 보증사고, 법원 경매 등)를 통한 캘리브레이션 미완료

**알려진 미완성 항목**:
- 카카오 로그인: 개발자 콘솔 설정 미완료로 비활성화 상태
- 전자계약 공인 전자서명(KCP 등): 미연동. 현재는 손글씨 가계약서 방식
- 파일 리팩터링: 500줄 초과 페이지 파일 전체 분리 완료(2026-06)

---

## Sources

- `/Users/watchers/Desktop/vestra/CLAUDE.md`
- `/Users/watchers/Desktop/vestra/prisma/schema.prisma`
- `/Users/watchers/Desktop/vestra/package.json`
- `/Users/watchers/Desktop/vestra/README.md`

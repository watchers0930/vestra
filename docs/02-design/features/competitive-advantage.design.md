# 내집스캔 대비 경쟁우위 확보 설계서

> **Summary**: 5개 열세 영역(모바일, 보험, 대출, 임대인DB, 전문가) 역전을 위한 기술 설계
>
> **Project**: VESTRA
> **Version**: 4.8.0
> **Author**: AI
> **Date**: 2026-03-24
> **Status**: Draft
> **Planning Doc**: [competitive-advantage.plan.md](../../01-plan/features/competitive-advantage.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. PWA 전환으로 모바일 접근성 확보 (Lighthouse 90+)
2. 기존 `guarantee-insurance.ts` 확장하여 보증보험 가입 판단 완성
3. 전세대출 가심사 시뮬레이션 신규 구현
4. 임대인 종합 프로파일 시스템 구축
5. FREE 티어 강화 + 건당 과금으로 가격 역전
6. AI+전문가 하이브리드 분석 플로우 설계

### 1.2 Design Principles

- **기존 코드 최대 활용**: guarantee-insurance.ts, fraud-risk-model.ts, Subscription/Payment 모델 확장
- **점진적 구현**: Phase별 독립 배포 가능하게 설계
- **규칙 엔진 패턴**: 보증보험/대출 조건은 JSON 설정으로 분리 (코드 수정 없이 업데이트)

---

## 2. Architecture

### 2.1 전체 컴포넌트 구조

```
┌──────────────────────────────────────────────────────┐
│                    PWA Shell (serwist)                │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Service  │  │ manifest │  │ Web Push (VAPID)  │   │
│  │ Worker   │  │ .json    │  │                   │   │
│  └─────────┘  └──────────┘  └───────────────────┘   │
├──────────────────────────────────────────────────────┤
│                   Next.js App Router                  │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  신규 페이지       │  │  신규 API Routes         │  │
│  │  /landlord/[id]   │  │  /api/landlord/profile   │  │
│  │  /loan-check      │  │  /api/loan/simulate      │  │
│  │  /decision-report │  │  /api/decision-report    │  │
│  │  /expert-request  │  │  /api/expert/request     │  │
│  └──────────────────┘  │  /api/report/purchase     │  │
│                        │  /api/user/report          │  │
│                        └──────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│                    비즈니스 로직 (lib/)                │
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │ guarantee-       │  │ loan-simulator.ts (신규) │   │
│  │ insurance.ts     │  │                          │   │
│  │ (기존 확장)       │  │ 5대 은행 조건 DB          │   │
│  └─────────────────┘  │ 소득/신용 기반 시뮬레이션  │   │
│  ┌─────────────────┐  └──────────────────────────┘   │
│  │ landlord-        │  ┌──────────────────────────┐   │
│  │ profiler.ts      │  │ decision-report.ts (신규) │  │
│  │ (신규)           │  │ 대출+시세+세금 통합 리포트 │  │
│  └─────────────────┘  └──────────────────────────┘   │
├──────────────────────────────────────────────────────┤
│              Prisma (PostgreSQL - Neon)               │
│  기존: User, Subscription, Payment, FraudCase,       │
│        Analysis, MonitoredProperty                   │
│  신규: LandlordProfile, UserReport,                  │
│        LoanCondition, SinglePurchase, ExpertRequest   │
└──────────────────────────────────────────────────────┘
```

### 2.2 Phase별 Data Flow

**Phase 1 — PWA**
```
사용자 모바일 접속 → PWA 설치 프롬프트 → 홈화면 추가
                  → Service Worker 캐시 → 오프라인 최근 분석 열람
                  → Web Push 구독 → 등기변동 알림 수신
```

**Phase 2 — 보증보험 + 임대인 추적**
```
등기부 분석 완료 → 소유자명 추출 → MOLIT API로 동일 소유자 물건 검색
                                 → 각 물건 등기부 자동 조회
                                 → 근저당/압류 합산 → 임대인 위험도 산정

물건 정보 입력 → guarantee-insurance.ts → HUG/HF/SGI 규칙 매칭
             → 가입 가능 여부 + 예상 보험료 + 추천 기관
```

**Phase 3 — 대출 가심사 + 건당 과금**
```
물건+소득+신용 입력 → loan-simulator.ts → 5대 은행 조건 매칭
                   → 대출 가능 금액/금리 시뮬레이션
                   → decision-report.ts로 통합
                     ├── 대출 가심사 결과
                     ├── 시세 예측 (prediction-engine.ts)
                     └── 세금 계산 (tax-calculator.ts)
                   → 무료 요약 or 건당 4,900원 상세 리포트

결제 플로우: 리포트 구매 → 포트원 결제 → SinglePurchase 기록 → 리포트 열람
```

**Phase 4 — 임대인 프로파일**
```
임대인명/물건 → landlord-profiler.ts
             ├── 등기부 기반 소유물건 수집
             ├── court-api.ts → 관련 판례 검색
             ├── news-collector.ts → 관련 뉴스 검색
             ├── FraudCase 테이블 → 기존 사기 사례 매칭
             └── UserReport 테이블 → 사용자 제보 조회
             → 종합 안전 등급 (A~F) 산정
             → LandlordProfile 캐시 저장

사용자 제보: 신고 → UserReport (PENDING) → 관리자 검증 → VERIFIED → 등급 반영
```

**Phase 5 — AI + 전문가 하이브리드**
```
AI 분석 완료 → "전문가 검토 요청" 버튼
           → ExpertRequest 생성 (건당 과금)
           → 제휴 권리분석사에게 알림
           → 전문가 검토 완료 → 최종 리포트 발행
           → 전문가 피드백 → adaptive-weight-tuner.ts 연동
```

---

## 3. Data Model

### 3.1 신규 Prisma 모델

```prisma
// ---------------------------------------------------------------------------
// 임대인 종합 프로파일
// ---------------------------------------------------------------------------

model LandlordProfile {
  id              String   @id @default(cuid())
  nameHash        String   // 이름 SHA-256 해시 (개인정보 보호)
  nameDisplay     String   // 마스킹된 표시명 (예: "김O수")
  propertyCount   Int      @default(0)
  totalMortgage   Float    @default(0)    // 근저당 총액
  totalLiens      Float    @default(0)    // 압류/가압류 총액
  safetyGrade     String   @default("C")  // A/B/C/D/F
  gradeScore      Float    @default(50)   // 0-100 정량 점수
  courtCaseCount  Int      @default(0)
  newsCount       Int      @default(0)
  reportCount     Int      @default(0)    // 사용자 제보 수
  properties      Json?                   // 소유 물건 목록 (주소, 근저당, 시세)
  courtCases      Json?                   // 관련 판례 요약
  newsArticles    Json?                   // 관련 뉴스 요약

  userReports     UserReport[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([nameHash])
  @@index([safetyGrade])
}

// ---------------------------------------------------------------------------
// 사용자 제보
// ---------------------------------------------------------------------------

model UserReport {
  id                String   @id @default(cuid())
  reporterId        String
  landlordProfileId String
  type              String   // DEPOSIT_UNPAID | FRAUD_SUSPECT | CONTRACT_BREACH | OTHER
  description       String   @db.Text
  evidence          String?  @db.Text  // 증거 자료 (URL 등)
  status            String   @default("PENDING") // PENDING | VERIFIED | REJECTED
  verifiedBy        String?  // 관리자 userId
  rejectReason      String?
  reporter          User     @relation(fields: [reporterId], references: [id])
  landlordProfile   LandlordProfile @relation(fields: [landlordProfileId], references: [id])

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([landlordProfileId])
  @@index([status])
}

// ---------------------------------------------------------------------------
// 전세대출 조건 DB
// ---------------------------------------------------------------------------

model LoanCondition {
  id           String   @id @default(cuid())
  bankName     String   // KB국민, 신한, 하나, 우리, NH농협
  productName  String
  loanType     String   // JEONSE_GENERAL | JEONSE_GUARANTEE | JEONSE_BOJEUNG
  conditions   Json     // { minIncome, maxLTV, maxAmount, propertyTypes, regions, ... }
  interestMin  Float    // 최저 금리
  interestMax  Float    // 최고 금리
  maxAmount    Float    // 최대 한도
  isActive     Boolean  @default(true)
  version      Int      @default(1)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([bankName])
  @@index([isActive])
}

// ---------------------------------------------------------------------------
// 건당 구매
// ---------------------------------------------------------------------------

model SinglePurchase {
  id          String   @id @default(cuid())
  userId      String
  productType String   // DECISION_REPORT | EXPERT_REVIEW | FULL_REPORT
  amount      Int      // 결제 금액 (원)
  orderId     String   @unique
  status      String   @default("pending") // pending | completed | failed | refunded
  reportData  String?  @db.Text  // 생성된 리포트 JSON
  user        User     @relation(fields: [userId], references: [id])

  createdAt   DateTime @default(now())
}

// ---------------------------------------------------------------------------
// 전문가 검토 요청
// ---------------------------------------------------------------------------

model ExpertRequest {
  id           String   @id @default(cuid())
  userId       String
  analysisId   String   // 원본 Analysis ID
  expertType   String   // RIGHTS_ANALYST | TAX_ADVISOR | LAWYER
  status       String   @default("PENDING") // PENDING | ASSIGNED | IN_REVIEW | COMPLETED
  assignedTo   String?  // 전문가 이름/ID
  reviewResult String?  @db.Text  // 전문가 검토 결과
  aiMatchRate  Float?   // AI 분석과 전문가 결과 일치율
  purchaseId   String?  // SinglePurchase 연결
  user         User     @relation(fields: [userId], references: [id])

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([status])
  @@index([userId])
}
```

### 3.2 기존 모델 수정

```prisma
// User 모델에 추가
model User {
  // ... 기존 필드 유지 ...
  userReports      UserReport[]
  singlePurchases  SinglePurchase[]
  expertRequests   ExpertRequest[]
}

// Subscription 모델 — dailyLimit 변경
// FREE 티어: 전세안전도 + 등기부 기본분석 = 무제한
// 고급 분석(계약서, 사업성 등)만 일일 제한 유지
```

### 3.3 Entity Relationships

```
[User] 1 ──── N [UserReport]
  │         N [SinglePurchase]
  │         N [ExpertRequest]
  │
[LandlordProfile] 1 ──── N [UserReport]
[LoanCondition] (독립 — 관리자 관리)
[SinglePurchase] 1 ──── 1 [ExpertRequest] (선택적)
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth | Phase |
|--------|------|-------------|------|-------|
| GET | `/api/guarantee-rules` | 보증보험 규칙 조회 | - | 2 (기존 확장) |
| POST | `/api/guarantee/check` | 보증보험 가입 가능 여부 판단 | Optional | 2 |
| GET | `/api/landlord/profile/[nameHash]` | 임대인 프로파일 조회 | Required | 4 |
| POST | `/api/landlord/profile` | 임대인 프로파일 생성/갱신 | Required | 4 |
| POST | `/api/landlord/track` | 등기부에서 임대인 물건 자동 추적 | Required | 2 |
| POST | `/api/loan/simulate` | 전세대출 가심사 시뮬레이션 | Required | 3 |
| GET | `/api/loan/conditions` | 은행별 대출 조건 목록 | - | 3 |
| POST | `/api/decision-report` | 의사결정 통합 리포트 생성 | Required | 3 |
| POST | `/api/report/purchase` | 건당 리포트 구매 | Required | 3 |
| GET | `/api/report/purchased/[id]` | 구매한 리포트 열람 | Required | 3 |
| POST | `/api/user/report` | 임대인 제보 신고 | Required | 4 |
| GET | `/api/user/reports` | 내 제보 목록 | Required | 4 |
| POST | `/api/expert/request` | 전문가 검토 요청 | Required | 5 |
| GET | `/api/expert/request/[id]` | 전문가 검토 상태 조회 | Required | 5 |
| GET | `/api/ai/accuracy` | AI 분석 정확도 통계 | - | 5 |
| POST | `/api/push/subscribe` | Web Push 구독 등록 | Required | 1 |
| DELETE | `/api/push/subscribe` | Web Push 구독 해제 | Required | 1 |

### 4.2 주요 API 상세

#### `POST /api/loan/simulate`

```typescript
// Request
interface LoanSimulateRequest {
  deposit: number;           // 전세 보증금
  propertyPrice: number;     // 매매 시세
  propertyType: string;      // APT | VILLA | OFFICETEL
  propertyAddress: string;   // 물건 주소
  annualIncome: number;      // 연소득
  creditScore?: number;      // 신용점수 (없으면 중간값 적용)
  existingLoans?: number;    // 기존 대출 잔액
  isFirstHome: boolean;      // 생애최초 여부
}

// Response (200)
interface LoanSimulateResponse {
  results: {
    bankName: string;
    productName: string;
    isEligible: boolean;
    maxLoanAmount: number;    // 최대 대출 가능액
    estimatedRate: { min: number; max: number };
    ltv: number;              // LTV 비율
    dti: number;              // DTI 비율
    reasons: string[];        // 가능/불가 사유
    requirements: string[];   // 필요 서류
  }[];
  bestOption: {               // 최적 상품 추천
    bankName: string;
    reason: string;
  } | null;
  disclaimer: string;
}
```

#### `POST /api/decision-report`

```typescript
// Request
interface DecisionReportRequest {
  address: string;
  deposit: number;
  propertyPrice: number;
  propertyType: string;
  annualIncome: number;
  transactionType: "JEONSE" | "PURCHASE";
}

// Response (200)
interface DecisionReportResponse {
  summary: {                  // 무료 요약 (항상 제공)
    overallGrade: string;     // A~F
    recommendation: string;   // "추천" | "조건부" | "비추천"
    keyPoints: string[];      // 핵심 포인트 3개
  };
  isPurchased: boolean;       // 상세 리포트 구매 여부
  detail?: {                  // 유료 상세 (구매 시)
    loanSimulation: LoanSimulateResponse;
    pricePredict: PredictionResult;
    taxCalculation: TaxResult;
    guaranteeInsurance: GuaranteeInsuranceResult;
    landlordProfile: LandlordProfileResult;
    integratedScore: number;  // 0-100
    aiOpinion: string;        // GPT 종합 의견
  };
  purchaseInfo?: {            // 미구매 시
    price: number;            // 4,900원
    purchaseUrl: string;
  };
}
```

#### `POST /api/landlord/track`

```typescript
// Request
interface LandlordTrackRequest {
  ownerName: string;      // 등기부에서 추출한 소유자명
  baseAddress: string;    // 기준 물건 주소
  region?: string;        // 검색 범위 제한 (시/구)
}

// Response (200)
interface LandlordTrackResponse {
  nameDisplay: string;          // "김O수"
  properties: {
    address: string;
    mortgageTotal: number;      // 근저당 합계
    liensTotal: number;         // 압류 합계
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  }[];
  totalMortgage: number;
  totalLiens: number;
  safetyGrade: string;          // A~F
  gradeScore: number;           // 0-100
}
```

---

## 5. UI/UX Design

### 5.1 신규 페이지 구조

```
app/(app)/
├── loan-check/              # 전세대출 가심사 (Phase 3)
│   └── page.tsx
├── decision-report/         # 의사결정 통합 리포트 (Phase 3)
│   └── page.tsx
├── landlord/                # 임대인 프로파일 (Phase 4)
│   ├── [id]/page.tsx        # 프로파일 상세
│   └── report/page.tsx      # 제보하기
└── expert/                  # 전문가 검토 (Phase 5)
    ├── request/page.tsx     # 검토 요청
    └── status/page.tsx      # 검토 현황
```

### 5.2 주요 화면 레이아웃

#### 전세대출 가심사 페이지 (`/loan-check`)

```
┌─────────────────────────────────────────┐
│  PageHeader: 전세대출 가심사 시뮬레이션   │
├─────────────────────────────────────────┤
│  [입력 폼]                               │
│  물건 주소    [AddressInput]             │
│  전세 보증금  [FormInput] 원              │
│  매매 시세    [FormInput] 원              │
│  연소득       [FormInput] 원              │
│  생애최초     [Toggle]                    │
│  기존대출잔액  [FormInput] 원              │
│                                          │
│  [시뮬레이션 시작] 버튼                    │
├─────────────────────────────────────────┤
│  [결과 카드 × 5대 은행]                   │
│  ┌──────────┐ ┌──────────┐             │
│  │ KB국민    │ │ 신한      │             │
│  │ ✅ 가능   │ │ ❌ 불가   │             │
│  │ 최대 2.3억│ │ DTI 초과  │             │
│  │ 3.2~3.8% │ │          │             │
│  └──────────┘ └──────────┘             │
│  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ 하나      │ │ 우리      │ │ NH농협 │  │
│  │ ✅ 가능   │ │ ⚠️ 조건부 │ │ ✅ 가능│  │
│  └──────────┘ └──────────┘ └────────┘  │
├─────────────────────────────────────────┤
│  [최적 상품 추천 배너]                    │
│  "KB국민 > 디딤돌 전세대출이 가장 유리"    │
│                                          │
│  [의사결정 리포트 보기] → /decision-report │
└─────────────────────────────────────────┘
```

#### 임대인 프로파일 페이지 (`/landlord/[id]`)

```
┌─────────────────────────────────────────┐
│  임대인 프로파일: 김O수                   │
│  안전등급 [ScoreGauge: B / 72점]          │
├─────────────────────────────────────────┤
│  📊 종합 요약                             │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │소유물건 │ │근저당   │ │판례이력│       │
│  │  3건    │ │ 4.2억  │ │  0건  │       │
│  └────────┘ └────────┘ └────────┘      │
├─────────────────────────────────────────┤
│  🏠 소유 물건 목록                        │
│  1. 강남구 OO아파트 - 근저당 2.1억 ⚠️     │
│  2. 서초구 OO빌라 - 근저당 1.5억          │
│  3. 마포구 OO오피스텔 - 근저당 0.6억       │
├─────────────────────────────────────────┤
│  ⚖️ 관련 판례 (0건)                      │
│  📰 관련 뉴스 (0건)                      │
│  🚨 사용자 제보 (0건)                     │
├─────────────────────────────────────────┤
│  [제보하기] [전체 분석 리포트 요청]         │
└─────────────────────────────────────────┘
```

### 5.3 신규 Component List

| Component | Location | Phase | Responsibility |
|-----------|----------|-------|----------------|
| `PwaInstallPrompt` | `components/pwa/` | 1 | A2HS 설치 프롬프트 |
| `PushSubscriber` | `components/pwa/` | 1 | Web Push 구독 관리 |
| `GuaranteeCheckCard` | `components/jeonse/` | 2 | 보증보험 가입 판단 결과 |
| `LandlordTracker` | `components/landlord/` | 2 | 임대인 물건 추적 결과 |
| `LoanSimulator` | `components/loan/` | 3 | 대출 가심사 폼 + 결과 |
| `LoanResultCard` | `components/loan/` | 3 | 은행별 대출 결과 카드 |
| `DecisionReport` | `components/report/` | 3 | 의사결정 통합 리포트 |
| `PaymentButton` | `components/payment/` | 3 | 건당 결제 버튼 (포트원) |
| `LandlordProfile` | `components/landlord/` | 4 | 임대인 종합 프로파일 |
| `LandlordGrade` | `components/landlord/` | 4 | 안전 등급 게이지 |
| `UserReportForm` | `components/landlord/` | 4 | 제보 신고 폼 |
| `ExpertRequestButton` | `components/expert/` | 5 | 전문가 검토 요청 |
| `ExpertStatusTracker` | `components/expert/` | 5 | 검토 진행 상황 |
| `AiAccuracyBadge` | `components/common/` | 5 | AI 정확도 표시 |

---

## 6. 비즈니스 로직 상세

### 6.1 보증보험 판단 (기존 확장)

`lib/guarantee-insurance.ts`는 이미 HUG/HF/SGI 규칙 엔진 구현 완료. 확장 사항:

```typescript
// 추가할 내용
// 1. 관리자 DB(GuaranteeRule)에서 규칙 로드 → 없으면 기존 상수 fallback
// 2. 전세 안전도 분석 결과 페이지에 보증보험 결과 자동 포함
// 3. /api/guarantee/check 엔드포인트 신규 (독립 호출용)
```

### 6.2 전세대출 가심사 엔진 (신규)

```typescript
// lib/loan-simulator.ts

interface LoanRule {
  bankName: string;
  productName: string;
  maxLTV: number;           // 예: 0.8 (80%)
  maxDTI: number;           // 예: 0.6 (60%)
  maxAmount: number;        // 최대 한도
  minIncome?: number;       // 최소 소득
  propertyTypes: string[];  // 대상 물건 유형
  regions?: string[];       // 대상 지역 (null = 전국)
  isFirstHomeOnly: boolean;
  rateRange: { min: number; max: number };
}

// 판단 로직
// 1. LTV 산정: deposit / propertyPrice
// 2. DTI 산정: (연간 대출 상환액 + 기존 대출 상환) / 연소득
// 3. 은행별 조건 매칭 → eligible/conditional/ineligible
// 4. 최적 상품 추천 (금리 최저 + 한도 최대)
```

### 6.3 임대인 안전 등급 산정

```typescript
// lib/landlord-profiler.ts

// 등급 산정 기준 (100점 만점)
const GRADE_WEIGHTS = {
  mortgageRatio: 30,    // 근저당 비율 (소유 물건 시세 대비)
  liensExist: 20,       // 압류/가압류 존재 여부
  courtCases: 20,       // 관련 판례 수
  userReports: 15,      // 검증된 사용자 제보 수
  propertyDiversity: 10, // 물건 분산도
  newsNegative: 5,      // 부정적 뉴스 수
};

// 등급 매핑
// A: 80-100 (안전)
// B: 60-79  (양호)
// C: 40-59  (주의)
// D: 20-39  (위험)
// F: 0-19   (매우 위험)
```

### 6.4 FREE 티어 변경

```typescript
// lib/auth.ts 수정

const FREE_UNLIMITED_TYPES = [
  "jeonse-safety",      // 전세 안전도 분석
  "rights-basic",       // 등기부 기본 분석
  "guarantee-check",    // 보증보험 가입 확인
];

// 위 타입은 dailyLimit 차감 없이 무제한 허용
// 기존 고급 분석 (계약서, 사업성, AI 상담 등)은 기존 제한 유지
```

### 6.5 건당 과금 체계

```typescript
// 상품 정의
const SINGLE_PRODUCTS = {
  DECISION_REPORT: {
    name: "의사결정 통합 리포트",
    price: 4900,
    includes: ["대출 가심사", "시세 예측", "세금 계산", "보증보험", "임대인 프로파일"],
  },
  EXPERT_REVIEW: {
    name: "전문가 검토",
    price: 19900,
    includes: ["권리분석사 검토", "최종 의견서", "AI 비교 분석"],
  },
  FULL_REPORT: {
    name: "프리미엄 종합 리포트",
    price: 9900,
    includes: ["의사결정 리포트", "통합 분석", "PDF 다운로드"],
  },
};
```

---

## 7. Security Considerations

- [x] 임대인 이름 SHA-256 해시 저장 + 마스킹 표시 (개인정보보호법)
- [ ] 사용자 제보 시 악의적 신고 방지: 3건 이상 교차 검증 필수
- [ ] 건당 결제 정보는 포트원에서 관리 (서버에 카드 정보 미저장)
- [ ] Web Push VAPID 키는 서버 환경변수로 관리
- [ ] 전문가 검토 결과 접근은 요청자 본인만 허용
- [ ] 대출 시뮬레이션 면책 조항 필수 표시 ("참고용이며 실제 심사 결과와 다를 수 있음")

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| Unit | loan-simulator, landlord-profiler | Vitest | 2-4 |
| Unit | guarantee-insurance 확장분 | Vitest | 2 |
| Integration | /api/loan/simulate, /api/landlord/track | Vitest | 2-4 |
| Integration | 포트원 결제 플로우 (sandbox) | Vitest + MSW | 3 |
| E2E | PWA 설치 + 오프라인 동작 | Lighthouse CI | 1 |

### 8.2 Test Cases

- [ ] HUG 보증보험 전세가율 80% 초과 시 ineligible 반환
- [ ] LTV 80% 초과 대출 불가 판정
- [ ] DTI 60% 초과 시 조건부 판정 + 사유 메시지
- [ ] 임대인 물건 3건 이상 + 근저당 합계 5억 초과 시 등급 D 이하
- [ ] 허위 제보 3건 미만은 등급에 반영 안 됨
- [ ] 건당 결제 실패 시 리포트 접근 차단
- [ ] PWA offline 시 최근 3건 분석 결과 열람 가능

---

## 9. Implementation Order

### Phase 1 — PWA + 무료 개방 (1주차)

```
1. [ ] serwist 설치 + next.config.ts PWA 설정
2. [ ] public/manifest.json + 아이콘 생성 (192x192, 512x512)
3. [ ] Service Worker 캐시 전략 (최근 분석 3건)
4. [ ] PwaInstallPrompt 컴포넌트
5. [ ] Web Push API 구독/해제 (/api/push/subscribe)
6. [ ] lib/auth.ts FREE_UNLIMITED_TYPES 적용
7. [ ] 기존 전세안전도/등기부 분석 dailyLimit 제외 로직
```

### Phase 2 — 보증보험 + 임대인 추적 (2주차)

```
1. [ ] /api/guarantee/check 독립 엔드포인트
2. [ ] 전세 안전도 분석 결과에 보증보험 섹션 자동 포함
3. [ ] lib/landlord-profiler.ts 신규
4. [ ] /api/landlord/track 엔드포인트
5. [ ] LandlordTracker 컴포넌트
6. [ ] 등기부 분석 결과 → "임대인 물건 조회" 버튼 연결
```

### Phase 3 — 대출 가심사 + 건당 과금 (3~4주차)

```
1. [ ] Prisma: LoanCondition, SinglePurchase 마이그레이션
2. [ ] lib/loan-simulator.ts 구현
3. [ ] 5대 은행 대출 조건 seed 데이터
4. [ ] /api/loan/simulate, /api/loan/conditions
5. [ ] LoanSimulator, LoanResultCard 컴포넌트
6. [ ] /app/(app)/loan-check/page.tsx
7. [ ] lib/decision-report.ts (대출+시세+세금 통합)
8. [ ] 포트원 결제 연동 (/api/report/purchase)
9. [ ] PaymentButton, DecisionReport 컴포넌트
10.[ ] /app/(app)/decision-report/page.tsx
```

### Phase 4 — 임대인 프로파일 + 제보 (5~6주차)

```
1. [ ] Prisma: LandlordProfile, UserReport 마이그레이션
2. [ ] landlord-profiler.ts 등급 산정 로직
3. [ ] /api/landlord/profile, /api/user/report
4. [ ] LandlordProfile, LandlordGrade, UserReportForm 컴포넌트
5. [ ] /app/(app)/landlord/[id]/page.tsx
6. [ ] /app/(app)/landlord/report/page.tsx
7. [ ] 관리자 제보 검증 UI (admin 확장)
```

### Phase 5 — AI 신뢰도 + 전문가 연결 (7~8주차)

```
1. [ ] Prisma: ExpertRequest 마이그레이션
2. [ ] /api/expert/request, /api/ai/accuracy
3. [ ] ExpertRequestButton, ExpertStatusTracker 컴포넌트
4. [ ] AiAccuracyBadge — 분석 결과에 정확도 표시
5. [ ] 전문가 검토 결과 → adaptive-weight-tuner 연동
6. [ ] /app/(app)/expert/ 페이지들
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-24 | 초안 — 5개 Phase 설계 | AI |

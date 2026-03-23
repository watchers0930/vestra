# 보증보험 가입가능성 판단 설계서

> **Plan Reference**: `docs/01-plan/features/guarantee-insurance-eligibility.plan.md`
>
> **Project**: VESTRA
> **Version**: 4.7.1
> **Author**: Watchers
> **Date**: 2026-03-23
> **Status**: Draft

---

## 1. 구현 범위

| ID | 항목 | 파일 | 우선순위 |
|----|------|------|:--------:|
| D-01 | 규칙 엔진 + 보증료 계산 유틸리티 | `lib/guarantee-insurance.ts` | 1 |
| D-02 | 보증보험 결과 카드 컴포넌트 | `components/results/GuaranteeInsuranceCard.tsx` | 2 |
| D-03 | 전세 분석 폼에 입력 필드 추가 | `app/(app)/jeonse/analysis/page.tsx` | 3 |
| D-04 | 전세 분석 결과에 보증보험 섹션 통합 | `app/(app)/jeonse/analysis/page.tsx` | 4 |
| D-05 | 규칙 DB 모델 + API (관리자 CRUD) | `prisma/schema.prisma`, `app/api/admin/guarantee-rules/` | 5 |
| D-06 | 관리자 규칙 관리 탭 UI | `components/admin/GuaranteeRulesTab.tsx` | 6 |
| D-07 | 규칙 변경 모니터링 알림 (cron) | `app/api/cron/guarantee-monitor/route.ts` | 7 |

---

## 2. 데이터 모델 (TypeScript 타입)

### 2.1 입력 타입

```typescript
/** 보증보험 판단에 필요한 입력 */
interface GuaranteeInput {
  deposit: number;              // 보증금 (원)
  propertyPrice: number;        // 주택 시세/매매가 (원)
  seniorLiens: number;          // 선순위 채권액 (근저당+선순위보증금 합계, 원)
  propertyType: string;         // 주택유형: 아파트, 빌라/다세대, 오피스텔, 단독주택
  isMetro: boolean;             // 수도권 여부
  contractStartDate: string;    // 계약 시작일 (YYYY-MM-DD)
  contractEndDate: string;      // 계약 종료일 (YYYY-MM-DD)
  hasJeonseLoan: boolean;       // 전세대출 연계 여부 (HF 판단용)
}
```

### 2.2 출력 타입

```typescript
type EligibilityStatus = "eligible" | "conditional" | "ineligible";

interface InsuranceResult {
  provider: "HUG" | "HF" | "SGI";
  providerName: string;         // "주택도시보증공사" 등
  status: EligibilityStatus;
  reasons: string[];            // 판정 사유 목록
  solutions: string[];          // 불가 시 해결 방안
  estimatedPremium: number;     // 예상 보증료 (원)
  premiumRate: number;          // 적용 보증료율 (%)
  applyUrl: string;             // 신청 사이트 URL
}

interface GuaranteeInsuranceResult {
  results: InsuranceResult[];
  recommendation: {
    provider: string;
    reason: string;
  } | null;
  disclaimer: string;
  checkedAt: string;            // 판단 기준 시점
}
```

---

## 3. 규칙 엔진 설계 (`lib/guarantee-insurance.ts`)

### 3.1 규칙 관리 아키텍처 (반자동 업데이트)

```
┌─────────────────────────────────────────────────────────────┐
│                    규칙 업데이트 흐름                          │
│                                                             │
│  [Vercel Cron 주 1회]                                       │
│       │                                                     │
│       ▼                                                     │
│  공식 사이트 변경 감지 ──→ 관리자 알림 (공지사항 자동 생성)     │
│       │                                                     │
│       ▼                                                     │
│  관리자 대시보드 ──→ 규칙 수정 ──→ DB 저장 (이력 자동 기록)    │
│       │                                                     │
│       ▼                                                     │
│  사용자 전세 분석 시 ──→ DB 규칙 로드 (fallback: 기본 상수)    │
└─────────────────────────────────────────────────────────────┘
```

**핵심 원칙**: DB에 규칙이 있으면 DB 우선, 없으면 코드 내 기본 상수로 fallback

### 3.2 기관별 조건 (기본 상수 = fallback)

```typescript
/** 기본 규칙 상수 (DB 미설정 시 fallback) */
const DEFAULT_GUARANTEE_RULES = {
  HUG: {
    depositLimit: { metro: 700_000_000, nonMetro: 500_000_000 },
    maxPropertyPrice: 1_200_000_000,
    ltvRatio: 0.9,
    minContractMonths: 12,
    premiumRates: {
      "아파트": 0.00115,
      "빌라/다세대": 0.00128,
      "오피스텔": 0.00140,
      "단독주택": 0.00154,
    },
    applyUrl: "https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp",
  },
  HF: {
    ltvRatio: 0.9,
    minContractMonths: 12,
    requiresLoan: true,
    premiumRate: 0.001,
    applyUrl: "https://www.hf.go.kr/ko/sub02/sub02_05_01.do",
  },
  SGI: {
    ltvRatio: 0.9,
    minContractMonths: 12,
    premiumRates: {
      "아파트": 0.00128,
      "빌라/다세대": 0.00154,
      "오피스텔": 0.00168,
      "단독주택": 0.00211,
    },
    applyUrl: "https://www.sgic.co.kr/",
  },
} as const;

/** DB에서 규칙 로드, 없으면 기본 상수 반환 */
export async function getGuaranteeRules(): Promise<GuaranteeRules> {
  const dbRules = await prisma.guaranteeRule.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (dbRules.length === 0) return DEFAULT_GUARANTEE_RULES;
  return mergeRulesFromDB(dbRules);
}
```

### 3.2 핵심 함수

```typescript
/** 메인 판단 함수 */
export function checkGuaranteeInsurance(input: GuaranteeInput): GuaranteeInsuranceResult

/** 개별 기관 판단 */
function checkHUG(input: GuaranteeInput): InsuranceResult
function checkHF(input: GuaranteeInput): InsuranceResult
function checkSGI(input: GuaranteeInput): InsuranceResult

/** 보증료 계산 */
function calculatePremium(deposit: number, rate: number, startDate: string, endDate: string): number

/** 계약기간 유효성 검증 */
function validateContractPeriod(startDate: string, endDate: string): { valid: boolean; months: number; halfPassed: boolean }

/** 담보인정비율(LTV) 검증 */
function checkLTV(deposit: number, seniorLiens: number, propertyPrice: number, ratio: number): boolean

/** 최적 기관 추천 */
function getRecommendation(results: InsuranceResult[]): { provider: string; reason: string } | null
```

### 3.3 판단 로직 (HUG 예시)

```typescript
function checkHUG(input: GuaranteeInput): InsuranceResult {
  const reasons: string[] = [];
  const solutions: string[] = [];
  let status: EligibilityStatus = "eligible";

  // 1. 보증금 한도 검증
  const limit = input.isMetro
    ? GUARANTEE_RULES.HUG.depositLimit.metro
    : GUARANTEE_RULES.HUG.depositLimit.nonMetro;
  if (input.deposit > limit) {
    status = "ineligible";
    reasons.push(`보증금 ${formatKRW(input.deposit)}이 한도 ${formatKRW(limit)}을 초과합니다`);
    solutions.push("SGI 서울보증은 보증금 한도 제한이 없습니다");
  }

  // 2. 주택가격 한도 검증
  if (input.propertyPrice > GUARANTEE_RULES.HUG.maxPropertyPrice) {
    status = "ineligible";
    reasons.push(`주택가격 ${formatKRW(input.propertyPrice)}이 12억 원을 초과합니다`);
  }

  // 3. 담보인정비율 검증
  if (!checkLTV(input.deposit, input.seniorLiens, input.propertyPrice, GUARANTEE_RULES.HUG.ltvRatio)) {
    status = "ineligible";
    const maxAllowed = input.propertyPrice * GUARANTEE_RULES.HUG.ltvRatio - input.seniorLiens;
    reasons.push(`선순위채권+보증금(${formatKRW(input.seniorLiens + input.deposit)})이 주택가격의 90%(${formatKRW(input.propertyPrice * 0.9)})를 초과합니다`);
    solutions.push(`선순위채권을 ${formatKRW(input.seniorLiens + input.deposit - input.propertyPrice * 0.9)} 이상 감축하거나, 보증금을 ${formatKRW(maxAllowed)} 이하로 조정하세요`);
  }

  // 4. 계약기간 검증
  const period = validateContractPeriod(input.contractStartDate, input.contractEndDate);
  if (period.months < 12) {
    status = "ineligible";
    reasons.push("계약기간이 1년 미만입니다");
  }
  if (period.halfPassed) {
    status = "ineligible";
    reasons.push("계약기간의 절반이 경과하여 가입 시기를 초과했습니다");
  }

  // 모든 조건 충족 시
  if (status === "eligible") {
    reasons.push("모든 가입 조건을 충족합니다");
  }

  // 보증료 계산
  const rate = GUARANTEE_RULES.HUG.premiumRates[input.propertyType] ?? 0.00140;
  const premium = calculatePremium(input.deposit, rate, input.contractStartDate, input.contractEndDate);

  return {
    provider: "HUG",
    providerName: "주택도시보증공사",
    status,
    reasons,
    solutions,
    estimatedPremium: premium,
    premiumRate: rate * 100,
    applyUrl: GUARANTEE_RULES.HUG.applyUrl,
  };
}
```

---

## 4. UI 컴포넌트 설계

### 4.1 GuaranteeInsuranceCard (`components/results/GuaranteeInsuranceCard.tsx`)

```
Props:
  result: GuaranteeInsuranceResult

구조:
┌─ Card ──────────────────────────────────────────┐
│  <CardHeader>                                    │
│    ShieldCheck 아이콘 + "보증보험 가입 가능성"      │
│  </CardHeader>                                   │
│                                                  │
│  ┌─ 기관 행 (results.map) ─────────────────────┐ │
│  │  [HUG 로고/이름]    [✅가능 / ⚠️조건부 / ❌불가] │ │
│  │  예상 보증료: 345,000원                       │ │
│  │  reasons 목록 (text-sm text-secondary)        │ │
│  │  solutions 목록 (text-sm text-blue-600)       │ │
│  │  [신청 바로가기 →] 링크                        │ │
│  └───────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ 추천 영역 (recommendation) ─────────────────┐ │
│  │  💡 추천: {provider} — {reason}               │ │
│  └───────────────────────────────────────────────┘ │
│                                                  │
│  <p className="text-xs text-muted">              │
│    판단 기준일 + 면책 문구                         │
│  </p>                                            │
└──────────────────────────────────────────────────┘
```

**상태별 배지 스타일** (기존 VESTRA 패턴 준수):

| Status | 텍스트 | bg | color |
|--------|--------|-----|-------|
| eligible | 가입 가능 | bg-emerald-100 | text-emerald-700 |
| conditional | 조건부 | bg-amber-100 | text-amber-700 |
| ineligible | 가입 불가 | bg-red-100 | text-red-700 |

### 4.2 전세 분석 폼 추가 필드

기존 `formData`에 4개 필드 추가:

```typescript
// 기존 formData에 추가
const [formData, setFormData] = useState({
  // ... 기존 필드 유지 ...
  propertyPrice: 500_000_000,    // 주택 시세 (기본 5억)
  seniorLiens: 0,                // 선순위 채권액
  isMetro: true,                 // 수도권 여부
  hasJeonseLoan: false,          // 전세대출 연계 여부
});
```

**폼 배치 (기존 슬라이더 아래에 추가)**:

```
[보증금 SliderInput]         ← 기존
[주택 시세 SliderInput]       ← 추가 (min: 1억, max: 30억, step: 1천만)
[선순위 채권액 SliderInput]   ← 추가 (min: 0, max: 20억, step: 1천만)
[수도권 여부 TabButtons]      ← 추가 ("수도권" / "비수도권")
[전세대출 연계 체크박스]       ← 추가
```

### 4.3 결과 배치

전세사기 위험도 카드(`FraudRiskCard`) **아래**, 문서 자동 생성 **위에** 배치:

```
분석 결과 영역:
  1. 전세권 설정 판단 (기존)
  2. 권고사항 (기존)
  3. 필요 서류 체크리스트 (기존)
  4. AI 종합 의견 (기존)
  5. 전세사기 위험도 (기존)
  6. ★ 보증보험 가입 가능성 (추가) ← GuaranteeInsuranceCard
  7. 문서 자동 생성 (기존)
```

---

## 5. DB 모델 설계 (`prisma/schema.prisma`)

### 5.1 GuaranteeRule 모델

```prisma
model GuaranteeRule {
  id            String   @id @default(cuid())
  provider      String   // "HUG" | "HF" | "SGI"
  rules         Json     // 기관별 조건 JSON (depositLimit, ltvRatio, premiumRates 등)
  version       Int      @default(1)
  isActive      Boolean  @default(true)
  effectiveFrom DateTime @default(now())  // 적용 시작일
  changelog     String?  @db.Text         // 변경 사유
  updatedBy     String?                   // 수정한 관리자 ID
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([provider, version])
  @@index([provider, isActive])
}
```

**rules JSON 구조 예시 (HUG)**:
```json
{
  "depositLimit": { "metro": 700000000, "nonMetro": 500000000 },
  "maxPropertyPrice": 1200000000,
  "ltvRatio": 0.9,
  "minContractMonths": 12,
  "premiumRates": {
    "아파트": 0.00115,
    "빌라/다세대": 0.00128,
    "오피스텔": 0.00140,
    "단독주택": 0.00154
  },
  "applyUrl": "https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp"
}
```

### 5.2 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/guarantee-rules` | 현재 활성 규칙 전체 조회 |
| PUT | `/api/admin/guarantee-rules` | 규칙 수정 (새 version 생성, 이전 비활성화) |
| GET | `/api/admin/guarantee-rules/history` | 변경 이력 조회 |
| GET | `/api/guarantee-rules` | 사용자용 — 활성 규칙 조회 (판단 엔진용) |

**규칙 수정 시 동작**:
```
1. 기존 활성 규칙의 isActive = false
2. 새 규칙 생성 (version + 1, isActive = true)
3. changelog에 변경 사유 기록
→ 이력이 자동으로 쌓이므로 롤백 가능
```

---

## 6. 관리자 규칙 관리 탭 (`components/admin/GuaranteeRulesTab.tsx`)

### 6.1 관리자 탭 추가

기존 admin 페이지 Tab 타입에 `"guarantee-rules"` 추가

**사이드바 메뉴 추가**:
```typescript
{ href: "/admin?tab=guarantee-rules", icon: ShieldCheck, label: "보증보험 규칙",
  description: "보증보험 가입조건 규칙을 관리합니다" }
```

### 6.2 UI 구조

```
┌─ 보증보험 규칙 관리 ──────────────────────────────┐
│                                                  │
│  [HUG] [HF] [SGI]  ← 기관별 탭                   │
│                                                  │
│  ┌─ 현재 활성 규칙 ──────────────────────────────┐ │
│  │  버전: v3 (2026-03-20 수정)                   │ │
│  │  수정자: admin@vestra.kr                      │ │
│  │                                               │ │
│  │  보증금 한도 (수도권): [  700,000,000  ] 원    │ │
│  │  보증금 한도 (비수도권): [  500,000,000  ] 원  │ │
│  │  주택가격 상한: [ 1,200,000,000 ] 원          │ │
│  │  담보인정비율: [  90  ] %                     │ │
│  │  최소 계약기간: [  12  ] 개월                  │ │
│  │                                               │ │
│  │  보증료율 (주택유형별):                         │ │
│  │  아파트:     [ 0.115 ] %                      │ │
│  │  빌라/다세대: [ 0.128 ] %                     │ │
│  │  오피스텔:   [ 0.140 ] %                      │ │
│  │  단독주택:   [ 0.154 ] %                      │ │
│  │                                               │ │
│  │  변경 사유: [                              ]   │ │
│  │  [저장]                                       │ │
│  └───────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ 변경 이력 ──────────────────────────────────┐ │
│  │  v3  2026-03-20  "담보인정비율 90%→80% 변경"  │ │
│  │  v2  2026-01-15  "보증료율 인상 반영"          │ │
│  │  v1  2025-12-01  "초기 설정"                  │ │
│  │  [v2 규칙으로 롤백]                            │ │
│  └───────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 7. 규칙 변경 모니터링 (Vercel Cron)

### 7.1 모니터링 API (`app/api/cron/guarantee-monitor/route.ts`)

```typescript
// Vercel Cron: 매주 월요일 09:00 KST
// vercel.json: { "crons": [{ "path": "/api/cron/guarantee-monitor", "schedule": "0 0 * * 1" }] }

export async function GET(req: Request) {
  // 1. CRON_SECRET 검증
  // 2. 각 기관 공식 페이지 fetch
  // 3. 주요 키워드 변경 감지 (보증금 한도, 담보인정비율, 보증료율 등)
  // 4. 변경 감지 시 → 관리자 공지사항에 알림 자동 생성
}
```

### 7.2 모니터링 대상

| 기관 | URL | 감지 키워드 |
|------|-----|------------|
| HUG | `khug.or.kr/hug/web/ig/dr/igdr000001.jsp` | 보증한도, 담보인정비율, 보증료 |
| HF | `hf.go.kr/ko/sub02/sub02_05_01.do` | 보증조건, 보증료율 |
| SGI | `sgic.co.kr` (전세보증 페이지) | 가입조건, 보증료 |

### 7.3 알림 생성 형식

변경 감지 시 기존 `announcements` 테이블에 자동 삽입:

```typescript
await prisma.announcement.create({
  data: {
    title: "[자동감지] HUG 전세보증보험 조건 변경 가능성",
    content: `HUG 공식 페이지에서 변경이 감지되었습니다.\n확인 후 보증보험 규칙 탭에서 업데이트하세요.\n감지일: 2026-03-24`,
    authorId: "system",
    isImportant: true,
  },
});
```

---

## 8. 구현 순서

| Step | 작업 | 예상 변경 |
|:----:|------|----------|
| 1 | `lib/guarantee-insurance.ts` 생성 | 신규 파일 (~200줄, DB 로드 + fallback 포함) |
| 2 | `components/results/GuaranteeInsuranceCard.tsx` 생성 | 신규 파일 (~120줄) |
| 3 | `components/results/index.ts`에 export 추가 | 1줄 추가 |
| 4 | `app/(app)/jeonse/analysis/page.tsx` 폼 필드 + 결과 통합 | formData 확장 + 카드 렌더링 |
| 5 | `prisma/schema.prisma`에 GuaranteeRule 모델 추가 | 모델 1개 + migration |
| 6 | `app/api/admin/guarantee-rules/route.ts` (GET/PUT) | 신규 API 2개 |
| 7 | `app/api/guarantee-rules/route.ts` (사용자용 GET) | 신규 API 1개 |
| 8 | `components/admin/GuaranteeRulesTab.tsx` 생성 | 신규 파일 (~200줄) |
| 9 | `app/(app)/admin/page.tsx`에 탭 등록 | Tab 타입 + 사이드바 메뉴 추가 |
| 10 | `app/api/cron/guarantee-monitor/route.ts` 생성 | 신규 cron API |
| 11 | `vercel.json`에 cron 스케줄 추가 | cron 설정 1줄 |

---

## 9. 의존성

- 추가 패키지: **없음** (순수 TypeScript 규칙 기반 + Prisma)
- DB 마이그레이션: `npx prisma migrate dev --name add-guarantee-rules`
- 기존 컴포넌트 재사용:
  - `Card`, `CardHeader` — 결과 카드 래퍼
  - `SliderInput` — 주택 시세, 선순위 채권 입력
  - `TabButtons` — 수도권/비수도권 선택
  - `cn`, `formatKRW` — 유틸리티
  - `FormInput` — 관리자 규칙 수정 폼

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-23 | Initial design | Watchers |
| 0.2 | 2026-03-23 | 반자동 규칙 업데이트 시스템 추가 (DB + 관리자 UI + cron 모니터링) | Watchers |

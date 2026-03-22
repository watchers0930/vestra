# 사업성 분석 보고서 (Feasibility Report) 고도화 설계서

> **Summary**: 다중 문서 파싱 → 주장-검증 엔진 → 합리성 판정 → SCR 수준 전문 보고서 자동 생성
>
> **Project**: Vestra
> **Version**: 1.0
>
> **Planning Doc**: [feasibility-report.plan.md](../../01-plan/features/feasibility-report.plan.md)

---

## 1. 개요 (Overview)

### 1.1 설계 목표

1. **다중 문서 통합**: 투자계획서, 재원조달계획 등 복수 파일에서 데이터를 추출하여 하나의 정합성 있는 사업 모델 구축.
2. **주장-검증 (Claim-Verification)**: 업체가 제시한 수치(분양가, 공사비 등)를 공공데이터(MOLIT, KICT 등)와 실시간 교차 검증.
3. **합리성 판정 (Rationality Audit)**: 벤치마크 DB 기반으로 각 지표의 적정성을 3단계(적정/낙관/비현실)로 자동 판정.
4. **SCR 스타일 리포트**: 각 장별로 '검토 의견(Review Opinion)' 섹션이 포함된 전문 신용평가 보고서 수준의 PDF 출력.
5. **데이터 투명성**: 검증에 사용된 공공데이터 출처 및 비교군(Peer group) 명시.

### 1.2 기존 코드베이스 활용

| 기존 모듈 | 활용 방식 |
|-----------|----------|
| `lib/validation-engine.ts` | 4단계 검증 프레임워크(Format→Arithmetic→Context→CrossCheck) 재사용 |
| `lib/v-score.ts` | 가중치 합산 알고리즘을 사업성 V-Score 산출에 응용 |
| `lib/molit-api.ts` | 실거래가 기반 분양가 검증의 핵심 소스 |
| `lib/risk-scoring.ts` | 위험 등급/점수 산정 패턴 재사용 |
| `lib/openai.ts` | OpenAI 클라이언트 + Cost Guard 재사용 |
| `lib/rate-limit.ts` | Rate Limit + Daily Usage 보호 재사용 |
| `components/forms/*` | FormInput, SliderInput, TabButtons 등 폼 컴포넌트 재사용 |
| `components/results/*` | ScoreGauge, KpiCard 등 결과 시각화 재사용 |

---

## 2. 아키텍처 (Architecture)

### 2.1 시스템 구성도

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Client (Next.js 16 / React 19)                     │
│                                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  ┌─────────┐ │
│  │ MultiFileUpload │  │VerificationView  │  │RationalityChart│  │PDFExport│ │
│  │ (Dropzone+Prog) │  │(주장 vs 벤치마크)  │  │(밴드 시각화)     │  │ Button  │ │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘  └────┬────┘ │
└───────────┼────────────────────┼────────────────────┼────────────────┼──────┘
            │                    │                    │                │
     ┌──────▼────────────────────▼────────────────────▼────────────────▼──────┐
     │                     API Routes (Server-Side)                           │
     │                                                                        │
     │  ┌──────────────────────────────────────────────────────────────────┐  │
     │  │              3-Stage Pipeline (기존 패턴 준수)                      │  │
     │  │                                                                  │  │
     │  │  Stage 1: Deterministic (No AI)                                  │  │
     │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │  │
     │  │  │ document-    │  │ context-     │  │ conflict-            │   │  │
     │  │  │ parser.ts    │→ │ merger.ts    │→ │ detector.ts          │   │  │
     │  │  │ (PDF/DOCX/   │  │ (데이터 병합)  │  │ (문서 간 불일치 감지)  │   │  │
     │  │  │  XLSX 파싱)   │  └──────────────┘  └──────────────────────┘   │  │
     │  │  └──────────────┘                                                │  │
     │  │                                                                  │  │
     │  │  Stage 2: External APIs                                          │  │
     │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │  │
     │  │  │ molit-api.ts │  │ benchmark-   │  │ supply-api.ts        │   │  │
     │  │  │ (실거래가)     │  │ db.ts        │  │ (미분양/분양률)       │   │  │
     │  │  │              │  │ (KICT/PF/Cap)│  │                      │   │  │
     │  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │  │
     │  │                                                                  │  │
     │  │  Stage 3: LLM Enrichment (Opinion Only)                         │  │
     │  │  ┌──────────────────────────────────────────────────────────┐   │  │
     │  │  │ OpenAI gpt-4o-mini (JSON mode, temp=0.3)                │   │  │
     │  │  │ → SCR 스타일 검증 의견 생성 (심사역 페르소나)                 │   │  │
     │  │  └──────────────────────────────────────────────────────────┘   │  │
     │  └──────────────────────────────────────────────────────────────────┘  │
     │                                                                        │
     │  ┌────────────────────┐  ┌──────────────────────────────────────────┐  │
     │  │feasibility-        │  │ audit-engine.ts                          │  │
     │  │validator.ts        │  │ (합리성 3단계 판정 + V-Score 산출)         │  │
     │  │(주장-검증 엔진)      │  └──────────────────────────────────────────┘  │
     │  └────────────────────┘                                                │
     └────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────┐
                    │       External Data APIs               │
                    │  MOLIT (실거래가) │ KICT (건설공사비지수)  │
                    │  REB (미분양)    │ 행안부 (인구통계)       │
                    └───────────────────────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────┐
                    │       Prisma / Neon PostgreSQL          │
                    │  FeasibilityReport │ BenchmarkData      │
                    │  FeasibilityFile   │ Analysis (기존)     │
                    └───────────────────────────────────────┘
```

### 2.2 데이터 흐름

```
[사용자]
   │
   ├─ 1. 다중 파일 업로드 (PDF, DOCX, XLSX, HWP)
   │      ↓
   ├─ 2. POST /api/feasibility/parse → 문서별 파싱 + 컨텍스트 병합
   │      ↓
   ├─ 3. 데이터 상충 감지 → 사용자 확인 UI (conflict resolution)
   │      ↓
   ├─ 4. POST /api/feasibility/verify → 주장-검증 + 합리성 판정
   │      ↓
   ├─ 5. POST /api/feasibility/report → SCR 스타일 보고서 생성
   │      ↓
   └─ 6. PDF 다운로드
```

---

## 3. 컴포넌트 구조 (Component Architecture)

### 3.1 파일 구조

```
app/
  (app)/
    feasibility/
      page.tsx                      # 메인 페이지 (멀티스텝 위자드)

  api/
    feasibility/
      parse/route.ts                # Stage 1: 다중 문서 파싱 + 병합
      verify/route.ts               # Stage 2+3: 주장-검증 + 합리성 판정 + LLM 의견
      report/route.ts               # PDF 보고서 생성

components/
  feasibility/
    FileUploadZone.tsx              # 멀티 파일 드래그&드롭 + 진행률
    ConflictResolver.tsx            # 문서 간 수치 불일치 해결 UI
    ClaimVerificationTable.tsx      # 주장 vs 벤치마크 비교 테이블
    RationalityBandChart.tsx        # 벤치마크 밴드 내 위치 시각화
    ChapterReview.tsx               # 장별 검증 의견 카드
    FeasibilityScoreSummary.tsx     # 종합 V-Score + 등급 요약
    FeasibilityReportPreview.tsx    # SCR 스타일 보고서 프리뷰

lib/
  feasibility/
    document-parser.ts              # 파일별 파서 (PDF/DOCX/XLSX)
    context-merger.ts               # 다중 문서 컨텍스트 병합
    feasibility-validator.ts        # 주장-검증 엔진
    audit-engine.ts                 # 합리성 3단계 판정
    benchmark-db.ts                 # 업계 벤치마크 DB
    feasibility-types.ts            # 전체 타입 정의
    feasibility-prompts.ts          # OpenAI 프롬프트 (심사역 페르소나)
```

### 3.2 페이지 컴포넌트 설계 (`app/(app)/feasibility/page.tsx`)

기존 분석 페이지 패턴을 따르며 **3단계 위자드**로 구성합니다.

```typescript
"use client";

import { useState, useRef } from "react";
import { PageHeader, Card, Button } from "@/components/common";
import { useToast } from "@/components/common/toast";
import { FileUploadZone } from "@/components/feasibility/FileUploadZone";
import { ConflictResolver } from "@/components/feasibility/ConflictResolver";
import { ClaimVerificationTable } from "@/components/feasibility/ClaimVerificationTable";
import { RationalityBandChart } from "@/components/feasibility/RationalityBandChart";
import { ChapterReview } from "@/components/feasibility/ChapterReview";
import { FeasibilityScoreSummary } from "@/components/feasibility/FeasibilityScoreSummary";
import { addAnalysis } from "@/lib/store";

type Step = "upload" | "verify" | "report";

export default function FeasibilityPage() {
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Step 1: Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);

  // Step 2: Verification state
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  // Step 3: Report state
  const [report, setReport] = useState<FeasibilityReport | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Step 1 handler: Parse uploaded files
  const handleParse = async () => { /* POST /api/feasibility/parse */ };

  // Step 2 handler: Run claim verification
  const handleVerify = async () => { /* POST /api/feasibility/verify */ };

  // Step 3 handler: Generate report
  const handleReport = async () => { /* POST /api/feasibility/report */ };

  return (
    <div className="space-y-6">
      <PageHeader
        title="사업성 분석 보고서"
        description="다중 문서 기반 SCR 수준 사업성 검증 보고서를 생성합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "사업성 분석" }]}
      />

      {/* Step Indicator */}
      <StepIndicator current={step} steps={["문서 업로드", "검증 분석", "보고서 생성"]} />

      {/* Step 1: File Upload + Conflict Resolution */}
      {step === "upload" && (
        <>
          <FileUploadZone files={files} onChange={setFiles} loading={loading} />
          {conflicts.length > 0 && (
            <ConflictResolver conflicts={conflicts} onResolve={handleConflictResolve} />
          )}
          <Button onClick={handleParse} loading={loading}>문서 분석 시작</Button>
        </>
      )}

      {/* Step 2: Claim Verification */}
      {step === "verify" && verifyResult && (
        <>
          <ClaimVerificationTable claims={verifyResult.claims} />
          <RationalityBandChart items={verifyResult.rationalityItems} />
          <Button onClick={handleVerify} loading={loading}>검증 완료 및 보고서 생성</Button>
        </>
      )}

      {/* Step 3: Report Preview + Download */}
      {step === "report" && report && (
        <div ref={resultRef} className="space-y-6">
          <FeasibilityScoreSummary score={report.vScore} chapters={report.chapters} />
          {report.chapters.map((ch) => (
            <ChapterReview key={ch.chapterId} chapter={ch} />
          ))}
          <Button onClick={handleDownloadPdf}>PDF 다운로드</Button>
        </div>
      )}
    </div>
  );
}
```

### 3.3 주요 UI 컴포넌트 상세

#### FileUploadZone

```typescript
interface FileUploadZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  loading: boolean;
  maxFiles?: number;       // default: 10
  maxSizeMB?: number;      // default: 10
  acceptTypes?: string[];  // default: [".pdf", ".docx", ".xlsx", ".hwp"]
}

// 기능:
// - 드래그&드롭 + 클릭 업로드
// - 파일별 아이콘 (PDF/DOCX/XLSX/HWP)
// - 업로드 진행률 (개별 파일 프로그레스바)
// - 파일 삭제/재정렬
```

#### ConflictResolver

```typescript
interface ConflictResolverProps {
  conflicts: DataConflict[];
  onResolve: (resolved: ResolvedConflict[]) => void;
}

// DataConflict example:
// { field: "총연면적", fileA: "사업계획서.pdf", valueA: 15000,
//   fileB: "재무분석표.xlsx", valueB: 14500, deviation: 3.4% }
//
// 사용자가 각 충돌 항목에서 어떤 값을 채택할지 선택하는 라디오 버튼 UI
```

#### ClaimVerificationTable

```typescript
interface ClaimVerificationTableProps {
  claims: VerificationResult[];
}

// 테이블 컬럼:
// | 항목 | 업체 주장값 | 시장 벤치마크 | 괴리율 | 판정 | 검증 출처 |
// | 분양가 | 4,500만원/평 | 3,800만원/평 | +18.4% | 🟡 낙관 | MOLIT 실거래가 |
```

#### RationalityBandChart

```typescript
interface RationalityBandChartProps {
  items: RationalityItem[];
}

// Recharts 기반 Bullet Chart:
// 벤치마크 범위(밴드)를 배경으로 하고 업체 주장값의 위치를 마커로 표시
// 적정(녹색) / 낙관(노란색) / 비현실(빨간색) 영역 시각화
```

#### ChapterReview

```typescript
interface ChapterReviewProps {
  chapter: ChapterOpinion;
}

// SCR 스타일 장별 카드:
// ┌──────────────────────────────────────┐
// │ Chapter III. 분양가 분석              │
// │                                      │
// │ [요약 테이블: 업체 주장 vs 검증 결과]    │
// │                                      │
// │ ┌── 검토 의견 (Review Opinion) ─────┐│
// │ │ "본 사업지 분양가는 인근 실거래가  ││
// │ │  대비 18.4% 높게 책정되어...      ││
// │ └──────────────────────────────────┘│
// │                                      │
// │ 판정: 🟡 낙관적 (Optimistic)         │
// └──────────────────────────────────────┘
```

---

## 4. 데이터 모델 (Data Model)

### 4.1 TypeScript 타입 정의 (`lib/feasibility/feasibility-types.ts`)

```typescript
// ─── 파싱 관련 ───

/** 개별 파일 파싱 결과 */
export interface ParsedDocument {
  filename: string;
  fileType: "pdf" | "docx" | "xlsx" | "hwp";
  extractedData: Record<string, ExtractedValue>;
  rawText: string;
  confidence: number;  // 0-100
  pageCount?: number;
}

/** 추출된 수치 */
export interface ExtractedValue {
  key: string;           // "planned_sale_price", "total_construction_cost" 등
  value: number;
  unit: string;          // "만원/평", "억원", "%" 등
  sourceFile: string;
  page?: number;
  context?: string;      // 원문 문맥
}

/** 문서 간 수치 불일치 */
export interface DataConflict {
  field: string;
  fileA: string;
  valueA: number;
  fileB: string;
  valueB: number;
  deviation: number;     // 괴리율 (%)
}

/** 사용자 선택으로 확정된 불일치 해결 */
export interface ResolvedConflict {
  field: string;
  selectedFile: string;
  selectedValue: number;
}

/** 병합된 사업 컨텍스트 */
export interface MergedProjectContext {
  projectName: string;
  location: {
    address: string;
    district: string;     // 시군구
    dongCode: string;     // 법정동 코드
    lat?: number;
    lng?: number;
  };
  scale: {
    totalLandArea: number;    // 대지면적 (㎡)
    totalFloorArea: number;   // 연면적 (㎡)
    floorAreaRatio: number;   // 용적률 (%)
    buildingCoverage: number; // 건폐율 (%)
    floors: { above: number; below: number };
    totalUnits: number;       // 총 세대/호실 수
  };
  purpose: "아파트" | "오피스텔" | "상가" | "지식산업센터" | "복합" | "기타";
  claims: ExtractedValue[];
  conflicts: DataConflict[];
  resolvedConflicts: ResolvedConflict[];
  sourceFiles: ParsedDocument[];
}

// ─── 검증 관련 ───

/** 주장-검증 결과 */
export interface VerificationResult {
  claimKey: string;          // "planned_sale_price"
  claimLabel: string;        // "분양가"
  claimValue: number;
  claimUnit: string;
  benchmark: {
    value: number;
    source: string;          // "MOLIT 실거래가 (2026.01~03)"
    sourceType: "molit" | "kict" | "reb" | "mois" | "internal";
    asOfDate: string;        // ISO8601
    comparableCount?: number;
    range?: { min: number; max: number };
  };
  deviation: number;         // (claim - benchmark) / benchmark
  deviationPercent: number;  // deviation * 100
}

/** 합리성 등급 */
export type RationalityGrade = "APPROPRIATE" | "OPTIMISTIC" | "UNREALISTIC" | "CONSERVATIVE";

export const RATIONALITY_LABELS: Record<RationalityGrade, string> = {
  APPROPRIATE: "적정",
  OPTIMISTIC: "낙관적",
  UNREALISTIC: "비현실적",
  CONSERVATIVE: "보수적",
};

/** 합리성 판정 결과 */
export interface RationalityItem {
  claimKey: string;
  claimLabel: string;
  grade: RationalityGrade;
  deviation: number;
  reasoning: string;         // "인근 실거래가 대비 18.4% 높게 책정됨"
  verificationSource: string;
}

// ─── 보고서 관련 ───

/** 장별 검증 의견 */
export interface ChapterOpinion {
  chapterId: string;         // "I" ~ "VI"
  title: string;             // "사업 개요", "시장 환경" 등
  summary: string;           // 장 요약
  dataTable: {               // 업체 제출 수치 요약 테이블
    label: string;
    value: string;
    unit: string;
  }[];
  verificationDetails: {
    claim: string;
    evidence: string;
    grade: RationalityGrade;
    reasoning: string;
  }[];
  overallReview: string;     // SCR 스타일 전문 의견 (LLM 생성)
  riskHighlight: boolean;    // true면 붉은색 강조
}

/** 사업성 종합 점수 (V-Score 응용) */
export interface FeasibilityScore {
  score: number;             // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;        // "투자적격" | "조건부적격" | "주의" | "부적격" | "투자불가"
  breakdown: {
    category: string;        // "분양가 적정성", "공사비 합리성" 등
    weight: number;
    score: number;
    grade: RationalityGrade;
  }[];
  investmentOpinion: string; // 종합 투자 의견 (LLM 생성)
}

/** 최종 사업성 보고서 */
export interface FeasibilityReport {
  id: string;
  projectContext: MergedProjectContext;
  verificationResults: VerificationResult[];
  rationalityItems: RationalityItem[];
  chapters: ChapterOpinion[];
  vScore: FeasibilityScore;
  metadata: {
    version: string;
    generatedAt: string;
    sourceFiles: string[];
    disclaimer: string;
  };
}
```

### 4.2 Prisma 스키마 확장

```prisma
// 기존 Analysis 모델의 type 필드에 "feasibility" 추가하여 분석 이력 저장

// 사업성 분석 보고서 (상세 데이터 별도 저장)
model FeasibilityReport {
  id                String   @id @default(cuid())
  userId            String
  projectName       String
  address           String
  purpose           String                  // "아파트" | "오피스텔" | ...
  totalFloorArea    Float                   // 연면적 (㎡)
  totalUnits        Int                     // 세대/호실 수
  mergedContext     Json                    // MergedProjectContext
  verificationData  Json                    // VerificationResult[]
  rationalityData   Json                    // RationalityItem[]
  chapters          Json                    // ChapterOpinion[]
  vScore            Int                     // 0-100
  vScoreGrade       String                  // "A" ~ "F"
  vScoreDetail      Json                    // FeasibilityScore
  status            String   @default("draft") // "draft" | "completed"
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user  User @relation(fields: [userId], references: [id])
  files FeasibilityFile[]

  @@index([userId])
  @@index([address])
}

// 업로드된 파일 메타데이터 (파일 본문은 분석 후 삭제)
model FeasibilityFile {
  id         String   @id @default(cuid())
  reportId   String
  filename   String
  fileType   String                        // "pdf" | "docx" | "xlsx" | "hwp"
  fileSize   Int                           // bytes
  pageCount  Int?
  confidence Int?                          // 파싱 신뢰도 0-100
  createdAt  DateTime @default(now())

  report FeasibilityReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@index([reportId])
}

// 벤치마크 데이터 캐시 (외부 API 결과 캐싱)
model BenchmarkCache {
  id          String   @id @default(cuid())
  key         String   @unique            // "kict:2026-03", "pf_rate:gradeA" 등
  category    String                      // "construction_cost" | "pf_rate" | "cap_rate" | "supply"
  data        Json                        // 벤치마크 수치 데이터
  source      String                      // 데이터 출처
  asOfDate    DateTime                    // 데이터 기준일
  expiresAt   DateTime                    // 캐시 만료일
  createdAt   DateTime @default(now())

  @@index([category])
  @@index([expiresAt])
}
```

### 4.3 벤치마크 DB (`lib/feasibility/benchmark-db.ts`)

```typescript
/** 벤치마크 기준 데이터 (정적 기본값 + DB 캐시) */
export const INDUSTRY_BENCHMARKS = {
  // 건설공사비지수 (KICT 기준, 2020=100)
  CONSTRUCTION_COST_INDEX: {
    baseYear: 2020,
    currentValue: 153.8,
    yoyGrowth: 0.045,
    byPurpose: {
      apartment: { perPyeong: 820 },    // 만원/평
      officetel: { perPyeong: 750 },
      commercial: { perPyeong: 900 },
      logistics: { perPyeong: 450 },
    },
  },
  // PF 금리 밴드 (신용등급별)
  PF_INTEREST_RATES: {
    gradeA: [0.055, 0.075],
    gradeB: [0.08, 0.12],
    bridge: [0.12, 0.18],
  },
  // 수익형 부동산 Cap Rate (지역별)
  CAP_RATE: {
    seoul_office: 0.042,
    seoul_retail: 0.048,
    gyeonggi_logistics: 0.055,
    local_commercial: 0.065,
  },
  // 분양률 기준 (지역별 3개년 평균)
  SALE_RATE: {
    seoul: { initial: 0.78, final: 0.95 },
    gyeonggi: { initial: 0.65, final: 0.88 },
    local: { initial: 0.45, final: 0.72 },
  },
} as const;

/** DB 캐시에서 최신 벤치마크 조회 (없으면 정적 기본값 반환) */
export async function getBenchmark(
  category: string,
  key: string
): Promise<BenchmarkValue> {
  // 1. BenchmarkCache에서 유효 캐시 조회
  // 2. 없으면 INDUSTRY_BENCHMARKS에서 기본값 반환
  // 3. 캐시 만료 시 외부 API 재조회 (별도 cron)
}
```

---

## 5. API 설계 (API Design)

### 5.1 API 엔드포인트 목록

| Method | Endpoint | 설명 | Input | Output |
|--------|----------|------|-------|--------|
| POST | `/api/feasibility/parse` | 다중 문서 파싱 + 컨텍스트 병합 | `FormData (files[])` | `{ context, conflicts }` |
| POST | `/api/feasibility/verify` | 주장-검증 + 합리성 판정 + LLM 의견 | `{ context, resolvedConflicts }` | `{ verifications, rationality, chapters, vScore }` |
| POST | `/api/feasibility/report` | PDF 보고서 생성 | `{ reportId }` | `{ pdfUrl }` or `ReadableStream (PDF)` |

### 5.2 API 상세 설계

#### `POST /api/feasibility/parse`

다중 파일을 파싱하여 병합된 사업 컨텍스트를 반환합니다.

```typescript
// app/api/feasibility/parse/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { parseDocument } from "@/lib/feasibility/document-parser";
import { mergeContexts } from "@/lib/feasibility/context-merger";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 10;

export async function POST(req: NextRequest) {
  try {
    // 1. Auth + Rate Limit (기존 패턴)
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`feasibility-parse:${userId || ip}`, 10);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit);
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다." },
        { status: 429, headers: rateLimitHeaders(daily) }
      );
    }

    // 2. FormData에서 파일 추출
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length || files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `파일은 1~${MAX_FILES}개까지 업로드 가능합니다.` },
        { status: 400 }
      );
    }

    // 3. 파일 크기 검증
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${file.name}: 파일 크기가 10MB를 초과합니다.` },
          { status: 400 }
        );
      }
    }

    // 4. Stage 1: 개별 문서 파싱 (병렬 처리)
    const parsedDocs = await Promise.all(
      files.map((file) => parseDocument(file))
    );

    // 5. 컨텍스트 병합 + 불일치 감지
    const { context, conflicts } = mergeContexts(parsedDocs);

    return NextResponse.json({
      context,
      conflicts,
      parsedFiles: parsedDocs.map((d) => ({
        filename: d.filename,
        fileType: d.fileType,
        confidence: d.confidence,
        extractedCount: Object.keys(d.extractedData).length,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Feasibility parse error:", message);
    return NextResponse.json(
      { error: `문서 분석 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
```

#### `POST /api/feasibility/verify`

주장-검증 + 합리성 판정 + SCR 스타일 보고서를 생성합니다.

```typescript
// app/api/feasibility/verify/route.ts

export async function POST(req: NextRequest) {
  try {
    // 1. Auth + Rate Limit + Cost Guard (기존 패턴)

    // 2. 입력 검증
    const { context, resolvedConflicts } = await req.json();
    if (!context?.claims?.length) {
      return NextResponse.json(
        { error: "분석할 데이터가 없습니다." },
        { status: 400 }
      );
    }

    // 3. Stage 2: 외부 API 교차 검증 (병렬)
    const [molitData, benchmarkData, supplyData] = await Promise.all([
      fetchComprehensivePrices(context.location.address, 12),
      getBenchmark("construction_cost", context.purpose),
      fetchSupplyData(context.location.district),
    ]);

    // 4. Stage 2: 주장-검증 수행
    const verifications = verifyClaims(context.claims, {
      molit: molitData,
      benchmark: benchmarkData,
      supply: supplyData,
    });

    // 5. Stage 2: 합리성 3단계 판정
    const rationalityItems = verifications.map((v) => ({
      ...v,
      grade: judgeRationality(v.claimValue, v.benchmark.value, v.claimKey),
      reasoning: generateReasoning(v),
    }));

    // 6. Stage 2: V-Score 산출 (가중치 합산)
    const vScore = calculateFeasibilityScore(rationalityItems);

    // 7. Stage 3: LLM 의견 생성 (OpenAI, JSON mode)
    const openai = getOpenAIClient();
    const costGuard = await checkOpenAICostGuard(ip);
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다." },
        { status: 429 }
      );
    }

    const chapters = await generateChapterOpinions(
      openai,
      context,
      verifications,
      rationalityItems
    );

    // 8. DB 저장 (Prisma)
    const report = await prisma.feasibilityReport.create({
      data: {
        userId: userId || "anonymous",
        projectName: context.projectName,
        address: context.location.address,
        purpose: context.purpose,
        totalFloorArea: context.scale.totalFloorArea,
        totalUnits: context.scale.totalUnits,
        mergedContext: context,
        verificationData: verifications,
        rationalityData: rationalityItems,
        chapters: chapters,
        vScore: vScore.score,
        vScoreGrade: vScore.grade,
        vScoreDetail: vScore,
        status: "completed",
      },
    });

    // 9. Analysis 이력 저장 (기존 패턴)
    await prisma.analysis.create({
      data: {
        userId: userId || "anonymous",
        type: "feasibility",
        typeLabel: "사업성 분석",
        address: context.location.address,
        summary: `사업성 등급: ${vScore.grade} (${vScore.score}점)`,
        data: JSON.stringify({ reportId: report.id, vScore }),
      },
    });

    return NextResponse.json({
      reportId: report.id,
      verifications,
      rationalityItems,
      chapters,
      vScore,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Feasibility verify error:", message);
    return NextResponse.json(
      { error: `검증 분석 중 오류: ${message}` },
      { status: 500 }
    );
  }
}
```

#### `POST /api/feasibility/report`

저장된 보고서를 PDF로 렌더링합니다.

```typescript
// app/api/feasibility/report/route.ts

export async function POST(req: NextRequest) {
  // 1. Auth + Rate Limit
  // 2. reportId로 FeasibilityReport 조회
  // 3. HTML 템플릿 렌더링 (SCR 스타일 레이아웃)
  // 4. @react-pdf/renderer 또는 puppeteer로 PDF 생성
  // 5. ReadableStream으로 반환

  const report = await prisma.feasibilityReport.findUnique({
    where: { id: reportId },
    include: { files: true },
  });

  // HTML → PDF 변환
  const pdfBuffer = await renderFeasibilityPdf(report);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="feasibility-report-${report.id}.pdf"`,
    },
  });
}
```

---

## 6. 핵심 모듈 설계 (Key Modules)

### 6.1 문서 파서 (`lib/feasibility/document-parser.ts`)

```typescript
import { getTextExtractor } from "office-text-extractor"; // DOCX/XLSX
// PDF: 기존 extract-pdf 패턴 재사용 (unpdf + Vision fallback)

const CLAIM_PATTERNS: Record<string, RegExp[]> = {
  planned_sale_price: [
    /분양가[:\s]*([0-9,.]+)\s*(만원|원)/,
    /분양\s*단가[:\s]*([0-9,.]+)/,
    /평당\s*분양가[:\s]*([0-9,.]+)/,
  ],
  total_construction_cost: [
    /총\s*공사비[:\s]*([0-9,.]+)\s*(억원|만원)/,
    /공사비\s*합계[:\s]*([0-9,.]+)/,
  ],
  total_project_cost: [
    /총\s*사업비[:\s]*([0-9,.]+)\s*(억원|만원)/,
    /사업비\s*합계[:\s]*([0-9,.]+)/,
  ],
  expected_sale_rate: [
    /분양률[:\s]*([0-9,.]+)\s*%/,
    /예상\s*분양률[:\s]*([0-9,.]+)/,
  ],
  expected_profit_rate: [
    /수익률[:\s]*([0-9,.]+)\s*%/,
    /사업\s*수익률[:\s]*([0-9,.]+)/,
  ],
  pf_interest_rate: [
    /PF\s*금리[:\s]*([0-9,.]+)\s*%/,
    /프로젝트\s*파이낸싱[:\s]*([0-9,.]+)\s*%/,
  ],
  total_floor_area: [
    /연면적[:\s]*([0-9,.]+)\s*(㎡|평)/,
    /총\s*연면적[:\s]*([0-9,.]+)/,
  ],
  total_units: [
    /총\s*세대[:\s]*([0-9,.]+)\s*(세대|호실|실)/,
    /총\s*호실[:\s]*([0-9,.]+)/,
  ],
};

/** 파일 유형별 텍스트 추출 → 정규식 패턴 매칭으로 수치 추출 */
export async function parseDocument(file: File): Promise<ParsedDocument> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileType = detectFileType(file.name);
  let rawText: string;

  switch (fileType) {
    case "pdf":
      rawText = await extractTextFromPdf(buffer);
      break;
    case "docx":
    case "xlsx":
      rawText = await extractTextFromOffice(buffer, fileType);
      break;
    case "hwp":
      rawText = await extractTextFromHwp(buffer);
      break;
    default:
      throw new Error(`지원하지 않는 파일 형식: ${fileType}`);
  }

  const extractedData = extractClaims(rawText, CLAIM_PATTERNS);

  return {
    filename: file.name,
    fileType,
    extractedData,
    rawText,
    confidence: calculateParsingConfidence(extractedData, rawText),
  };
}
```

### 6.2 컨텍스트 병합기 (`lib/feasibility/context-merger.ts`)

```typescript
/** 다중 문서의 추출 데이터를 하나로 병합하고 충돌을 감지 */
export function mergeContexts(
  docs: ParsedDocument[]
): { context: MergedProjectContext; conflicts: DataConflict[] } {
  const allClaims = new Map<string, ExtractedValue[]>();
  const conflicts: DataConflict[] = [];

  // 1. 모든 문서의 추출값을 키별로 그룹핑
  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc.extractedData)) {
      if (!allClaims.has(key)) allClaims.set(key, []);
      allClaims.get(key)!.push(value);
    }
  }

  // 2. 동일 키에 다른 값이 있으면 conflict 등록
  const mergedClaims: ExtractedValue[] = [];
  for (const [key, values] of allClaims) {
    if (values.length === 1) {
      mergedClaims.push(values[0]);
    } else {
      const deviation = calculateDeviation(values);
      if (deviation > 0.02) { // 2% 이상 차이 시 충돌
        conflicts.push({
          field: values[0].key,
          fileA: values[0].sourceFile,
          valueA: values[0].value,
          fileB: values[1].sourceFile,
          valueB: values[1].value,
          deviation: deviation * 100,
        });
      }
      // 충돌 없으면 최근 문서(마지막 파일) 기준 채택
      mergedClaims.push(values[values.length - 1]);
    }
  }

  return {
    context: buildProjectContext(mergedClaims, docs),
    conflicts,
  };
}
```

### 6.3 주장-검증 엔진 (`lib/feasibility/feasibility-validator.ts`)

```typescript
/** 업체 주장값을 외부 데이터와 교차 검증 */
export function verifyClaims(
  claims: ExtractedValue[],
  externalData: {
    molit: ComprehensivePriceResult;
    benchmark: BenchmarkValue;
    supply: SupplyData;
  }
): VerificationResult[] {
  const results: VerificationResult[] = [];

  for (const claim of claims) {
    const verification = matchClaimToBenchmark(claim, externalData);
    if (verification) {
      results.push(verification);
    }
  }

  return results;
}

function matchClaimToBenchmark(
  claim: ExtractedValue,
  data: ExternalData
): VerificationResult | null {
  switch (claim.key) {
    case "planned_sale_price":
      // MOLIT 실거래가 대비 검증
      return {
        claimKey: claim.key,
        claimLabel: "분양가",
        claimValue: claim.value,
        claimUnit: claim.unit,
        benchmark: {
          value: data.molit.sale.avgPrice,
          source: `MOLIT 실거래가 (${data.molit.sale.period})`,
          sourceType: "molit",
          asOfDate: new Date().toISOString(),
          comparableCount: data.molit.sale.transactionCount,
          range: { min: data.molit.sale.minPrice, max: data.molit.sale.maxPrice },
        },
        deviation: (claim.value - data.molit.sale.avgPrice) / data.molit.sale.avgPrice,
        deviationPercent: ((claim.value - data.molit.sale.avgPrice) / data.molit.sale.avgPrice) * 100,
      };

    case "total_construction_cost":
      // KICT 건설공사비지수 대비 검증
      const standardCost = data.benchmark.byPurpose?.[claim.key]?.perPyeong;
      if (!standardCost) return null;
      return {
        claimKey: claim.key,
        claimLabel: "공사비",
        claimValue: claim.value,
        claimUnit: claim.unit,
        benchmark: {
          value: standardCost,
          source: "KICT 건설공사비지수",
          sourceType: "kict",
          asOfDate: new Date().toISOString(),
        },
        deviation: (claim.value - standardCost) / standardCost,
        deviationPercent: ((claim.value - standardCost) / standardCost) * 100,
      };

    // ... 분양률, PF금리 등 추가 항목
    default:
      return null;
  }
}
```

### 6.4 합리성 판정 엔진 (`lib/feasibility/audit-engine.ts`)

```typescript
/** 벤치마크 대비 괴리율로 합리성 등급 판정 */
export function judgeRationality(
  actual: number,
  benchmark: number,
  claimKey: string
): RationalityGrade {
  const deviation = (actual - benchmark) / benchmark;

  // 항목별 방향성을 고려한 판정
  // 분양가: 높을수록 낙관적, 공사비: 낮을수록 낙관적
  const isRevenue = ["planned_sale_price", "expected_sale_rate", "expected_profit_rate"].includes(claimKey);
  const isCost = ["total_construction_cost", "pf_interest_rate"].includes(claimKey);

  const adjustedDeviation = isCost ? -deviation : deviation;

  if (Math.abs(deviation) <= 0.10) return "APPROPRIATE";
  if (adjustedDeviation > 0.25) return "UNREALISTIC";
  if (adjustedDeviation > 0.10) return "OPTIMISTIC";
  return "CONSERVATIVE";
}

/** 종합 사업성 점수 산출 (V-Score 패턴 응용) */
export function calculateFeasibilityScore(
  items: RationalityItem[]
): FeasibilityScore {
  const WEIGHTS: Record<string, number> = {
    planned_sale_price: 0.25,
    total_construction_cost: 0.25,
    expected_sale_rate: 0.15,
    pf_interest_rate: 0.15,
    expected_profit_rate: 0.10,
    total_floor_area: 0.05,
    total_units: 0.05,
  };

  const GRADE_SCORES: Record<RationalityGrade, number> = {
    APPROPRIATE: 90,
    CONSERVATIVE: 80,
    OPTIMISTIC: 55,
    UNREALISTIC: 20,
  };

  let totalScore = 0;
  let totalWeight = 0;
  const breakdown: FeasibilityScore["breakdown"] = [];

  for (const item of items) {
    const weight = WEIGHTS[item.claimKey] || 0.05;
    const score = GRADE_SCORES[item.grade];
    totalScore += score * weight;
    totalWeight += weight;

    breakdown.push({
      category: item.claimLabel,
      weight,
      score,
      grade: item.grade,
    });
  }

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  const grade = scoreToGrade(finalScore);

  return {
    score: finalScore,
    grade,
    gradeLabel: FEASIBILITY_GRADE_LABELS[grade],
    breakdown,
    investmentOpinion: "", // LLM이 채움
  };
}

const FEASIBILITY_GRADE_LABELS: Record<string, string> = {
  A: "투자적격",
  B: "조건부적격",
  C: "주의",
  D: "부적격",
  F: "투자불가",
};

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
```

### 6.5 LLM 의견 생성 (`lib/feasibility/feasibility-prompts.ts`)

```typescript
export const FEASIBILITY_SYSTEM_PROMPT = `당신은 서울신용평가(SCR)의 수석 PF 심사역입니다.
제출된 사업 데이터와 공공데이터 교차 검증 결과를 바탕으로 전문적인 검증 의견을 작성합니다.

원칙:
1. 수치의 허점을 지적하고 근거를 제시하라.
2. 모든 의견에 사용된 데이터 출처와 기준일을 명시하라.
3. 낙관적 수치에 대해서는 반드시 리스크를 지적하라.
4. "적정"한 수치에 대해서도 조건과 전제를 명시하라.
5. 전문 용어를 사용하되 핵심 논점이 명확히 전달되도록 하라.

응답은 반드시 JSON 형식으로 반환하라.`;

export const CHAPTER_OPINION_PROMPT = `다음은 사업성 분석의 "{chapterTitle}" 장입니다.

[업체 제출 수치]
{claimTable}

[교차 검증 결과]
{verificationTable}

[합리성 판정]
{rationalityTable}

위 데이터를 바탕으로 SCR 스타일의 검토 의견을 작성하세요.
반드시 구체적 수치를 인용하고 리스크 요인을 지적하세요.

JSON 응답:
{
  "overallReview": "장 전체에 대한 종합 검토 의견 (3-5문장)",
  "riskHighlight": true/false (비현실적 항목이 있으면 true)
}`;

export const INVESTMENT_OPINION_PROMPT = `다음은 사업성 분석 전체 결과입니다.

[종합 점수] {vScore}점 ({grade})
[항목별 판정]
{breakdownTable}

위 결과를 바탕으로 최종 투자 의견을 작성하세요.
긍정적 요인과 부정적 요인을 균형 있게 제시하고,
최종 투자 적격 여부에 대한 의견을 명확히 밝히세요.

JSON 응답:
{
  "investmentOpinion": "종합 투자 의견 (5-8문장)"
}`;
```

---

## 7. 보안 및 규정 준수 (Security)

| 항목 | 대응 방안 |
|------|----------|
| **파일 보안** | 업로드 파일은 메모리에서만 처리. 분석 완료 후 원본 파일 즉시 삭제. DB에는 메타데이터만 저장. |
| **입력 검증** | 파일 크기 10MB 제한, MIME 타입 검증, 파일 확장자 화이트리스트 적용 |
| **Rate Limit** | parse: 10req/min, verify: 5req/min (OpenAI 비용 보호) |
| **Cost Guard** | 기존 `checkOpenAICostGuard` 재사용 (일일 OpenAI 비용 제한) |
| **출처 명시** | 모든 검증 의견에 데이터 시점(as-of date) 및 출처(MOLIT, KICT 등) 각주 처리 |
| **AI 면책** | "본 의견은 공공데이터 기반의 참고 수치이며 최종 투자 결정은 사용자의 책임입니다." 면책 문구 필수 |

---

## 8. 구현 순서 (Implementation Plan)

### Phase 1: 다중 문서 파싱 엔진

| Step | 작업 | 파일 | 의존성 |
|------|------|------|--------|
| 1-1 | 타입 정의 | `lib/feasibility/feasibility-types.ts` | 없음 |
| 1-2 | 문서 파서 (PDF/DOCX/XLSX) | `lib/feasibility/document-parser.ts` | unpdf, office-text-extractor |
| 1-3 | 컨텍스트 병합기 | `lib/feasibility/context-merger.ts` | 1-1 |
| 1-4 | Parse API 라우트 | `app/api/feasibility/parse/route.ts` | 1-2, 1-3 |
| 1-5 | 파일 업로드 UI | `components/feasibility/FileUploadZone.tsx` | 없음 |
| 1-6 | 충돌 해결 UI | `components/feasibility/ConflictResolver.tsx` | 1-1 |

### Phase 2: 벤치마크 DB + 주장-검증 시스템

| Step | 작업 | 파일 | 의존성 |
|------|------|------|--------|
| 2-1 | 벤치마크 DB | `lib/feasibility/benchmark-db.ts` | 없음 |
| 2-2 | Prisma 스키마 확장 | `prisma/schema.prisma` | 없음 |
| 2-3 | DB 마이그레이션 | `prisma/migrations/` | 2-2 |
| 2-4 | 주장-검증 엔진 | `lib/feasibility/feasibility-validator.ts` | 2-1, molit-api.ts |
| 2-5 | 검증 테이블 UI | `components/feasibility/ClaimVerificationTable.tsx` | 1-1 |

### Phase 3: 합리성 판정 + LLM 의견

| Step | 작업 | 파일 | 의존성 |
|------|------|------|--------|
| 3-1 | 합리성 판정 엔진 | `lib/feasibility/audit-engine.ts` | 2-4 |
| 3-2 | LLM 프롬프트 | `lib/feasibility/feasibility-prompts.ts` | 없음 |
| 3-3 | Verify API 라우트 | `app/api/feasibility/verify/route.ts` | 3-1, 3-2, 2-4 |
| 3-4 | 밴드 차트 UI | `components/feasibility/RationalityBandChart.tsx` | 1-1 |
| 3-5 | 장별 의견 UI | `components/feasibility/ChapterReview.tsx` | 1-1 |
| 3-6 | 종합 점수 UI | `components/feasibility/FeasibilityScoreSummary.tsx` | 1-1 |

### Phase 4: 페이지 통합 + PDF 보고서

| Step | 작업 | 파일 | 의존성 |
|------|------|------|--------|
| 4-1 | 메인 페이지 | `app/(app)/feasibility/page.tsx` | Phase 1~3 전체 |
| 4-2 | 보고서 프리뷰 | `components/feasibility/FeasibilityReportPreview.tsx` | Phase 3 |
| 4-3 | PDF 렌더링 | `lib/feasibility/pdf-renderer.ts` | 4-2 |
| 4-4 | Report API 라우트 | `app/api/feasibility/report/route.ts` | 4-3 |
| 4-5 | 사이드바 메뉴 추가 | `components/layout/Sidebar.tsx` | 없음 |
| 4-6 | 라우팅 설정 | `app/(app)/feasibility/layout.tsx` | 없음 |

### 의존성 패키지 (신규)

```json
{
  "office-text-extractor": "^3.0.0",  // DOCX/XLSX 텍스트 추출
  "hwp.js": "^0.2.0"                  // HWP 파일 파싱 (또는 libreoffice-convert)
}
```

기존 패키지로 처리 가능한 항목:
- PDF 파싱: `unpdf` (기존 사용 중)
- PDF 생성: `@react-pdf/renderer` 또는 기존 puppeteer 패턴
- 차트: `recharts` (기존 사용 중)

---

## 9. 테스트 전략

| 대상 | 방법 | 우선순위 |
|------|------|---------|
| `document-parser.ts` | 유닛 테스트 (샘플 PDF/DOCX로 추출 정확도 검증) | 높음 |
| `context-merger.ts` | 유닛 테스트 (충돌 감지 시나리오) | 높음 |
| `feasibility-validator.ts` | 유닛 테스트 (mock 외부 데이터로 검증 정확도) | 높음 |
| `audit-engine.ts` | 유닛 테스트 (경계값: ±10%, ±25% 기준) | 높음 |
| `/api/feasibility/parse` | 통합 테스트 (실제 파일 업로드 시나리오) | 중간 |
| `/api/feasibility/verify` | 통합 테스트 (MOLIT mock + 전체 파이프라인) | 중간 |
| UI 컴포넌트 | 수동 테스트 (멀티 파일 업로드, 충돌 해결 플로우) | 낮음 |

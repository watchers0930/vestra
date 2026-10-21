# 전세 UX 감사 잔여결함 8건 — 설계서 (공용 계약서)

> 프로젝트: VESTRA · 작성일: 2026-10-21
> 상위 기획: [`docs/01-plan/features/ux.plan.md`](../../01-plan/features/ux.plan.md)
> 상태: 설계 확정, 구현 전
> 역할: **백엔드(Codex)와 프론트엔드(Claude)가 각자 구현할 때 따르는 단일 계약서.** 이 문서의 타입·필드명·API 스펙·상수는 양측이 동일하게 사용한다. 한쪽이 임의로 바꾸면 계약 위반이다.

## 0. 이 문서의 사용 규칙

- 기획서의 "제안"은 이 설계서에서 **확정 계약**이 된다. 충돌 시 이 문서 → 기획서 순으로 따른다. 단 기획서 §8의 완화 불가 조건(**85% 고위험·단조성·본인 권한·입력 검증·500줄 제한·DB 미적용**)은 어느 경우에도 완화하지 않는다.
- 이 문서는 **설계·스펙만** 담는다. UI/컴포넌트 구현 코드(JSX·렌더링 로직)는 포함하지 않는다. 포함된 TypeScript `interface`/`type`·상수·SQL은 양측이 복붙 가능한 **계약 정의**다.
- 실제 파일명·import 경로는 기존 인접 구조를 따른다. 아래 경로는 조사로 검증된 실제 위치 기준이다.

### 0.1 조사로 검증된 현재 상태 (기획서 수치 정정)

| 파일 | 기획서 표기 | **실제 줄 수** | 500줄 여유 |
| --- | --- | --- | --- |
| `components/rights/RightsResult.tsx` | 409 | **410** | 90 |
| `lib/registry/section-parsers.ts` | 483 | **483** | 17 |
| `app/api/analyze-unified/analyze-service.ts` | 489 | **489** | 11 |
| `components/rights/RightsGraphView.tsx` | 499 | **500** | 0 (즉시 분리) |
| `app/(personal-home)/renewal/jeonse/JeonseRenewalContent.tsx` | 516 | **517** | 0 (즉시 분리) |

→ 기능 추가 전 **분리 선행**이 강제된다(특히 RightsGraphView, JeonseRenewalContent는 이미 한도 초과/근접).

### 0.2 조사로 확인된 기존 결함 (설계에 정정 계약 포함)

| 결함 | 근거 (실측) | 설계 정정 |
| --- | --- | --- |
| 화면 등급 기준 불일치 | `rights-result-styles.ts:22` `getScoreLabel`이 70→안전/40→주의 (서버는 85/70/50/30/F) | §5.1 공용 등급 정책으로 교체 |
| V-Score 필드명 오참조 | `AnalysisHistory.tsx:57` `extractKeyMetrics`가 `vScore.finalScore` 참조, **실제 반환 필드는 `vScore.score`** | §4.3 정규화 계층에서 `score` 우선 + 레거시 `finalScore` 폴백 |
| 선순위 감점 과소 | `evaluators.ts` `evaluateTotalClaims`: >60%→8, >80%→15, >100%→25 (85%가 15점 감점 → 85점 안전) | §4.1 감점표 재보정 |
| 계약 보증금 필드 부재 | `analyze-service.ts` `AnalysisInput`에 실제 계약 보증금 없음. `propertyInfo.jeonsePrice`는 시장평균/등기 전세권 총액 | §4.1 `userDeposit` 신규 입력 연결 |

---

## 1. 아키텍처 및 컴포넌트 구조 (파일 분리 계획)

### 1.1 레이어 원칙 (5대원칙 §2·§5 적용)

```
app/api/**           서버 계약: 인증·입력검증·본인조건·DB 접근 (Codex)
  └ *-service.ts     비즈니스 파이프라인 (서버 전용, Prisma/인증 비밀 포함 가능)
lib/**               공용 순수 로직: 점수·파서·정책 상수 (서버/클라 공유, 비밀 없음)
  └ risk/ v-score/ registry/   도메인별 분리
hooks/**             클라 상태·데이터 생명주기 (fetch·캐시·무효화)
components/**         UI 조합·표시 전용 (Claude). 서버 산식 재구현 금지
schemas/**           Zod 입력 스키마 (서버 검증 단일 소스)
types/ (또는 lib/*-types.ts)   공용 DTO 타입
```

**계약:** 점수·등급·비율 계산은 **`lib/` 서버 산식이 단일 소스**다. 컴포넌트는 서버가 내려준 값을 표시만 한다. "UI에서만 숫자를 낮추는" 경로는 금지(기획 §4.1).

### 1.2 파일 분리 계획 (기능별)

각 분리 단위는 500줄 이내. 분리는 해당 기능 구현 **착수 시점에 선행**하고, 분리 직후 `npm run build` 확인 후 기능 추가.

#### ① + ⑤ 위험산정 보정 · 점수/경고 배치
| 신규/분리 | 경로(제안) | 책임 | 레이어 |
| --- | --- | --- | --- |
| 분리 | `lib/risk/claims-policy.ts` | 선순위 비율 감점표·85% 정책 상수 (서버/화면/PDF 공유) | lib |
| 수정 | `lib/risk/evaluators.ts` (396줄) | `evaluateTotalClaims` 감점 재보정, 중복가중 제거 | lib |
| 수정 | `lib/risk-scoring.ts` (238줄) | 등급 경계·단조성 보장·복합규칙 점검 | lib |
| 신규 | `lib/risk/grade-policy.ts` | 공용 등급 경계·라벨·색상 단일 정의 | lib |
| 수정 | `components/rights/rights-result-styles.ts` (27줄) | `getScoreLabel` → `grade-policy` 재사용 | components |
| 분리 | `components/rights/RightsScoreCard.tsx` | 독립 안전점수 카드 | components(UI) |
| 분리 | `components/rights/HighRiskSummary.tsx` | 고위험 요약 영역 | components(UI) |
| 수정 | `components/rights/RightsResult.tsx` (410줄) | 배치 순서만 조정, 하위 컴포넌트 조합 | components(조합) |
| 분리 | `app/api/analyze-unified/property-normalize.ts` | `analyze-service`에서 물건정보 정규화·지표 구성 추출 | 서버 |

#### ② V-Score 설명 / ⑧ 그래프
| 신규/분리 | 경로(제안) | 책임 |
| --- | --- | --- |
| 분리 | `components/rights/VScoreExplainPanel.tsx` | 5축 설명 (서버 DTO 표시 전용) |
| 분리 | `components/rights/graph/RightsGraphNode.tsx` | 노드 상세 |
| 분리 | `components/rights/graph/RightsGraphLegend.tsx` | 범례 |
| 분리 | `components/rights/graph/RightsRiskIndexPanel.tsx` | 그래프 위험지수(종합점수와 분리) |
| 수정 | `components/rights/RightsGraphView.tsx` (500줄) | 위 3개 조합으로 축소 |

#### ③ 이력 상세·비교·PDF
| 신규/분리 | 경로(제안) | 책임 |
| --- | --- | --- |
| 신규 | `app/api/user/analyses/[id]/route.ts` | 본인 상세 조회 GET |
| 분리 | `app/(personal-home)/profile/components/AnalysisDetailModal.tsx` | 상세 모달 |
| 분리 | `app/(personal-home)/profile/components/AnalysisCompareReport.tsx` | 비교 리포트(PDF 캡처 대상 DOM) |
| 신규 | `app/(personal-home)/profile/hooks/useAnalysisDetail.ts` | 상세 조회·비교·캐시 무효화 훅 |
| 수정 | `app/(personal-home)/profile/components/ProfileDashboardPanel.tsx` (218줄) | 모달 분리로 축소 |
| 신규 | `lib/analysis/normalize-record.ts` | 신규/레거시 이력 수치 정규화 계층 |

#### ④ 체크리스트 서버 저장
| 신규/분리 | 경로(제안) | 책임 |
| --- | --- | --- |
| 신규 | `lib/jeonse/checklist-items.ts` | 15개 항목(id 0~14) 서버/클라 공용 정의 + `schemaVersion` |
| 신규 | `schemas/jeonse-checklist.ts` | Zod 입력 스키마(서버 검증) |
| 신규 | `app/api/user/jeonse-checklists/route.ts` | GET/PUT |
| 신규 | `app/(personal-home)/renewal/jeonse/hooks/useJeonseChecklist.ts` | 저장·복원·충돌·직렬화 훅 |
| 분리 | `app/(personal-home)/renewal/jeonse/components/ChecklistPanel.tsx` | 체크리스트 UI |
| 수정 | `app/(personal-home)/renewal/jeonse/JeonseRenewalContent.tsx` (517줄) | 패널/훅 분리로 축소 |

#### ⑥ 면적 / ⑦ 주소 파싱
| 신규/분리 | 경로(제안) | 책임 |
| --- | --- | --- |
| 분리 | `lib/registry/title-address-parser.ts` | 표제부 주소 후보 추출·완전표시 |
| 분리 | `lib/registry/title-area-parser.ts` | 전유부분 면적 우선 파싱·단위 정규화 |
| 수정 | `lib/registry/section-parsers.ts` (483줄) | 위 2개 호출로 축소 |
| 수정 | `lib/registry/parsing-utils.ts` (263줄) | `extractArea` 단위 변형 정규화 보강 |
| 수정 | `app/api/analyze-unified/analyze-service.ts` | `parseAreaValue` 중복 제거, 공용 파서로 통일 |

---

## 2. 데이터 모델

### 2.1 신규 DB 스키마 — `JeonseChecklist` (④ 전용)

> **DB 미적용 계약:** 아래 스키마는 `prisma/schema.prisma` 수정과 `scripts/sql/2026-10-21-add-jeonse-checklist.sql` **작성까지만** 허용. `db push`/`migrate *`/`db execute`/직접 연결 **실행 금지**. 적용 전까지 ④ 기능은 비활성화하고 "사용 가능"처럼 안내하지 않는다(기획 §4.4, §6).

Prisma 모델 (기존 cuid PK·타임스탬프·`@@unique`·`@@index` 관례 준수):

```prisma
model JeonseChecklist {
  id            String   @id @default(cuid())
  userId        String                           // 세션에서만 결정 (클라 제공 금지)
  address       String                           // 표시용 주소, AES-256-GCM 암호화(PII_FIELDS 등록)
  addressKey    String                           // 정규화 주소+동호수의 hashForSearch(HMAC) — blind index
  state         Json                             // { "0": true, ..., "14": false } 허용 ID·boolean만
  schemaVersion Int                              // checklist-items.ts 정의 버전
  revision      Int      @default(1)             // 동시수정 충돌 감지
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, addressKey])                 // 암호문이 아닌 blind index로 유일성
  @@index([userId])
}
```

**User 모델 역관계 추가 (기존 `analyses`/`assets` 패턴과 동일):**
```prisma
// model User { ... 기존 필드 ...
  jeonseChecklists JeonseChecklist[]
// }
```

**PII 암호화 등록 계약** — `lib/pii-crypto-tree.ts`의 `PII_FIELDS`에 추가:
```typescript
JeonseChecklist: ["address"],   // addressKey는 암호화 대상 아님(blind index)
```
→ `state`·`addressKey`는 암호화하지 않는다. `addressKey`는 `hashForSearch(정규화주소+동호수)` 결과이며 조회/유일성 판단은 암호문이 아닌 이 blind index로만 수행한다(기획 §4.4, §5.2).

**SQL 파일(`scripts/sql/2026-10-21-add-jeonse-checklist.sql`)은 위 모델과 1:1 일치**해야 한다: 동일 테이블·컬럼·FK(ON DELETE CASCADE)·`UNIQUE(userId, addressKey)`·`INDEX(userId)`·기본값(`revision=1`, 타임스탬프).

### 2.2 기존 모델 (변경 없음, 참조용)

```prisma
model Analysis {              // 이력 저장 — ③에서 상세조회 대상
  id String @id @default(cuid())
  userId String
  type String                 // "rights" | "jeonse" | "contract" | "prediction" | "feasibility"
  typeLabel String
  address String              // AES-256-GCM 암호화
  summary String @db.Text
  data String @db.Text        // 분석 결과 원문(JSON 직렬화 문자열)
  fraudRisk Json?             // FraudRiskResult
  vScore Json?                // VScoreResult
  createdAt DateTime @default(now())
  @@index([userId]) @@index([createdAt]) @@index([address])
}
```
→ ③은 신규 테이블 없이 기존 `Analysis`를 사용한다. 비교 대상 매칭은 `address`(암호화) 자체가 아닌 **정규화 주소+동호수**로 서버에서 수행하되, `Analysis`에는 blind index 컬럼이 없으므로 **본인(`userId`) + 동일 `type` 범위로 조회 후 서버에서 복호화된 주소를 정규화해 매칭**한다(§4.3).

### 2.3 공용 타입 정의 (계약 — 양측 공유)

#### ① 위험산정 지표 (서버 → 응답 → 화면)

```typescript
// lib/risk/claims-policy.ts (신규)

/** 선순위 비율 지표 — 분모를 라벨에 명시 (기획 §4.1) */
export interface ClaimRatioSet {
  priorClaims: number;          // C: 확인 가능한 선행 근저당·저당·선순위 금액 합계(원)
  marketValue: number | null;   // V: 유효/추정 시세(원). 미확인 null
  userDeposit: number | null;   // D: 실제 계약 보증금(원). 미입력 null
  ratioToMarket: number | null; // C/V × 100. V 없으면 null
  ratioToDeposit: number | null;// C/D × 100. D 없으면 null
  jeonseRatio: number | null;   // D/V × 100 (실제 계약 기준)
  marketJeonseRatio: number | null; // 지역/시장 참고 전세가율(별도 필드)
  combinedBurden: number | null;// (C+D)/V × 100
  claimBasis: "actual" | "maxClaim"; // 실제 잔액 미확인 시 "maxClaim"(채권최고액 기준)
  priorityConfirmed: boolean;   // 순위 확정 여부. false면 "확인된 현행 채권 기준" 표시
  uncertainClaims: boolean;     // 금액·순위 미확인 권리 존재 여부(별도 알림)
}
```

#### 점수·등급 (기존 타입 재사용, 필드명 고정)

```typescript
// lib/risk-scoring.ts (기존) — 변경 없이 계약으로 고정
export interface RiskScore {
  totalScore: number;        // 0-100, 높을수록 안전 (= safetyScore)
  grade: "A"|"B"|"C"|"D"|"F";
  gradeLabel: string;        // 안전|양호|주의|위험|매우위험
  gradeColor: string;        // emerald|blue|amber|orange|red
  factors: RiskFactor[];
  mortgageRatio: number;
  totalDeduction: number;    // 계약: = 실제 반영 factors의 deduction 합
  summary: string;
  interactionPenalties?: RiskInteractionResult;
  temporalPatterns?: TemporalRiskResult;
  // ↓ 신규 추가 필드 (기획 §4.1 파생결과)
  claimRatios?: ClaimRatioSet;     // ① 지표 세트
  scoreRuleVersion: string;        // 점수 규칙 버전(예: "risk-v2-2026-10")
  decisiveHighRisk?: {             // 결정적 고위험 사유(파생모델이 상쇄 불가)
    reason: string;                // 예: "선순위 부담 기준 고위험"
    basis: "ratioToMarket"|"ratioToDeposit";
    ratio: number;                 // 판정에 쓴 반올림 전 수치
  } | null;
}
export interface RiskFactor {
  id: string; category: string; description: string;
  deduction: number; severity: "critical"|"high"|"medium"|"low"; detail: string;
}
```

> **safetyScore / riskScore 계약:** `safetyScore = riskScore.totalScore`, `riskScore = 100 - totalScore`. 둘의 합은 항상 100. `riskScore`는 **확률이 아니라** 안전점수의 역수치다. 위치: `analyze-service.ts`.

#### V-Score (기존 타입 재사용 — 실제 필드명 고정)

```typescript
// lib/patent-types.ts (기존)
export interface VScoreResult {
  score: number;             // ← 실제 필드. (레거시 일부 이력은 finalScore)
  grade: "A"|"B"|"C"|"D"|"F";
  gradeLabel: string;
  sources: VScoreSource[];   // 5축
  interactions: VScoreInteraction[];
  explanation: VScoreExplanation;
  metadata: { version: string; calculatedAt: string; confidenceLevel: number; algorithmId: string };
}
export interface VScoreSource {
  id: "registry"|"price"|"contract"|"landlord"|"region";
  name: string; score: number; weight: number;
  weightedScore: number; contribution: number;  // weight ≠ contribution (구분 표시)
  dataAvailable: boolean;    // ② 미확보 표시 근거
  details: string;
}
```

#### ④ 체크리스트 DTO

```typescript
// lib/jeonse/checklist-items.ts (신규)
export const CHECKLIST_SCHEMA_VERSION = 1;
export interface ChecklistItemDef { id: number; group: string; label: string; }
export const CHECKLIST_ITEMS: ChecklistItemDef[];  // id 0~14 고정 (아래 §3.2 PUT 참조)
export const CHECKLIST_TOTAL = 15;

// API 응답 DTO
export interface JeonseChecklistDTO {
  address: string;              // 복호화된 표시 주소(본인에게만)
  schemaVersion: number;
  revision: number;             // 미생성 시 0
  state: Record<string, boolean>; // 키는 "0"~"14"만
  updatedAt: string | null;     // 서버 시각
}
```

---

## 3. API 스펙

> 공통 계약 (전 엔드포인트):
> - 인증: `import { auth } from "@/lib/auth"` → `const s = await auth(); if (!s?.user?.id) 401`. **본인 조건(`userId`)은 세션에서만** 결정, 클라 제공 userId/id 무시.
> - 변경요청(PUT/POST/DELETE): `import { validateOrigin } from "@/lib/csrf"` → `const e = validateOrigin(req); if (e) return e;`
> - 개인 데이터 응답: `Cache-Control: no-store` 헤더 필수.
> - 에러 응답 표준: `NextResponse.json({ error: "<한국어 사용자 메시지>" }, { status })`. **DB 스택·쿼리·PII·주소·체크상태를 에러/로그에 노출 금지**.
> - 상태코드: 400 입력오류 · 401 미인증 · 403 Origin거부 · 404 없음/타인ID(동일 처리) · 409 충돌 · 413 본문초과 · 500 내부오류.

### 3.1 `GET /api/user/analyses/[id]` — 이력 상세 조회 (③, 신규)

- **인증:** 필요 (401). 본인 소유만.
- **Path param:** `id` (Analysis.id)
- **Query params:**
  - `includePrevious=1` (선택): 동일 회원·동일 물건(정규화 주소+동호수)·동일 `type`의 **직전 시각** 결과 1건 함께 반환
- **동작:**
  1. `prisma.analysis.findFirst({ where: { id, userId: s.user.id } })` — `id + userId` 동시 조건. 없으면 404(타인 ID도 404).
  2. `includePrevious=1`이면 본인·동일 `type` 이력을 조회 → 서버에서 복호화 주소 정규화 매칭 → 현재보다 `createdAt`이 이전인 것 중 최신 1건. 동률 시 `id` 내림차순 고정.
  3. `data`(JSON 문자열) 파싱 후 `lib/analysis/normalize-record.ts`로 정규화(`vScore.score` 우선, 레거시 `finalScore` 폴백, 미확인은 `null`=비교불가).
- **Response 200:**
```json
{
  "current": {
    "id": "...", "type": "rights", "typeLabel": "권리분석",
    "address": "서울시 ...", "unitNumber": "101동 1203호",
    "createdAt": "2026-10-21T...",
    "metrics": {
      "safetyScore": 42, "grade": "D",
      "ratioToMarket": 85.2, "jeonseRatio": 78.1,
      "marketValue": 500000000, "userDeposit": 390000000, "depositSource": "user",
      "vScore": 44, "vScoreGrade": "D",
      "riskFactors": [{ "id": "...", "description": "...", "severity": "high" }]
    },
    "scoreRuleVersion": "risk-v2-2026-10"
  },
  "previous": { "...": "current와 동일 형태 | null" },
  "diff": {
    "safetyScore": { "delta": -8, "direction": "worse" },
    "jeonseRatio": { "deltaPp": 3.2 },
    "addedRiskFactors": ["..."], "resolvedRiskFactors": ["..."],
    "ruleVersionChanged": true
  }
}
```
  - 점수는 **점 차이**, 비율은 **%p 차이**. 안전점수 상승=`improved`, 위험점수 상승=`worse`. 규칙 버전 다르면 `ruleVersionChanged:true` + "산정 기준 변경" 안내.
  - 비교 불가 항목은 `null`. **0점으로 채우지 않는다.** 요약 문장 파싱 추정 금지.
- **Response 실패:**
  - 404: `{ "error": "분석 기록을 찾을 수 없습니다." }` (없음·타인·삭제 동일)
  - 400: `includePrevious` 등 잘못된 쿼리
  - 500: `{ "error": "서버 오류가 발생했습니다." }`
- **계약:** 재분석·AI 호출·분석횟수 차감 **없음**(저장 스냅샷만). 비교 대상도 서버에서 본인 소유 확인.

### 3.2 `GET /api/user/jeonse-checklists?address=...` — 체크리스트 조회 (④, 신규)

- **인증:** 필요 (401).
- **Query params:** `address` (필수, 최대 300자. 동·호수 포함)
- **동작:**
  1. 서버에서 주소 정규화(공백·Unicode 정리, 로/길·건물번호·지번·동호수 **보존**) → `addressKey = hashForSearch(정규화값)`.
  2. `prisma.jeonseChecklist.findUnique({ where: { userId_addressKey: { userId: s.user.id, addressKey } } })`.
  3. 미생성이면 빈 상태 반환(`revision: 0`, `state: {}`).
- **Response 200:** `JeonseChecklistDTO` (복호화 `address`는 본인에게만)
```json
{ "address": "서울시 ... 101동 1203호", "schemaVersion": 1, "revision": 0, "state": {}, "updatedAt": null }
```
- **Response 실패:** 400(빈/과대 주소), 401, 500. 헤더 `Cache-Control: no-store`.

### 3.3 `PUT /api/user/jeonse-checklists` — 생성/갱신 (④, 신규)

- **인증:** 필요 (401) + `validateOrigin` (403).
- **Request body (JSON, 최대 16KB):**
```json
{
  "address": "서울시 ... 101동 1203호",
  "schemaVersion": 1,
  "expectedRevision": 0,
  "state": { "0": true, "1": false, "...": "...", "14": true }
}
```
- **서버 검증(Zod, 거부 시 400):**
  - `address`: 1~300자, 공백만 불가
  - `schemaVersion`: 현재 지원 버전과 일치(불일치 400 "버전 미지원")
  - `expectedRevision`: 0 이상 정수
  - `state`: **키는 `"0"`~`"14"`만**, 값은 boolean만. 그 외 키/타입/과대 본문 거부
  - 클라 제공 `userId`/`id`/`updatedAt`은 **무시**(저장 범위 변경 불가)
- **동작 (원자적):**
  1. `addressKey` 서버 계산.
  2. 레코드 없음 + `expectedRevision=0` → 생성(`revision=1`). 생성 경합은 `@@unique([userId, addressKey])`로 1건만.
  3. 레코드 있음 + `expectedRevision === 기존 revision` → `revision+1`로 갱신. (조건부 업데이트: `updateMany({ where: { userId, addressKey, revision: expectedRevision } })` count=0이면 충돌)
  4. `expectedRevision` 불일치 → **409 + 최신 본인 상태 반환**(자동 덮어쓰기 금지).
- **Response 200:** 갱신된 `JeonseChecklistDTO` (서버가 `id`·`userId`·시각·`revision` 결정)
- **Response 409:** `{ "error": "다른 기기에서 먼저 저장되었습니다.", "latest": { /* JeonseChecklistDTO */ } }`
- **Response 실패:** 400(검증), 401, 403(Origin), 413(16KB 초과), 500. 헤더 `Cache-Control: no-store`.
- **계약:** 모든 조회·갱신 `where`에 세션 `userId` 포함. 관리자/부동산 대리 접근 예외 없음. 후속 ID 경로 추가해도 타인·없는 ID는 동일 404. 완료개수·총개수는 `CHECKLIST_ITEMS` 정의로 계산(임의 JSON 키 집계 금지).

### 3.4 기존 API 영향 (①·⑥·⑦)

| 엔드포인트 | 변경 | 계약 |
| --- | --- | --- |
| `POST /api/analyze-unified` (route.ts 220줄) | **신규 입력 필드 추가** | body에 `userDeposit?: number` 추가. 서버 검증: 유한·0 이상·원 단위. 음수·NaN·Infinity·범위초과 거부(400). **미입력 시 시장평균으로 조용히 대체 금지** → `claimRatios.userDeposit=null` |
| 동 응답 | 지표·버전 추가 | 응답에 `riskScore.claimRatios`, `riskScore.scoreRuleVersion`, `riskScore.decisiveHighRisk` 포함. `propertyInfo.area`는 전유부분 우선(⑥), `propertyInfo.address`는 완전표시+`unitNumber` 분리(⑦) |

> `POST /api/analyze-unified` 입력 검증은 기존 rawText 최소 20자·CSRF·Rate limit·Daily usage 흐름을 유지하고 `userDeposit`만 추가한다. 기존 필드 의미는 바꾸지 않는다(기획 §4.1 "조용히 바꾸지 말 것").

---

## 4. 기능별 설계 상세

### 4.1 ① 위험산정·등급 보정 (P0)

**감점 재보정 계약** — `lib/risk/claims-policy.ts`의 단일 소스. `r`은 **반올림 전** 수치. `C/V`와 `C/D` 각각 평가 후 **더 큰 감점 채택**(단순 합산 금지), 근거에는 각각 표시.

| 비율 `r` | 최소 감점 | 단일요인 시 안전점수 상한 | 등급 |
| --- | --- | --- | --- |
| `0 ≤ r < 60` | 0 | 100 | A 가능 |
| `60 ≤ r < 70` | 15 | 85 | A 이하 |
| `70 ≤ r < 80` | 30 | 70 | B 이하 |
| `80 ≤ r < 85` | 45 | 55 | C 이하 |
| `85 ≤ r < 100` | **51** | **49** | **D 이하, 고위험** |
| `r ≥ 100` | 71 | 29 | F, 매우위험 |

**산식 불변식(단조성·일관성) — 테스트로 강제:**
- 다른 입력 고정 시 `r`↑ → 위험점수 내려가지 않음(구간 내 동일·0/100 포화 허용). `C↑`(채권 증가)·`V↓`(시세 하락)·`D↓`(보증금 고정 시 C/D↑) 각각 검증.
- `totalDeduction === Σ(반영 factor.deduction)`, `safetyScore + riskScore === 100`.
- 같은 채권 부담 계열(근저당비율·합산채권)은 **최대 감점으로 묶고** 중복 가중 제거. 압류·경매 등 독립 위험만 추가 감점.
- 85% 경계 명시 검증: `84.99 / 85 / 85.01 / 100`. 반올림 전 판정, 화면 반올림과의 관계 안내.
- 분모/채권 미확인을 "0% 안전"으로 표현 금지 → `analyzable` 또는 `claimRatios.*=null` 상태로.

**파생 결과 일관성:**
- `analyze-service`가 위험분석·진단·V-Score 입력·근거·AI 의견에 **동일 보정 결과** 전달.
- `fraudRisk`(FraudRiskResult)와 `vScore`는 별도 모델 — `100-safetyScore`나 실제 사기확률과 혼용 금지. 종합 안내는 `decisiveHighRisk` 우선, 다른 지수가 고위험을 상쇄 못 함. 85% 사례에서 최상단 결론이 "안전"인 경로는 없어야 함.
- `scoreRuleVersion`을 결과 JSON에 저장. 과거 결과는 당시 점수 보존(새 규칙 덮어쓰기 금지), 버전 다른 비교엔 "산정 기준 변경" 표시.

### 4.2 ⑤ 점수/경고 배치 (P0)

- `RightsResult` 렌더 순서(계약): **고위험 요약(`HighRiskSummary`) → 독립 안전점수 카드(`RightsScoreCard`) → 지표·점수 근거 → 상세 위험 목록**. 모바일(360px)에서도 고위험 요약이 최초 영역.
- 점수 카드: "권리분석 안전점수 · 높을수록 안전" + 기준시점 + 산정 가능 여부. 고위험 요약은 별도 배경·아이콘·제목. 색상 외 **텍스트·아이콘**으로도 구분.
- 동일 지표에서 점수·등급·문구 충돌 시 **서버 결과 오류**로 취급(화면에서 땜빵 금지). 모델 간 차이는 출처·범위 설명, 결정적 고위험 우선.
- `analyzable=false`·비율 계산불가·확인범위 제한은 별도 상태. "위험 없음/0%/안전 100점"으로 바꾸지 않음(기존 분기 유지).

### 4.3 ③ 상세·비교·PDF (P1)

- **정규화 계층(`lib/analysis/normalize-record.ts`):** `vScore.score` 우선, 확인된 레거시 `finalScore`만 폴백(현재 `AnalysisHistory.extractKeyMetrics`의 `finalScore` 참조는 이 계층으로 교체). 미확인은 `null`=비교불가, **0 채움 금지**.
- **물건 매칭:** 고유 식별자(`propUid`) 있으면 우선, 없으면 정규화 주소+동호수 보수적 일치만. 도로명/지번 동등성 확인 못 하면 임의 결합 금지.
- **비교 항목:** 분석일·시세/실제보증금(+출처)·안전점수/등급·선순위비율/전세가율·V-Score·위험요인 추가/해소. 숫자·단위 기준 차이 계산.
- **PDF(`exportToPdf({ element, filename, title })` 재사용):**
  - 전용 리포트 DOM(`AnalysisCompareReport`)을 캡처. 스크롤·접힘에 잘리지 않게, 닫기/삭제 버튼·오버레이 제외, **차트 렌더 완료 후** 캡처.
  - 파일명 제어문자·경로문자 제거. 한국어 지원 — 직접 PDF 빌더로 대체 금지.
  - 생성 중 중복 클릭 방지, 실패 후 재시도, 모바일·다중 페이지. **상세 데이터 확보 전 내보내기 비활성화.**
- **모달:** 제목 연결·포커스 이동/복귀/가두기·Escape 닫기·본문 스크롤. `useSession` 계정 변경 시 상세/비교 캐시·지연 응답 무효화.
- 빈 상태 각각 안내: 이전 결과 없음 / 원문 없음 / 삭제된 비교대상 / 조회 실패.

### 4.4 ② V-Score 설명 (P1)

- `VScoreExplainPanel`은 서버 `VScoreResult.sources` 표시 전용. **산식 재구현 금지.**
- 축별 `score`·`weight`·`weightedScore`·`contribution`·`details`·`dataAvailable` 표시. "높을수록 안전" 명시. `weight ≠ contribution` 구분.
- 미확보 축(`dataAvailable=false`)은 "미확보/기본값 반영" 표시 — 현재 산식은 미확보 축 제외 재정규화가 아니며 기본값이 전부 50점도 아님(실제 반환값·근거로 표시).
- 전체 순서 설명(펼침): 가중합 → 상호작용 보정 → 신뢰도(`confidenceLevel`) 50점 방향 보정 → 반올림. `confidenceLevel`은 보증금 반환 확률 아님.
- 분석 불가 상태에선 V-Score 정상 평가처럼 표시 금지. 레거시 이력에 V-Score 없으면 "해당 분석에서 제공되지 않음".

### 4.5 ④ 체크리스트 (P1) — §2.1 모델 + §3.2/3.3 API

- 비회원: 세션 내 임시 체크 허용 + "로그인 후 기기 간 저장" 안내. 회원 영속은 서버 기준, **localStorage를 저장소로 재사용 안 함**.
- 상태: 저장 중/완료/실패/충돌 구분. 완료 시각은 서버 응답 후 표시. **연속 입력은 요청 직렬화/병합**해 응답 역전으로 상태 되돌림 방지.
- 다른 기기·새로고침·재진입·탭 복귀 시 재조회. 미저장 변경과 서버 변경 충돌 시 사용자 확인 후 재적용.
- 회원/주소 전환 시 이전 요청 취소·응답 무효화·상태 초기화.
- 레거시 단일 키(`vestra_jeonse_checklist_v1`) **자동 업로드 금지**. 로그인 후 대상 주소 명시 확인하는 **일회성 가져오기**만 제공(허용 ID만, 서버 기록 덮어쓰기 금지, 서버 저장 성공 후에만 이전 키 제거).

### 4.6 ⑥ 전용면적 파싱 (P1)

- `title-area-parser.ts`: 표제부를 건물전체/전유부분/대지권 블록 분리, **대상 동·호수 전유부분 우선**(`exclusiveArea`). 첫 면적 무조건 채택 금지.
- 단위 정규화: `㎡`·`m²`·`m2`·`제곱미터`·전각 숫자·소수점 주변 공백·행바꿈 → 동일 양수. 표준 표시값 `84.97㎡`와 원문 근거 구분.
- 집합건물은 `exclusiveArea` 기준으로 `area`·`propertyInfo.area`·시세추정 입력 일관 연결. 일반건물 면적을 근거 없이 전용면적이라 부르지 않음.
- 대지·연면적·대지권비율·다른 호수 면적을 전용면적으로 쓰지 않음. 충돌 시 경고·미확인 반환. 단위 없는 숫자 임의 추정 금지.
- `analyze-service.parseAreaValue`와 공용 파서 중복 제거. 잘못된 면적이 시세 비교매물 필터까지 전달되지 않게 연결 검증.

### 4.7 ⑦ 주소 완전표시 (P1)

- `title-address-parser.ts`: 일반/집합건물 공용 후보 추출. `[도로명주소]`·숫자 포함 도로명·로/길·건물번호·부번·지번·산번지·시도/시군구/읍면동리·다중 행 지원.
- **표제부 물건 주소 범위에서만** 후보 선택. 소유자·채권자 주소, 구조·용도·면적·등기일자 혼입 방지(경계).
- 도로명 있으면 건물번호까지 완전표시+지번 보존. 지번만 있으면 지번 완전표시. **없는 도로명 생성 금지.**
- `address`와 `unitNumber` 분리 보관, 표시 시 중복 없이 조합. 누락·불일치 시 출처 표시.
- 시장 조회용 주소 = 결과 표시용 주소(같은 물건). `inputSource`별 입력 주소 우선 보존하되 **잘린 파싱 주소를 무조건 시장 조회에 우선하는 현재 경로 보완**.
- 기본정보 카드·PDF는 긴 주소 **줄바꿈**(말줄임만으로 숨김 금지). 정규화는 ③·④에서도 재사용하되 검증 안 된 동등성 생성 금지.

### 4.8 ⑧ 그래프·종합위험도 (P1)

- 기존 `RightsGraphView`·`lib/rights-graph-engine.ts` 결과 활용(재구현 금지). 의미·탐색·접근성만 보강.
- 현행 권리 기본 표시, 말소는 토글·취소선·상태 라벨로 구별. 부기등기는 원권리와 연결(신규 채권처럼 중복 표현 금지).
- 노드: 권리종류·채권금액·접수일·확인 가능 순위. 클릭/키보드로 원문 근거 + "내 보증금 회수 영향" 열람.
- 노드 평균 %는 "권리 구성 참고 지수"로 명명(사고확률·종합위험도로 부르지 않음). 엔진 `totalSystemRisk`는 "권리 그래프 위험지수"로 분리.
- **종합위험도 표시는 ①의 공용 안전/위험점수에서만 파생**. 그래프 지수를 종합점수에 재합산 금지. 고위험 노드가 노드 수에 희석되어 결론이 "안전"으로 바뀌지 않게.
- 우선변제·실제 배당 확정에 필요한 계약일/대항력/확정일자 없을 수 있음을 상태 표시. 임차인 위치 추정 시 가정 명시.
- 작은 화면 노드 겹침·긴 이름/금액 처리, 텍스트 목록/표로 동일 내용 제공. 말소만 존재/권리 없음/엔진 결과 없음은 정상 빈 상태.

---

## 5. 공유 상수·정책 (단일 소스)

### 5.1 등급 정책 (`lib/risk/grade-policy.ts`, 신규 — 서버/화면/PDF 공유)

```typescript
export type RiskGrade = "A"|"B"|"C"|"D"|"F";
export const GRADE_THRESHOLDS: Array<{ min: number; grade: RiskGrade; label: string; color: string }> = [
  { min: 85, grade: "A", label: "안전",   color: "emerald" },
  { min: 70, grade: "B", label: "양호",   color: "blue"    },
  { min: 50, grade: "C", label: "주의",   color: "amber"   },
  { min: 30, grade: "D", label: "위험",   color: "orange"  },
  { min: 0,  grade: "F", label: "매우위험", color: "red"    },
];
export function getGrade(score: number): { grade: RiskGrade; label: string; color: string };
```
→ `rights-result-styles.ts`의 `getScoreLabel`(70/40 기준)·게이지의 중복 기준 **제거**하고 이 함수 재사용. `v-score.ts`·`fraud-risk-model.ts`의 자체 라벨은 각 모델 고유 의미이므로 유지하되, **권리분석 안전점수 등급은 이 단일 정책**을 쓴다.

### 5.2 개인 데이터·접근 제어 (전 신규 API 공통)

- 모든 경로에서 인증 + 본인조건(`userId`) 동시. 주소를 안다고 타인 기록 접근 불가.
- 주소 암호화(`PII_FIELDS` 등록) + blind index(`hashForSearch`) 재사용. **암호문에 문자열 검색·유일성 검사 금지.** 모델 관계 매핑(`MODEL_RELATIONS`) 누락 검증.
- 응답 DTO는 필요한 필드만. 원문·소유자/채권자 PII 공개 범위 확대 금지. 에러에 DB 스택·쿼리·PII 노출 금지.
- 사용자 입력 포함 설명·주소·요약은 **일반 텍스트 렌더링**(XSS 방어). PDF도 HTML 직접 삽입으로 검증 우회 금지.

---

## 6. 구현 순서 (백엔드 → UI)

> 각 단계: 해당 파일 **분리 선행 → 백엔드/lib 산식·API → 테스트 → UI**. 단계마다 `npm run build` 통과 후 다음 단계.

| 단계 | 범위 | 백엔드/lib (Codex) | UI (Claude) | 완료 기준 |
| --- | --- | --- | --- | --- |
| 1 | ① 산정·등급 보정 | `claims-policy.ts`·`grade-policy.ts` 신규, `evaluators.ts`·`risk-scoring.ts` 보정, `analyze-service`에 `userDeposit`·`claimRatios`·`scoreRuleVersion`·`decisiveHighRisk` 연결, `route.ts`에 `userDeposit` 검증 | 입력 UI에 `userDeposit` 필드, `rights-result-styles` 등급 교체 | 85% 고위험·단조성·경계(84.99/85/100) 회귀 통과 |
| 2 | ⑤ 배치 | — | `HighRiskSummary`·`RightsScoreCard` 분리, `RightsResult` 순서 재구성 | ① 결과 그대로 사용, 화면 기준 불일치 0 |
| 3 | ⑥·⑦ 파싱 | `title-area-parser.ts`·`title-address-parser.ts` 분리, `section-parsers`·`parsing-utils` 보강, `parseAreaValue` 통일 | 기본정보 카드 주소 줄바꿈·면적 표시 | 전유부분 84.97㎡·주소 완전표시, fixture 신규 형식 통과 |
| 4 | ②·⑧ 설명/시각화 | (서버 DTO 그대로) | `VScoreExplainPanel`, `RightsGraphView` 분리(노드/범례/위험지수) | 보정 점수·면적·주소·결측 상태 동일 근거 표시 |
| 5 | ③ 상세·비교·PDF | `GET /api/user/analyses/[id]`, `normalize-record.ts` | `AnalysisDetailModal`·`AnalysisCompareReport`·`useAnalysisDetail`, `ProfileDashboardPanel` 분리 | 본인 상세·직전 이력·버전 차이·레거시·PDF·재분석 호출 없음 |
| 6 | ④ 체크리스트 | `checklist-items.ts`·`schemas/jeonse-checklist.ts`, `GET`/`PUT` API, `schema.prisma`+SQL **작성만**, `PII_FIELDS` 등록 | `ChecklistPanel`·`useJeonseChecklist`, `JeonseRenewalContent` 분리 | 서버 권한·경합(409)·검증 통과, 500줄 초과 해소, **DB 미적용 상태로 기능 비활성** |
| 7 | 통합 검수 | 8건 수용 기준 증거 연결 | — | 실제 DB 적용 미실행 확인, 미검증 DB E2E 잔여조건 명시 |

> ④는 "DB 미적용 코드 산출 상태"와 "실제 교차기기 저장 검증 완료 상태"를 **구분 보고**한다. 적용 필요성을 이유로 금지된 DB 명령 실행 금지(기획 §6).

### 6.1 후속 검증 매핑 (기존 Vitest 기반)

| 영역 | 핵심 검증 | 기존 기반 |
| --- | --- | --- |
| ① 산식 | 비율 0/60/70/80/84.99/85/85.01/100/120, 85% 단일요인 고위험, C↑·V↓·D↓ 단조성, 중복합산·말소제외 | `__tests__/risk-scoring.test.ts` |
| ① 일관성 | Σ감점=총감점, 안전+위험=100, 서버/화면/PDF 등급 일치, 파생모델 비상쇄 | `__tests__/v-score.test.ts`, `__tests__/fraud-risk-model.test.ts` |
| ③ 이력 | 경량목록→상세, 직전 이력, 버전차이/원문없음/비교없음, 현재/레거시 필드, 재분석 없음 | `__tests__/api-sync-data.test.ts` 패턴 신규 API 테스트 |
| ④ 보안 | 비인증·타인ID/주소/변조userId·미지원 키/타입/버전·과대본문·Origin·본인조건 없는 DB호출 부재 | mock Prisma 신규 API 테스트 |
| ④ 저장 | 신규/복원/주소분리/계정변경/저장실패/응답역전/동일 revision 경합/가져오기 실패 | 서비스·훅 테스트(실제 교차기기는 DB 준비 후) |
| ⑥ 면적 | 전유 84.97㎡ vs 건물/대지 동시, 단위변형·줄바꿈·다른호수·결측·충돌, 시세필터 전달값 | `__tests__/registry-parser.test.ts` |
| ⑦ 주소 | 로/길·도로명·건물번호/부번·지번·특별자치시·여러줄·동호수·소유자주소 혼입 방지, 조회/표시 일치 | 등기 파서 fixture 확장 |
| ⑤·⑧ UI | 360px/데스크톱, 색상 외 인지, 키보드·모달 포커스·텍스트 대체, 권리없음·말소만·고위험노드1개 | `__tests__/rights-graph-engine.test.ts`, 화면 검수 |

---

## 7. 절대규칙 준수 체크리스트 (구현자 필수 — 각 단계 완료 시 확인)

### 7.1 플랫폼 5대 원칙

- [ ] **① 500줄 제한** — 신규·수정 파일 모두 ≤500줄. RightsGraphView(500)·JeonseRenewalContent(517)·section-parsers(483)·analyze-service(489)는 **기능 추가 전 분리 선행**. 분리 직후 `npm run build` 확인.
- [ ] **② 단일 책임** — UI(`components`)·상태/로직(`hooks`)·비즈니스(`lib`)·API(`app/api`) 혼재 금지. 컴포넌트에서 점수 산식 재구현 금지.
- [ ] **③ 서버 검증·보안** — 신규 3개 API(`analyses/[id]`, `jeonse-checklists` GET/PUT) 전부 `auth()` 본인조건 + 변경요청 `validateOrigin` + Zod 입력검증 + `Cache-Control: no-store`. `userDeposit` 서버 검증(유한·0 이상). 클라 제공 userId/id 무시. 에러·로그 PII 미노출. 일반 텍스트 렌더(XSS).
- [ ] **④ 성능** — 이력 목록은 `light=1` 경량 유지, 상세는 모달 열 때만 조회(N+1·중복호출 방지). 비교 대상은 서버 조회(필요 컬럼만). 연속 체크 저장 직렬화.
- [ ] **⑤ 폴더 구조** — 라우트 전용 컴포넌트는 해당 라우트 `components/`, 공용 로직 `lib/`, 상태 `hooks/`, 서버 액션/라우트 `app/api/`, 스키마 `schemas/`.

### 7.2 최우선 절대규칙(0)·완화 불가 조건

- [ ] **85% 고위험** — 선순위비율(C/V·C/D) 85%에서 안전점수 ≤49·위험점수 ≥51·D/F. 최상단 결론 "안전" 경로 부재.
- [ ] **단조성** — 비율↑ 시 위험점수 비감소(C↑·V↓·D↓ 각각 테스트).
- [ ] **본인 권한** — 모든 신규 조회/갱신에 세션 `userId` 조건. 타인·없는 ID는 404. IDOR 없음.
- [ ] **입력 검증** — 음수·NaN·Infinity·과대본문(16KB)·허용 외 키/타입/버전 거부.
- [ ] **500줄 제한** — 위 §7.1①.
- [ ] **DB 미적용** — `schema.prisma`+SQL **작성만**. `db push`/`migrate *`/`db execute`/직접연결 **미실행**. 적용 전 ④ 기능 비활성, "사용 가능"처럼 안내 금지.
- [ ] **운영 검증(규칙 0-1)** — ①⑤⑥⑦ 보정은 로컬 빌드/테스트 후 `t-vestra` 테스트 배포에서 실화면 확인 → 대장 승격 지시 전 운영 미반영. ④는 DB 준비 전까지 실제 교차기기 저장 미검증 상태로 **구분 보고**.
- [ ] **실데이터 검증(검증 규율)** — 합성 fixture는 보조. "0건/통과/빌드성공"을 샘플 손검사 없이 신뢰하지 않음. 교차검증은 "어떻게 깨지나" 적대적으로.

---

## 8. 완료 정의

구현 완료 = 점수 모순이 **서버 산식부터** 해소되고, 파싱·설명·비교·PDF·체크리스트·그래프가 **같은 정의와 본인 권한**을 유지하며, §6.1 검증 증거가 연결된 상태. DB 적용은 별도 작업으로 남기고 코드/SQL 산출과 운영 활성화를 구분 보고한다. 완화 불가 6조건(§7.2)은 어떤 세부안에서도 완화하지 않는다.

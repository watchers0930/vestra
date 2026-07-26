# 긴급대응 플로우 & 데이터 출처 배지 (Alert Flow & Source Badge) 설계서

> **Plan**: `docs/01-plan/features/alert-flow.plan.md`
> **Version**: 5.43.4
> **Author**: Claude (대장 승인)
> **Date**: 2026-07-27
> **Status**: Design

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 파일 분리 계획

두 기능 모두 **신규 API 없음** — 클라이언트 사이드 렌더링, 기존 `GET /api/monitoring/alerts`만 활용.

```
[신규 파일]
lib/
  emergency-checklist.ts          # 긴급대응 체크리스트 상수 + isEmergencyAlert() 분류 함수
  source-badges.ts                 # 출처 배지 상수 + 페이지별 배지 매핑

components/common/
  EmergencyResponseModal.tsx       # 긴급대응 모달 (로컬 상태만, API 없음)
  SourceBadge.tsx                  # 출처 배지 + 툴팁 (정적 컴포넌트)

[수정 파일]
app/(app)/monitoring/[id]/components/
  AlertTimeline.tsx                # 긴급대응 버튼 + 모달 마운트 (현재 241줄 → 약 275줄)

app/(app)/rights/
  page.tsx                         # SourceBadge 추가 (현재 290줄 → 약 302줄)

app/(app)/jeonse/analysis/
  page.tsx                         # SourceBadge 추가 (현재 59줄 → 약 68줄)

app/(app)/contract/
  page.tsx                         # SourceBadge 추가 (현재 254줄 → 약 265줄)

app/(app)/prediction/
  page.tsx                         # SourceBadge 추가 (현재 434줄 → 약 444줄)
```

모든 수정 대상 파일이 500줄 이하 — 분리 불필요.

### 1.2 의존 관계

```
EmergencyResponseModal
  └── lib/emergency-checklist.ts  (EMERGENCY_CHECKLIST, isEmergencyAlert)
  └── localStorage                (체크 상태 유지, DB 불필요)

SourceBadge
  └── lib/source-badges.ts        (SOURCE_BADGE_DEFINITIONS, PAGE_SOURCE_BADGES)

AlertTimeline (수정)
  └── EmergencyResponseModal      (import 추가)
  └── lib/emergency-checklist.ts  (isEmergencyAlert 조건 판단)

rights/page.tsx (수정)
jeonse/analysis/page.tsx (수정)   → SourceBadge import 추가
contract/page.tsx (수정)
prediction/page.tsx (수정)
```

---

## 2. 데이터 모델

### 2.1 기존 DB 모델 (변경 없음)

두 기능 모두 DB 스키마 변경 없음. 기존 `MonitoringAlert` 모델만 읽기 용도로 사용한다.

```prisma
model MonitoringAlert {
  id                  String            @id @default(cuid())
  monitoredPropertyId String
  changeType          String            // mortgage_added | seizure_added | ownership_changed | lien_added | etc.
  summary             String
  detail              String?           @db.Text
  riskLevel           String            @default("medium") // low | medium | high | critical
  isRead              Boolean           @default(false)
  monitoredProperty   MonitoredProperty @relation(...)
  createdAt           DateTime          @default(now())
}
```

### 2.2 TypeScript 타입 정의

#### `lib/emergency-checklist.ts`

```typescript
export type ChecklistItem = {
  id: string;
  label: string;
};

export type ChecklistStep = {
  stepNumber: 1 | 2 | 3;
  stepLabel: string;
  items: ChecklistItem[];
};

// localStorage 저장 형태: Record<itemId, boolean>
export type ChecklistState = Record<string, boolean>;
// localStorage key: `vestra_emergency_checklist_${alertId}`

// 긴급대응 트리거 대상 변동 유형
export const EMERGENCY_CHANGE_TYPES: string[] = [
  "mortgage_added",       // 근저당 추가
  "seizure_added",        // 압류 설정
  "ownership_changed",    // 소유권 이전
  "lien_added",           // 가압류 설정
  "provisional_registration", // 가등기 설정
];

// isEmergency 판단: riskLevel이 critical 또는 high이면서 대응 필요 변동 유형
export function isEmergencyAlert(changeType: string, riskLevel: string): boolean;

export const EMERGENCY_CHECKLIST: ChecklistStep[];
export const VICTIM_SUPPORT_PORTAL_URL: string; // "https://jeonse.go.kr"
```

#### `lib/source-badges.ts`

```typescript
export type SourceBadgeKey =
  | "court_registry"      // 대법원 등기부
  | "molit_price"         // 국토교통부 실거래가
  | "vworld_price"        // 공시지가(VWorld)
  | "building_registry";  // 건축물대장

export type SourceBadgeConfig = {
  key: SourceBadgeKey;
  label: string;    // 배지에 표시되는 짧은 이름
  tooltip: string;  // 마우스오버 시 설명
};

export const SOURCE_BADGE_DEFINITIONS: Record<SourceBadgeKey, SourceBadgeConfig>;

// 페이지별 배지 목록
export type SourceBadgePageKey =
  | "rights"
  | "jeonse_analysis"
  | "contract"
  | "prediction";

export const PAGE_SOURCE_BADGES: Record<SourceBadgePageKey, SourceBadgeKey[]> = {
  rights:          ["court_registry", "vworld_price", "building_registry"],
  jeonse_analysis: ["court_registry", "molit_price", "vworld_price", "building_registry"],
  contract:        ["molit_price"],                    // 계약서는 AI 분석, MOLIT 시세 참조만
  prediction:      ["molit_price", "vworld_price"],
};
```

#### `components/common/EmergencyResponseModal.tsx`

```typescript
export type EmergencyResponseModalProps = {
  open: boolean;
  onClose: () => void;
  alertId: string;          // localStorage 키 생성에 사용
  changeType: string;       // 변동 유형 (표시용)
  summary: string;          // 변동 요약 (모달 상단 표시)
  riskLevel: string;        // "critical" | "high"
  createdAt: string;        // ISO 8601 datetime string
  propertyAddress: string;  // 물건 주소 표시
};
```

#### `components/common/SourceBadge.tsx`

```typescript
import type { SourceBadgePageKey } from "@/lib/source-badges";

export type SourceBadgeProps = {
  pageKey: SourceBadgePageKey;
  className?: string;
};
```

---

## 3. API 스펙

이번 기능에서 **신규 API 엔드포인트 없음**. 기존 API를 읽기 용도로만 사용.

---

### 3.1 기존 API — 알림 목록 조회 (READ, 변경 없음)

#### `GET /api/monitoring/alerts`

| 항목 | 내용 |
|------|------|
| 메서드 + 경로 | `GET /api/monitoring/alerts` |
| 인증 | 필요 (NextAuth session) |
| 용도 | AlertTimeline에서 알림 목록을 받아 `isEmergencyAlert()` 로 긴급 여부 판단 |

**Query params**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `propertyId` | `string` (optional) | 특정 물건 알림만 조회 |
| `unread` | `"true"` (optional) | 미읽음만 조회 |
| `page` | `number` (optional, default 1) | 페이지 번호 |

**Response 200**

```json
{
  "alerts": [
    {
      "id": "clxxxxx",
      "monitoredPropertyId": "clyyyyy",
      "changeType": "seizure_added",
      "summary": "압류(세무서) 설정: 1,200만원",
      "detail": "...",
      "riskLevel": "critical",
      "isRead": false,
      "createdAt": "2026-07-27T08:15:00.000Z",
      "monitoredProperty": { "address": "서울시 강남구 ..." }
    }
  ],
  "total": 1,
  "unreadCount": 1,
  "page": 1,
  "totalPages": 1
}
```

**Response 401**

```json
{ "error": "인증 필요" }
```

**Response 429**

```json
{ "error": "요청 한도 초과" }
```

---

### 3.2 기존 API — 알림 읽음 처리 (WRITE, 변경 없음)

#### `PATCH /api/monitoring/alerts`

| 항목 | 내용 |
|------|------|
| 메서드 + 경로 | `PATCH /api/monitoring/alerts` |
| 인증 | 필요 (NextAuth session + CSRF Origin 검증) |
| 용도 | 모달 열람 후 해당 alert 읽음 처리 (AlertTimeline 기존 로직 활용) |

**Request body**

```json
{ "alertIds": ["clxxxxx"] }
```

또는 전체 읽음:

```json
{ "markAll": true }
```

**Response 200**

```json
{ "updated": 1 }
```

**Response 400**

```json
{ "error": "alertIds 배열이 필요합니다." }
```

**Response 401**

```json
{ "error": "인증 필요" }
```

---

### 3.3 외부 링크 (API 아님)

| 대상 | URL | 방식 |
|------|-----|------|
| 전세사기피해지원 포털 | `https://jeonse.go.kr` | `target="_blank" rel="noopener noreferrer"` |
| 전문가 연결 페이지 | `/expert-connect` | Next.js `<Link>` |

`VICTIM_SUPPORT_PORTAL_URL` 상수(`lib/emergency-checklist.ts`)로 관리 — URL 변경 시 단일 지점에서 수정.

---

## 4. 구현 순서

### Phase 1 — 상수/유틸리티 (백엔드 없음, 0개 API)

| 순서 | 파일 | 작업 | 완료 기준 |
|------|------|------|----------|
| 1 | `lib/emergency-checklist.ts` | `EMERGENCY_CHECKLIST`, `EMERGENCY_CHANGE_TYPES`, `isEmergencyAlert()`, `VICTIM_SUPPORT_PORTAL_URL` 작성 | TypeScript 컴파일 성공 |
| 2 | `lib/source-badges.ts` | `SOURCE_BADGE_DEFINITIONS`, `PAGE_SOURCE_BADGES` 작성 | TypeScript 컴파일 성공 |

### Phase 2 — 공통 컴포넌트

| 순서 | 파일 | 작업 | 완료 기준 |
|------|------|------|----------|
| 3 | `components/common/SourceBadge.tsx` | 배지 UI + CSS hover 툴팁 구현 | 렌더 확인, 툴팁 표시 확인 |
| 4 | `components/common/EmergencyResponseModal.tsx` | 모달 UI + 체크리스트 + localStorage 연동 | 모달 열기/닫기, 체크 상태 재오픈 유지 확인 |

### Phase 3 — 페이지 통합

| 순서 | 파일 | 작업 | 완료 기준 |
|------|------|------|----------|
| 5 | `app/(app)/rights/page.tsx` | `<SourceBadge pageKey="rights" />` 추가 | 분석 결과 하단 배지 표시 확인 |
| 6 | `app/(app)/jeonse/analysis/page.tsx` | `<SourceBadge pageKey="jeonse_analysis" />` 추가 | 배지 표시 확인 |
| 7 | `app/(app)/contract/page.tsx` | `<SourceBadge pageKey="contract" />` 추가 | 배지 표시 확인 |
| 8 | `app/(app)/prediction/page.tsx` | `<SourceBadge pageKey="prediction" />` 추가 | 배지 표시 확인 |
| 9 | `app/(app)/monitoring/[id]/components/AlertTimeline.tsx` | `isEmergencyAlert()` 조건으로 버튼 추가 + `EmergencyResponseModal` 마운트 | 긴급 알림에서 모달 정상 표시 |

### Phase 4 — 검증

| 순서 | 작업 | 완료 기준 |
|------|------|----------|
| 10 | `npm run build` | 빌드 성공, 타입 에러 없음 |
| 11 | `npm run lint` | ESLint 에러 없음 |
| 12 | 수동 smoke check | 4개 분석 페이지 배지 표시, 모달 동작, 외부 링크 새 탭 열기 |

---

## 5. 컴포넌트 행동 명세

### 5.1 EmergencyResponseModal 행동 규칙

| 조건 | 동작 |
|------|------|
| `open === false` | 렌더 없음 (조건부 마운트) |
| ESC 키 입력 | `onClose()` 호출 |
| 배경(overlay) 클릭 | `onClose()` 호출 |
| 모달 내부 클릭 | 이벤트 전파 차단 |
| 체크박스 클릭 | `localStorage[vestra_emergency_checklist_${alertId}]` 업데이트 |
| 모달 재오픈 | localStorage에서 이전 체크 상태 복원 |
| 전세사기피해지원 포털 버튼 | `target="_blank"`, `rel="noopener noreferrer"` |
| 전문가 상담 버튼 | `onClose()` 후 `/expert-connect` 이동 |

**접근성 요구사항**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` 연결
- 모달 오픈 시 첫 버튼으로 포커스 이동
- 포커스 트랩: Tab/Shift+Tab이 모달 내부를 순환

### 5.2 isEmergencyAlert 분류 기준

긴급대응 모달 표시 조건:

```
riskLevel === "critical" OR riskLevel === "high"
AND
changeType IN EMERGENCY_CHANGE_TYPES
```

**EMERGENCY_CHANGE_TYPES 목록**

| changeType | 한국어 | 비고 |
|-----------|--------|------|
| `mortgage_added` | 근저당 설정 | 경매 우선변제 위험 |
| `seizure_added` | 압류 설정 | 강제경매 전환 위험 |
| `ownership_changed` | 소유권 변동 | 대항력 요건 재확인 필요 |
| `lien_added` | 가압류 설정 | 본압류·경매 전환 위험 |
| `provisional_registration` | 가등기 설정 | 본등기 시 권리 밀려남 위험 |

`riskLevel === "low"` 또는 `"medium"`이거나, 해지/해제/취소 변동 유형(`_removed`, `_released`)이면 긴급 아님 — 버튼 미표시.

### 5.3 AlertTimeline 수정 범위

기존 로직 유지, 추가 내용만:

1. 각 alert 카드에 `isEmergencyAlert(alert.changeType, alert.riskLevel)` 평가
2. `true`이면 "긴급대응 보기" 버튼 렌더 (기존 "최신 등기부 확인하기" 버튼과 나란히)
3. 버튼 클릭 → `selectedEmergencyAlert` state 세팅 → 모달 `open={true}`
4. 모달은 컴포넌트 최하단에 단 한 개만 마운트 (다중 마운트 금지)

### 5.4 SourceBadge 렌더 위치

각 페이지의 **분석 결과 섹션 하단**, 기존 footer/disclaimer 위.

- 결과가 없는 상태(초기 입력 폼만 표시)에서는 **배지 숨김** — 분석 결과 존재 시에만 노출
- `rights/page.tsx`, `contract/page.tsx`, `prediction/page.tsx`: 결과 상태 조건부 렌더
- `jeonse/analysis/page.tsx`: `JeonseResultPanel` 컴포넌트 내부 또는 페이지 레벨에서 조건부 렌더

### 5.5 SourceBadge 툴팁

CSS `:hover` + `absolute` 포지셔닝 방식 — Radix/외부 라이브러리 불필요.

```
배지 클릭/마우스오버 → 툴팁 표시
툴팁 표시 방향: 위 (viewport 잘림 시 아래로 fallback은 이번 범위 외)
```

---

## 6. 절대규칙 준수 체크리스트

```
─────────────────────────────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (설계 단계)
─────────────────────────────────────────────────────────────────────────
1. 페이지 500줄 제한
   ✅ 수정 대상 전 파일이 500줄 이하
      - rights/page.tsx       290줄 → 약 302줄
      - jeonse/analysis/page  59줄  → 약  68줄
      - contract/page.tsx     254줄 → 약 265줄
      - prediction/page.tsx   434줄 → 약 444줄
      - AlertTimeline.tsx     241줄 → 약 275줄

2. 단일 책임
   ✅ 체크리스트 상수 → lib/emergency-checklist.ts (데이터 전용)
   ✅ 배지 상수 → lib/source-badges.ts (데이터 전용)
   ✅ EmergencyResponseModal → UI + 로컬 상태만 (API 없음)
   ✅ SourceBadge → 순수 표시 컴포넌트 (상태 없음, prop 수신만)
   ✅ AlertTimeline → 기존 역할 유지, 모달 트리거 조건만 추가

3. 서버 검증·보안
   ✅ 신규 API 없음 — 기존 인증된 GET/PATCH만 사용
   ✅ 외부 링크: rel="noopener noreferrer" 적용
   ✅ localStorage 사용 — 민감 데이터(토큰/키) 저장 없음, 체크 상태만 저장
   ✅ XSS: React JSX 렌더링, dangerouslySetInnerHTML 미사용

4. 성능 (중복·N+1)
   ✅ 신규 API 호출 없음 — 기존 모니터링 알림 API 재사용
   ✅ SourceBadge: 정적 상수 데이터, 런타임 API 호출 없음
   ✅ EmergencyResponseModal: 조건부 마운트로 미사용 시 DOM 없음
   ✅ localStorage: 동기 읽기, 렌더 경로 외 초기화

5. 폴더 구조
   ✅ 공통 컴포넌트 → components/common/ (여러 페이지 공유)
   ✅ 공통 상수/유틸 → lib/ (도메인 로직 없는 상수+순수함수)
   ✅ 페이지 전용 수정은 해당 라우트 내 기존 파일에만
   ✅ 신규 API route 없음 → app/api/ 구조 변경 없음
─────────────────────────────────────────────────────────────────────────
위반 항목: 없음
─────────────────────────────────────────────────────────────────────────
```

---

## 7. 리스크 및 결정사항

### 7.1 모달 자동 표시 vs 버튼 트리거

기획서 FR-01 "자동 트리거"는 **버튼 클릭 트리거**로 구현한다.

**사유**: `AlertTimeline`이 이미 렌더된 상태에서 새 알림이 실시간으로 추가되는 구조가 아님 — 페이지 로딩 시 목록이 한 번에 렌더된다. 자동 표시를 구현하면 사용자가 페이지를 열 때마다 강제로 모달이 뜨는 UX 문제가 발생한다. 최초 미읽음 critical 알림 1건에 대해 자동 표시를 원한다면 별도 논의 필요.

### 7.2 체크리스트 상태 범위

기획서에 "체크 상태 유지 (모달 닫아도 재오픈 시 유지)" → `localStorage` 사용.

**저장 키**: `vestra_emergency_checklist_${alertId}` (알림 ID별 독립 상태)
**만료 없음**: 의도적 만료 정책 미설정 — 사용자가 브라우저 스토리지를 직접 삭제 시에만 초기화.

### 7.3 계약서 분석 페이지의 출처 배지

계약서 분석은 사용자가 직접 업로드한 계약서를 GPT-4.1-mini로 분석하는 기능 — 공공데이터 API를 직접 조회하지 않음. 단, 분석 결과에서 시세 비교 참고 시 MOLIT 실거래가 기반이므로 `["molit_price"]` 배지만 표시한다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-07-27 | Initial design | Claude (대장 승인) |

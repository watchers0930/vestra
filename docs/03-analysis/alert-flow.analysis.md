# Alert Flow & Source Badge — 설계-구현 GAP 분석

> **설계서**: `docs/02-design/features/alert-flow.design.md`
> **분석일**: 2026-07-27
> **분석자**: Claude (크로미)
> **Status**: Analysis

---

## 1. Match Rate (일치율)

```
종합 일치율: 95 / 100
```

| 영역 | 일치율 | 비고 |
|------|--------|------|
| `lib/emergency-checklist.ts` | 100% | 타입, 상수, 함수 설계와 완전 일치 |
| `lib/source-badges.ts` | 100% | 배지 키, 페이지 매핑 설계와 완전 일치 |
| `components/common/EmergencyResponseModal.tsx` | 97% | 행동 명세 전체 구현, 포커스 이동 방식 소소한 차이 |
| `components/common/SourceBadge.tsx` | 90% | 기능 일치, CSS 비표준 속성 + `<style>` 반복 이슈 |
| `AlertTimeline.tsx` (수정) | 98% | 단일 마운트, 버튼, isEmergencyAlert 모두 정확 |
| `rights/page.tsx` (수정) | 100% | 결과 조건부 렌더, 배지 위치 설계 의도 부합 |
| `jeonse/analysis/page.tsx` (수정) | 100% | `analysis &&` 조건부 렌더, 페이지 레벨 배치 |
| `contract/page.tsx` (수정) | 100% | 결과 블록 내, 면책 조항 위 배치 |
| `prediction/page.tsx` (수정) | 100% | 결과 블록 내, 면책 조항 위 배치 |

---

## 2. Gap 목록

### GAP-01 SourceBadge — `<style>` 태그 배지 수만큼 반복 [중간]

**위치**: `components/common/SourceBadge.tsx:74-78`

**현상**: 배지를 렌더할 때 각 배지 `<span>` 안에 동일한 `<style>` 블록을 반복 삽입한다.

```tsx
// 현재: 배지가 4개면 동일한 CSS 규칙이 4번 DOM에 삽입됨
{keys.map((key) => (
  <span key={key} ...>
    <span ...>{badge.label}</span>
    <span className="source-badge-tooltip" ...>...</span>
    <style>{`
      .source-badge-wrap:hover .source-badge-tooltip { opacity: 1; }
    `}</style>
  </span>
))}
```

**영향**: `jeonse_analysis` 페이지(배지 4개)에서 동일 CSS 규칙이 4번 삽입됨. 기능은 정상 동작하나 DOM이 오염되고 성능상 비효율.

**권고**: `<style>` 블록을 배지 루프 밖, 컴포넌트 최상단으로 한 번만 이동.

```tsx
// 권고
<div className={className} style={...}>
  <style>{`.source-badge-wrap:hover .source-badge-tooltip { opacity: 1; }`}</style>
  <span ...>데이터 출처</span>
  {keys.map(...)}
</div>
```

---

### GAP-02 SourceBadge — 비표준 React 인라인 스타일 속성 [낮음]

**위치**: `components/common/SourceBadge.tsx:64-65`

**현상**: 툴팁 `<span>`에 인식되지 않을 수 있는 속성 사용.

```tsx
whiteSpaceCollapse: "collapse",  // 비표준 camelCase, 브라우저 무시 가능
textWrap: "wrap",                // 실험적 CSS 속성
```

`white-space-collapse`는 CSS Spec 후보 단계, React에서 camelCase로 변환해도 구형 브라우저 무시.  
`text-wrap: wrap`은 최신 Chrome/Firefox 지원하나 Safari 구버전 미지원.

**영향**: 툴팁 텍스트가 긴 경우 줄바꿈이 안 되어 viewport를 벗어날 수 있음. `maxWidth: "220px"` 설정이 이를 보완하지만 완전하지 않음.

**권고**: 두 속성 제거 후 `wordBreak: "break-word"` 또는 `whiteSpace: "normal"` 사용.

---

### GAP-03 EmergencyResponseModal — 포커스 첫 이동에 setTimeout 사용 [낮음]

**위치**: `components/common/EmergencyResponseModal.tsx:76-78`

**현상**:
```tsx
useEffect(() => {
  if (open) {
    setTimeout(() => firstBtnRef.current?.focus(), 50);
  }
}, [open]);
```

설계서 §5.1 접근성 요구사항: "모달 오픈 시 첫 버튼으로 포커스 이동" — 충족됨.  
그러나 50ms 하드코딩은 렌더 완료를 보장하는 신뢰할 수 있는 방법이 아님.

**영향**: 느린 디바이스에서 포커스가 이동하기 전에 사용자가 키보드를 누를 경우 포커스 트랩이 모달 밖에서 시작될 수 있음.

**권고**: `setTimeout` → `requestAnimationFrame` 교체.

```tsx
useEffect(() => {
  if (open) {
    requestAnimationFrame(() => firstBtnRef.current?.focus());
  }
}, [open]);
```

---

### GAP-04 설계서 §7.1 자동 트리거 → 버튼 트리거 결정 (의도적 변경, Gap 아님)

설계서에 명시된 결정: 기획서의 "자동 트리거"를 "버튼 클릭 트리거"로 변경.  
구현도 버튼 클릭 방식으로 동일하게 구현됨. 설계-구현 일치. ✅

---

## 3. 플랫폼 절대규칙 위반 점검

### 3.1 500줄 제한

| 파일 | 줄 수 | 상태 |
|------|-------|------|
| `lib/emergency-checklist.ts` | 59줄 | ✅ |
| `lib/source-badges.ts` | 47줄 | ✅ |
| `components/common/EmergencyResponseModal.tsx` | 381줄 | ✅ |
| `components/common/SourceBadge.tsx` | 84줄 | ✅ |
| `app/(app)/monitoring/[id]/components/AlertTimeline.tsx` | 295줄 (설계 예상 275줄) | ✅ |
| `app/(app)/rights/page.tsx` | 293줄 (설계 예상 302줄) | ✅ |
| `app/(app)/jeonse/analysis/page.tsx` | 61줄 (설계 예상 68줄) | ✅ |
| `app/(app)/contract/page.tsx` | 257줄 (설계 예상 265줄) | ✅ |
| `app/(app)/prediction/page.tsx` | 437줄 (설계 예상 444줄) | ✅ |

> 실제 줄 수가 설계 예상보다 전반적으로 적음. 전체 500줄 이하 준수.

---

### 3.2 단일 책임 위반 파일

| 파일 | 판단 | 근거 |
|------|------|------|
| `lib/emergency-checklist.ts` | ✅ 준수 | 긴급대응 상수+순수함수 전용 |
| `lib/source-badges.ts` | ✅ 준수 | 출처 배지 상수 전용 |
| `EmergencyResponseModal.tsx` | ✅ 준수 | UI + localStorage 로컬 상태 — 설계 의도 내 |
| `SourceBadge.tsx` | ✅ 준수 | 순수 표시 컴포넌트 (상태 없음) |
| `AlertTimeline.tsx` | ✅ 준수 | 알림 타임라인 UI + 모달 트리거 조건 — 설계 의도 내 |
| 4개 page.tsx | ✅ 준수 | 조합/진입 역할만 수행 |

---

### 3.3 서버 검증 누락 API

신규 API 엔드포인트 없음 — 해당 없음. ✅  
기존 `GET /api/monitoring/alerts`, `PATCH /api/monitoring/alerts` 변경 없음. ✅  
localStorage 저장 데이터: 체크 상태(boolean)만, 민감 정보 없음. ✅  
외부 링크 `rel="noopener noreferrer"` 적용. ✅

---

### 3.4 성능 문제

| 항목 | 판단 | 설명 |
|------|------|------|
| 중복 API 호출 | ✅ 없음 | 신규 API 호출 없음 |
| N+1 쿼리 | ✅ 없음 | DB 접근 없음 |
| SourceBadge `<style>` 반복 삽입 | ⚠️ 경미 | 같은 CSS 규칙 배지 수만큼 반복 (GAP-01) |
| EmergencyResponseModal 조건부 마운트 | ✅ 준수 | `if (!open) return null` + `selectedEmergencyAlert &&` |
| localStorage 동기 읽기 | ✅ 준수 | `open` 트리거 useEffect 내 실행, 렌더 경로 외 |

---

### 3.5 폴더 구조 위반

| 항목 | 판단 | 위치 |
|------|------|------|
| 공통 컴포넌트 | ✅ 준수 | `components/common/` |
| 공통 유틸/상수 | ✅ 준수 | `lib/` |
| 페이지 전용 수정 | ✅ 준수 | 해당 라우트 내 기존 파일 |
| 신규 API route | ✅ 해당 없음 | 없음 |

---

## 4. 종합 의견 및 수정 우선순위

### 종합 의견

설계서가 요구한 **파일 구조, 타입 정의, 행동 명세, 페이지 통합** 전체가 충실히 구현됨.  
기능 정확성 면에서 완성도가 높고, 플랫폼 절대규칙 위반이 없다.

발견된 3개 Gap은 모두 **기능 동작에 영향 없는 코드 품질 문제**다.  
배포 차단 수준의 위반은 없음.

### 수정 우선순위

| 순위 | Gap | 위치 | 공수 | 이유 |
|------|-----|------|------|------|
| 1 | GAP-01 `<style>` 반복 | `SourceBadge.tsx:74` | 5분 | DOM 오염, 배지 수 증가 시 확장 |
| 2 | GAP-02 비표준 CSS | `SourceBadge.tsx:64` | 5분 | 구형 브라우저 호환성 리스크 |
| 3 | GAP-03 setTimeout → rAF | `EmergencyResponseModal.tsx:77` | 2분 | 접근성 신뢰성 향상 |

> **결론**: 95% 일치. GAP-01, GAP-02 수정 후 배포 권장.  
> 세 Gap 모두 합쳐 15분 이내 수정 가능.

---

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수 (전체 파일 500줄 이하)
2. 단일 책임           : ✅ 준수
3. 서버 검증·보안      : ✅ 준수 (신규 API 없음, 외부링크 보안 적용)
4. 성능 (중복·N+1)     : ⚠️ 경미 위반 — SourceBadge <style> 반복 삽입 (GAP-01)
5. 폴더 구조           : ✅ 준수
─────────────────────────────────────────────────
위반 항목: GAP-01 경미 (배포 차단 아님, 수정 권장)
─────────────────────────────────────────────────
```

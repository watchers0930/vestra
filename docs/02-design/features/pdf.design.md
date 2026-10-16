# 비회원 등기감시 PDF-only 신청 흐름 재설계 설계서 (공용 계약서)

> **Plan**: `docs/01-plan/features/pdf.plan.md`
> **관련 계약서(SSOT)**: `docs/02-design/features/lib.design.md` (비회원 전체 흐름·엔드포인트 원본), `docs/02-design/features/app.design.md` (주소검색 UX 버전 — §0.2 관계 주의)
> **Author**: Claude (대장 승인 전 초안)
> **Date**: 2026-10-16
> **Status**: Design · 구현 전
> **대상 독자**: 백엔드(Codex) / 프론트엔드(Claude) — 각자 구현 시 따르는 **단일 계약서**
> **범위 한 줄**: 비회원 신청의 **물건 식별 입력을 등기부 PDF 하나로 통합**(주소 입력·주소 일치검증 완전 제거)하고, `owner`/`tenant` **역할 선택 + 소유자명 서버 대조 + 역할별 알림 문구**를 추가한다.

---

## 0. 이 문서의 위상과 범위

- 이 문서는 **계약서**다. 바뀌는 API 요청/응답 스키마·공유 타입·에러 코드·추출/대조 계약은 백엔드와 프론트가 **반드시 동일하게** 구현한다. 변경이 필요하면 **이 문서를 먼저 고치고 양측에 공지**한다. 한쪽이 임의로 바꾸면 상대 구현이 깨진다.
- **새로 만들거나 교체하지 않는 것**: 인증 공급자(다날/SMS OTP), 결제 공급자(PortOne V1 다날), OCR 서비스, 신규 결제 흐름, 회원 물건 등록 흐름, 공동/법인/마스킹 소유자 신규 지원, 요금·기간·중복활성 정책.
- 신청 단계는 유지하되 **②에 추출 결과 확인 + ③ 역할 선택 + ④에 소유자 대조**가 추가된다: **① 신청 입력(이름·전화·PDF) → ② PDF 분석·추출 결과 확인 → ③ 역할 선택(owner/tenant) → ④ 동의·OTP(소유자는 인증 후 이름 대조) → ⑤ 결제(10,000원) → ⑥ 감시 시작**.
- 이번 작업으로 계약이 **바뀌는** 엔드포인트: `POST /parse-pdf`(주소 제거·동/호 추출), `POST /identity/start`(apply에 `role` 추가·초안 저장), `POST /orders`(소유자/역할 게이트 — 응답 계약 불변, 동작만 추가). 나머지 엔드포인트와 전체 흐름·멱등·복구·게이트는 **회귀 보존 대상**이며 `lib.design.md §3`이 SSOT다.
- **DB 스키마 변경**: `GuestMonitoring`에 **`role String?` 1개 컬럼만 추가전용**. 동/호 전용 컬럼·변동 발송용 테이블은 이번 범위 아님. **운영 ALTER는 대장이 수동 적용**(§2.1, §5 Phase 0 경계).

### 0.1 용어

| 용어 | 정의 |
|---|---|
| **PDF-only** | **물건 식별 입력**을 PDF 하나로 받는다는 뜻. 이름·전화·역할·동의·OTP 입력은 유지. 분석 **전** 주소 수동입력·주소 일치검증은 **완전 제거**. |
| **role(역할)** | `GuestMonitoringRole = "owner" | "tenant"`. `owner`=소유자/내 물건, `tenant`=임차인/세입자. 권한 확대 플래그 아님 — tenant도 동일한 인증·동의·결제·조회 검증을 통과해야 함. |
| **소유자 대조(owner match)** | `role=owner`일 때만, 인증에 결합된 초안의 `guestName`과 PDF 추출 `ownerName`을 **정규화 비교**(NFKC·앞뒤 공백 제거·내부 공백 제거). 불일치 시 결제 전 거부. |
| **추출 기준값(extracted truth)** | PDF에서 서버가 뽑은 `address / unitNumber / commUniqueNo / ownerName`. **서버 원본**으로만 저장·대조에 사용. 브라우저 제출값으로 덮어쓰지 않음. |
| **draft(초안)** | 결제 전 PDF 파싱 결과 레코드(`GuestMonitoring.status=pending_payment`). TTL 후 정리. |
| **unitNumber** | 집합건물 전유부분 표현(예: `제101동 제15층 제1502호`). 응답에서 `buildingDong`/`unitHo`로 파생 분리. |

### 0.2 app.design.md 와의 관계 (⚠️ 구현 전 대장 확정 필요)

`app.design.md`(같은 날짜)는 **주소검색 UX를 유지**하고 parse-pdf에 `address?`/`dong?`/`ho?`를 **선택 입력으로 추가**하는 방향이다. 본 문서(pdf.plan 기준)는 그 반대로 **주소 입력을 완전히 제거**한다. **두 설계는 parse-pdf 요청 모양이 서로 배타적**이다.

- 본 계약서는 **pdf.plan.md를 governing plan**으로 삼아 "주소 제거" 방향을 확정 기술한다.
- 동일 엔드포인트(`POST /parse-pdf`)를 두 방향이 동시에 구현할 수 없으므로, **어느 방향을 채택할지는 대장 승인 사항**이다. 승인 전에는 두 설계를 병행 구현하지 않는다. (양립안: PDF-only를 기본으로 하고 주소검색을 완전 제거 — 본 문서. 혹은 주소를 선택 입력으로 남김 — app.design. 혼합 시 "주소 매칭 제거"와 "주소 선택 입력 유지"가 충돌하므로 반드시 하나만 선택.)
- 공통 구성요소(`parseUnitNumber` 동/호 구조화, `property-fields.ts`, 전화 `formatMobile`, 드롭존 100% 폭)는 두 방향에서 **재사용**되며 충돌하지 않는다.

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 레이어 경계 (절대규칙 2·3·5 — 단일 책임 / 서버검증 / 폴더 역할)

```
UI (GuestApplyForm + GuestExtractionPanel + GuestRoleSelect + GuestPdfDropField)
  └ 담당: 이름·전화 입력(formatMobile 표시), PDF 선택·드롭,
          분석 후 추출결과(마스킹) 확인 표시, 역할 radio group, 필수 동의,
          분석 중 입력 잠금, draft 수신 후 상태 동기화, 수정=PDF 교체 재분석 트리거
  └ 안 함: 주소 추정·입력, ownerName/commUniqueNo 자유 수정·전송, 가격/권한/소유 판단
        │ parsePdf(FormData: file, guestName, guestPhone)          // 주소 없음
        │ identityStart({ purpose:"apply", guestName, guestPhone, draftId, role })
        ▼
Hook (useGuestApply / useGuestOtp / useGuestOrderFlow + 신규 순수 유틸)
  └ 담당: 분석 입력 검증(주소 필수 없음), genRef 최신응답 가드, 역할 상태·복원,
          OTP·주문 흐름 연결, 수정 시 초안/동의/OTP/주문참조 무효화
  └ 안 함: 소유자 대조·역할 저장을 클라에서 신뢰(서버가 최종 판정)
        │ POST /api/guest-monitoring/{parse-pdf | identity/start | identity/verify-otp | orders | payment/callback}
        ▼
API Route (app/api/guest-monitoring/**/route.ts)  ── 래퍼·게이트 보존
  └ endpoint()·Origin·IP limit·boundedBody·no-store·Node 런타임 보존(계약 불변)
        ▼
Service (lib/guest-monitoring/*)
  ├ draft.ts / schemas.ts / pdf-extraction.ts / property-fields.ts[신규]  → 추출·저장(주소비교 제거, 동/호 구조화)
  ├ session.ts / sms-otp.ts                                               → apply 시 role 초안 저장(OTP 발송 전)
  ├ order.ts / owner-match.ts[신규]                                       → 결제 전 역할·소유자 대조 게이트
  ├ activation.ts                                                         → 활성화 방어검증(위반 시 needs_review)
  └ precheck-adapter.ts / calendar-dto.ts / signal-message.ts[신규]       → 역할별 알림 문구(단일 소스)
        │
        ├─▶ lib/registry-parser.ts · lib/registry/section-parsers.ts (표제부 재사용, 변경 없음)
        └─▶ prisma.guestMonitoring (기존 컬럼 + 신규 role 컬럼만)
```

**철칙**: UI/클라이언트가 보내는 값은 **서버 검증 입력일 뿐 신뢰 소스가 아니다**. 저장되는 `address`·`unitNumber`·`commUniqueNo`·`ownerName`은 **동일 PDF 추출 결과로만** 확정한다(plan §4.6, §6). `role`만 클라이언트가 선택하지만 **서버가 enum 검증 후 초안에 저장**하고, **owner 판정은 서버 저장값 기준**이다(plan §4.2·§4.4).

### 1.2 변경·신규 파일 분리 계획 (절대규칙 1 — 500줄, 5 — 폴더 역할)

| 책임 | 파일 | 구분 | 현재 | 예상 | 분리 전략 |
|---|---|---|---|---|---|
| 신청 폼(이름·전화·PDF·동의·역할·확인 조합) | `app/(personal-home)/renewal/monitoring/components/guest/GuestApplyForm.tsx` | 변경 | 223줄 | ⚠️ 위험구역 | 주소 제거분 만큼 줄지만 역할·확인 패널 추가로 증가. **추출 확인 패널·역할 선택·PDF 드롭을 각 컴포넌트로 분리**(아래 3개). 폼은 조합만. 400줄 초과 감지 시 대장 보고 후 진행. |
| 추출 결과 확인 표시(마스킹 주소·동/호·고유번호·소유자) | `.../components/guest/GuestExtractionPanel.tsx` | **신규** | — | ~90줄 | 읽기전용 표시 + "다시 입력(PDF 교체)" 트리거. 자유 텍스트 수정 입력 없음(§4.2). |
| 역할 선택(owner/tenant radio group) | `.../components/guest/GuestRoleSelect.tsx` | **신규** | — | ~60줄 | 접근 가능한 radio group. 기본 선택 없음, 동일 비중. 값은 `GuestMonitoringRole`. |
| PDF 업로드 영역(드롭·클릭·검증·disabled·파일명) | `.../components/guest/GuestPdfDropField.tsx` | **신규** | — | ~90줄 | 100% 폭. 기존 프로젝트 드롭 패턴 재사용, 신규 라이브러리 금지. |
| 분석 입력 검증·최신 응답·역할 상태·흐름 연결 | `.../hooks/useGuestApply.ts` | 변경 | 413줄 | ⚠️ 500 근접 | **주소 상태·검증 제거**(감소 요인), **역할 상태·복원 추가**. 신규 파싱 로직은 훅 본문에 넣지 말고 순수 유틸로. 413줄 시작이므로 신규 state 최소화·초과 시 분리. |
| 복원값·역할 배선 | `.../guest/apply/GuestApplyClient.tsx` | 변경(소폭) | 177줄 | ~185줄 | 비회원 경로의 `initialAddress` 주입 제거. 회원 `initialAddress` 사용처가 공유되면 **비회원만 미주입**하도록 분기(랜딩 `GuestEntrySection`도 동일). |
| 랜딩 진입 섹션 | `.../components/guest/GuestEntrySection.tsx` | 변경(소폭) | 33줄 | ~33줄 | 비회원 경로 주소 주입 경로 제거만. |
| 멀티파트/인증 클라이언트 계약 | `.../guest/guestApi.ts` | 변경 | 193줄 | ~195줄 | `parsePdf` 입력에서 `address` 제거, FormData에 address 키 넣지 않음. `identityStart` 요청 타입에 `role` 반영(공유 타입 경유). |
| 요청 스키마 | `lib/guest-monitoring/schemas.ts` | 변경 | 24줄 | ~30줄 | `applicantSchema`에서 `address` 제거, `identityStartSchema`에 `role` optional + apply 필수 refine. strict 유지. |
| 추출(주소 비교 제거·동/호 구조화) | `lib/guest-monitoring/pdf-extraction.ts` | 변경 | 45줄 | ~60줄 | `extractRegistryFields(text)` — 두 번째 인자 제거(또는 선택화 후 신규 경로 미전달). `address_mismatch` 호출 제거. 동/호는 아래 순수 모듈 호출. |
| 동/호 구조화·집합건물 판정(서버 순수) | `lib/guest-monitoring/property-fields.ts` | **신규** | — | ~70줄 | `parseUnitNumber(unitNumber) → {dong, ho}`, `isAggregateFromRegistry(parsed)`. 테스트 1급 대상. (app.design과 공유 가능) |
| 소유자명 대조(서버 순수) | `lib/guest-monitoring/owner-match.ts` | **신규** | — | ~20줄 | `normalizeOwnerName(v)`, `ownerNameMatches(a, b)`. **identity-hash.ts 의미 불변**(§2.5). |
| 역할별 알림 문구 빌더(서버 순수) | `lib/guest-monitoring/signal-message.ts` | **신규** | — | ~60줄 | `buildSignalSummary(role, result, caseType?) → string | null` 단일 소스(§4.7). |
| 저장/응답 조립 | `lib/guest-monitoring/draft.ts` | 변경 | 29줄 | ~40줄 | 허용목록에서 `address` 제거, 응답에 `unitNumber`(buildingDong/unitHo) 추가. `...fields`에 비존재 컬럼(dong/ho 등) 전개 금지. |
| 주문 생성(역할·소유자 게이트) | `lib/guest-monitoring/order.ts` | 변경 | 68줄 | ~90줄 | `createOrder` initial 경로에 역할 enum 검증 + owner 대조. **pending/existing 재사용 조기반환보다 앞**(§3.4). |
| 활성화 방어검증 | `lib/guest-monitoring/activation.ts` | 변경 | 52줄 | ~65줄 | `applyPaidOrder` initial에서 역할/소유자 재확인, 위반 시 **needs_review**(결제 보존). |
| 역할 알림 plumbing | `lib/guest-monitoring/precheck-adapter.ts`, `calendar-dto.ts` | 변경 | 55/53줄 | +~10줄 | `select`에 `role` 추가(컬럼 존재 시), `safeSummary`→`buildSignalSummary(role, ...)`로 교체. null role=중립. |
| 에러 메시지 | `lib/guest-monitoring/errors.ts` | 변경 | 27줄 | +2줄 | `owner_name_mismatch` 메시지 추가. |
| 공유 타입 | `types/guest-monitoring.ts` | 변경 | 92줄 | ~105줄 | `GuestMonitoringRole`, `GuestDraftResponse`에 `unitNumber`, `GuestIdentityStartRequest`에 `role?`. |
| Prisma 스키마 | `prisma/schema.prisma` | 변경(추가전용) | — | +1줄 | `GuestMonitoring`에 `role String?`. **운영 ALTER는 대장 수동**(§2.1). |
| CSS 폭 보정 | `monitoring-renewal.module.css` 또는 비회원 범위 클래스 | 변경 | — | +~6줄 | `.mDropZone` 전역 변경 금지. 비회원 전용 클래스로 `width:100%`·`box-sizing:border-box`. |
| 재사용(변경 없음) | `lib/phone-format.ts`, `lib/registry-parser.ts`, `lib/registry/section-parsers.ts` | 재사용 | — | — | `formatMobile`·표제부 파서 그대로. |

> **500줄 경보**: `useGuestApply.ts`(413줄)·`GuestApplyForm.tsx`(223→변동)가 위험 구역. 주소 상태 제거로 줄지만 역할·확인 패널 추가로 다시 증가하므로, **확인 패널/역할/드롭을 신규 컴포넌트로 분리**(위 표)하여 폼을 조합 역할로 유지한다. 구현 중 400줄 초과 감지 시 즉시 대장 보고 후 진행(global rule 강제 트리거).

---

## 2. 데이터 모델

### 2.1 DB 스키마 — **`GuestMonitoring.role` 1개 추가전용**

```prisma
model GuestMonitoring {
  // ... 기존 컬럼 불변 ...
  role  String?   // "owner" | "tenant". 미선택 초안/기존 레코드는 null. 서버 enum으로만 제한.
}
```

- **추가전용(add-only)**: default 없음(`null`), 기존 레코드·미선택 초안은 `null`. owner/tenant 자동 부여 금지(plan §4.3).
- **동/호 전용 컬럼 없음**: 동/호는 기존 암호화 `address` 문자열 안에 **함께 보존**(예: `서울 강남구 ... 101동 1502호`), 응답에서만 `unitNumber`로 분리(plan §4.3). Tilko `reqAddress`·달력 주소 축약(`address.split(/\s+/).slice(0,3)`)과의 호환을 **회귀 테스트 필수**(§3.5).
- **변동 발송용 테이블 없음**: 역할별 **알림 문구 생성·화면/달력 반영**만 이번 범위. 외부 변동 SMS 발송(이벤트 식별·영속·중복방지)은 **별도 DB 설계 범위**(§4.7, §6-C).
- **운영 적용 경계(규칙 0-1·0-3)**: 이 작업과 후속 구현에서 운영 `prisma migrate*`·`db push`·`ALTER`를 **자동 실행하지 않는다**. 순서는 **① 테스트 DB에 role 컬럼 추가해 ORM 호환 검증 → ② 대장이 운영 수동 ALTER → ③ role을 `select`하는 새 코드 배포**. **기능 OFF만으로 ORM 조회 오류가 전부 차단된다고 가정하지 않는다**(`select:{role}`은 컬럼 없는 DB에서 즉시 에러 — §2.4). 롤백은 role 컬럼을 남긴 채 이전 코드로 복귀하는 **추가전용 방식**.

기존 저장 필드(불변): `guestName`(normalizeGuestName), `guestPhone`(normalizeGuestPhone), `guestIdentityHash`, `address`(암호화, 동/호 포함), `commUniqueNo`, `ownerName`(암호화), `draftExpiresAt`. 모두 PII 암복호화·blind index 경로 유지.

### 2.2 공유 타입 변경 (`types/guest-monitoring.ts`)

```ts
// [신규] 역할 enum — DTO·strict schema·훅이 동일 타입 사용
export type GuestMonitoringRole = "owner" | "tenant";

// [변경] 추출 결과 자동입력 — 하위호환 "추가"만. 기존 필드 불변.
export interface GuestDraftResponse {
  draftId: string;
  address: string;               // [기존] 서버 저장용 표시 주소(동/호 포함 가능)
  unitNumber: {                  // [신규] 동/호 분리 표시용. 비집합건물은 둘 다 "".
    buildingDong: string;        // "101" 또는 ""(동 없음/해당없음)
    unitHo: string;              // "1502" 또는 ""(해당없음)
    isAggregate: boolean;        // 집합건물 여부(전유부분 근거)
  };
  commUniqueNoMasked: string;    // [기존] 마스킹만
  ownerNameMasked: string;       // [기존] 마스킹만
  extractionOk: boolean;         // [기존]
  draftExpiresAt: string;        // [기존]
}

// [변경] identity/start 요청 — role 추가. apply일 때만 필수.
export interface GuestIdentityStartRequest {
  purpose: VerificationPurpose;  // "apply" | "status" | "renewal"
  guestName: string;
  guestPhone: string;
  draftId?: string;              // apply 필수(기존 refine)
  role?: GuestMonitoringRole;    // [신규] apply 필수, status/renewal 금지
}
```

- `unitNumber`는 **표시 전용**이며 서버 저장 입력 경로가 **아니다**. 요청에 `unitNumber`/`dong`/`ho`/`ownerName`/`commUniqueNo`가 들어오면 기존처럼 **거부**(허용목록 밖).
- 인증 전 `commUniqueNo`·`ownerName`은 **마스킹만** 반환(기존 공개 경계 유지). 원문 자동입력·편집 없음(§6-마스킹 결정).

### 2.3 서버 내부 추출 타입

```ts
interface ExtractedRegistry {
  commUniqueNo: string;   // 고유번호 (저장·응답마스킹)
  ownerName: string;      // 현재 유효 소유자 (저장·응답마스킹·owner 대조)
  address: string;        // 표제부 기본주소 + 검증된 동/호 조합(저장용)
  unitNumber: {           // 응답 분리용
    buildingDong: string;
    unitHo: string;
    isAggregate: boolean;
  };
}
```

### 2.4 역할 조회의 ORM 안전성 (⚠️ 견고성)

- `precheck-adapter.ts`·`calendar-dto.ts`가 `select:{ role: true }`를 추가하면 **DB에 role 컬럼이 없을 때 Prisma가 런타임 에러**를 던진다. 따라서 role을 읽는 코드는 **운영 컬럼 추가(§2.1 ②) 이후에만 배포**한다.
- 과도기 안전장치: role이 `null`이면 **중립 문구**(기존 `safeSummary` 동등)로 폴백. owner/tenant 임의 분류 금지(plan §4.3·§4.7). 이미 결제된 기존 null 건을 새 조건으로 거부하지 않는다.

### 2.5 소유자명 대조 규칙 (`owner-match.ts`)

```ts
export function normalizeOwnerName(v: string) {
  return v.normalize("NFKC").trim().replace(/\s+/g, "");  // 내부 공백까지 제거
}
export function ownerNameMatches(guestName: string, ownerName: string) {
  return normalizeOwnerName(guestName) === normalizeOwnerName(ownerName);  // 완전 일치만
}
```

| guestName | ownerName | 결과 | 비고 |
|---|---|---|---|
| ` 홍 길 동 ` | `홍길동` | ✅ 일치 | NFKC·앞뒤·내부 공백 제거 후 동일 |
| `홍길` | `홍길동` | ❌ 불일치 | 성명 일부 승인 금지 |
| `홍길동` | `홍길순` | ❌ 불일치 | 유사도·접두어 승인 금지 |

- **`identity-hash.ts`의 `normalizeGuestName`/`guestIdentityHash` 의미는 변경하지 않는다**(비교 편의로 신원 HMAC을 바꾸면 기존 조회·주문 복구가 끊어짐 — plan §4.4-4). 대조는 **비교 전용 함수**로 분리.
- 대조 입력은 **인증에 결합된 초안의 서버 저장 `guestName`**과 **PDF 추출 `ownerName`**. 수정 UI로 입력한 이름으로 PDF 원본 소유자를 덮어써 대조하지 않는다(plan §4.4-2).
- 지원하지 않는 소유 형태(공유/법인/마스킹)는 추출 단계에서 이미 `extraction_incomplete`로 차단(기존 유지).

### 2.6 집합건물 판정·동/호 구조화 (`property-fields.ts`)

입력: `parseRegistry(text).title` 의 `unitNumber`(예: `제101동 제15층 제1502호`), `isApartment`, `purpose`.

| 입력 예 | `buildingDong` | `unitHo` | `isAggregate` | 비고 |
|---|---|---|---|---|
| `제101동 제15층 제1502호` | `"101"` | `"1502"` | true | **층은 호로 오인 금지** |
| `제15층 제1502호`(동 없음) | `""` | `"1502"` | true | 동 미상 → 빈값, 임의 생성 금지 |
| 전유부분 표식 없음(비집합건물) | `""` | `""` | false | 동/호 "해당 없음" 허용 |
| 집합건물인데 호 특정 불가 | — | — | — | **임의 보완 금지 → `extraction_incomplete`로 재업로드 유도**(plan §4.1) |

- 추출은 **해당 집합건물 전유부분(표제부) 범위**에서만. **소유자 주소·대지권 토지 주소·다른 전유부분·행정동/지번·접수번호 `제○호`를 물건 주소/호수로 오인 금지**(plan §4.1).
- `동`/`호` 접미사를 이미 포함한 숫자를 재가공해 `동동`·`호호` 중복 접미사를 만들지 않는다.
- `isAggregate` 1차 근거는 **전유부분 존재(`isApartment`)**. 단지명에 "아파트"가 있다는 이유만으로 판정하지 않는다.

---

## 3. API 스펙

### 3.1 변경 — `POST /api/guest-monitoring/parse-pdf` (주소 제거·동/호 추출)

PDF 파싱 + 초안 생성. **멀티파트(FormData)**.

#### 메서드 + 경로
```
POST /api/guest-monitoring/parse-pdf
Content-Type: multipart/form-data
```

#### 인증 필요 여부
**불필요**(초안 생성은 인증 전). 단, 기존 보호장치 전부 보존: `endpoint(..., {upload:true})`·Origin·기능/암호화 게이트, `ipLimit(req,"parse-pdf",10)`, `boundedBody(req, 11MB)`, `runtime="nodejs"`·`maxDuration=60`, 응답 `Cache-Control: no-store`.

#### Request body (FormData 필드)

| 키 | 타입 | 필수 | 검증 | 변경 |
|---|---|---|---|---|
| `file` | File(PDF) | ✅ | `application/pdf` + 확장자 `.pdf` + 매직바이트 + size>0 + ≤10MB(초과 413) + 1~40페이지 + 텍스트 50~300,000자 | 불변 |
| `guestName` | string | ✅ | `applicantSchema.name`: normalize 후 2~80자, `/^[\p{L}\p{M} .'-]+$/u` | 불변 |
| `guestPhone` | string | ✅ | `applicantSchema.phone`: `normalizeGuestPhone` 후 `/^01[016789]\d{7,8}$/` | 불변(하이픈 혼재 허용) |
| ~~`address`~~ | — | **제거** | — | **[변경] 허용목록에서 제거**. address 키가 오면 `invalid_input`으로 거부 |

**허용목록·중복키 규칙**:
- 허용 키: **`["file", "guestName", "guestPhone"]`**. **그 외 키 1개라도 있으면 `invalid_input`**(address·dong·ho·ownerName·commUniqueNo·금액 포함 전부 거부 — plan §4.1 "잔존 address 요청은 strict 검증으로 거부").
- 각 키 `getAll(k).length === 1`(중복 키 거부).

#### 처리 흐름 (서버)
```
1) FormData 허용목록·중복키 검사            // address 포함 모든 미허용 키 거부
2) applicantSchema.safeParse({ guestName, guestPhone })   // strict, address 없음
3) file: instanceof File·type·확장자·size·매직바이트·용량 (기존)
4) text = extractGuestPDF(buffer)           // 페이지·길이 제한 + finally destroy
5) fields = extractRegistryFields(text)     // 주소 비교 없음. not_registry/multiple_properties/extraction_incomplete 분기
     - 소유자 추출·공유/법인/가림 거부(기존)
     - parseUnitNumber + isAggregate 구조화. 집합건물인데 호 미확정 → extraction_incomplete
     - storedAddress = 표제부 기본주소 + 검증된 동/호(중복 없이 조합)
6) prisma.create({ data: { guestName, guestPhone, guestIdentityHash,
        commUniqueNo, ownerName, address: storedAddress, draftExpiresAt } })
     // ⚠️ role 없음(분석 단계), unitNumber/dong/ho 컬럼 없음 → data에 넣지 않음
7) 응답 조립(마스킹 + unitNumber 분리)
```

#### Response — 성공 (200 `application/json`)
```jsonc
{
  "draftId": "ckx...",
  "address": "서울 강남구 테헤란로 1 101동 1502호",
  "unitNumber": { "buildingDong": "101", "unitHo": "1502", "isAggregate": true },
  "commUniqueNoMasked": "1146-****-******",
  "ownerNameMasked": "홍**",
  "extractionOk": true,
  "draftExpiresAt": "2026-10-16T09:30:00.000Z"
}
```
- 비집합건물: `unitNumber: { buildingDong:"", unitHo:"", isAggregate:false }`.
- `extractionOk=false` 또는 비-2xx면 UI는 역할·인증·주문·결제로 진입하지 않는다.

#### Response — 실패 (비-2xx, `GuestApiError` = `{ error, code }`)

| code | status | 트리거 | 사용자 메시지 |
|---|---|---|---|
| `invalid_input` | 400 | 허용목록 밖 키(address 포함)·중복키·스키마 실패 | 입력 내용을 확인해주세요. |
| `invalid_pdf` | 400 | 형식·매직바이트·페이지(1~40)·텍스트 길이 위반 | 유효한 등기부 PDF를 업로드해주세요. |
| `file_too_large` | 413 | PDF > 10MB | 10MB 이하 PDF를 업로드해주세요. |
| `not_registry` | 400 | 등기부 판별/갑구 부재 | 등기부등본 PDF를 업로드해주세요. |
| `multiple_properties` | 400 | 고유번호 2종 이상 | 한 물건의 등기부등본만 업로드해주세요. |
| `extraction_incomplete` | 400 | 주소/고유번호/소유자 미확정·공유/법인/가림 소유자·**집합건물 호 미확정** | 고유번호와 소유자를 확인할 수 없습니다. PDF를 확인해주세요. |
| `rate_limited` | 429 | IP limit 초과 | 요청이 많습니다. 잠시 후 다시 시도해주세요. |

> **`address_mismatch` 제거**: 비회원 경로에서 주소 비교가 사라지므로 이 코드는 parse-pdf에서 발생하지 않는다. 다만 `errors.ts`의 메시지 엔트리·공용 유틸 참조 여부를 먼저 확인하고(다른 경로 사용 여부), **비회원 경로에서만** 호출을 제거한다(plan §4.1 — 공용 유틸 참조 확인 후 정리).

### 3.2 변경 — `POST /api/guest-monitoring/identity/start` (apply에 role 추가·초안 저장)

본인인증 시작(다날/SMS OTP 분기). **역할 선택값을 OTP 발송 전에 초안에 저장**한다(plan §4.2).

#### 인증 필요 여부
**불필요**(draft 참조). 기존 `ipLimit("identity",5)`·`guestLimit("identity"/"identity-phone")`·Origin·게이트 보존.

#### Request body (JSON)
| 키 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `purpose` | `"apply"\|"status"\|"renewal"` | ✅ | enum |
| `guestName` | string | ✅ | `name`(normalize 2~80자) |
| `guestPhone` | string | ✅ | `phone`(normalize) |
| `draftId` | string | apply만 ✅ | `resourceId`. apply일 때 필수, 그 외 금지(기존 refine) |
| `role` | `"owner"\|"tenant"` | **apply만 ✅** | **[신규]** enum. **apply일 때만 필수·허용**, status/renewal에는 금지 |

**`identityStartSchema` refine**: `purpose==="apply"` → `draftId && role` 모두 존재. `purpose!=="apply"` → `draftId`·`role` 모두 부재. 생략/임의 문자열/배열/중복키 거부(strict). **브라우저 라디오 값만 믿지 않고 서버 enum으로 확정**(plan §4.2).

#### 처리 흐름 (apply 경로, SMS OTP·다날 공통 — `startOtp`/`startIdentity` 확장)
```
1) 신원 해시 계산, draft 소유·상태 검증(id + guestIdentityHash + pending_payment + draftExpiresAt>now)   // 기존 validDraft
2) [신규] 동일 신원 잠금(locked) 안에서 draft.role 저장:
     - 진행 주문(해당 draft에 pending/paid/needs_review 주문) 존재 → role 변경 금지(이미 흐름 시작) → notFound/forbidden
     - draft.role 이 null 또는 입력 role과 동일 → role 설정(멱등)
     - draft.role 이 입력과 다른 값으로 이미 설정 → 재발송·복구 호환을 위해 '동일 역할 유지' 원칙상 거부(role 교체 불가, plan §4.2·§4.3)
3) OTP 발송(기존): 코드 생성·세션 생성·sendSms. 저장 실패/발송 실패 시 세션 revoke(기존 복구 보존)
```
> **경합 방지(plan §4.2·§4.5)**: role 저장은 **OTP 발송 전**, 동일 신원 잠금 안에서 1회. 인증 중 role 교체 요청은 서버에서 거부. 추출값/PDF/신청 이름·전화가 바뀌면 **새 초안**으로 진행(기존 초안 수정 아님 — §4.2).

#### Response
성공/실패 **계약 불변**(`GuestIdentityStartResponse` = `{ verificationId, launch, expiresAt }`). role은 응답에 포함하지 않는다(서버 저장만). 실패는 기존 `{error, code}`(`invalid_input`/`not_found`/`provider_unavailable`/`rate_limited`).

### 3.3 불변 — `POST /api/guest-monitoring/identity/verify-otp`

OTP 확인 → HttpOnly 조회세션 발급. **계약·동작 불변**. role은 이미 초안에 저장되어 있으므로 verify-otp는 변경 없음. 성공 후 폼은 이름·전화·역할·확인 결과를 복원(프론트 §4.4).

### 3.4 변경(동작만) — `POST /api/guest-monitoring/orders` (역할·소유자 게이트)

주문 생성. **요청/응답 계약 불변**(`GuestOrderRequest`/`GuestOrderResponse`). `createOrder`의 **initial 경로에 역할·소유자 서버 게이트 추가**.

#### 인증 필요 여부
**필요**(조회세션). 기존 `requireSession`·`guestLimit("orders")` 보존.

#### `createOrder` initial 경로 게이트 (plan §4.4 — **결제정보 생성·SDK 실행 전**)
동일 신원 잠금(`locked`) 안, property(초안) 로드 **직후**, **pending/existing 재사용 조기반환보다 앞**에서:
```
A) 정확 idempotencyKey 재요청 → 기존 주문 그대로 반환(멱등 재시도 보존, 기존 동작)
B) [신규] role 게이트:
     - property.role 이 "owner"|"tenant" 가 아니면(신규 초안 null 포함) → invalid_input(400)  // 미선택 차단
     - role==="owner": ownerNameMatches(property.guestName, property.ownerName) 실패
         → GuestError("owner_name_mismatch", 403)  // 결제정보 생성/SDK 실행 전 중단
     - role==="tenant": 소유자 대조 생략(단, PDF ownerName은 감시 upstream에 계속 필요 — 저장 유지)
C) (기존) 미완료 주문 재사용 / draft 만료·중복활성 검사 / 주문 생성
```
- **이름은 주문 요청값이 아니라 인증에 결합된 초안의 `property.guestName`을 사용**(plan §4.4-1). 주문 요청에서 역할/소유자를 덮어쓰지 않는다.
- **기존 null 역할 호환**: renewal 경로(purpose!=="initial")는 role 게이트를 적용하지 않는다(기존 active/expired·결제된 건 보존, 중립 처리). initial만 role 필수.
- 응답·로그에 두 이름 원문을 포함하지 않는다(plan §4.4-5).

#### Response — 실패(신규 코드)
| code | status | 트리거 | 사용자 메시지 |
|---|---|---|---|
| `owner_name_mismatch` | 403 | role=owner인데 guestName≠ownerName | **본인 소유 물건이 아닙니다.** |
| `invalid_input` | 400 | initial인데 role 미선택/비정상 | 입력 내용을 확인해주세요. |

> `errors.ts.messages`에 `owner_name_mismatch: "본인 소유 물건이 아닙니다."` 추가. 기존 `draft_expired`/`duplicate_active`/`not_found` 등은 불변.

### 3.5 회귀 보존 대상 (계약 **불변** — SSOT: `lib.design.md §3`)

| 엔드포인트 | 인증 | 회귀 관점(이번 변경이 깨지 않는지) |
|---|---|---|
| `GET /orders/[orderId]` | 조회세션 | 결제 중 복구 — 변경 없음 |
| `POST /payment/callback` | — | 콜백 서명·nonce·서버 재조회·멱등 활성화 — **단, 활성화 방어검증에 역할/소유자 재확인 추가(§3.6)** |
| `GET /properties`, `GET /properties/[id]/calendar`, `DELETE /session` | 조회세션 | 현황·달력·로그아웃 — **달력 요약은 역할별 문구로 교체(§4.7)**, 주소 축약 호환 확인 |
| cron `registry-monitor` / `guest-monitoring-lifecycle` | cron secret | precheck 요약을 역할별 빌더로 생성(§4.7) |

**감시 연계 회귀(`precheck-adapter.ts`)**: `fetchRegistryCaseStatus({ reqAddress: property.address, commUniqueNo, ownerName })`가 **동/호 포함 `address`로도 동일 물건을 조회**하는지 회귀 확인(plan §4.3). 최종 `address`·고유번호·소유자 조합이 같은 물건을 가리켜야 한다.

### 3.6 변경(방어) — `applyPaidOrder` (활성화 역할/소유자 재확인)

결제 승인 후 활성화(`activation.ts`). initial 적용 시 **방어적으로** role·소유자 재확인:
- `property.role` 미설정 또는 owner 불일치가 **활성화 시점에 발견**되면 → **결제 사실을 유실시키지 않고** 기존 `needs_review` 정책으로 전환(승인 증빙 보존, 감사 로그, 자동 환불/새 결제 금지 — plan §4.4-8). 단순 throw로 결제를 버리지 않는다.
- 정상(검증 통과)은 기존대로 활성화(`status=active`, `paidUntil`, `appliedAt` 1회 적용).

---

## 4. UX 요구사항 (프론트 구현 계약)

> ⚠️ **본 절은 동작 명세다. UI 구현 코드는 작성하지 않는다.**

### 4.1 입력·자동입력
1. 최초 입력은 **이름·전화·PDF 세 항목**. **주소 입력란 없음**. "등기부 PDF를 올리면 주소·동/호·소유자를 자동으로 확인합니다" 수준 안내.
2. 전화 `onChange`: 숫자만 추출 후 `formatMobile` 적용(표시). 초기값·OTP 복원값도 동일 포맷. **요청·DB·신원해시는 `normalizeGuestPhone` 기준**(숫자 정규형). 새 포맷 함수 만들지 않음.
3. PDF **선택 자체는 분석 성공이 아님**. "등기부 분석하기" 성공(draft 수신) 시에만 주소·동/호·마스킹 고유번호·소유자를 확인 영역에 표시. **최초 `useState` 초기값에 의존하지 말고** draft 응답 수신 이벤트로 동기화.
4. 분석 중 입력 잠금(지연 응답이 새 입력을 덮지 못하게). `genRef` 세대 가드 보존.

### 4.2 추출 결과 확인·역할·수정
- 분석 완료 후 순서: **① 추출 결과 확인(GuestExtractionPanel) → ② 역할 선택(GuestRoleSelect) → ③ 필수 동의 → ④ "본인인증 후 결제 (10,000원)"**.
- **역할 선택**: 접근 가능한 radio group. **기본 선택 없음, owner/tenant 동일 비중**. 미선택 시 인증·결제 진행 불가(서버도 거부 — §3.4-B). 값은 `GuestMonitoringRole`.
- **수정(§6 결정)**: 추출 결과는 **읽기전용 확인**(마스킹 소유자·고유번호). **핵심 식별자(ownerName/commUniqueNo/주소)를 자유 텍스트로 수정해 서버 저장값을 덮어쓰지 않는다.** "다시 입력"은 **PDF 교체 후 재분석(새 초안)** 경로로만 정정한다. 클릭 시 **기존 초안·주문 재개 참조·OTP·동의를 무효화**하고 이름·전화는 유지해 재분석.
- 집합건물인데 동/호 미확정이면 진행 차단. 서버가 정합성 확인 불가한 값은 확정하지 않음(재업로드 유도).

### 4.3 업로드 영역
- 카드 내부 가용 폭 기준 `width:100%` + `box-sizing:border-box`. 입력·주요 버튼과 좌우 경계 일치, 모바일 긴 파일명 넘침 없음. **비회원 범위 클래스**로 적용(공유 `.mDropZone` 전역 변경 금지 → 회원 폼 영향 차단).
- 키보드 접근(네이티브 button)·파일 선택·선택 상태 표시·분석 중 disabled 유지.
- **드롭 지원**: 파일 선택과 동일한 파일 검증·단일 파일 정책. 기존 프로젝트 드롭 패턴 재사용, 신규 업로드 라이브러리 금지.

### 4.4 흐름·보안·멱등 보존 (불변)
- 기존 표시 흐름 `input → ready → otp → ordering → paying → recovering → done`을 **PDF분석·역할·인증·결제·완료**가 이해되게 확장하되, 주문 실행·복구 책임은 `useGuestOrderFlow`에 유지.
- 수정 후 **초안만 교체**, 기존 OTP·주문 참조 재사용 금지. OTP 취소·재발송·폼 재마운트 시 **이름·포맷 전화·역할·확인 결과 복원**. 인증 중 role 교체 경합은 서버에서도 거부(§3.2).
- 인증 시작 전 유효 초안·역할 선택·동의 확인. `extractionOk=false`/검증 실패에서 인증·주문·결제 진입 금지.
- 세션·브라우저 바인딩·신원해시·초안만료·주문 멱등키·동일물건 중복활성 방지·SDK 재진입 잠금·401 재인증·결제 복구 보존. **역할을 바꿔 별도 중복 활성 물건을 만들 수 없다.**
- 완료 판정은 **서버 주문 `paid && applied`만** 근거. OTP 성공·SDK 반환만으로 완료 처리 금지.
- 소유자·고유번호는 UI 마스킹 유지. PDF 원문·추출 전문·OTP·주소·전화를 URL·localStorage·sessionStorage·로그에 추가 저장 금지. PII 암호화 경로 유지.

### 4.5 소유자 대조 UX
- `role=owner` 불일치는 **"본인 소유 물건이 아닙니다"**(서버 `owner_name_mismatch` 403)를 `role=alert`로 표시하고 **결제 진입 차단**. 응답/화면에 두 이름 원문 비노출.
- OTP는 **전화 수신 권한**을 확인할 뿐 실명·소유권을 증명하지 않는다. 이름 일치는 **신청 조건**이며 소유권의 독립 증명이 아님 — 안내 문구를 과장하지 않는다(plan §4.4 말미).

---

## 5. 구현 순서 (백엔드 → UI)

plan §5 우선순위를 그대로 따른다. **파일 하나씩 순차 변경 → 검증 → 다음 파일**(프로젝트 규칙).

### Phase 0 (P0 / 설계 선행) — 결정 확정
§6의 수정/PII 정책, 기존 null·pending 호환, 변동 발송 계약을 확정(본 문서 §2·§3·§4·§6에 반영). **보안 우회·미정 API 계약 없이 구현 가능** 상태 확보. 운영 role 컬럼 적용 전제·롤백 경계 확정.

### Phase 1 (P0) — PDF-only 서버/DTO·동호 추출 [백엔드/Codex]
- 대상: `lib/guest-monitoring/property-fields.ts`(신규), `pdf-extraction.ts`, `schemas.ts`, `draft.ts`, `types/guest-monitoring.ts`
- 산출: `parseUnitNumber`·`isAggregate`, `extractRegistryFields(text)`(주소 비교 제거), applicantSchema address 제거, 허용목록 `[file,guestName,guestPhone]`, 응답 `unitNumber` 추가.
- 종료조건: **주소 없이 분석 성공, address 키 거부, 추출 실패 안전 종료**, `address_mismatch` 호출 없음.
- 검증: `npx vitest run --config lib/guest-monitoring/vitest.config.ts`(+ `security.test.ts` 주소매칭 기대값 교체·확장) + 변경파일 lint + `npm run build`.

### Phase 2 (P0) — role 스키마·신청 저장·소유자 비교 [백엔드/Codex]
- 대상: `prisma/schema.prisma`(role 추가전용), `types`(GuestMonitoringRole·role), `schemas.ts`(identityStart role refine), `session.ts`/`sms-otp.ts`(role 초안 저장), `owner-match.ts`(신규), `order.ts`(게이트), `activation.ts`(방어), `errors.ts`(owner_name_mismatch).
- 종료조건: **owner 일치/불일치, tenant 생략, 미선택 차단**. 주문 조기반환·복구·콜백 경로로 우회 불가. 활성화 방어검증 needs_review.
- 검증: 비회원 vitest + 테스트 DB role 컬럼 호환 확인 + lint + build. **운영 ALTER는 대장 수동(미실행)**.

### Phase 3 (P0) — 프론트 주소 제거·전화포맷·전체폭·확인/역할 [프론트/Claude]
- 대상: `guestApi.ts`(parsePdf address 제거·identityStart role), `useGuestApply.ts`(주소 제거·역할 상태), `GuestApplyForm.tsx`+신규 `GuestExtractionPanel`/`GuestRoleSelect`/`GuestPdfDropField`, `GuestApplyClient.tsx`/`GuestEntrySection.tsx`(주소 주입 제거).
- 종료조건: **독립 신청·랜딩 모두 동일 동작**. 실제 입력 반영·수정 후 재분석·복원·역할 접근성. 각 파일 500줄 이하(§1.2 분리).
- 검증: lint + build + 브라우저 수동(렌더·이벤트·포커스·폭).

### Phase 4 (P0) — OTP/주문/결제/활성화·복구 연결 [양측]
- 종료조건: 기존 **멱등·오류·재인증·콜백 복구 회귀 없음**, 역할 게이트가 모든 경로에서 일관.

### Phase 5 (P0) — 역할별 알림 생성·달력·발송 경계 [백엔드/Codex]
- 대상: `signal-message.ts`(신규), `precheck-adapter.ts`·`calendar-dto.ts`(role plumbing).
- 산출: `buildSignalSummary(role, result, caseType?)` 단일 소스. 화면/달력 요약 역할 분기. **외부 변동 SMS 발송은 범위 외**(§4.7, §6-C).
- 종료조건: 역할·사건 단계·null 중립 검증. `no_change`/`fetch_failed` 오경보 없음.

### Phase 6 (P0) — 테스트·Codex 교차검수·테스트환경 검증
§7 통과, 중대 미해결 결함 없음.

### Phase 7 (P1) — 비차단 안내·진행 문구 다듬기
핵심 흐름 변경 없음. 역할 알림·수정·소유자 비교를 후순위로 축소하지 않는다.

> **배포**: 이 문서 단계에서는 구현·테스트·배포를 하지 않는다. 향후 배포는 `main 커밋 → deploy vestra(t-vestra) → test 브랜치 동기화 → 대장 확인 → promote`(CLAUDE.md). **운영 role 컬럼 수동 적용 전 새 코드의 운영 활성화 금지.**

---

## 6. 상세 설계 결정 (plan §6 — P0 산출물 확정)

| 항목 | 충돌 | **확정 결정** |
|---|---|---|
| 주소 제거 ↔ 추출 후 수정 | "주소 수동입력 완전 제거" + "추출 결과 수정 가능" | 분석 **전** 주소 필드/매칭 **완전 제거**. 분석 **후** 정정은 **읽기전용 확인 + PDF 교체 재분석**으로 해석. 자유 텍스트로 식별자를 덮어쓰는 수정 API는 **만들지 않는다**(§4.2). |
| 소유자·고유번호 수정 | ownerName을 자기 이름으로 바꾸면 대조 우회, commUniqueNo 변경은 다른 물건 전환 | `ownerName/commUniqueNo/주소`는 **서버 PDF 추출 원본으로만** 저장·대조. 핵심 식별 정정은 **교체 PDF 재분석(새 초안)**으로만 확정. 임의 수정값을 기준값으로 저장하지 않는다. |
| 마스킹 ↔ 원문 편집 | 인증 전 원문 미반환 경계 | 인증 전 **마스킹 유지**, 원문 자동입력/편집 **없음**. 인증 후 정정도 기존 초안 변경이 아니라 **새 초안 생성·재분석·재인증**(§4.2). 평문 DTO 확장으로 해결하지 않음. |
| 기존 레코드 호환 | 분석 직후 role 미선택 null ↔ 과거 null 레코드 동일 표현 | **purpose로 구분**: initial(신규 신청)은 role 필수(§3.4-B). renewal/status(기존 active/expired·결제건)는 role 미요구·중립 처리. 새 초안이 기존 건 예외로 통과하지 못하게 initial에서 반드시 enum 검증. |
| 역할 저장 시점 | 분석 후 선택 → createDraft 시 owner 검증 불가 | **identity/start(apply)에서 role 확정·초안 저장(OTP 발송 전)**, **OTP 성공 후 createOrder에서 owner 대조**. 인증/주문 시작 후 role·물건값 변경 금지(§3.2·§4.4). |
| 변동 알림 발송 | outbox는 만료 안내 전용·사건 단위 유일키 없음 | 이번 범위: **역할별 메시지 생성 + 화면/달력 반영**(`signal-message.ts` 단일 소스). **외부 변동 SMS 발송은 범위 외** — 안정 사건 식별자(`receiptNo` 등)·이벤트 영속·중복방지가 필요하며 **추가 DB 설계 별도 범위**로 제안(§4.7). 만료 안내 outbox·영수증 reconciliation 의미를 바꿔 우회하지 않는다. |

> **동시 선언 금지(plan §6 말미)**: "모든 추출값 자유 수정·저장"과 "PDF 원본 소유자 검증·마스킹 유지"를 동시에 만족한다고 선언하지 않는다. "수정 가능" 요구는 **PDF 교체 재분석**으로 충족하며 식별자 자유덮어쓰기는 채택하지 않는다.

---

## 7. 절대규칙 준수 체크리스트

### 7.1 플랫폼 5대 원칙
| 원칙 | 설계 반영 |
|---|---|
| **1. 페이지 500줄** | `useGuestApply`(413)·`GuestApplyForm`(223→변동) 위험구역 → 확인패널·역할·드롭을 신규 컴포넌트 분리, 서버 순수로직을 `property-fields`/`owner-match`/`signal-message`로 분리(§1.2). 400줄 초과 감지 시 대장 보고 |
| **2. 단일 책임** | UI(폼/패널/역할/드롭)·상태(훅)·검증(schemas)·추출(pdf-extraction/property-fields)·대조(owner-match)·저장(draft)·주문게이트(order)·알림(signal-message) 각 파일 분리 |
| **3. 서버 검증·보안** | role/이름/전화/PDF 모두 **서버 zod strict + 허용목록 + 중복키 거부 + 매직바이트**. 식별자·소유자·최종주소는 **PDF 추출만 신뢰**. owner 판정은 서버 저장값 기준. PII·OTP·원문 로그/URL/저장소 비노출 |
| **4. 성능** | parse-pdf 1회 호출 분석(중복요청 없음)·PDF `destroy`. precheck/calendar `select`는 필요한 컬럼만(role 추가 시 컬럼 존재 전제). 신규 N+1 없음. owner 대조는 단건 순수함수 |
| **5. 폴더 역할** | `components/`(UI)·`hooks/`(상태)·`lib/guest-monitoring/`(서버)·`types/`(타입)·`app/api/`(라우트)·`prisma/`(스키마) 규칙 준수 |

### 7.2 견고성 4문 (global rule 0-5)
| 질문 | 설계 답변 |
|---|---|
| **규모(100×)** | IP limit·11MB·10MB·40페이지·300K자 상한 보존. precheck는 `take: GUEST_BATCH_SIZE`·슬롯 rate limit 보존. owner 대조·동호 파싱은 단건 서버 순수함수. 목록성 role 조회 없음 |
| **수명주기** | 초안 TTL·정리 보존. 수정 시 초안·OTP·동의·주문참조 **무효화**. role은 추가전용 컬럼 — 고아/삭제 경로 불변. 변동 SMS 이벤트 영속은 **범위 외로 명시**(미완성 발송을 완성으로 오인하지 않음) |
| **비정상 경로** | 지연응답(genRef)·이중클릭·401 재인증·IDOR(조회세션+신원해시)·env 누락(게이트)·입력위조(허용목록·매직바이트)·role 미선택/교체경합/null 호환·owner 우회(수정값 주입·다른 초안·orders/복구/콜백 직접호출)·집합건물 호 미확정 처리 명시 |
| **적대적 자문** | owner 대조 우회(이름 수정·식별자 덮어쓰기)·role 승격 오남용·기존 null 건 오거부·ORM role 컬럼 부재 에러·동/호 오인(층/행정동/접수번호)·중복 접미사·변동 SMS 미완성을 §2~4에 명시. 구현 후 **독립 Codex 교차검수(Phase 6)** 필수 |

### 7.3 이번 단계 경계
- 본 문서는 **설계만**. 기능 코드·테스트 실행·운영 DB ALTER·배포·실제 문자/결제 **없음**.
- DB 변경은 **`role String?` 추가전용 1개**. 운영 적용은 대장 수동. 동/호·변동 발송 컬럼은 범위 외.
- 계약이 바뀌는 엔드포인트는 **parse-pdf / identity/start(apply) / orders(동작)** 3개. 나머지는 `lib.design.md` SSOT 불변.
- **app.design.md(주소검색 유지)와 parse-pdf 요청 모양이 배타적** — 채택 방향은 대장 승인(§0.2).

---

## 8. 백엔드·프론트 합의 요약 (한눈에)

| 항목 | 백엔드(Codex) 책임 | 프론트(Claude) 책임 |
|---|---|---|
| parse-pdf 계약 | 허용목록 `[file,guestName,guestPhone]`·중복키 거부, **address 키 거부**, 동/호 구조화·`unitNumber` 응답 | parsePdf FormData에 **주소/동/호 키 없음**, draft 수신 후 확인영역 동기화 |
| 동/호 | `parseUnitNumber` 전유부분에서만 구조화, 집합건물 호 미확정 시 `extraction_incomplete` | 마스킹 확인 표시, 미확정 시 재업로드 안내(자유 수정 없음) |
| 역할 | identity/start(apply)에서 `role` enum 검증·**OTP 발송 전 초안 저장**, 교체 금지 | owner/tenant radio group(기본선택 없음), 복원 유지, 서버 저장값 신뢰 |
| 소유자 대조 | createOrder initial에서 **조기반환보다 앞** owner 대조, 불일치 403 `owner_name_mismatch` | "본인 소유 물건이 아닙니다" `role=alert` 표시·결제 차단 |
| 전화 | `normalizeGuestPhone` 저장·해시 | `formatMobile` 표시만 |
| 저장 | storedAddress(동/호 포함)+commUniqueNo+ownerName+role, **비존재 컬럼 전개 금지** | 저장값 신뢰 판단 안 함(표시·전달만) |
| 알림 | `buildSignalSummary(role,...)` 단일 소스, precheck/calendar 적용, null 중립 | 역할별 문구 표시, 변동 SMS는 범위 외 인지 |
| 불변 | parse/identity/orders 외 엔드포인트·흐름·멱등·복구·게이트·needs_review 보존 | genRef·OTP·주문흐름·복원·완료판정(`paid && applied`) 보존 |
</content>
</invoke>

# 비회원 등기감시 신청 폼 표준 UX 정비 설계서 (공용 계약서)

> **Plan**: `docs/01-plan/features/app.plan.md`
> **관련 계약서**: `docs/02-design/features/lib.design.md` (기존 비회원 전체 흐름·엔드포인트 SSOT)
> **Author**: Claude (대장 승인 전 초안)
> **Date**: 2026-10-16
> **Status**: Design · 구현 전
> **대상 독자**: 백엔드(Codex) / 프론트엔드(Claude) — 각자 구현 시 따르는 단일 계약서
> **범위 한 줄**: 비회원 신청 폼을 플랫폼 표준(전화 포맷·공통 주소검색·집합건물 동/호)에 맞추고, 주소 없이 PDF만으로 분석·자동입력을 가능하게 한다.

---

## 0. 이 문서의 위상과 범위

- 이 문서는 **계약서**다. 변경되는 API 요청/응답 스키마·타입·에러 코드·추출 계약은 백엔드와 프론트가 **반드시 동일하게** 구현한다. 한쪽이 임의로 바꾸면 상대 구현이 깨지므로, 변경이 필요하면 **이 문서를 먼저 고치고 양측에 공지**한다.
- 이번 작업으로 **새로 만들거나 교체하지 않는 것**: 인증 공급자(다날/SMS OTP), 결제 공급자(PortOne V1), 신규 지도·주소검색 UI, 임의 주소 직접입력 폼, 신규 결제 흐름, 전체 신청 화면 리디자인, 회원 신청 폼, **DB 스키마(prisma)**.
- 신청 단계는 그대로 유지한다: **신청 입력 → PDF 분석·초안 확인 → 본인인증 OTP → 주문·결제 → 서버 결과 확인·완료**. 다날/OTP 분기도 보존한다(`lib.design.md` §5~6).
- 유일하게 계약이 바뀌는 API는 **`POST /api/guest-monitoring/parse-pdf`** 한 개다(§3). 나머지 엔드포인트(identity/start·verify-otp·orders·payment/callback·orders/[id]·properties·session)는 **계약 불변**이며 `lib.design.md §3`이 SSOT다. 본 문서는 그 엔드포인트들을 **회귀 보존 대상**으로만 다룬다.

### 0.1 용어

| 용어 | 정의 |
|---|---|
| **AddressValue** | 공통 주소 입력 값 객체. `components/common/AddressSearchField.tsx`가 정의·소유. `{ roadAddress, jibunAddress, zonecode, buildingName, isBuilding, dong, ho, detail }`. |
| **집합건물(aggregate)** | `AGGREGATE_TYPES = ["아파트", "빌라/다세대", "오피스텔"]` 세 유형. 동/호 입력이 필수가 되는 물건. (`jeonse/components/JeonseSafetyAnalysis.tsx` 패턴) |
| **표시용 주소(display)** | 화면/저장용 사람이 읽는 주소 문자열. `composeAddress(AddressValue)`가 **도로명 우선**으로 조합. |
| **비교용 주소(compare)** | PDF 지번 표제부와 동일성 검증에 쓰는 주소. **지번 우선**(`jibunAddress || roadAddress`). 표시용과 **다를 수 있음** → 혼용 금지(plan 2p 각주). |
| **storedAddress** | 서버가 검증을 통과시킨 뒤 DB `address` 컬럼(암호화)에 저장하는 최종 문자열. 기본주소 + 검증된 동/호를 **중복 없이** 조합. |
| **draft(초안)** | 결제 전 PDF 파싱 결과 레코드(`GuestMonitoring.status=pending_payment`). TTL 후 삭제. |

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 레이어 경계 (절대규칙 2·3·5 — 단일 책임 / 서버검증 / 폴더 역할)

```
UI (GuestApplyForm + AddressSearchField)
  └ 담당: AddressValue 상태, 전화 표시 포맷(formatMobile), 집합건물 동/호 조건부 노출,
          PDF 선택·드롭 이벤트, 분석 중 입력 잠금, 비동기 draft 수신 후 필드 동기화
  └ 안 함: 주소 추정·보정, 고유번호/소유자 입력, 가격/권한 판단, PDF 추출·동일성 검증
        │ parsePdf(FormData: file, guestName, guestPhone, address?, dong?, ho?)
        ▼
Hook (useGuestApply + 신규 순수 변환 유틸)
  └ 담당: 분석 입력 검증(주소 필수 해제), 최신 응답(draft)만 반영(genRef 가드),
          OTP·주문 흐름 연결, draft → 폼 복원값 전달
  └ 안 함: 주소 파싱/조합 로직을 훅 본문에 누적(순수 함수로 분리, §1.2)
        │ POST /api/guest-monitoring/parse-pdf
        ▼
API Route (app/api/guest-monitoring/parse-pdf/route.ts)  ── 계약 불변
  └ endpoint() 래퍼·Origin·IP limit·11MB boundedBody·no-store·Node 런타임 보존
        │ createDraft(form)
        ▼
Service (lib/guest-monitoring/draft.ts · schemas.ts · pdf-extraction.ts · property-fields.ts[신규])
  └ 담당: FormData 허용목록·중복키 거부, zod strict 검증, PDF 매직바이트·용량·페이지 검증,
          주소 선택적 비교, 동/호 구조화, 저장용/응답용 데이터 분리
        │
        ├─▶ lib/registry-parser.ts · lib/registry/section-parsers.ts (표제부 재사용, 변경 없음)
        └─▶ prisma.guestMonitoring (기존 컬럼만, 신규 컬럼 없음)
```

**철칙**: UI/클라이언트가 보내는 `dong`·`ho`·`address`는 **서버 검증 입력일 뿐 신뢰 소스가 아니다**. 저장되는 고유번호·소유자·최종 주소는 **동일 PDF 추출 결과로만** 확정한다(plan 5.2-7).

### 1.2 변경·신규 파일 분리 계획 (절대규칙 1 — 500줄, 5 — 폴더 역할)

| 책임 | 파일 | 구분 | 현재 | 예상 | 분리 전략 |
|---|---|---|---|---|---|
| 화면·자동입력·파일 이벤트·잠금 | `components/guest/GuestApplyForm.tsx` | 변경 | 223줄 | ~300줄 | 전화 onChange·AddressSearchField·동/호 조건부가 추가되면 400줄 접근 시 PDF 업로드 영역을 **`components/guest/GuestPdfDropField.tsx`** 로 분리(드롭·클릭·검증·disabled·파일명 표시 전담). 400줄 초과 감지 시 대장 보고 후 진행. |
| 분석 입력 검증·최신 응답 반영·흐름 연결 | `hooks/useGuestApply.ts` | 변경 | 413줄 | ⚠️ 500 근접 | **본문에 주소 파싱/조합 로직을 넣지 않는다.** 주소·동/호 변환은 전부 아래 신규 순수 모듈로 뺀다. 훅은 호출만. 413줄 시작이므로 신규 state는 최소화. |
| 주소/동호/유형 순수 변환(클라이언트) | `app/(personal-home)/renewal/monitoring/guest/addressMapping.ts` | **신규** | — | ~80줄 | `draftResponse → AddressValue`, `AddressValue → 비교용 주소`, 집합건물 유형 판정 보조. React 의존 없는 순수 함수. 폼·훅 공용. |
| 복원값 연결 | `guest/apply/GuestApplyClient.tsx` | 변경(소폭) | 177줄 | ~185줄 | draft의 addressValue/propertyType를 폼 초기값으로 내려주는 prop 배선만. |
| 멀티파트 클라이언트 계약 | `guest/guestApi.ts` | 변경 | 194줄 | ~210줄 | `parsePdf` 입력에 `address?`·`dong?`·`ho?` 추가, 미제공 시 FormData 키 자체를 넣지 않음. |
| 요청 스키마 | `lib/guest-monitoring/schemas.ts` | 변경 | 25줄 | ~40줄 | `applicantSchema`의 address를 optional로, dong/ho optional 추가(strict 유지). |
| 추출·주소 비교·동호 구조화(서버) | `lib/guest-monitoring/pdf-extraction.ts` | 변경 | 46줄 | ~90줄 | `extractRegistryFields(text, inputAddress?)` 선택 인자화. 동/호 구조화는 아래 신규 순수 모듈 호출. |
| 동호 구조화·유형 매핑·주소 조합(서버 순수) | `lib/guest-monitoring/property-fields.ts` | **신규** | — | ~70줄 | `parseUnitNumber`, `mapPropertyType`, `composeStoredAddress`, `buildAddressValue`. 테스트 1급 대상. |
| 저장/응답 조립 | `lib/guest-monitoring/draft.ts` | 변경 | 29줄 | ~45줄 | FormData 허용목록에 `dong`·`ho` 추가, 저장용 값(storedAddress)과 응답용 값(addressValue) 분리, `...fields` 전개 시 존재하지 않는 컬럼 금지. |
| 응답 타입 | `types/guest-monitoring.ts` | 변경 | 93줄 | ~105줄 | `GuestDraftResponse`에 `addressValue`·`propertyType` 추가(하위호환 추가). |
| CSS 폭 보정 | `guest/guest.module.css` | 변경 | — | +~6줄 | 비회원 범위 드롭존 폭 100%·`box-sizing`. 공유 `.mDropZone` 전역 변경 금지. |
| 재사용(변경 없음) | `lib/phone-format.ts`, `components/common/AddressSearchField.tsx` | 재사용 | — | — | `formatMobile` 그대로. AddressSearchField는 **제어 컴포넌트로 재사용**. 동/호 UI 중복 생성 금지. `disabled` prop 없음 → 잠금은 상위 `<fieldset disabled>` 우선 검토(§4.3). |

> **500줄 경보**: `useGuestApply.ts`(413줄)와 `GuestApplyForm.tsx`(223→증가)가 위험 구역. 구현 중 400줄 초과가 감지되면 즉시 대장에게 보고 후 위 분리안대로 진행한다(global rule 강제 트리거).

---

## 2. 데이터 모델

### 2.1 DB 스키마 — **변경 없음**

이번 기능은 **신규 컬럼·테이블·인덱스·마이그레이션을 전제하지 않는다**. `GuestMonitoring`의 기존 암호화 주소 컬럼(`address`) 하나로 처리한다. 동/호 전용 컬럼은 없다.

- 동/호는 `storedAddress` 문자열 안에 조합되어 `address` 컬럼에 저장된다(예: `서울 강남구 ... 101동 1502호`).
- 추출 메타데이터(`addressValue`, `propertyType`)는 **응답 전용**이며 **DB에 저장하지 않는다.**
- `createDraft`의 `prisma...create({ data: { ...fields } })`에 **존재하지 않는 컬럼(dong/ho/addressValue/propertyType)을 펼치지 않는다.** 저장용 객체와 응답용 객체를 명시적으로 분리한다(plan 5.2 말미).

기존 저장 필드(불변):

| 컬럼 | 값 | 비고 |
|---|---|---|
| `guestName` | `normalizeGuestName` 정규화 | 기존 |
| `guestPhone` | `normalizeGuestPhone` 정규화(숫자) | 기존 — 하이픈 표시와 무관하게 숫자 저장 |
| `guestIdentityHash` | `guestIdentityHash(name, phone)` | 기존 blind index |
| `address` | **storedAddress** (기본주소 + 검증된 동/호) | 기존 컬럼, 암호화 경로 유지 |
| `commUniqueNo` | 동일 PDF 추출값 | 기존 |
| `ownerName` | 동일 PDF 추출값 | 기존 |
| `draftExpiresAt` | `now + DRAFT_TTL` | 기존 |

### 2.2 공유 타입 변경 (`types/guest-monitoring.ts`)

`GuestDraftResponse`에 **하위호환 추가** 필드 2개. 기존 필드는 그대로 둔다. 구버전 클라이언트(신규 필드 모름)도 깨지지 않아야 하므로 **추가만** 한다.

```ts
export interface GuestDraftAddressValue {
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
  buildingName: string;
  isBuilding: boolean;
  dong: string;   // 숫자 문자열("101") 또는 ""
  ho: string;     // 숫자 문자열("1502") 또는 ""
  detail: string; // 비집합건물 상세(서버 자동입력 시 "")
}

export interface GuestDraftResponse {
  draftId: string;
  address: string;               // [기존] storedAddress(표시·확인용). 서버가 검증한 값만.
  commUniqueNoMasked: string;    // [기존]
  ownerNameMasked: string;       // [기존]
  extractionOk: boolean;         // [기존]
  draftExpiresAt: string;        // [기존]
  addressValue: GuestDraftAddressValue; // [신규] UI 복원용. 서버 확인값만 채움.
  propertyType: string | null;   // [신규] AGGREGATE_TYPES 멤버 또는 null(비집합/미확정)
}
```

- `addressValue`는 **UI 복원 전용 데이터**이며, 서버 소유자·고유번호의 입력 경로가 **아니다**. 요청에 `addressValue` 객체가 들어오면 기존처럼 **거부**한다(허용목록 밖 키).
- `propertyType`은 `AGGREGATE_TYPES`(`"아파트" | "빌라/다세대" | "오피스텔"`) 중 하나이거나 `null`. UI가 `null`을 비집합건물로 간주해 동/호 필수 검증을 걸지 않는다.
- `GuestDraftAddressValue`의 필드 집합은 `AddressValue`와 동일 모양이어야 UI가 그대로 상태에 넣을 수 있다. (서버는 타입 공유를 위해 `components/common/AddressSearchField.tsx`의 `AddressValue`를 참조하거나, `types/`에 공용 타입을 두고 양쪽이 참조한다 — 구현 시 한 곳으로 통일.)

### 2.3 서버 내부 타입 (추출 결과)

`extractRegistryFields` 반환 모양(내부용, 응답과 구분):

```ts
interface ExtractedRegistry {
  commUniqueNo: string;   // 고유번호 (저장·응답마스킹)
  ownerName: string;      // 소유자 (저장·응답마스킹)
  address: string;        // PDF 표제부 기본주소(지번 성격일 수 있음)
  dong: string;           // 전유부분에서 구조화한 동(숫자) 또는 ""
  ho: string;             // 전유부분에서 구조화한 호(숫자) 또는 ""
  isAggregate: boolean;   // 전유부분/isApartment 근거
  propertyType: string | null; // AGGREGATE_TYPES 매핑 결과
}
```

### 2.4 집합건물 유형 매핑 규칙 (`property-fields.ts`)

PDF 표제부 `purpose`/`isApartment`/전유부분 → `AGGREGATE_TYPES` 매핑. **단지명에 "아파트"가 있다는 이유만으로 판정하지 않는다**(plan 4.2).

| PDF 근거 (`parsed.title.purpose` 등) | `propertyType` | `isAggregate` |
|---|---|---|
| `아파트` + 전유부분 존재(`isApartment=true`) | `"아파트"` | true |
| `다세대주택` / `공동주택`(전유부분 존재) | `"빌라/다세대"` | true |
| `오피스텔`(전유부분 존재) | `"오피스텔"` | true |
| `다가구주택` / `단독주택` / 전유부분 없음 | `null` | false |
| 판단 불가 | `null` | false → 동/호 **미확정**으로 처리(§4.2 임의 보완 금지) |

- 집합건물 판정의 1차 근거는 **전유부분 존재(`parseRegistry().title.isApartment`)** 와 PDF `purpose`다. 검색 결과의 `isBuilding`은 사용자가 주소를 먼저 선택한 경우의 **보조 근거**로만 쓴다.
- `AddressValue.isBuilding`은 최종적으로 `isAggregate`와 **일치**시킨다(공통 컴포넌트가 이 값으로 동/호 UI 노출을 결정).

### 2.5 동/호 구조화 규칙 (`parseUnitNumber`)

입력: `parsed.title.unitNumber`(예: `제101동 제15층 제1502호` 또는 `제15층 제1502호`).

| 입력 예 | `dong` | `ho` | 비고 |
|---|---|---|---|
| `제101동 제15층 제1502호` | `"101"` | `"1502"` | **층은 호로 오인 금지** |
| `제15층 제1502호`(동 없음) | `""` | `"1502"` | 동 미상 → 빈값, 임의 생성 금지 |
| 전유부분 표식 없음 | `""` | `""` | 미확정 — 사용자 보완/재분석 유도(§4.2) |
| 비숫자/변형 | `""` | `""` | 임의 절단 금지. `extraction_incomplete`로 처리 가능 |

- `동`/`호` 접미사를 이미 포함한 숫자를 재가공해 `동동`·`호호` 중복 접미사를 만들지 않는다.
- **행정동(법정동/행정동 명)·지번·층·접수번호의 `제○호`를 동/호로 오인하지 않는다**(plan 5.2-3). 추출은 **전유부분(표제부) 범위**에서만 수행한다.
- 결과 `dong`/`ho`는 공통 컴포넌트와 동일하게 **숫자 문자열**로만 반환한다.

---

## 3. API 스펙

### 3.1 변경 대상 — `POST /api/guest-monitoring/parse-pdf`

PDF 파싱 + 초안 생성. **멀티파트(FormData)**. 이번 작업으로 계약이 바뀌는 **유일한** 엔드포인트.

#### 메서드 + 경로
```
POST /api/guest-monitoring/parse-pdf
Content-Type: multipart/form-data
```

#### 인증 필요 여부
**불필요** (초안 생성은 인증 전 단계). 단, 기존 보호장치는 전부 보존:
- `endpoint(..., { upload: true })` 래퍼 — Origin 검증, 기능/암호화 게이트
- `ipLimit(req, "parse-pdf", 10)` — IP당 레이트리밋
- `boundedBody(req, 11 * 1024 * 1024)` — 요청 본문 11MB 상한
- `runtime = "nodejs"`, `maxDuration = 60`
- 응답 `Cache-Control: no-store`

#### Request body (FormData 필드)

| 키 | 타입 | 필수 | 검증 | 비고 |
|---|---|---|---|---|
| `file` | File(PDF) | ✅ | `application/pdf` + 확장자 `.pdf` + 매직바이트 + size>0 + ≤10MB(초과 시 413) + 1~40페이지 + 텍스트 50~300,000자 | 기존 그대로 |
| `guestName` | string | ✅ | `applicantSchema.name`: normalize 후 2~80자, `/^[\p{L}\p{M} .'-]+$/u` | 기존 |
| `guestPhone` | string | ✅ | `applicantSchema.phone`: `normalizeGuestPhone` 후 `/^01[016789]\d{7,8}$/` | 기존. 하이픈 유무 무관(클라가 숫자/하이픈 혼재 전송 가능) |
| `address` | string | ⬜ **선택** | 제공 시: trim 후 5~300자, 제어문자/`^v\d+:` 금지(기존 refine). 미제공·빈문자열·공백만 → **미제공으로 정규화** | **[변경] 선택 입력화.** 제공 시 PDF 지번 비교용 |
| `dong` | string | ⬜ 선택 | 제공 시: 숫자만 1~10자. **`address`와 함께 제출할 때만 허용** | **[신규]** 사용자가 주소 먼저 선택 후 직접 입력한 동 |
| `ho` | string | ⬜ 선택 | 제공 시: 숫자만 1~10자. **`address`와 함께 제출할 때만 허용** | **[신규]** 동일 |

**허용목록·중복키 규칙(불변 유지, 확장)**:
- 허용 키: `["file", "guestName", "guestPhone", "address", "dong", "ho"]`. **그 외 키 1개라도 있으면 `invalid_input`.**
- 각 키 `getAll(k).length === 1` (중복 키 거부).
- `ownerName`, `commUniqueNo`, 금액, `addressValue` 등은 **여전히 거부**(허용목록 밖).
- `dong`/`ho`만 있고 `address`가 없으면 `invalid_input`(동/호는 기본주소 동반 시에만 의미).
- **비어있지 않은 잘못된 주소를 "미제공"으로 묵살하지 않는다** — 길이/문자 검증으로 명시적 `invalid_input`(plan 5.1 말미).

#### 처리 흐름 (서버)

```
1) FormData 허용목록·중복키 검사
2) applicantSchema.safeParse({ guestName, guestPhone, address? , dong?, ho? })   // strict
3) file: instanceof File·type·확장자·size·매직바이트·용량 검사 (기존)
4) text = extractGuestPDF(buffer)                                                // 페이지·길이 제한 + destroy
5) fields = extractRegistryFields(text, inputAddress?)   // 주소 미제공이면 사용자 비교만 생략
     - not_registry / multiple_properties / extraction_incomplete / address_mismatch 분기 (아래)
     - 동/호 구조화(parseUnitNumber), 유형 매핑(mapPropertyType)
6) storedAddress = composeStoredAddress(fields.address, 검증된 dong/ho)          // 저장용
7) addressValue = buildAddressValue(fields)                                      // 응답용(복원)
8) prisma.create({ data: { guestName, guestPhone, guestIdentityHash, commUniqueNo, ownerName, address: storedAddress, draftExpiresAt } })
   // ⚠️ dong/ho/addressValue/propertyType는 data에 넣지 않는다(존재하지 않는 컬럼)
9) 응답 조립(마스킹 + addressValue + propertyType)
```

**주소 비교 규칙(plan 5.2-5·6)**:
- `address` 제공 시: 비교용 주소는 `jibunAddress || roadAddress`를 서버가 받되, **`normalizeAddress` 기반 정확 동일성**으로 PDF 표제부 주소와 비교한다. 부분 문자열/유사도 완화 금지.
- 기본주소와 동/호를 **구조적으로 나눠 각각 비교**하여, 같은 단지의 **다른 동/호는 반드시 거절**한다.
- 표시용 `composeAddress`의 도로명 우선 규칙을 **서버 비교 규칙으로 오용하지 않는다.**
- `address` 미제공 시: **사용자 주소와의 비교만** 생략. PDF 주소 추출 성공은 여전히 필수(실패 시 초안 저장 0회). 고유번호·소유자 검증 완화 없음.

#### Response — 성공 (200 `application/json`)

```jsonc
{
  "draftId": "ckx...",
  "address": "서울 강남구 테헤란로 1 101동 1502호",   // storedAddress(표시·확인용)
  "commUniqueNoMasked": "1146-****-******",
  "ownerNameMasked": "홍**",
  "extractionOk": true,
  "draftExpiresAt": "2026-10-16T09:30:00.000Z",
  "addressValue": {                                    // [신규] UI 복원용
    "roadAddress": "",
    "jibunAddress": "서울 강남구 역삼동 123",
    "zonecode": "",
    "buildingName": "",
    "isBuilding": true,
    "dong": "101",
    "ho": "1502",
    "detail": ""
  },
  "propertyType": "아파트"                              // [신규] 또는 null
}
```

- `addressValue`의 우편번호·도로명·지번은 **서버가 확인한 값만** 채운다. 검색 결과가 없는 PDF 추출값에 **우편번호/도로명/지번을 추정해 넣지 않는다**(plan 4.1-3). 추출 주소 종류가 명확하면 해당 필드에만 배치(지번이면 `jibunAddress`).
- `extractionOk`는 기존 의미 유지. `false`면 UI는 인증·주문·결제로 진입하지 않는다.

#### Response — 실패 (비-2xx, `GuestApiError` 계약 유지)

형태: `{ error: string, code: string }` (기존 `GuestApiError`). 상태코드·코드 모두 보존/확장.

| code | status | 트리거 | 사용자 메시지(`errors.ts`) |
|---|---|---|---|
| `invalid_input` | 400 | 허용목록 밖 키·중복키·스키마 실패·dong/ho만 단독 제출·비어있지 않은 잘못된 주소 | 입력 내용을 확인해주세요. |
| `invalid_pdf` | 400 | 파일형식·매직바이트·페이지(1~40)·텍스트길이 위반 | 유효한 등기부 PDF를 업로드해주세요. |
| `file_too_large` | 413 | PDF > 10MB | 10MB 이하 PDF를 업로드해주세요. |
| `not_registry` | 400 | 등기부 판별/갑구 부재 | 등기부등본 PDF를 업로드해주세요. |
| `multiple_properties` | 400 | 고유번호 2종 이상 | 한 물건의 등기부등본만 업로드해주세요. |
| `extraction_incomplete` | 400 | 고유번호/소유자 미확정·공유/법인/가림 소유자·**주소·동/호 구조화 실패(집합건물인데 호 미확정)** | 고유번호와 소유자를 확인할 수 없습니다. PDF를 확인해주세요. |
| `address_mismatch` | 400 | **주소 제공 시** 사용자 주소와 PDF 주소/동·호 불일치 | 입력 주소와 등기부 주소가 일치하지 않습니다. |
| `rate_limited` | 429 | IP limit 초과 | 요청이 많습니다. 잠시 후 다시 시도해주세요. |

> **중요 구분(plan 5.2-3)**: *주소 추출 실패*(PDF에서 물건 주소를 못 뽑음)와 *사용자 주소 불일치*는 다른 코드다. 전자는 `extraction_incomplete`(주소 미제공이어도 실패), 후자는 `address_mismatch`(주소 제공 시만). 집합건물인데 동/호를 PDF에서 확정하지 못하면 **임의 보완하지 않고** `extraction_incomplete`로 돌려 사용자 보완/재업로드를 유도한다.

### 3.2 회귀 보존 대상 엔드포인트 (계약 **불변** — SSOT: `lib.design.md §3`)

아래 엔드포인트는 이번 작업으로 **스펙이 바뀌지 않는다**. 재작성·재설계 금지. parse-pdf 변경이 이들 흐름을 깨지 않는지 **회귀 확인**만 한다.

| 엔드포인트 | 인증 | 역할 | 회귀 관점 |
|---|---|---|---|
| `POST /identity/start` | 불필요(draft 참조) | 본인인증 시작(다날/OTP 분기) | draftId가 신규 흐름에서도 유효하게 전달되는지 |
| `POST /identity/verify-otp` | 불필요→세션발급 | OTP 확인, HttpOnly 조회세션 설정 | OTP 성공 후 폼 복원(이름·전화·주소·동/호) |
| `POST /orders` | 조회세션 | 주문 생성(멱등키) | draft 교체 시 이전 주문 재사용 금지 |
| `GET /orders/[orderId]` | 조회세션 | 주문 상태(복구) | 변경 없음 |
| `POST /payment/callback` | — | 결제 콜백(echo·서버 REST 검증) | 변경 없음 |
| `GET /properties`, `GET /properties/[id]/calendar`, `DELETE /session` | 조회세션 | 현황·달력·로그아웃 | 변경 없음 |

### 3.3 감시 연계 회귀 (`lib/guest-monitoring/precheck-adapter.ts`)

- `runGuestPrechecks`는 `{ commUniqueNo, ownerName, address }`로 `fetchRegistryCaseStatus({ reqAddress: property.address, ... })`를 호출한다.
- **검증**: `storedAddress`에 동/호가 포함되어도 **동일 물건으로 조회되는지** 회귀 확인(plan 2p·5.2-7). 최종 `address`·고유번호·소유자 조합이 같은 물건을 가리켜야 한다.

---

## 4. UX 요구사항 (프론트 구현 계약)

> ⚠️ **본 절은 동작 명세다. UI 구현 코드는 작성하지 않는다.**

### 4.1 입력·자동입력

1. 기존 필드 순서·카드·단계 표시 유지. 주소에 "주소를 검색하거나 PDF 분석으로 자동 입력할 수 있습니다" 수준 안내 추가. **이름·전화는 분석 전 여전히 필수**, 주소는 선택.
2. 전화 `onChange`: 숫자만 추출 후 `formatMobile` 적용(표시). 초기값·OTP 복원값도 동일 포맷. **요청·DB·신원해시는 `normalizeGuestPhone` 기준**(숫자 정규형). 새 포맷 함수 만들지 않음.
3. 주소 상태는 `AddressValue`로 관리, `AddressSearchField`에 전달. 추정값 삽입 금지.
4. PDF **선택 자체는 분석 성공이 아님**. "등기부 분석하기" 요청 성공(draft 수신) 시에만 주소/동·호를 채우고 확인 영역에 동일 값 표시. **최초 `useState` 초기값에 의존하지 말고**, draft 응답 수신 이벤트로 `AddressValue` 상태와 확인 영역을 동기화한다.
5. 사용자가 주소를 **먼저 선택**한 경우: PDF 비교 성공 시에만 자동입력 반영. 불일치는 `address_mismatch`로 안내하고 **기존 입력 보존**. 분석 중에는 입력 잠금(지연 응답이 새 입력을 덮지 못하게).

### 4.2 집합건물·수정

- `AGGREGATE_TYPES` 세 유형 + `isAggregate` 조건부 노출 + `dongHoMissing` 진행 차단 패턴(jeonse 참고). PDF `다세대주택` 등은 §2.4 표로 **명시 매핑**.
- 동/호 UI는 **공통 컴포넌트의 기존 필드 재사용**(중복 생성 금지). `AddressValue.isBuilding = isAggregate(propertyType)` 일치.
- 비집합건물은 동/호 필수 검증 미적용.
- 집합건물인데 동/호 미확정이면 진행 차단(`dongHoMissing`). 서버가 정합성 확인 불가한 값은 확정하지 않음.
- **수정**: 기존 "다시 입력" 경로 유지. 클릭 시 **초안·주문 재개 참조·OTP·동의를 무효화**하고 입력값·선택 PDF는 가능 범위에서 유지해 재분석(`useGuestApply.goInput`/`onEdit` 경로 보존).

### 4.3 업로드 영역

- 카드 내부 가용 폭 기준 `width: 100%` + `box-sizing: border-box`. 부모 카드 최대 폭은 유지. **비회원 범위 클래스**로 적용(공유 `.mDropZone` 전역 변경 금지 → 회원 폼 영향 차단).
- 파일명 줄바꿈·긴 파일명 넘침 방지. 모바일 320/375px·데스크톱 확인.
- 키보드 접근(네이티브 button) 유지, 분석 중 비활성화 유지.
- **드롭 지원**: 파일 선택과 **동일한 파일 검증·단일 파일 정책**. 기존 프로젝트 드롭 패턴 재사용, 신규 업로드 라이브러리 도입 금지.
- **잠금**: `AddressSearchField`에 `disabled` prop이 없으므로, 분석 중·잠금 상태는 **상위 `<fieldset disabled>`** 등 네이티브 방식을 우선 검토한다(공통 컴포넌트에 prop 추가가 필요하면 기존 사용처 회귀 범위를 먼저 정하고 최소 호환 확장).

### 4.4 흐름·보안·멱등 보존 (불변)

- `useGuestApply`의 `genRef`, reset·재분석·언마운트 시 stale 응답 무시, `useGuestOtp`/`useGuestOrderFlow` 책임 분리 유지.
- 수정 후 **초안만 교체**, 기존 OTP·주문 참조 재사용 금지. OTP 취소·재발송 실패로 폼 재마운트 시 이름·포맷 전화·자동입력 주소·동/호 복원.
- 인증 시작 전 유효 초안·집합건물 필수값·동의 확인. `extractionOk=false`/검증 실패에서 인증·주문·결제 진입 금지.
- 세션·브라우저 바인딩·신원해시·초안만료·주문 멱등키·동일물건 중복활성 방지·SDK 재진입 잠금·401 재인증·결제 복구 정책 보존.
- 완료 판정은 **서버 주문 `paid && applied`만** 근거. OTP 성공·SDK 반환만으로 완료 처리 금지.
- 소유자·고유번호는 UI 마스킹 유지. PDF 원문·주소·전화·인증정보를 URL·브라우저 저장소·로그에 추가 저장 금지. PII 암호화 경로 유지.

---

## 5. 구현 순서 (백엔드 → UI)

plan §7 우선순위를 그대로 따른다. **파일 하나씩 순차 변경 → 검증 → 다음 파일**(프로젝트 규칙).

### Phase 1 (P0) — 추출 계약 고정 [백엔드/Codex]
- 대상: `lib/guest-monitoring/property-fields.ts`(신규), `lib/guest-monitoring/pdf-extraction.ts`
- 산출: `parseUnitNumber`·`mapPropertyType`·`composeStoredAddress`·`buildAddressValue` 순수 함수 + `extractRegistryFields(text, inputAddress?)` 선택 인자화.
- 종료조건: 주소 미제공/일치/불일치·다른 호수·추출 불완전의 예상 결과가 테스트로 고정. 기존 샘플 회귀 유지.
- 검증: `npx vitest run --config lib/guest-monitoring/vitest.config.ts` (+ 기존 `security.test.ts` 보존·확장)

### Phase 2 (P0) — 스키마·FormData·서버 추출·초안 응답 [백엔드/Codex]
- 대상: `lib/guest-monitoring/schemas.ts`, `lib/guest-monitoring/draft.ts`, `types/guest-monitoring.ts`
- 산출: address optional + dong/ho optional(strict), 허용목록 확장, 저장용/응답용 분리, 응답 신규 필드.
- 종료조건: 주소 없이 분석 성공, 서버 검증값만 저장, 기존 보안검사(허용목록·중복키·매직바이트·용량·페이지) 유지, `...fields`에 비존재 컬럼 전개 없음.
- 검증: 비회원 vitest + 변경파일 lint + `npm run build`

### Phase 3 (P0) — 전화·주소 공통 UX·자동입력·동호 [프론트/Claude]
- 대상: `guest/guestApi.ts`, `guest/addressMapping.ts`(신규), `hooks/useGuestApply.ts`, `components/guest/GuestApplyForm.tsx`, `guest/apply/GuestApplyClient.tsx`
- 산출: `parsePdf` 계약 확장, `formatMobile` 적용, `AddressSearchField` 제어 재사용, draft 수신 동기화, 집합건물 조건·수정 후 재분석·복원.
- 종료조건: 기존 컴포넌트/유틸 사용, 실제 입력 반영·수정 후 재분석·복원 동작. 각 파일 500줄 이하(위험 시 §1.2 분리).
- 검증: 변경파일 lint + `npm run build` + 브라우저 수동 확인(실제 렌더·이벤트·포커스)

### Phase 4 (P0) — 업로드 100% 폭·드롭 [프론트/Claude]
- 대상: `guest/guest.module.css`, (필요 시) `components/guest/GuestPdfDropField.tsx`(분리)
- 종료조건: 모바일/데스크톱 좌우 경계 일치·100% 폭, 클릭·키보드·드롭 동일 검증·단일 파일·접근성.
- 검증: 320/375px·데스크톱 브라우저 확인

### Phase 5 (P0) — 테스트·회귀·교차검수
- 산출: plan §6 표의 필수 사례 테스트 추가, 인증·결제·감시연계 회귀, 500줄 점검, Codex 교차검수.
- 종료조건: 정합성·보안·멱등·복구·500줄 기준 통과, 미해결 차단 항목 0.

### Phase 6 (P1) — 지원 PDF 변형 보강·문구 다듬기
- 필수 기능 완료 **후** 진행. 주소검증·동호정합성을 뒤로 미루는 근거로 사용 금지.

> **배포**: 이번 문서 작성 단계에서는 구현·테스트·배포를 하지 않는다. 향후 배포 요청 시 `main 커밋 → deploy vestra(t-vestra) → test 브랜치 동기화 → 대장 확인 → promote` 절차(CLAUDE.md Deployment Rule)를 따른다. **운영 직접 배포 금지.**

---

## 6. 테스트 계획 요약 (상세는 plan §6)

Node 환경 Vitest로 순수함수·서버경로 검증, 실제 렌더·이벤트·폭·포커스는 브라우저 병행(DOM 테스트 도구는 현재 의존성에 없음 → UI 자동화는 별도 영향범위 명시).

| 구분 | 1급 테스트 대상(신규/확장) |
|---|---|
| 전화 포맷 단위 | `formatMobile`: 숫자·하이픈붙여넣기·문자혼입·삭제·10/11자리·초과. 저장은 숫자정규형, 하이픈 유무 무관 신원해시 동일 |
| 동/호 구조화 | `parseUnitNumber`: `제101동 제15층 제1502호`→(101,1502), 동 없음, 표식 없음, 비숫자 |
| 유형 매핑 | `mapPropertyType`: 아파트/다세대/공동주택/오피스텔/다가구·단독/판단불가 |
| 주소 없는 PDF | `extractRegistryFields` 주소 인자 생략, `createDraft` 주소 키 생략/빈값/공백 성공. 추출주소 없는 문서 저장 0회 |
| 주소 정합성 | 동일 정규화 성공, 도로명/지번 선택, 다른 기본주소·같은 단지 다른 동/호 거부, 행정동 혼동 방지, 중복 접미사 방지 |
| 추출 실패·보안 | `not_registry`·`multiple_properties`·고유번호/소유자 누락·공유/법인/가림·주소누락. 허용목록 밖 키·중복키·위조/초과 PDF 차단 |
| 자동입력·복원 | 비동기 draft 수신 후 필드·확인영역·제출 동일, 최초 빈 상태 반영, 불일치 시 입력 보존, OTP 취소/재발송 실패 후 복원 |
| 인증·결제·감시 회귀 | parse→OTP→주문/결제, 멱등·401 재인증·복구·`paid && applied`, `runGuestPrechecks` 동일물건 전달 |
| 업로드 UI | 클릭·키보드·드롭 동일 검증, 파일 교체·긴 파일명·disabled, 100% 폭 |

검증 명령 기본: `npm run test -- <경로>`, `npx vitest run --config lib/guest-monitoring/vitest.config.ts`, 변경파일 lint, `npm run build`. 실제 외부 문자/결제 호출 없이 검증.

---

## 7. 절대규칙 준수 체크리스트

### 7.1 플랫폼 5대 원칙

| 원칙 | 설계 반영 | 비고 |
|---|---|---|
| **1. 페이지 500줄** | `useGuestApply`(413줄)·`GuestApplyForm`(223→증가)가 위험구역 → 주소 변환은 `addressMapping.ts`로, 업로드 영역은 `GuestPdfDropField.tsx`로 분리 계획(§1.2). 400줄 초과 감지 시 대장 보고 | ⚠️ 구현 중 모니터링 필수 |
| **2. 단일 책임** | UI(폼)·상태(훅)·순수변환(mapping/property-fields)·검증(schemas)·추출(pdf-extraction)·저장조립(draft) 각 파일 분리 | 훅에 주소 파싱 로직 누적 금지 |
| **3. 서버 검증·보안** | address/dong/ho 모두 **서버 zod strict + 허용목록 + 중복키 거부**. PDF 매직바이트·용량·페이지. 고유번호/소유자/최종주소는 **PDF 추출만 신뢰**. 비밀값·PII 로그·URL·저장소 노출 금지 | 클라이언트 입력 불신 |
| **4. 성능** | parse-pdf 1회 호출로 분석(중복요청 없음). PDF 리소스 `destroy`. DB `select: {id}`. 신규 N+1 없음 | 추출 순수함수는 렌더 경로 밖(서버) |
| **5. 폴더 역할** | `components/`(UI)·`hooks/`(상태)·`guest/addressMapping.ts`(클라 유틸)·`lib/guest-monitoring/`(서버 로직)·`types/`(타입)·`app/api/`(라우트) 규칙 준수 | 신규 파일 위치 §1.2 표 |

### 7.2 견고성 4문 (global rule 0-5)

| 질문 | 설계 답변 |
|---|---|
| **규모(100×)** | parse-pdf는 IP limit·11MB·10MB·40페이지·300K자 상한 보존. 추출 순수함수는 단건·서버. 목록성 로드 없음 |
| **수명주기** | 초안 TTL·삭제(기존 cleanup) 보존. 수정 시 초안·OTP·동의·주문참조 **무효화** 경로 유지. 신규 blob/컬럼 없음 → 고아 미발생 |
| **비정상 경로** | 지연 응답(genRef)·이중클릭(payingRef)·401 재인증·IDOR(조회세션)·env 누락(503 게이트)·입력위조(허용목록·매직바이트)·주소 불일치/동호 미확정/비숫자 입력 처리 명시 |
| **적대적 자문** | 도로명/지번 비교 혼용·같은 단지 다른 동호·접수번호 제○호 오인·중복 접미사·주소 묵살·비존재 컬럼 전개 등 공격면을 §2~3에 명시. 구현 후 Codex 교차검수(Phase 5) 필수 |

### 7.3 이번 단계 경계

- 본 문서는 **설계만**. 기능 코드·`prisma/schema.prisma`·환경변수·운영 DB·테스트 실행·실제 문자/결제 호출 **없음**.
- 변경 계약은 **parse-pdf 한 개**. 나머지 엔드포인트는 `lib.design.md`가 SSOT이며 불변.
- DB 스키마 변경 **전제하지 않음**(기존 `address` 컬럼 재사용).

---

## 8. 백엔드·프론트 합의 요약 (한눈에)

| 항목 | 백엔드(Codex) 책임 | 프론트(Claude) 책임 |
|---|---|---|
| FormData 계약 | 허용목록 `[file,guestName,guestPhone,address?,dong?,ho?]` 검증·중복키 거부 | address/dong/ho 미제공 시 **키 자체를 FormData에 넣지 않음** |
| 주소 검증 | `normalizeAddress` 정확 동일성, 기본주소·동/호 각각 비교 | 비교용은 `jibunAddress||roadAddress`로 전송, 표시용 `composeAddress`와 구분 |
| 동/호 | `parseUnitNumber`로 전유부분에서만 구조화, 미확정 시 `extraction_incomplete` | `AGGREGATE_TYPES`·`isAggregate`·`dongHoMissing` 패턴, 공통 컴포넌트 필드 재사용 |
| 응답 | `addressValue`·`propertyType` 추가(저장 아님, 복원용) | draft 수신 이벤트로 `AddressValue` 상태·확인영역 동기화 |
| 전화 | `normalizeGuestPhone` 저장·해시 | `formatMobile` 표시만 |
| 저장 | storedAddress + commUniqueNo + ownerName, 비존재 컬럼 전개 금지 | 저장값 신뢰 판단 안 함(표시·전달만) |
| 불변 | parse-pdf 외 엔드포인트·흐름·멱등·복구·게이트 보존 | genRef·OTP·주문흐름·복원·완료판정(`paid && applied`) 보존 |

# 비회원 등기감시 단건 서비스 설계서 (공용 계약서)

> **Plan**: `docs/01-plan/features/lib.plan.md`
> **Author**: Claude (대장 승인 전 초안)
> **Date**: 2026-10-15
> **Status**: Design · 구현 전
> **대상 독자**: 백엔드(Codex) / 프론트엔드(Claude) — 각자 구현 시 따르는 단일 계약서
> **상품**: 물건 1건 / 1개월 / 결제 총액 10,000원(KRW, 정수) / 다날 단건 결제 · 자동결제 없음

---

## 0. 이 문서의 위상과 범위

- 이 문서는 **계약서**다. API 경로·요청/응답 스키마·타입·상태전이·에러 코드는 백엔드와 프론트가 반드시 동일하게 구현한다. 한쪽이 임의 변경하면 상대 구현이 깨지므로, 변경이 필요하면 이 문서를 먼저 고치고 양측에 공지한다.
- 이번 작업 범위: **설계 문서 작성만**. 실제 기능 코드, `prisma/schema.prisma`, 환경변수, 운영 DB는 변경하지 않는다(기획서 7p·9p 경계 준수).
- 기능 전체는 **서버 기능 플래그** `GUEST_MONITORING_ENABLED`(기본 OFF) 뒤에 둔다. 플래그 OFF이면 신규 테이블 접근·비회원 cron·신규 라우트가 모두 비활성이다. 운영 DDL 승인·실연동 검증 전에는 ON하지 않는다.
- 다날 키 수령 전에는 **목(mock) 어댑터**로만 B~E 단계를 격리 DB에서 검증한다. 운영에서 키가 없으면 결제·본인인증 라우트는 **503**으로 차단한다(가짜 성공 금지).

### 0.1 용어

| 용어 | 정의 |
|---|---|
| **identityHash** | 정규화한 `이름 + 전화번호`를 `hashForSearch`(HMAC-SHA256)로 만든 blind index. 평문 검색 대체. |
| **draft(초안)** | 결제 전 PDF 파싱 결과 + 신청 입력을 담은 서버측 임시 레코드. TTL 후 삭제. `GuestMonitoring.status=pending_payment`. |
| **verification session(조회 세션)** | 다날 본인인증을 통과한 뒤 발급되는 제한 세션. 달력·주문·연장 요청의 유일한 권한 근거. HttpOnly 쿠키. |
| **order(주문)** | 결제 1건 = 주문 1건. 최초(initial) / 연장(renewal). 금액·기간을 서버에서 결정·스냅샷. |
| **적용(apply)** | 승인된 주문을 감시 기간(`startedAt`/`paidUntil`)에 **원자적·멱등** 반영하는 동작. |

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 레이어 경계 (절대규칙 2·5 — 단일 책임 / 폴더 역할 분리)

```
UI (page/components)  →  하지 않는다: 가격결정·권한판정·암복호화·외부서명
       │ fetch (최소 DTO만)
       ▼
API Route (app/api/guest-monitoring/**)  →  인증/세션검증 → Origin/CSRF → rate limit
       │                                     → 입력 zod 검증 → 서비스 호출 → DTO 직렬화
       ▼
Service (lib/guest-monitoring/**)  →  비즈니스 로직·상태전이·트랜잭션·멱등·동시성
       │
       ├─▶ lib/danal/**            (외부 연동 어댑터: 본인인증·결제·콜백검증, 서버 전용)
       ├─▶ lib/registry-monitor/** (프리체크 코어 재사용 — 공통화)
       ├─▶ lib/crypto / pii-crypto-tree (PII 암복호화·blind index)
       └─▶ prisma (Guest* 모델)
```

**철칙**: UI는 가격·기간·물건 수·`commUniqueNo`·`ownerName`을 서버로 보내도 **가격/권한 결정에 쓰이지 않는다**. 서버는 draft/order/SSOT를 기준으로만 판단한다(기획 5.6-1).

### 1.2 신규 파일 분리 계획 (절대규칙 1 — 500줄 제한, 5 — 폴더 역할)

```
[외부 연동 어댑터] lib/danal/
  types.ts                  # 어댑터 공용 타입(요청/응답 DTO, 에러 코드)
  identity.ts               # IdentityAdapter: startVerification / verifyResult
  payment.ts                # PaymentAdapter: createPayment / verifyPayment / getPayment / cancelPayment
  callback.ts               # verifyCallback (서명·무결성·재전송 식별)
  mock.ts                   # 목 구현(성공·불일치·만료·취소·금액불일치·중복/지연콜백·저장실패 재현)
  index.ts                  # provider 선택부(mock|danal) + env 게이트(키 없으면 503 신호)

[비회원 서비스] lib/guest-monitoring/
  product.ts                # 단건 상품 SSOT 참조 + 주문 금액/기간 산출(서버 단일 소스)
  period.ts                 # 1개월 계산(KST 기준 월말 보정, UTC 저장) — 순수 함수, 테스트 필수
  identity-hash.ts          # 이름/전화 정규화 + guestIdentityHash 생성(hashForSearch 래핑)
  draft.ts                  # 파싱 초안 생성/조회/TTL 정리
  session.ts                # 조회 세션 발급/검증/소비/폐기(토큰 해시·nonce·용도·브라우저 결합)
  order.ts                  # 주문 생성(멱등키)·조회·승인 적용(트랜잭션·동시성 직렬화)
  activation.ts             # 결제 적용 = 감시 활성화/연장(원자적·멱등·paid-but-unapplied 복구)
  precheck-adapter.ts       # 비회원 프리체크 저장 어댑터(회원 recordCheck와 동일 원자성)
  calendar-dto.ts           # CheckLog → CheckLogItem 호환 최소 DTO 매핑(PII 제거·월 범위)
  expiry.ts                 # 만료 판정/상태 정리 + Solapi outbox 예약·재검증
  rate-limit-keys.ts        # 비회원 전용 rate limit 키 빌더(IP·세션·identityHash 단위)
  errors.ts                 # 서비스 에러 → 공통 안내 코드 매핑(상세 원인 비노출)

[스키마/타입] types/guest-monitoring.ts   # API 요청/응답 DTO, 상태 enum (프론트·백엔드 공유)
[검증 스키마] lib/guest-monitoring/schemas.ts  # zod 입력 스키마(서버 검증 SSOT)

[API 라우트] app/api/guest-monitoring/        # §3 스펙 참조
[수명주기 cron] app/api/cron/guest-monitoring-lifecycle/route.ts  # 시간당 만료·문자·복구

[수정] lib/pricing-plans.ts        # GUEST_SINGLE_MONITORING 단건 상품 상수 추가(구독 enum에 섞지 않음)
[수정] lib/pii-crypto-tree.ts      # PII_FIELDS에 GuestMonitoring 필드 등록 + MODEL_RELATIONS
[수정] prisma/schema.prisma        # Guest* 모델 4종(로컬 반영 단계에서만)
[수정] app/api/cron/registry-monitor/route.ts  # 비회원 유효 대상 통합(저장/알림만 분기)
[수정] vercel.json                 # 수명주기 cron 스케줄 추가

[프론트 UI] app/(personal-home)/renewal/monitoring/
  — 신청 흐름(비회원 분기): 유료공지 + 회원요금제(기존 SSOT) + 단건상품카드 + 신청폼
  guest/                           # 비회원 전용 라우트 세그먼트
    apply/                         # 신청·결제 진입(필요 시)
    status/                        # 현황 조회(이름·전화 입력 → 본인인증 → 달력)
  components/ (라우트 하위)         # 각 섹션 컴포넌트(단일 책임, 500줄 이하)
```

**분리 원칙(절대규칙 1·5)**: 라우트 전용 컴포넌트는 해당 라우트 하위 `components/`, 상태·로직은 `hooks/`, 공용 로직은 `lib/`. 각 page는 조합·진입만. API 라우트 핸들러는 얇게 유지(검증·호출·직렬화)하고 로직은 `lib/guest-monitoring/`로 내린다.

### 1.3 재사용 대상 (기획 2장 — 기존 코드 기준)

| 재사용 | 실제 시그니처 | 사용 방식 |
|---|---|---|
| 요금제 SSOT | `PRICING_PLANS`, `PRICING_COMPARISON` (`lib/pricing-plans.ts`) | 회원 요금제 카드/비교표 그대로. 단건 상품은 같은 파일에 **별도 export** |
| 고유번호 추출 | `extractCommUniqueNoFromText(text): string \| null` — 정규식 `/고유번호[\s:：]+(\d{4}-\d{4}-\d{6})/` | 파싱 코어 결과에 추가 |
| 프리체크 | `fetchRegistryCaseStatus({reqAddress, commUniqueNo, ownerName}): Promise<TilkoCaseStatusResult>` — commUniqueNo·ownerName 필수 | 공통 입력으로 호출, 둘 중 하나라도 미검증 시 결제 차단 |
| Tilko 설정 | `isTilkoAvailable(): boolean` | 미설정 시 비회원은 오류 기록(정상/no_change 금지) |
| 로그 타입 | `CheckLogItem { id, checkedAt, method, result, riskLevel, summary }` | 달력 DTO 호환 유지 |
| 로그 기록 | `recordCheck(propertyId, updateData, method, result, summary?, riskLevel?)` | 회원용. 비회원은 동일 원자성의 `precheck-adapter.ts` 신규 |
| heartbeat | `recordCronHeartbeat(phase, detail?)`, `CRON_HEARTBEAT_ACTION` | cron 재사용 |
| PII 암호화 | `encryptWriteTree(data, model)`, `decryptReadTree(node, model)`, `PII_FIELDS`, `MODEL_RELATIONS` | SSOT에 Guest 필드 등록 |
| blind index | `hashForSearch(value): string` (HMAC-SHA256, trim+lowercase) | `guestIdentityHash` 생성 |
| 암복호 | `encryptPII(plaintext)` / `decryptPII(encoded)` (`v2:` prefix) | 서비스에서 직접 쓰지 않고 트리 경유 |
| rate limit | `rateLimit(identifier, limit?, windowMs?): RateLimitResult`, `rateLimitHeaders(result)` | fail-closed. 키만 비회원 전용 |
| SMS | `sendSms(phone, text): {channel, success, error?}` — 미설정 시 `sms_mock` success:true | outbox가 채널 구분 기록 |
| CSRF | `validateOrigin(req): NextResponse \| null` (`lib/csrf.ts`) | 브라우저 쓰기 API 재사용. 외부 콜백은 적용 안 함 |
| cron 인증 | `verifyCronSecret(authHeader): boolean` (timing-safe) | 신규 cron도 동일 |
| 매직바이트 | `validateMagicBytes(buffer, "application/pdf"): boolean` (`lib/sanitize.ts`) | PDF 검증 재사용 |
| 달력 | `MonitoringActivityCalendar({ logs: CheckLogItem[] })` | 컴포넌트·색상헬퍼 재사용. 회원 전용 훅/상세 재사용 안 함 |

---

## 2. 데이터 모델

> 아래는 **로컬 `prisma/schema.prisma` 반영을 위한 논리 설계**다. 이 문서 단계에서 스키마를 수정하지 않는다. 운영 DB 적용은 §6 절차·별도 승인 후 수동 SQL(기획 9장).
> 비회원은 **절대 `MonitoredProperty`/`User`에 저장하지 않고, 가짜 User를 만들지 않는다.** `MonitoringCheckLog`는 `MonitoredPropertyId` FK 필수이므로 비회원 로그는 별도 모델을 쓴다.

### 2.1 Prisma 모델 (논리 설계)

#### `GuestMonitoring` — 비회원 감시 물건 (감시 수명주기의 중심)

```prisma
model GuestMonitoring {
  id                 String   @id @default(cuid())
  guestName          String                      // PII 암호화
  guestPhone         String                      // PII 암호화
  guestIdentityHash  String                      // blind index (이름+전화 정규화 HMAC)
  address            String                      // PII 암호화(소유자명과 함께)
  commUniqueNo       String?                     // active 시 필수
  ownerName          String?                     // PII 암호화, active 시 필수
  status             String   @default("pending_payment") // pending_payment|active|expired|abandoned
  startedAt          DateTime?                   // active 시 필수(초안에선 null)
  paidUntil          DateTime?                   // active 시 필수. 감시 유효 = now < paidUntil
  lastCheckedAt      DateTime?
  // 프리체크 상태(회원 MonitoredProperty와 의미 대응)
  registrySignalStatus     String  @default("idle")  // idle|signal_detected|error
  registrySignalDetectedAt DateTime?
  registrySignalSummary    String? @db.Text          // PII 제거된 요약만
  draftExpiresAt     DateTime?                   // pending_payment TTL
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  orders   GuestMonitoringOrder[]
  checkLogs GuestMonitoringCheckLog[]
  messages GuestMonitoringMessage[]

  @@index([guestIdentityHash])
  @@index([status, paidUntil])
  @@index([guestIdentityHash, commUniqueNo])   // 중복 활성 탐지
  @@index([draftExpiresAt])                     // 초안 TTL 정리
}
```

- `orderId`(최초 주문 식별자)는 `GuestMonitoringOrder.purpose=initial`로 역참조(별도 컬럼 중복 저장 안 함). 최초 주문 unique는 주문 모델 쪽 제약으로 보장.
- 중복 활성화 방지: `(guestIdentityHash, commUniqueNo)`에서 `status=active`가 둘 이상이 되지 않도록 **트랜잭션 잠금 + 애플리케이션 유니크 검사**. (DB partial unique는 운영 DDL 단계에서 `WHERE status='active'` 조건부 인덱스로 보강 검토.)

#### `GuestMonitoringOrder` — 주문/결제 이력 (다회 연장 보존)

```prisma
model GuestMonitoringOrder {
  id                    String   @id @default(cuid())
  orderId               String   @unique          // 서버 생성 주문번호(다날 전달)
  guestMonitoringId     String
  purpose               String                    // initial | renewal
  amount                Int                        // 서버 스냅샷(KRW 정수)
  currency              String   @default("KRW")
  productVersion        String                     // SSOT 가격 버전 스냅샷
  status                String   @default("pending") // pending|paid|failed|canceled|refunded
  providerMode          String                     // mock | danal
  providerTransactionId String?  @unique           // 승인 후 거래 ID
  idempotencyKey        String   @unique           // 요청 멱등키
  appliedPeriodStart    DateTime?                  // 이 주문이 적용한 기간 시작
  appliedPeriodEnd      DateTime?                  // 이 주문이 적용한 기간 끝
  appliedAt             DateTime?                  // 적용 완료 시각(멱등 재적용 방지)
  paidAt                DateTime?
  expiresAt             DateTime                    // 결제 대기 주문 TTL
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  guestMonitoring GuestMonitoring @relation(fields: [guestMonitoringId], references: [id], onDelete: Cascade)

  @@index([guestMonitoringId, status])
  @@index([status, expiresAt])                     // 대기 주문 정리/복구
}
```

- **이름·전화 평문 중복 저장 금지**(기획 5.4). 주문은 `guestMonitoringId`로만 신청자 연결.
- `appliedAt != null`이면 재적용 금지 → 콜백 재전송·병렬 승인에서 기간 중복 반영 방지(멱등의 핵심).
- `paid but unapplied` = `status=paid AND appliedAt=null` → 복구 cron 대상.

#### `GuestMonitoringCheckLog` — 비회원 감시 실행 로그 (90일)

```prisma
model GuestMonitoringCheckLog {
  id                String   @id @default(cuid())
  guestMonitoringId String
  checkedAt         DateTime @default(now())
  method            String                    // precheck | full_doc | skipped
  result            String                    // no_change|signal_detected|changed|needs_registration|fetch_failed
  riskLevel         String?                    // low|medium|high|critical
  summary           String?  @db.Text          // PII 제거·정제된 요약만

  guestMonitoring GuestMonitoring @relation(fields: [guestMonitoringId], references: [id], onDelete: Cascade)

  @@index([guestMonitoringId, checkedAt(sort: Desc)])
  @@index([checkedAt])                          // 90일 정리
}
```

- 필드는 회원 `MonitoringCheckLog`와 동일 의미 → `CheckLogItem` DTO로 1:1 변환.

#### `GuestVerificationSession` — 본인인증/조회 세션

```prisma
model GuestVerificationSession {
  id                String   @id @default(cuid())
  tokenHash         String   @unique           // 세션 토큰 원문은 저장 안 함(해시만)
  purpose           String                     // apply | status | renewal
  requestNonce      String   @unique           // 콜백 결합 nonce(state)
  providerTxId      String?                     // 다날 거래 ID
  inputIdentityHash String                     // 사용자가 입력한 이름+전화 해시
  verifiedIdentityHash String?                  // 다날이 검증한 이름+전화 해시
  browserBindingHash String?                    // UA/쿠키 바인딩(세션 바꿔치기 방지)
  verifiedAt        DateTime?
  expiresAt         DateTime                     // 조회 세션 15분
  consumedAt        DateTime?                    // 인증 콜백 1회 소비
  revokedAt         DateTime?
  createdAt         DateTime @default(now())

  @@index([inputIdentityHash])
  @@index([expiresAt])
}
```

- 인증 콜백 **1회 소비**(`consumedAt`)와 조회 세션(`expiresAt`)을 단계로 구분. 인증 전에는 어떤 권한도 없음.
- 평문 이름·전화 저장 안 함(해시만). `verifiedIdentityHash == inputIdentityHash == GuestMonitoring.guestIdentityHash` 세 값이 모두 일치해야 접근 허용.

#### `GuestMonitoringMessage` — 만료/연장 안내 outbox

```prisma
model GuestMonitoringMessage {
  id                String   @id @default(cuid())
  guestMonitoringId String
  targetPaidUntil   DateTime                    // 어느 만료 기간에 대한 안내인지
  type              String                      // expiry_notice (| pre_expiry MVP 외)
  status            String   @default("pending") // pending|sent|failed|dead
  channel           String?                      // sms | sms_mock
  attempts          Int      @default(0)
  nextAttemptAt     DateTime?
  providerMessageId String?
  sentAt            DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  guestMonitoring GuestMonitoring @relation(fields: [guestMonitoringId], references: [id], onDelete: Cascade)

  @@unique([guestMonitoringId, type, targetPaidUntil])  // 만료 기간당 1건 예약(중복 방지)
  @@index([status, nextAttemptAt])
}
```

### 2.2 PII 암호화 등록 (`lib/pii-crypto-tree.ts` 수정)

```ts
// PII_FIELDS에 추가
GuestMonitoring: ["guestName", "guestPhone", "address", "ownerName"],
// GuestVerificationSession / Order / Message 는 평문 PII 미보유 → 등록 불필요
// include/select nested 암복호화가 필요하면 MODEL_RELATIONS에 매핑 추가
```

- `guestIdentityHash`는 암호화 대상이 아니라 **검색용 HMAC**(복호화 불가). `where`에는 암호문이 아니라 이 해시만 사용.
- 복호화 실패·키 누락 시 인증·등록·조회 **중단**. `decryptPII`가 암호문을 그대로 반환하는 경우(`v2:` 미검출)를 "일치 성공"으로 판정하지 않는다(기획 5.4).

### 2.3 요금제 단건 상품 SSOT (`lib/pricing-plans.ts` 추가)

```ts
// 구독 enum(PricingPlanKey)에 섞지 않고 별도 export
export const GUEST_SINGLE_MONITORING = {
  productId: "guest_monitoring_single",
  priceVersion: "2026-10-15",   // 변경 시 버전 올림
  amount: 10000,                 // KRW 정수, 총액
  currency: "KRW",
  propertyCount: 1,
  months: 1,
} as const;
```

- 주문 생성·승인 검증 모두 이 상수만 가격 기준으로 사용. 주문에는 `amount`·`productVersion` 스냅샷 저장.

### 2.4 공유 타입 (`types/guest-monitoring.ts` — 프론트·백엔드 공유)

```ts
export type GuestMonitoringStatus = "pending_payment" | "active" | "expired" | "abandoned";
export type GuestOrderStatus = "pending" | "paid" | "failed" | "canceled" | "refunded";
export type GuestOrderPurpose = "initial" | "renewal";
export type VerificationPurpose = "apply" | "status" | "renewal";

// CheckLogItem 은 기존 정의 재사용(lib/registry-monitor usePropertyDetail 의 형태와 동일)
export interface CheckLogItem {
  id: string;
  checkedAt: string;   // ISO 8601
  method: string;
  result: string;
  riskLevel: string | null;
  summary: string | null;
}

// 공통 에러 응답(상세 원인 비노출 — 기획 4.2/5.5)
export interface GuestApiError {
  error: string;        // 사용자용 한글 안내
  code: string;         // 내부 분류 코드(디버깅용, PII·내부경로 금지)
}
```

---

## 3. API 스펙

### 3.0 공통 규약

- **Base**: `/api/guest-monitoring`
- **브라우저 쓰기(POST/PUT/DELETE)**: 진입 시 `validateOrigin(req)` 호출(실패 403). 외부 다날 콜백 라우트는 **예외**(Origin 대신 provider 서명·state/nonce 검증).
- **인증 모델**: 비회원이므로 NextAuth 세션 없음. 권한 근거는 **조회 세션 쿠키(HttpOnly)** 뿐. 아래 "인증" 열은 이 세션 요구 여부.
- **공통 응답 헤더**: PII 포함 응답은 `Cache-Control: no-store`. rate limit 응답은 `rateLimitHeaders(result)`.
- **공통 에러 바디**: `GuestApiError` (`{ error, code }`). 무권한·없는 리소스·불일치는 **동일 404/공통 안내**로 통일(IDOR·열거 방지).
- **플래그 OFF**: 모든 라우트 404(기능 미노출). **키 누락 운영**: 결제·인증 라우트 503.
- 이름·전화·인증 토큰은 **URL/쿼리/로그/분석 이벤트에 절대 넣지 않는다.**

---

### 3.1 `POST /api/guest-monitoring/parse-pdf` — PDF 파싱 + 초안 생성

- **인증**: 불필요(신청 진입) · Origin 검증 O · rate limit: IP당 10회/분
- **Content-Type**: `multipart/form-data`
- **Request (form fields)**:
  | 필드 | 타입 | 필수 | 설명 |
  |---|---|---|---|
  | `file` | File(PDF) | O | ≤10MB, 매직바이트 `%PDF` |
  | `guestName` | string | O | 신청자 이름 |
  | `guestPhone` | string | O | 신청자 전화 |
  | `address` | string | O | 입력 주소(파싱 결과와 대조) |
- **서버 처리**: 매직바이트·용량·빈파일·손상/암호화PDF·비등기문서·복수물건·추출자원한도 검사 → `extractTextFromPDF` → `parseRegistry` + `extractCommUniqueNoFromText` → 입력 주소와 정규화 대조 → **초안(`GuestMonitoring` status=pending_payment)** 생성(`draftExpiresAt` TTL). **원문·rawText는 응답/저장에서 폐기.**
- **Response 200 (성공)**:
  ```jsonc
  {
    "draftId": "clxxx",          // 초안 식별자(이후 주문 생성에 사용)
    "address": "서울 ...",        // 정규화된 주소(확인용)
    "commUniqueNoMasked": "1234-****-******",  // 마스킹 표기만
    "ownerNameMasked": "김**",
    "extractionOk": true,         // commUniqueNo·ownerName 모두 검증됨 → 결제 진입 가능
    "draftExpiresAt": "2026-10-15T..."  // ISO
  }
  ```
- **Response 4xx (실패)** — 공통 바디 `{error, code}`:
  | status | code 예 | 상황 |
  |---|---|---|
  | 400 | `invalid_pdf` | 매직바이트 불일치·빈/손상/암호화 PDF |
  | 400 | `not_registry` | 등기부 아님 |
  | 400 | `multiple_properties` | 여러 물건 혼재 |
  | 400 | `extraction_incomplete` | 고유번호/소유자 미검출(→ `extractionOk:false`, 결제 차단) |
  | 400 | `address_mismatch` | 입력 주소와 추출 주소 불일치 |
  | 413 | `file_too_large` | 10MB 초과 |
  | 429 | `rate_limited` | 분당 한도 초과 |
- **불변식**: 클라이언트가 보낸 `commUniqueNo`/`ownerName`은 받지 않는다(서버 추출만 신뢰). 수동 입력으로 추출 검증 우회 불가.

---

### 3.2 본인인증

#### `POST /api/guest-monitoring/identity/start` — 인증 시작

- **인증**: 불필요 · Origin O · rate limit: IP당 5회/10분 **AND** identityHash당 3회/10분 + 일일 비용 한도
- **Request (JSON)**:
  ```jsonc
  { "purpose": "apply" | "status" | "renewal",
    "guestName": "홍길동",
    "guestPhone": "010-1234-5678",
    "draftId": "clxxx"   // purpose=apply 일 때만(초안 결합)
  }
  ```
- **서버 처리**: 정규화 → `inputIdentityHash` 산출 → `GuestVerificationSession` 생성(`requestNonce`, `browserBindingHash`, `purpose`) → `IdentityAdapter.startVerification` 호출(키 없으면 운영 503) → 인증창 실행 정보 반환.
- **Response 200**:
  ```jsonc
  { "verificationId": "...",      // 세션 참조(토큰 아님)
    "launch": { /* 다날 인증창 실행 파라미터(서버가 만든 것) */ },
    "expiresAt": "..." }
  ```
- **중요**: `purpose=status`에서는 이 응답으로 **신청 존재 여부·주소·건수·기간을 절대 노출하지 않는다**(기획 4.2-2).
- **실패**: 503(키 누락 운영) / 429(한도) / 400(`invalid_input`).

#### `POST /api/guest-monitoring/identity/callback` — 인증 검증(콜백 소비)

- **인증**: 조회 세션 불필요. 대신 **state/nonce + provider 서명 검증**. Origin 검증은 교차사이트 반환 특성상 적용하지 않음(provider 검증으로 대체).
- **Request**: 다날이 돌려주는 파라미터(provider 명세 확정 후 고정). 서버는 `requestNonce`로 세션 매칭.
- **서버 처리**: `verifyCallback`(서명·무결성·재전송 식별) → `IdentityAdapter.verifyResult`로 검증된 이름·전화·거래ID 획득 → `verifiedIdentityHash` 산출 → 세션 nonce·브라우저·만료·**1회 소비(`consumedAt`)** 검사 → `verifiedIdentityHash == inputIdentityHash` 확인 → 통과 시 **조회 세션 쿠키 발급**(HttpOnly·Secure·SameSite, 15분).
- **Response**:
  - 성공: 302 redirect(purpose별 화면) + `Set-Cookie`(세션). 또는 200 `{ ok: true, redirect: "/renewal/monitoring/..." }`.
  - 실패/취소/만료/불일치/재사용: **모두 공통 안내**(상세 원인 비노출), 세션 미발급. 302→공통 실패 화면 or 200 `{ ok:false, code:"verification_failed" }`.
- **불변식**: 클라이언트가 전달한 이름·전화·`success=true`를 인증 결과로 신뢰하지 않는다. 콜백 1회만 소비.

---

### 3.3 주문/결제

#### `POST /api/guest-monitoring/orders` — 신규/연장 주문 생성

- **인증**: initial은 신청 본인인증 세션(purpose=apply) 필요, renewal은 조회 세션(status/renewal) 필요 · Origin O · rate limit: 세션당 5회/분
- **Request (JSON)**:
  ```jsonc
  { "purpose": "initial" | "renewal",
    "draftId": "clxxx",          // initial 일 때
    "guestMonitoringId": "clyyy", // renewal 일 때(세션 권한 범위 내)
    "idempotencyKey": "uuid"      // 클라이언트 생성, 재시도 시 동일값
  }
  ```
- **서버 처리**:
  1. 세션·권한 검증(renewal은 `id + verifiedIdentityHash` 일치 신청만).
  2. initial: draft 유효성·본인인증 일치·중복 활성(`guestIdentityHash+commUniqueNo` active 존재 시 연장 안내) 검증.
  3. 금액·기간을 **SSOT(`GUEST_SINGLE_MONITORING`)에서 서버 결정** → 주문 생성(금액·`productVersion` 스냅샷, `idempotencyKey` unique).
  4. `idempotencyKey` 재수신·동일 물건 미완료 주문 존재 시 **기존 주문 반환**(중복 생성 금지).
  5. `PaymentAdapter.createPayment`로 결제 실행 정보 획득.
- **Response 200/201**:
  ```jsonc
  { "orderId": "ord_...",
    "amount": 10000, "currency": "KRW",
    "payment": { /* 다날 결제창 실행 정보 */ },
    "status": "pending" }
  ```
- **실패**: 409 `duplicate_active`(연장 안내) / 400 `draft_expired`·`extraction_incomplete` / 401·404(세션·권한) / 503(키 누락) / 429.

#### `GET /api/guest-monitoring/orders/[orderId]` — 주문 상태 조회(복구용)

- **인증**: 해당 주문을 만든 세션(apply/status/renewal) 범위 내 · rate limit 병행
- **서버 처리**: 세션 권한 + `orderId` → `guestMonitoringId`가 세션 identity 범위인지 확인. 범위 밖/없음 → **동일 404**.
- **Response 200 (최소 상태만)**:
  ```jsonc
  { "orderId": "ord_...", "status": "pending|paid|failed|canceled|refunded",
    "applied": true, "startedAt": "...", "paidUntil": "..." }
  ```
  — 신청자 PII·고유번호·소유자명 미포함. 결제창 새로고침·재시도 시 이 API로 상태 복구(즉시 재결제 유도 금지).

#### `POST /api/guest-monitoring/payment/callback` — 다날 승인 검증 + 멱등 활성화

- **인증**: 조회 세션 불필요. **provider 서명·state/nonce·거래 단위 검증**. Origin 미적용. 일반 사용자 IP 제한으로 정상 콜백 유실 방지(거래 단위 멱등 처리).
- **Request**: 다날 승인 콜백 파라미터(명세 확정 후 고정).
- **서버 처리(원자적·멱등)**:
  1. `verifyCallback` → `PaymentAdapter.verifyPayment`/`getPayment`로 **서버 기준 재조회**.
  2. 주문 ID·가맹 식별·거래 ID·승인 상태·**실제 금액(KRW 10000 정수)·통화**가 서버 주문과 일치하는지 검사. 불일치·취소·미승인 → 활성화 안 함(주문 failed/canceled 기록).
  3. 물건 단위 **직렬화 잠금** 하에 트랜잭션: 주문 `paid`·`providerTransactionId`·`paidAt`, 감시 `active`·`startedAt`/`paidUntil` 계산(§4.4 기간 규칙), `appliedPeriodStart/End`·`appliedAt` 기록.
  4. 동일 주문·거래 재전송 → `appliedAt != null`이면 **기존 결과 그대로 반환**(기간 재가산 금지).
  5. PG 승인 후 DB 실패 → 주문 `paid AND appliedAt=null`로 남겨 복구 cron 대상(`paid but unapplied`).
- **Response**: provider가 요구하는 ACK 형식(2xx). 중복 정상 ACK 멱등 처리.

---

### 3.4 조회 (본인인증 세션 필요)

#### `GET /api/guest-monitoring/properties` — 본인 신청 물건 목록(선택용)

- **인증**: 조회 세션(status/renewal) **필수** · rate limit: 세션당 30회/분 + IP 병행 · `Cache-Control: no-store`
- **서버 처리**: `verifiedIdentityHash` == `GuestMonitoring.guestIdentityHash` 인 신청만. 동일 고유번호라도 **다른 신청자 이력과 합치지 않음**.
- **Response 200 (최소 DTO)**:
  ```jsonc
  { "properties": [
      { "id": "clyyy",
        "addressShort": "서울 ○○구 ...",   // 식별용 최소 주소
        "status": "active" | "expired",
        "startedAt": "...", "paidUntil": "..." }
    ] }
  ```
  — 고유번호·소유자명·PII·알림·PDF 원문 **미포함**.
- **실패**: 401 `session_required` / 공통 안내.

#### `GET /api/guest-monitoring/properties/[id]/calendar` — 월간 달력 DTO

- **인증**: 조회 세션 **필수** · rate limit 세션당 30회/분 + IP · `Cache-Control: no-store`
- **Query**: `month=YYYY-MM`(기본 현재월, KST 기준). 응답은 해당 월 로그.
- **서버 처리**: 세션 검증 후 **`id + verifiedIdentityHash` 조건**으로 신청 조회(권한 검사 생략 금지). 범위 밖/없음 → **동일 404**. 유효 서비스 기간(`[startedAt, paidUntil)`) 내 로그만 월 범위로 조회(회원 120건 상한에 잘리지 않게 월 범위 쿼리). `summary`에서 PII·원문 제거/정제.
- **Response 200**:
  ```jsonc
  { "property": { "id": "clyyy", "addressShort": "...", "status": "active",
                  "startedAt": "...", "paidUntil": "..." },
    "month": "2026-10",
    "logs": [ /* CheckLogItem[] — 기존 달력 컴포넌트 호환 */ ] }
  ```
- **불변식**: 결제 리턴 URL·주문 ID·문자 링크·파싱 토큰은 **달력 열람 권한이 아니다**. 세션만 권한.

#### `DELETE /api/guest-monitoring/session` — 조회 세션 폐기(로그아웃)

- **인증**: 조회 세션 · Origin O
- **서버 처리**: 세션 `revokedAt` 기록 + 쿠키 삭제.
- **Response 200**: `{ ok: true }`

---

### 3.5 cron (서버 간, `verifyCronSecret`)

#### `GET /api/cron/registry-monitor` (기존 수정) — 회원+비회원 통합 배치

- **인증**: `Authorization: Bearer ${CRON_SECRET}` (timing-safe)
- **변경점**:
  - 비회원 대상 포함: `GuestMonitoring.status=active AND paidUntil > now`. **외부 호출 직전에도 유효기간 재검사**(만료 작업이 최신 기간 위에 종료 덮어쓰지 않게).
  - 회원·비회원 저장소 분리: 저장은 `precheck-adapter.ts`, 알림은 회원 `createAlertAndNotify`를 비회원에 **직접 호출하지 않음**.
  - 배치 배분: 기존 BATCH_SIZE=50·회원 우선이 비회원 전체 누락으로 이어지지 않도록 회원/비회원 쿼터·페이지 순회 설계. 재시도 대상 ID는 **모델 종류 포함**해 충돌 없이 분리.
  - 비회원은 `standard` 프리체크만. Tilko 미설정·실패를 `no_change`로 기록 금지 → `fetch_failed`. 유료 발급 폴백 금지.
- **Response**: 기존 요약 + 비회원 처리 카운트 추가.

#### `GET /api/cron/guest-monitoring-lifecycle` (신규) — 시간당 수명주기

- **인증**: `verifyCronSecret` · `vercel.json`에 매시 스케줄 추가
- **처리**:
  1. 만료 정리: `status=active AND now >= paidUntil` → `expired`.
  2. 만료 안내 예약: `GuestMonitoringMessage` unique(`id,type,targetPaidUntil`)로 **만료 기간당 1건**. 발송 직전 대상 기간이 여전히 만료인지 재검증(연장과 경합 시 미발송).
  3. outbox 발송: `sendSms` → `channel`·`providerMessageId`·`attempts`·`nextAttemptAt` 기록. 응답 유실 시 무조건 재발송 않고 상태 조회 우선. 재시도 소진 → `dead`(운영 알림).
  4. `paid but unapplied` 복구: `PaymentAdapter.getPayment` 재조회 후 멱등 적용.
  5. 초안/세션 TTL 정리: `draftExpiresAt`/주문 `expiresAt`/만료 인증 세션 정리, PDF 임시 데이터 삭제.
- **Solapi 문자 내용**: 서비스 만료·연장 금액·안전한 조회 링크만. 성명·상세주소·고유번호 **미포함**. 링크는 조회 화면으로만 연결(인증 대체 아님).

---

### 3.6 API 요약표

| 메서드 · 경로 | 인증 | 쓰기검증 | rate limit(초기 제안) |
|---|---|---|---|
| POST `/parse-pdf` | 없음 | Origin | IP 10/분 |
| POST `/identity/start` | 없음 | Origin | IP 5/10분 + identityHash 3/10분 |
| POST `/identity/callback` | nonce+서명 | provider | 거래 단위 |
| POST `/orders` | 세션(용도별) | Origin | 세션 5/분 |
| GET `/orders/[orderId]` | 세션 범위 | — | 세션 병행 |
| POST `/payment/callback` | nonce+서명 | provider | 거래 단위 멱등 |
| GET `/properties` | 조회 세션 | — | 세션 30/분 + IP |
| GET `/properties/[id]/calendar` | 조회 세션 | — | 세션 30/분 + IP |
| DELETE `/session` | 조회 세션 | Origin | — |
| GET `/cron/registry-monitor`(수정) | CRON_SECRET | — | — |
| GET `/cron/guest-monitoring-lifecycle`(신규) | CRON_SECRET | — | — |

---

## 4. 핵심 규칙 (양측 공유 불변식)

### 4.1 상태 전이

```
GuestMonitoring:
  (draft 생성) pending_payment ──결제 적용(appliedAt)──▶ active ──now>=paidUntil──▶ expired
                     │                                      ▲
                     └─ TTL 만료 ─▶ abandoned               └─ 연장 적용(만료 전/후) ─┘

GuestMonitoringOrder:
  pending ──승인검증 OK & 적용──▶ paid(appliedAt set)
  pending ──승인실패/취소/불일치──▶ failed | canceled
  paid & appliedAt=null ──복구 cron──▶ appliedAt set  (paid-but-unapplied)
```

### 4.2 IDOR·권한 (기획 5.5 · US-05)
- 모든 조회/주문조회/연장은 **세션 검증 → `id + verifiedIdentityHash` 조건**으로 신청 조회. ID 추측 불가해도 권한 검사 생략 금지. 무권한·없음 = **동일 404**.
- 세 identity hash(입력·검증·저장)가 모두 일치해야 접근. 동일 고유번호라도 다른 신청자 로그 병합 금지.

### 4.3 결제 멱등·금액 (기획 5.6)
- 가격·기간·물건수는 **서버 SSOT만**. 클라이언트 값 무시.
- 금액 = `KRW 10000` 정수. provider 재조회로 실제 승인 금액·통화·거래·주문·가맹 일치 검증. 불일치 시 활성화 금지.
- `appliedAt`으로 재적용 차단. 병렬 연장은 물건별 직렬화. 성공 주문마다 **정확히 1개월**만 반영.

### 4.4 기간 계산 (`lib/guest-monitoring/period.ts` — 순수함수·테스트 필수)
- **1개월** = 활성화 시각부터 KST 기준 **다음 달 같은 일시**. 다음 달에 같은 날짜 없으면 **말일 보정**. DB는 UTC 저장, 이용 범위 `[startedAt, paidUntil)`. 30일 고정 혼용 금지.
- 연장: 만료 **전** 결제 → 기존 `paidUntil`부터 +1개월. 만료 **후** 결제 → 재활성화 시각부터 +1개월(중단 구간 소급 감시 표시 안 함).
- 감시 유효의 **유일 판정**은 `now < paidUntil`. cron은 외부 호출 직전 재검사. `now >= paidUntil`이면 프리체크 미실행.

### 4.5 달력 시간 처리 (기획 5.7 — 회귀 주의)
- 현재 `MonitoringActivityCalendar`의 오전/오후 그룹은 **브라우저 로컬시간** 기준(`new Date().getHours()`). 해외 기기에서도 KST 날짜·정오/오후 슬롯이 일치하도록 **공통 KST 시간 처리로 보완**. 회원 화면도 영향 → **회원 달력 회귀 검증 필수**.

---

## 5. 구현 순서 (기획 7장 단계와 정렬 · 백엔드 → UI)

> 다날 키 없는 동안 B~E는 격리 테스트 DB + 목으로 검증. F 전 운영 개방 금지.

| 순번 | 단계 | 담당 | 작업 | 완료 기준(DoD) |
|---|---|---|---|---|
| 1 | B. 격리 기반 | 백엔드 | 로컬 Prisma 모델 4종, `lib/pii-crypto-tree` 등록, `pricing-plans` 단건상품, `identity-hash`/`period`/`draft`/`session`/`rate-limit-keys`, `parse-pdf` 라우트 | 격리 DB에서 암호문 저장·blind index 조회·불완전 PDF 결제 차단·평문 미저장 확인 |
| 2 | 다날 경계 | 백엔드 | `lib/danal/` types·identity·payment·callback·mock·index. 운영 키 없음→503 게이트 | 목이 성공·불일치·만료·취소·금액불일치·중복/지연콜백·저장실패 재현. 임의 success 거부 |
| 3 | C. 신청/결제 | 백엔드 | `order`·`activation`, `/identity/*`, `/orders*`, `/payment/callback` 멱등·동시성 | 10,000원 서버검증 후 1건·1개월 active 1회만. 콜백 재전송 기간 미가산 |
| 4 | C. 신청 UI | 프론트 | `renewal/monitoring` 비회원 분기: 유료공지+회원요금제(기존 SSOT)+단건카드+신청폼. 본인인증·결제창 진입, 결제 중 복구 | 로그인 강제 없이 동시 노출. 완료화면에 시작/만료일시·조회링크. 완료화면만으로 달력 접근 불가 |
| 5 | D. 감시 통합 | 백엔드 | `precheck-adapter`, `cron/registry-monitor` 비회원 통합(저장/알림 분기), `calendar-dto`, `/properties`·`/calendar` API | 혼합 배치 누락·오염 없음, 본인 달력만, 회원 cron 회귀 없음 |
| 6 | D. 조회 UI | 프론트 | `guest/status`: 이름·전화 입력 → 본인인증 → 물건 선택 → `MonitoringActivityCalendar`. `/session` 로그아웃 | 인증 전 정보 비노출, 본인 달력만, 세션 만료 재인증 |
| 7 | E. 수명주기 | 백엔드 | `expiry`, `cron/guest-monitoring-lifecycle`, Solapi outbox, 연장 결제·복구, `vercel.json` 매시 cron | 미결제 자동 종료, 만료 기간당 안내 1건, 중복 연장 방지, paid-but-unapplied 복구 |
| 8 | E. 연장 UI | 프론트 | 조회 화면 연장 버튼 → 주문 → 결제 재진입 | 본인 범위 연장만, 성공당 1개월 |
| 9 | 검증/회귀 | 양측 | §8(기획) 시나리오 + 회원 PII·cron·등록/조회 회귀. `period` 월말/윤년 유닛테스트 | 전 시나리오 통과, 회귀 통과 |
| 10 | F. 실연동 준비 | 운영/백엔드 | 다날 키·공식명세, 실어댑터·가맹테스트, 승인된 수동 DDL, 플래그 ON | 운영 목 불가, 검증된 실결제/실인증, 승인 DB에만 반영 |

- 각 백엔드 단계 완료 후 프론트가 해당 API를 소비. 프론트는 이 문서의 DTO만 의존(백엔드 내부구현 비의존).
- 각 파일 작성 직후 줄 수 확인(400 초과 시 보고·분리), `npm run build` 통과 후 다음 파일.

---

## 6. DB 반영 경계 (기획 9장 — 요약)

1. 이 단계: 문서만. 스키마·마이그레이션·DB·배포 변경 없음.
2. 구현 단계: **로컬** Prisma 모델 선언 + 격리 DB 검증(관계·인덱스·암호화·동시성·삭제). 운영 연결 `db push`/`migrate *` 금지.
3. 운영 준비: 현재 DB와 차이 확인 → 신규 테이블·인덱스·제약 수동 SQL + 백업 + 적용검증 + 롤백 절차를 별도 자료로.
4. **별도 승인 후 수동 SQL로만** 적용. 이 문서는 실행 승인이 아님.
5. 테이블 적용 전 기능은 플래그 OFF. 롤백은 플래그 OFF + 예약작업 중단 우선. 결제/신청 데이터 생긴 테이블 임의 삭제 금지.

---

## 7. 절대규칙 준수 체크리스트 (설계 단계 자가 점검)

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (설계 기준 / 구현 시 재점검)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 설계 — API 핸들러 얇게 유지, 로직은 lib/guest-monitoring/** 로 분리.
                          page.tsx는 조합·진입만. UI 섹션은 라우트 하위 components/ 분할(§1.2)
2. 단일 책임           : ✅ 설계 — UI/상태(hooks)/로직(lib)/API(route)/외부연동(lib/danal)/타입(types) 분리
3. 서버 검증·보안      : ✅ 설계 — 모든 입력 서버 zod 검증, 가격·권한·암복호 서버 전용.
                          IDOR(세션+identityHash), CSRF(validateOrigin), 콜백 서명/nonce,
                          PII 암호화+blind index, no-store, 503/플래그 게이트
4. 성능 (중복·N+1)     : ✅ 설계 — rate limit 전 구간, 배치 쿼터·페이지 순회, 달력 월 범위 쿼리,
                          period/hash 순수함수, 암복호 트리 1회, 주문 상태 조회로 재결제 억제
5. 폴더 구조           : ✅ 설계 — components/hooks/lib/actions(route)/types 역할 분리(절대규칙 5)
─────────────────────────────────────────────────
위반 항목: 없음 (설계 기준). 각 구현 파일 저장 직후 400줄 체크·build 확인으로 재점검
─────────────────────────────────────────────────
```

### 7.1 견고성 4문 (CLAUDE.md 규칙 0-5) — 설계 반영 위치
1. **규모**: 암복호화 트리·KDF 반복을 요청당 최소화(트리 1회), 달력 월 범위·cron 배치 쿼터·rate limit, 로그 90일 정리 → §3.4·§3.5·§4.5.
2. **수명주기**: 생성뿐 아니라 삭제 경로 설계 — 초안/세션/대기주문 TTL 정리, PDF 임시 폐기, 로그 90일, 만료 종료 → §3.5-5.
3. **비정상 경로**: 재사용·재시도·동시요청·IDOR·env누락·입력위조(MIME/PDF)·콜백 재전송·한쪽 경로만 처리 모두 명시 → §3·§4.2·§4.3.
4. **적대적 자문**: 완료 전 §8(기획) IDOR/결제/암호화/문자 공격 시나리오로 검증 + 보안·데이터·cron은 병렬 코드리뷰 권장.

### 7.2 API 보안 체크리스트 (CLAUDE.md — 배포 전 전체 `app/api/` 대상)
- 인증 없는 변이 핸들러: parse-pdf·identity/start는 의도적 비세션이나 **Origin+rate limit 필수**, 콜백은 **서명/nonce 필수**. 그 외 변이는 세션 필수.
- dead code endpoint: 신규 라우트는 모두 프론트에서 호출됨을 구현 단계에서 확인. 미사용 엔드포인트 추가 금지.

---

## 8. 미확정·결정 필요 (기획 9.2 — 구현/출시 전 확정)

| 항목 | 상태 |
|---|---|
| 신청 본인인증(결제 전) 채택 | 설계는 **보강안 채택** 기준(US-05 안전). 최종 확정 필요 |
| 다날 공식 명세 | 인증/PG 프로토콜·서명·반환URL·콜백·취소 API 미확정 → `lib/danal` 계약은 **제안**, 키 수령 후 고정 |
| 동의·보관·환불·세금 | 개인정보 처리/보관기간·환불 시 감시종료·잔여기간 정책 미확정(자동환불 금지) |
| 만료 SMS | 만료 후 1시간 목표·발신번호·문안·Solapi 운영검증 |
| PDF 예외 | 공동소유·법인·복수문서 자동추출 지원 범위 |
| 감시 장애 | 장애 고지·보상 정책, 운영 Tilko 가용성 |

> 이 설계서 승인·다날 키 수령은 **운영 DB 변경 승인을 대신하지 않는다.** 실제 기능 구현·운영 반영은 별도 작업·별도 승인.

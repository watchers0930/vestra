# 집키퍼(KeepZip) → VESTRA 통합 설계서

| 항목 | 내용 |
|---|---|
| 문서 번호 | 05-KEEPZIP-Design |
| 버전 | **v0.8** (내용증명 5종 + 스텝 플로우 + 포스트플러스 발송 API 규격·어댑터) |
| 작성일 | 2026-08-22 |
| 프로젝트 | VESTRA (부동산 자산관리 통합 AI 플랫폼) |
| 분류 | 신규 도메인 설계서 (Concierge MVP → 자동화) |
| 원천 문서 | `260821_집키퍼_KeepZip_최종사업계획서.html`, `index(집키퍼 메인)_사업계획서 기반 개발 컨셉.html` |
| 대상 리포지토리 | `/Users/watchers/Desktop/vestra` (메인 베스트라) |

### v0.8 변경 요약 (대장 확정)
- **내용증명 종류 5종 확정**(§8.0): ①보증금 반환 청구 ②부동산 계약 해지(세입자용) ③부동산 계약 해지(임대인용) ④월세 청구 ⑤체납 관리비 납부 요청.
- **발신 주체 양방향 확장**: 기존 "임차인→임대인" 단방향에서, ④⑤와 ③은 **임대인이 발신자**. `KeepzipCase.senderSide`(tenant/landlord) 신규 필드로 종류별 발신 주체를 명시. §2·§8 반영.
- 기존 `cause` enum(`non_refund`/`excessive_repair`/`refuse_renew`) → 5종 코드로 교체.
- **작성 스텝 플로우 확정(§8.3)**: 참지마요(`ai.chamjimayo.com`) 실측 분석 → 종류별 조건부 스텝 순서를 그대로 적용. 종류선택→조건부입력→상대방주소→AI생성→편집→접수/PDF. (단, 집키퍼는 발송 전 변호사 승인·직인 필수)
- **포스트플러스 발송 API 규격 확보 + 어댑터 구현(§14.2.1)**: 규격서 v1.1.2 실측 → 접수/상태조회 엔드포인트·요청/응답·상태값·에러코드 명문화. `lib/keepzip/postal-sender.ts` 어댑터 구현 완료(`sendCertifiedMail`/`getStatus`), `lib/env.ts`에 `POSTPLUS_*` 3종 등록. 실제 발송은 Key/IP·기업가입·템플릿 협의(월요일 전화) 후 활성.

### v0.7 변경 요약
- **UX/IA 재구성**: "변호사 목록 페이지"와 "변호사 상세(액션 허브) 페이지"를 분리(한 페이지 두 섹션 → 두 페이지 한 섹션). 상세에서 **상담신청·실시간 채팅·내용증명**이 한 곳에서 이어짐.
- **변호사 랭킹·후기(§16)**: 사건 완료 후에만 이용자가 5개 항목(전문성·응답속도·소통·결과만족·비용만족) 점수 → 평균 높은 순 상위 노출. 신규 `LawyerRating`.
- **실시간 상담 채팅(§17)**: presence(초록/회색) 온라인 표시. 신규 `ChatThread`/`ChatMessage`. 실시간 인프라 선택 필요(미결정).
- **마이페이지 내용증명 메뉴** + 배송현황.

### v0.6 변경 요약
- **베스트라 통합 방향 확정** (별도 브랜드 아님). 집키퍼를 베스트라의 **액션 레이어**(진단→행동 퍼널 완성) + **데이터 피더**(분쟁 데이터→fraud-risk)로 통합. → §15 신설.
- 통합에 따른 **변호사법 리스크 본체 전이**를 §12에 추가하고 완화책(표기 분리·kill switch·컴플라이언스) 명시.

### v0.5 변경 요약
- 미결정 5건 확정: **연회비 50만원**, **정산 월 2회(15일 간격) 배치 지급**, 미니홈페이지 `/lawyer/[slug]`, 노출 위치=**전문가상담·계약서분석 카테고리(메뉴+변호사 카드)**, 진입 동선=변호사 선택→미니홈페이지 결제.
- **엔드투엔드 사용자 플로우** 명문화(§1.2). 포스트플러스 단가는 대장이 직접 확인(추후 실비 반영).

### v0.4 변경 요약
- **가격모델 C 확정**: 소비자 결제 = **변호사 서비스료 9,900원(전액 변호사 수익) + 발송 실비(pass-through)**. 변호사 수익을 실비 변동과 분리해 9,900원 고정.
- 소비자 표기는 "변호사 검증 9,900원 + 우체국 실비"로 분리 → 9,900원 앵커 유지, 총액 1만원 초과분은 실비로 투명화.
- `KeepzipCase` 금액 필드 세분(`serviceFee`/`postalFee`/`totalPaid`), 정산 2분기(변호사=serviceFee / 포스트플러스=postalFee).

### v0.3 변경 요약
- **발송 전 과정을 베스트라 내부에서 완결** — 인터넷우체국 웹 수기 접수 대신 **민간 우편발송 API(포스트플러스 등)** 연동. 내용증명·등기 API 발송 + 직인 PDF 첨부 확인.
- **변호사 직인**: 승인 시 내용증명 PDF에 전자직인 합성 → 그 PDF를 그대로 발송. (§6·§8·§14)
- 발송 벤더 종속 회피용 **발송 어댑터 추상화**(`lib/keepzip/postal-sender.ts`) 도입.

### v0.2 변경 요약
- BM 확정: **플랫폼 무수수료(노쉐어) + 변호사 가입비·연회비** (로톡식 정액모델)
- **⭐ 절대원칙: 사건대금을 변호사와 쉐어하지 않는다 — 변호사법 위반.**
- 결제: 단일 PG + 토스 지급대행 자동정산 + 정산 보류(에스크로적)
- 환불: 발송 전 전액 / 발송 후 실비·검토료 차감
- 변호사 **미니홈페이지(멀티테넌시)** 반영

---

## 0. 절대원칙 (변호사법 준수)

> **플랫폼은 이용자↔변호사 사이에 발생한 사건대금(변호사 서비스료 9,900원)을 변호사와 나누지 않는다(노쉐어).**
> 서비스료는 전액 변호사 수익이며, 플랫폼은 여기서 수수료·커미션·성사 사례금을 일절 취하지 않는다.
> 플랫폼 수익은 **오직 변호사 연회비 50만원**(정액, 가입비 없음)뿐이다.
> 변호사법 제34조(알선수수료 금지) 위반 원천 차단을 위한 설계 최상위 제약이며, 이하 모든 설계는 이 원칙에 종속된다.

---

## 1. 요약 및 배치 결정

집키퍼는 **임차인이 임대인에게 AI 내용증명을 작성·변호사 검증·우체국 등기 발송**하는 B2C 리걸테크 서비스다.

**배치 결정: 메인 베스트라(`vestra`)에 신규 도메인 `keepzip`으로 통합.** (별도 브랜드/법인 아님, 임대 `vestra-rent` 아님)

**통합 전략 (대장 확정)**: 집키퍼는 독립 수익사업이 아니라 **베스트라의 ① 액션 레이어**(진단·분석 → 내용증명 발송으로 퍼널 완성)이자 **② 데이터 피더**(분쟁 데이터 → `fraud-risk-model` 강화)로 통합한다. 상세 §15.

근거: 고객 방향 일치(임차인 B2C = `userType=TENANT`), 재사용 자산 다수(AI 문서생성·토스 결제·변호사 풀·등기부 데이터·알림), 4중 모트 ①(위험건물 데이터)이 `lib/fraud-risk-model.ts`에 이미 존재.

### 1.1 수익모델(BM) — 대장 확정 ⭐
- **플랫폼 수익** = 변호사 **연회비 50만원 단일**(가입비 없음, 미니홈페이지·대시보드 제공/유지 대가). 정액·SaaS 성격.
- **사건대금** = **노쉐어**. 플랫폼 취득분 0원.
- **가격모델 C (실비 pass-through)** — 소비자 결제액을 둘로 구성:
  - **변호사 서비스료 9,900원** → **전액 변호사 수익**(검토·직인 대가). 실비 변동과 무관하게 고정.
  - **발송 실비** → 포스트플러스 등 발송 대행에 그대로 지급(pass-through). 플랫폼·변호사 마진 0.
  - 소비자 총 결제 = `9,900 + 실비`. 표기는 **"변호사 검증 9,900원 + 우체국 실비"** 로 분리(9,900원 앵커 유지).
- 성격상 **로톡식 정액 광고모델** → 변호사법 제34조 리스크 최소화.

> ⚠️ **사업계획서 원문과의 차이**: 원문은 "플랫폼이 9,900원 수취 + 변호사에 검토료 지급 + 지급명령/SaaS/데이터 수익"의 다단계 모델. 본 설계서는 **대장 지침(노쉐어+회비+가격모델 C)을 우선** 반영한다. 지급명령·데이터 API는 Phase 3+ 옵션.

### 1.2 엔드투엔드 사용자 플로우 (대장 확정)

1. **노출** — 기존 **전문가상담(`expert-connect`)** · **계약서분석(`contract`)** 두 카테고리에 집키퍼 메뉴 + **변호사 카드**를 노출.
2. **선택** — 이용자가 변호사 카드를 선택 → 해당 변호사 **미니홈페이지(`/lawyer/[slug]`)** 또는 대시보드로 진입.
3. **작성·결제** — 문서2 프로토타입 UI대로 분쟁 정보 입력 + 파일 첨부 → AI 내용증명 초안 → 결제(변호사료 9,900 + 실비).
4. **변호사 검증** — 사건이 해당 변호사에게 전송 → 변호사가 확인 후 **직인 날인**(PDF 합성).
5. **발송** — 직인 완료 내용증명을 **우체국(포스트플러스) API로 발송** → 수신 당사자(임대인)에게 등기 우편 도달.
6. **추적·정산** — 종적조회로 도달 확인 → 다음 정산일(월 2회)에 서비스료를 변호사에게 지급.

---

## 2. 도메인 및 사용자 역할

기존 `User.role`(`prisma/schema.prisma:66`)을 확장한다.

| role | 집키퍼에서의 역할 |
|---|---|
| `PERSONAL` (임차인) | 내용증명 신청·결제·사건 추적 (주 고객) |
| `LAWYER` **(신규)** | **미니홈페이지·대시보드 보유**, 사건 검토·전자날인, 서비스료 정산 수령 |
| `ADMIN` | 경영 관제, 발송 관리, 변호사 입점·회비·정산 관리 |

- `LAWYER` role은 `withAdminAuth`(`lib/with-admin-auth.ts:20`) 패턴을 본떠 `withLawyerAuth` 래퍼로 가드.
- **변호사 입점 = 연회비 결제 + KYC(지급대행 셀러 등록) + 미니홈페이지 개설**이 하나의 온보딩 플로우.

---

## 3. 재사용 자산 매핑 (신규 개발 최소화)

| 집키퍼 요구 | 재사용할 기존 자산 | 처리 |
|---|---|---|
| 사건대금 결제 | `POST /api/registry/payment/confirm` 토스 승인 흐름 | 복제 + **지급대행 정산** 추가 |
| 변호사 정산(N명 자동) | — (신규) | **토스 지급대행(Payouts) API** |
| 연회비 결제 | 기존 `Subscription`/토스 일반결제 | 별도 트랙 |
| 로그인/세션/역할 가드 | `auth()` + `session.user.role` | `LAWYER` role 추가 |
| AI 내용증명 초안 | `POST /api/generate-document`(`gpt-4.1-mini`, JSON 모드) | `type:"keepzip-cd"` 추가 |
| 변호사 풀·상담 | `app/(app)/expert-connect/` | 미니홈페이지·승인 흐름으로 확장 |
| 위험건물 데이터 모트 | `lib/fraud-risk-model.ts`(15-피처), `rights-graph-engine.ts`, `registry-parser.ts` | Phase 3 데이터 기반 |
| 알림 | `lib/notification-sender.ts` `sendNotification()` | type만 추가 |
| 문서 PDF·직인 | `@react-pdf/renderer`, `@vercel/blob` | 내용증명 PDF + 직인 합성 |

---

## 4. 라우트 및 폴더 구조 (5대 원칙 반영)

> 각 `page.tsx` 500줄 제한. UI/상태/로직/API 분리. (베스트라 CLAUDE.md 리팩터링 규칙 준수)

**노출/진입 (대장 확정, v0.7 재구성)**: 집키퍼는 기존 **전문가상담(`app/(app)/expert-connect/`)** · **계약서분석(`app/(app)/contract/`)** 카테고리 + **마이페이지 "내용증명" 메뉴**에서 진입한다. UX는 **① 변호사 목록(선택) 페이지 → ② 변호사 상세(액션 허브) 페이지**로 **분리**한다(기존 "한 페이지에 선택+입력폼 두 섹션"의 혼란 해소). 상세 페이지에서 **상담신청·실시간 채팅·내용증명**이 한 곳에서 이어진다.

```
# ── 이용자(임차인) ──
app/(app)/keepzip/
├── page.tsx                     # [페이지1] 변호사 목록(랭킹·후기) ← 전문가상담/마이페이지 유입
├── lawyers/[slug]/page.tsx      # [페이지2] ★ 변호사 상세(액션 허브): 상담신청·실시간채팅·내용증명 탭
├── lawyers/[slug]/components/   # 탭·프로필·후기·채팅 UI (분리)
├── new/page.tsx                 # 내용증명 프로세스(상세에서 진입): 정보입력·첨부·AI초안
├── new/components/
├── cases/page.tsx               # 내 내용증명 목록 (마이페이지 메뉴에서)
├── cases/[id]/page.tsx          # 사건 추적 + 배송현황(종적조회)
└── checkout/page.tsx            # 결제(변호사료 9,900 + 실비)

# 마이페이지: 기존 dashboard에 "내용증명" 메뉴 → keepzip/cases 링크

# ── 변호사(LAWYER) ──
app/lawyer/dashboard/            # ★ 변호사 대시보드 (LAWYER 가드)
├── page.tsx                     # 승인 대기/완료, 정산 현황
├── cases/[id]/page.tsx          # 서류 검토 + 1클릭 전자날인
├── chat/page.tsx                # 상담 채팅 응대(presence)
├── profile/page.tsx             # 공개 상세(미니홈) 프로필 편집
└── settlement/page.tsx          # 정산 내역·연회비

# 변호사 공개 상세 = app/(app)/keepzip/lawyers/[slug] (이용자용 액션 허브)

app/(app)/admin/keepzip/page.tsx # 경영 관제 + 입점/회비/정산 관리

app/api/keepzip/
├── draft/route.ts               # AI 내용증명 생성(서버 검증 필수)
├── cases/route.ts               # 사건 생성/목록
├── cases/[id]/route.ts          # 사건 상세/상태전이
├── order/route.ts               # 주문 생성(serviceFee + postalFee)
├── payment/confirm/route.ts     # 토스 결제 승인 → 정산 hold
├── review/[id]/route.ts         # 변호사 승인·전자날인·직인 PDF (withLawyerAuth)
├── postal/[id]/route.ts         # 우체국 발송·추적
├── payout/[id]/route.ts         # ★ 지급대행 자동 정산(서비스료→변호사)
├── refund/[id]/route.ts         # ★ 환불(발송 전 자동 / 발송 후 차감)
└── lawyer/
    ├── onboard/route.ts         # ★ 입점: 연회비 결제 + 셀러 KYC 등록
    └── membership/route.ts      # ★ 연회비 결제/갱신

lib/keepzip/
├── cd-template.ts               # 내용증명 템플릿·프롬프트
├── case-state.ts                # 상태 머신
├── payout.ts                    # 지급대행 클라이언트(정산/잔액/환불)
├── postal-sender.ts             # ★ 발송 어댑터(포스트플러스 등, 벤더 교체 가능)
├── postal-tracking.ts           # 종적조회 클라이언트
└── pricing.ts                   # 서비스료·회비·실비 상수

components/keepzip/
```

---

## 5. DB 스키마 (신규 모델)

컨벤션: String enum(+주석), `cuid()`, `now()`, `@@index`, `@db.Text`, `onDelete:Cascade`.
> DB 구조 변경은 베스트라 CLAUDE.md에 따라 **일반 작업과 분리**하여 baseline/백업/승인 절차를 거친다.

```prisma
model KeepzipCase {
  id              String    @id @default(cuid())
  userId          String                          // 임차인
  lawyerId        String                          // 배정 변호사(미니홈페이지 소유자)
  // 당사자
  senderName      String
  recipientName   String
  address         String
  deposit         Int?
  expiryDate      DateTime?
  cause           String    @default("deposit_return") // §8.0 내용증명 5종 코드
  senderSide      String    @default("tenant")          // tenant | landlord — cause별 발신 주체(§8.0)
  // 문서/상태
  draftContent    String?   @db.Text
  documentUrl     String?                          // 직인 합성 완료 PDF (Blob)
  status          String    @default("draft")     // draft | paid | lawyer_pending | lawyer_approved | postal_sent | delivered | canceled | refunded
  riskScore       Int?
  sentAt          DateTime?                        // ★ 발송 시각 — 환불 기준선
  // 결제/정산/환불  (가격모델 C — 노쉐어)
  orderId         String?   @unique
  serviceFee      Int       @default(9900)        // 변호사 서비스료 → 전액 변호사 정산
  postalFee       Int       @default(0)            // 발송 실비 → 포스트플러스 pass-through
  totalPaid       Int                              // 소비자 총 결제액 = serviceFee + postalFee
  settlementStatus String   @default("hold")       // hold | released | refunded | partial_refunded
  payoutId        String?                          // 지급대행 지급 식별자(서비스료)
  payoutAmount    Int?
  refundedAmount  Int?
  // 관계
  lawyerReview    LawyerReview?
  tracking        PostalTracking?
  user            User      @relation("KeepzipTenant", fields: [userId], references: [id], onDelete: Cascade)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
  @@index([lawyerId])
  @@index([status])
}

model LawyerPartner {
  id                String    @id @default(cuid())
  userId            String    @unique              // User(role=LAWYER)
  barNumber         String                          // 변호사 등록번호
  firmName          String?
  // 미니홈페이지(멀티테넌시)
  homepageSlug      String    @unique              // /lawyer/[slug]
  homepageActive    Boolean   @default(false)
  bio               String?   @db.Text
  // 지급대행 셀러
  payoutSellerId    String?   @unique              // 토스 지급대행 셀러 ID
  kycStatus         String    @default("none")     // none | pending | verified | rejected
  // 회비 (= 플랫폼의 유일한 수익원) — 연회비 50만원 단일, 가입비 없음
  membershipFee     Int       @default(500000)     // 연회비(원)
  membershipStatus  String    @default("inactive") // inactive | active | expired
  membershipExpires DateTime?
  // 랭킹·presence 캐시
  avgRating         Float     @default(0)          // 후기 5항목 평균(정렬용)
  ratingCount       Int       @default(0)
  lastSeenAt        DateTime?                        // presence(온라인) 근사
  active            Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([membershipStatus])
}

model LawyerReview {
  id           String    @id @default(cuid())
  caseId       String    @unique
  lawyerId     String
  tier         String    @default("tier2")         // tier1 | tier2 | tier3 (AI 신뢰도별 검토 강도)
  decision     String    @default("pending")       // pending | approved | rejected
  stampedAt    DateTime?                            // 직인 날인 시각
  memo         String?   @db.Text
  case         KeepzipCase @relation(fields: [caseId], references: [id], onDelete: Cascade)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([lawyerId])
}

model PostalTracking {
  id           String    @id @default(cuid())
  caseId       String    @unique
  trackingNo   String?                             // 등기번호
  step         Int       @default(1)               // 1~5 (검증완료→접수→인쇄→배달→도달)
  deliveredAt  DateTime?
  provider     String    @default("postplus")      // postplus | epost_manual
  case         KeepzipCase @relation(fields: [caseId], references: [id], onDelete: Cascade)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model LawyerRating {   // 이용자 후기·평점 — 사건 완료 후에만 (실이용자·중복 방지)
  id                 String   @id @default(cuid())
  lawyerId           String
  userId             String
  caseId             String   @unique              // 완료 사건 연결(1사건 1후기)
  scoreExpertise     Int                            // 전문성 1~5
  scoreResponse      Int                            // 응답 속도 1~5
  scoreCommunication Int                            // 소통·친절 1~5
  scoreResult        Int                            // 결과 만족 1~5
  scoreValue         Int                            // 비용 대비 만족 1~5
  avgScore           Float                          // 5항목 평균(정렬용)
  comment            String?  @db.Text
  createdAt          DateTime @default(now())

  @@index([lawyerId])
}

model ChatThread {     // 이용자 ↔ 변호사 실시간 상담
  id         String   @id @default(cuid())
  userId     String
  lawyerId   String
  caseId     String?                               // 내용증명 사건 연결(선택)
  lastMsgAt  DateTime?
  createdAt  DateTime @default(now())

  @@unique([userId, lawyerId])
  @@index([lawyerId])
}

model ChatMessage {
  id        String   @id @default(cuid())
  threadId  String
  senderId  String                                 // userId 또는 lawyerId
  body      String   @db.Text
  readAt    DateTime?
  createdAt DateTime @default(now())

  @@index([threadId])
}
```

---

## 6. API 스펙 (핵심)

모든 변이 핸들러: `validateOrigin` → `auth()` → role 체크 → `rateLimit` → **서버 입력 재검증(zod)**.

| 엔드포인트 | 메서드 | 인증 | 동작 |
|---|---|---|---|
| `/api/keepzip/draft` | POST | PERSONAL | 서버 검증 → OpenAI 초안(비저장 미리보기) |
| `/api/keepzip/cases` | POST | PERSONAL | 사건 생성(lawyerId=미니홈페이지 소유자) |
| `/api/keepzip/order` | POST | PERSONAL | orderId 발급, serviceFee=9900 + postalFee(실비) |
| `/api/keepzip/payment/confirm` | POST | PERSONAL | 금액 검증 → 토스 confirm → lawyer_pending, settlement=hold |
| `/api/keepzip/review/[id]` | PATCH | **LAWYER** | approve/reject + stampedAt + **직인 PDF 합성**(→ documentUrl) |
| `/api/keepzip/postal/[id]` | PATCH | ADMIN/시스템 | 발송(어댑터) + 단계 전이, 도달 시 sentAt/delivered |
| `/api/keepzip/payout/[id]` | POST | 시스템/ADMIN | **지급대행 자동 정산**(도달+이의기간 경과) — serviceFee 전액 변호사 |
| `/api/keepzip/refund/[id]` | POST | PERSONAL/ADMIN | **환불**(발송 전 전액 / 발송 후 차감) |
| `/api/keepzip/lawyer/onboard` | POST | LAWYER | 연회비 결제 + 셀러 KYC 등록 |
| `/api/keepzip/lawyer/membership` | POST | LAWYER | 연회비 결제/갱신 |

**⚠️ 배포 전 API 보안 체크리스트(CLAUDE.md)**: 위 변이 핸들러 전부 인증 적용 확인, dead endpoint 없음 확인.

---

## 7. 결제 · 정산 · 환불 구조 ⭐ (대장 결정 반영)

### 7.1 자금 트랙 (가격모델 C — 3분기)

소비자 1회 결제(`totalPaid = serviceFee + postalFee`)가 세 방향으로 분리된다.

| 자금 | 금액 | 귀속 | 방식 |
|---|---|---|---|
| **변호사 서비스료** | 9,900원 | **전액 변호사** | 토스 결제 → **지급대행(Payouts)** 정산 |
| **발송 실비** | 실비(변동) | 포스트플러스(발송대행) | pass-through 지급 (마진 0) |
| **연회비 (가입비 없음)** | **연 50만원 단일** | **플랫폼(유일 수익)** | 변호사→플랫폼 일반결제(연 1회 갱신) |

> 플랫폼은 서비스료·실비에서 **취득분 0원**. 오직 회비만 수익.

### 7.1.1 토스페이먼츠 계약은 2종 (⚠️ 준비 단계 필수)

"토스 가입 + 상점번호"만으론 정산이 안 된다. **결제(받기)와 지급대행(주기)은 별개 계약**이다.

| | ① 일반 결제 (돈 받기) | ② 지급대행 Payouts (변호사 정산) |
|---|---|---|
| 필요 | 토스 가입 + `clientKey`·`secretKey` | **지급대행 서비스 별도 신청·심사** |
| 상점번호만으로? | 사실상 가능(키 2개) | ❌ **불가 — 별도 계약** |
| 베스트라 현황 | 🟢 **이미 연동됨**(`TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`) | 🔴 **신규 신청 필요** |
| 추가 | — | 변호사별 **셀러(sub-seller) 등록 + KYC** |

**준비 액션(대장·토스 확인):** ① 지급대행 서비스 이용 신청·심사기간 ② 기존 가맹점(MID)에 붙는지/별도 MID 필요한지 ③ 셀러(변호사) 등록·KYC 절차(온보딩 편입) ④ (에스크로 표기 시) 구매안전 설정.

### 7.2 "쉐어"와 "실비"의 구분 (오해 방지)

| 구분 | 정의 | 처리 | 허용? |
|---|---|---|---|
| **쉐어(커미션)** | 플랫폼이 변호사 서비스료 일부를 취득 | — | ❌ **절대 금지** |
| **발송 실비** | 우체국 등기·인쇄 실제 원가 | 소비자가 별도 부담 → 발송대행에 pass-through | ✅ |
| **PG 결제수수료** | 토스가 떼는 결제 비용 | 플랫폼이 회비 수익에서 흡수(변호사 전가 안 함) | ✅ (권장) |

### 7.3 지급대행 자동 정산 (직원 수동송금 0)

```
① 소비자, 변호사 미니홈페이지(/lawyer/[slug])에서 결제(9,900 + 실비)
       ↓ 플랫폼 대표 가맹점 수취
② 토스 결제 webhook → status=paid, settlementStatus=hold
       ↓ (트리거: 등기 도달 완료 + 이의제기 기간 N일 경과)
③ 서버가 지급대행 API 호출 → 변호사 payoutSellerId에게 서비스료 9,900원 지급
       ↓ (실비는 발송 시점에 포스트플러스로 지급)
④ 토스가 변호사 계좌로 자동 이체 (EXPRESS 바로지급 / SCHEDULED 예약지급)
       ↓
⑤ 잔액·지급상태 조회 API로 결과 기록(payoutId, payoutAmount)
```
- 변호사는 입점 시 **셀러 KYC 선완료**(법인 즉시, 개인 본인인증, 주 1천만원↑ 지급 시 KYC 필수).
- 자체 계좌·펌뱅킹 직접 이체는 PG업/전자금융업 이슈 → **반드시 토스 지급대행 경유**.

### 7.4 정산 보류 및 지급 주기 (안전결제 / 에스크로적)

- **hold-and-release**: 결제 후 즉시 정산하지 않고 보류.
- **지급 주기 = 월 2회, 15일 간격 배치**(예: 매월 1일·16일). 등기 **도달 완료**가 확인된 사건을 모아 다음 정산일에 지급대행 SCHEDULED(예약지급)로 일괄 지급.
- 도달 ~ 다음 정산일 사이(최대 15일)가 사실상 **이의제기·환불 버퍼**가 된다. 이 기간 내 문제 발생 시 정산 전이라 서비스료 환불 자동 처리.
- ⚠️ **표기 주의**: 소비자 화면·약관에는 **"토스페이먼츠 구매안전(에스크로) 서비스 적용"** 처럼 제공 주체(토스=전자금융업자)를 명시. 플랫폼 자체를 결제대금예치업자로 표기 금지. (전자상거래법 표기 규정 — 로펌 자문 대상)

### 7.5 환불 정책 (대장 확정, 가격모델 C 기준)

| 시점 | 환불액 | 자동화 |
|---|---|---|
| **발송 전 취소** (status < postal_sent) | **전액(9,900 + 실비)** — 실비 미집행 | 🟢 토스 결제취소 API 완전 자동 |
| **발송 후** (status ≥ postal_sent) | **실비 차감**(이미 집행) + 검토 완료 시 서비스료 차감 | 🟡 차감 계산 자동, 승인만 운영자 |

- 발송 실비는 발송 시점에 이미 포스트플러스로 나가므로 발송 후 환불 불가(차감).
- 서비스료(9,900)는 정산(release) 전이라 플랫폼 잔액에 있어 환불 자동 처리 가능.
- **환불 실행 100% 자동**, **환불 승인 판단만 반자동**(분쟁성은 운영자 원클릭).

### 7.6 변호사법 적합성

노쉐어 + 정액 회비 = 로톡식 모델로 제34조 알선수수료 리스크 최소. 단 **서비스 오픈 전 변호사법 전문 로펌 정식 자문 선행**(사업계획서 선결과제).

---

## 8. AI 내용증명 생성 설계

### 8.0 내용증명 종류 (5종 — 대장 확정)

| 코드(`cause`) | 명칭 | 발신 주체(`senderSide`) | 수신 상대 | 핵심 청구/통지 내용 |
|---|---|---|---|---|
| `deposit_return` | 보증금 반환 청구 | tenant(세입자) | 임대인 | 계약 만료·해지에 따른 보증금 반환 청구 + 지연손해금 |
| `terminate_by_tenant` | 부동산 계약 해지(세입자용) | tenant(세입자) | 임대인 | 세입자 사유 계약 해지 통지(하자·계약위반 등) |
| `terminate_by_landlord` | 부동산 계약 해지(임대인용) | landlord(임대인) | 세입자 | 임대인 사유 계약 해지 통지(차임 연체·용법위반 등) |
| `rent_arrears` | 월세 청구 | landlord(임대인) | 세입자 | 연체 차임 납부 청구 + 지연손해금·해지 예고 |
| `maintenance_arrears` | 체납 관리비 납부 요청 | landlord(임대인) 또는 관리주체 | 세입자 | 체납 관리비 납부 요청 + 연체료 |

- 발신 주체가 **양방향**(세입자/임대인)이므로, 노출 동선(§15.1)·주 고객(§2) 문구는 "임차인 중심"을 유지하되 임대인 발신 3종을 포함한다. `senderSide`로 UI 라벨·발신인 표기·프롬프트 분기.
- 각 종류는 §9 상태 머신을 공통으로 따른다(종류 무관 동일 플로우).

### 8.1 생성 방식
- 재사용: `POST /api/generate-document` 확장 또는 `/api/keepzip/draft` 신설. 모델 `gpt-4.1-mini`, `temperature:0.3`, `response_format:{type:"json_object"}`.
- 프롬프트: **위 5종별 시스템 프롬프트**. 근거 법령 자동 인용 — ①②는 주택임대차보호법(보증금·해지), ③④는 민법 임대차·주택임대차보호법(차임 연체 해지), ⑤는 관리비 관련 약정·집합건물법/관리규약. 각 종별로 청구 금액·기한·불이행 시 조치(법적 대응 예고) 문구 포함.
- 리스크 진단: 권리순위·회수기간·지연손해율. 초기 룰 기반 → 이후 `fraud-risk-model` 연계.
- **AI 초안은 반드시 변호사 승인 후에만 발송**(자동 발송 금지).

### 8.2 변호사 직인 처리 (베스트라 내부)
- 변호사 승인(`review/[id]`) 시 `@react-pdf/renderer`로 내용증명 PDF를 렌더하며 **변호사 전자직인 이미지를 합성**. 결과 PDF는 `@vercel/blob`에 저장하고 `documentUrl`에 기록.
- 발신인 표기: "발신인 임차인 OOO / 대리인 변호사 OOO (직인)" 또는 법무법인 명의. **직인은 우체국 웹 기능이 아니라 베스트라가 만든 PDF 안에서 처리**되고, 그 PDF를 §14 발송 API에 그대로 첨부.
- 법적 사실: 내용증명에 직인은 접수 필수 요건이 아니나, **변호사(법무법인) 명의·직인**이 수신인에 주는 공신력·압박이 상품의 핵심 가치.
- ⚠️ 변호사 직인이 정당하려면 그 변호사가 **실제 대리인/작성자**여야 한다(대리·수임 관계 성립). 발신인 명의·대리 구조는 **로펌 자문으로 확정**.

### 8.3 내용증명 작성 스텝 플로우 (참지마요 벤치마크 — 대장 지시 반영)

> 대장 지시로 **참지마요(`www.ai.chamjimayo.com`)** 서비스의 종류별 스텝 순서를 실측 분석해 그대로 적용한다. keepzip `new` 프로세스(§4, `app/(app)/keepzip/new`)의 단계형 UI 근거.
> **공통 골격**: `종류 선택 → (종류별 조건부 입력 스텝) → 상대방 주소 확인 → AI 문서 자동 생성 → 발신/수신인 입력·문서 편집 → 접수 or PDF`. 진행률 프로그레스바를 상단에 표시(참지마요는 30%→…→생성 완료).

**STEP 0. 종류 선택** — §8.0의 5종 카드(명칭 + 한 줄 설명)에서 택1.

**STEP 1~N. 종류별 조건부 입력** — 선택한 종류에 따라 질문 세트가 달라진다:

| 종류 | 스텝 순서 |
|---|---|
| **① 보증금 반환청구** (세입자) | ①임차보증금(원) → ②계약 종료 이유(기간만료 / 묵시적연장 종료희망) → ③계약한 날짜 → ④임차 대상 주소 → ⑤보증금 반환 희망 일자 |
| **② 계약해지(세입자용)** (세입자) | ①과 **동일 스텝**(문구만 "종료된 이유"→"해지하려는 이유"): ①임차보증금 → ②해지 이유 → ③계약한 날짜 → ④임차 대상 주소 → ⑤보증금 반환 희망 일자 |
| **③ 계약해지(임대인용)** (임대인) | ①해지 이유 **6종**(임대료 연체 / 임대 대상물 무단 변경 / 무단 전대차 / 무단 임차권 양도 / 임대기간 만료 / 기타) → ②*(조건부)* 연체 임대료 총 금액[임대료 연체 선택 시] → ③임대차 종료 일자 → ④기타 이유 직접 입력 → ⑤계약한 날짜 → ⑥임차 대상 주소 |
| **④ 월세 청구** (임대인) | ①연체 임대료 총 금액 → ②계약한 날짜 → ③임차 대상 주소 (**최단 3스텝**) |
| **⑤ 체납 관리비 납부 요청** (임대인/관리주체) | ①체납 시작 시기(자유 텍스트) → ②미납 관리비 총액 (**임차 대상 주소 스텝 없음**) |

**STEP N+1. 상대방(수신인) 주소 확인** — "상대방의 주소를 아시나요?" 분기:
- **알아요** → 우체국 등기 + 전자 내용증명 **모두** 가능.
- **몰라요** → 전화번호만으로 **전자 내용증명**만 가능.
- ⚠️ 집키퍼는 **포스트플러스 우체국 등기(§14)** 가 기본이므로 **"주소 알아요" 경로가 주 플로우**. 전자 내용증명(전화번호 기반)은 참지마요 특유 옵션 — Phase 3 검토 대상(집키퍼 범위 밖).

**STEP 최종. AI 문서 자동 생성 → 편집 → 처리** (`/paper` 대응):
- 입력값으로 **완성된 내용증명 초안 자동 생성**(제목·발신인/수신인·본문·작성일자·서명란). 참지마요 실측: 보증금 반환청구 본문에 민사집행법 제276조(가압류)·임차권등기명령·소송촉진법 제3조 연 12% 지연손해금을 자동 인용.
- 문서를 클릭해 **직접 편집** 가능(발신/수신인 성명·전화번호·주소 셀 입력, 본문 수정, 맞춤법 검사).
- 완료 후 **[지금 접수하기]**(발송 접수) / **[무료 PDF 내려받기]**.
- **집키퍼 매핑**: 이 "생성→편집"은 §8.1 `/api/keepzip/draft`(AI 초안) + `new` 편집 UI, "접수하기"는 §7 결제 → §6 `review`(변호사 승인·직인) → §14 발송으로 이어진다. **참지마요와 달리 집키퍼는 발송 전 변호사 승인·직인 단계가 필수**(§8.2).

**구현 참고 (실측 발견)**:
- 주소 입력은 **카카오(다음) 우편번호 서비스 iframe** 사용 → 베스트라가 이미 카카오맵 SDK 사용 중이므로 동일 자산 재사용.
- 금액 입력 시 "1억"·"300만" 등 **한글 단위 힌트**를 실시간 표시.
- 날짜는 년/월/일 3분할 입력.

---

## 9. 사건 상태 머신

```
draft ──결제──▶ lawyer_pending ──승인+직인──▶ lawyer_approved ──발송──▶ postal_sent ──도달──▶ delivered
        │            │                                                                       │
        │            └──반려──▶ draft                                            도달+N일 무이슈
        └──(발송전)취소/환불──▶ canceled/refunded                                       ▼
                                                              payout(지급대행 — 서비스료 전액 변호사)
```
- 정산(payout)은 **delivered + 이의기간 경과** 후에만 발생 → 그 전 환불은 서비스료 전액 자동.

---

## 10. 알림 흐름 (`sendNotification` 재사용)

| 시점 | 채널 | 내용 |
|---|---|---|
| 결제 완료 | 카톡/SMS | "내용증명 접수, 변호사 검증 중" |
| 변호사 승인 | 카톡/메일 | "변호사 최종 승인, 발송 예정" |
| 우체국 접수 | SMS | "등기번호 + 추적 링크" |
| 도달 완료 | 카톡/메일 | "임대인 수령 완료 — 법적 효력 발생" |
| 정산 완료 | (변호사) 카톡/메일 | "사건 [id] 서비스료 정산 완료" |
| 환불 완료 | 카톡/SMS | "환불 처리 완료 (금액)" |

---

## 11. 단계별 로드맵 (Concierge MVP)

| Phase | 범위 | 신규 개발 | Go/No-Go |
|---|---|---|---|
| **1 (2~4주)** | 수작업 런칭 | keepzip `new`·`checkout`·`cases` + `KeepzipCase` + `/draft` + 토스 결제 + **지급대행 정산(수동 트리거 허용)** + 포스트플러스 발송 + 변호사 미니홈페이지 1~3개. 승인=카톡/수동 | 변호사 3인 입점(연회비·KYC) + 약식 법률자문 완료 |
| **2 (M3~6)** | 자동화 | `/lawyer/dashboard` 승인·정산, 발송·추적 완전 자동, 벤더 이중화, 경영관제 | 전환율 실측 8%+ / 중대사고 0 |
| **3 (M7~)** | 확장(옵션) | 지급명령 패키지, 위험건물 데이터 API(← fraud-risk 연계) | 월 결제 1,000건 안정 |

---

## 12. 리스크 및 선결과제

| 항목 | 내용 | 대응 |
|---|---|---|
| **사건대금 쉐어** | 플랫폼이 서비스료 일부라도 취득 시 변호사법 위반 | **노쉐어 절대원칙**, PG수수료는 회비로 흡수 |
| **총액 1만원 초과** | 가격모델 C는 총결제 9,900+실비 → 1만원 초과 (사업계획서 "1만원 미만" 앵커와 상충) | "변호사 9,900원 + 실비" 분리 표기로 앵커 유지, 경쟁 대비 여전히 저가 |
| **발송 실비 미확정** | 포스트플러스 내용증명 단가가 사업성·변호사 유인 좌우 | 1577-8114 견적 확인(§14.4) |
| **변호사법 제34조** | 알선수수료 소지 | 노쉐어+정액회비(로톡식), 로펌 자문 선행 |
| **에스크로 표기** | 예치업 표기 규정 | "토스 구매안전(에스크로)" 주체 명시 |
| **전자금융업** | 3자 정산 | 토스 지급대행 경유(자체 이체 금지) |
| **직인 대리 구조** | 직인 정당성 | 변호사 실제 수임·대리 관계, 로펌 자문 |
| **서버 검증** | 내용증명=법적 문서 | 모든 입력 `/api/keepzip` zod 재검증 |
| **AI 자동발송** | 오작성 | 변호사 승인 전 발송 차단 |
| **변호사법 리스크 본체 전이** | 통합이라 규제 이슈 시 베스트라 브랜드 신뢰 타격 | ①UI/약관에 "제휴 변호사 서비스, 베스트라는 법률사무 주체 아님" 명시 ②기능 단위 **kill switch**로 본체 격리 가능 ③컴플라이언스 상시 모니터링·로펌 자문 |

---

## 13. 결정 현황

### 대장 직접 확인 중 (외부 — 코드로 검증 불가)
- **포스트플러스 계약 (월요일 전화 1577-8114)** — 기업가입·API Key 발급·템플릿 협의·예치금·발송 IP 등록 5종(§14.4). API 규격은 확보·어댑터 구현 완료, **Key/IP만 대기**. 🔴 Vercel 고정 IP 이슈 질의 필수.
- **포스트플러스 내용증명 B2B 단가** — 상동 통화 시 확인. 확정 시 §7 실비·환불액 숫자 반영.
- 변호사법 전문 로펌 정식 자문(오픈 전 선결과제): 노쉐어·직인 대리구조·에스크로 표기.
- **토스 지급대행(Payouts) 서비스 신청·심사** — 변호사 자동정산의 필수 계약. 기존 결제 연동과 별개(§7.1.1). 상점번호만으론 불가.

### 해소된 결정 (전량 확정)
- ✅ 배치: 메인 베스트라 `keepzip`
- ✅ BM: **노쉐어(절대원칙)** + 연회비(가입비 없음)
- ✅ **가격모델 C**: 변호사료 9,900(전액 변호사) + 실비 pass-through
- ✅ 결제: 단일 PG + 토스 지급대행 자동정산 + 회비 별도 트랙
- ✅ **연회비 50만원 단일** (가입비 없음, 변호사→플랫폼, 플랫폼 유일 수익)
- ✅ **정산 주기: 월 2회(15일 간격) 배치 지급** — 도달 확인 건을 다음 정산일에 지급
- ✅ 정산 보류: 에스크로적, 도달~정산일 사이가 이의제기·환불 버퍼
- ✅ 환불: 발송 전 전액 / 발송 후 실비·검토료 차감, 실행 자동
- ✅ 변호사 UI: 미니홈페이지(`/lawyer/[slug]` 경로형) + 대시보드
- ✅ **노출 위치: 전문가상담·계약서분석 카테고리(메뉴 + 변호사 카드)**
- ✅ **진입 동선: 카드 선택 → 변호사 미니홈페이지에서 입력·첨부·결제**
- ✅ 발송: 베스트라 내부 완결(포스트플러스 API) + 직인 PDF 첨부
- ✅ 추적: 종적조회 오픈API 자동화
- ✅ **UX: 변호사 목록(선택) / 상세(액션 허브) 2페이지 분리** — 상세에서 상담신청·채팅·내용증명
- ✅ **랭킹·후기: 완료 후 5항목 점수 → 평균 높은 순 (§16)**
- ✅ **실시간 채팅 + presence(초록/회색) (§17)** — 실시간 인프라는 구현 시 선택
- ✅ **마이페이지 내용증명 메뉴 + 배송현황**
- ✅ **내용증명 5종 확정 (§8.0)**: 보증금반환청구 / 계약해지(세입자용) / 계약해지(임대인용) / 월세청구 / 체납 관리비 납부 요청
- ✅ **발신 주체 양방향(`senderSide`)**: 세입자 발신 2종 + 임대인 발신 3종
- ✅ **작성 스텝 플로우 (§8.3)**: 참지마요 벤치마크로 종류별 조건부 스텝 순서 확정
- ✅ **포스트플러스 발송 API 규격 확보 + 어댑터 구현 (§14.2.1)**: 접수/상태조회 명세 확정, `postal-sender.ts` 구현 완료 (Key/IP 발급만 대기)

### 신규 미결정 (v0.7)
- 실시간 채팅 인프라 (Pusher/Ably/Supabase Realtime vs SSE+폴링) — 구현 시 결정. Phase 1은 카톡 대체 가능.

---

## 14. 내용증명 발송 · 추적 (베스트라 내부 완결) ⭐

> 목표: **직인 찍힌 내용증명 생성 → 발송 → 추적** 전 과정을 베스트라 안에서 완결. 운영자가 인터넷우체국 웹을 따로 거치지 않는다.

### 14.1 완전 내부 완결 아키텍처

```
[베스트라 내부]                                          [외부]
임차인 입력 → AI 초안 → 변호사 승인+직인 PDF → "발송" 버튼
                                                   │
                                                   ▼ (REST/HTTPS)
                                          민간 우편발송 API ──▶ 우체국 인쇄·봉함·등기 발송
                                                   │                        │
                            종적조회 오픈API로 배달상태 폴링 ◀───────── 집배원 배달·도달
                                                   │
                                       PostalTracking 자동 갱신 → 도달 확인 → 정산 트리거
```

### 14.2 발송 — 민간 우편발송 API 연동 (권장) 🟢

**포스트플러스(PostPlus) 등 민간 우편 API로 베스트라에서 직접 발송 가능** (웹 확인, 2026-08):
- 지원 배달종류: 일반·등기·선택등기·배달증명·**내용증명** ✅
- **RESTful HTTPS**로 자기 시스템 연동, 발송·현황확인 ✅
- **문서 첨부 발송**: "주소+첨부파일" / "서식데이터+PDF 생성" → **§8.1 직인 PDF를 그대로 첨부** ✅
- API Key 발급: 1:1문의 또는 **1577-8114**

**발송 경로 비교**

| 경로 | 방식 | 내부완결 | 비고 |
|---|---|---|---|
| A. 인터넷우체국 웹 수동 | 운영자 직접 접수 | ✕ | 초기/폴백 |
| B. e그린우편 우체국 직접계약 | 데이터 전송 → 우체국 발송 | △ | 대량, 내용증명 지원 확인 필요 |
| **C. 민간 우편발송 API(포스트플러스)** | REST 호출 → 대행 발송 | **○** | **권장 — 내용증명·PDF첨부·내부완결** |

**벤더 종속 회피**: `lib/keepzip/postal-sender.ts` **어댑터 인터페이스**(`sendCertifiedMail()` / `getStatus()`)로 추상화. 포스트플러스 구현 기본 + 향후 교체 가능. ✅ **구현 완료**(2026-08-22, Key/IP 발급 대기).

#### 14.2.1 포스트플러스 API 실측 규격 (규격서 v1.1.2 — 2026-08-22 확보)

> 출처: `PostPlus 기업연계 API 2023-05-09.pdf`. 전송은 **`multipart/form-data`**, 응답은 `{"결과":"OK|ERROR|E_xxxxx","비고":"..."}`.

| API | Method / Path | 요청 | 핵심 응답 |
|---|---|---|---|
| **우편 제작 접수** | `POST {BASE}/po/api/postplusPstMsrApi.do` | `apiKey` + `pstFile`(master/detail JSON) + `pstFile`(첨부 PDF) | `결과`, `비고` |
| **우편 제작 상태 조회** | `POST {BASE}/po/api/postplusPstStatusApi.do` | `apiKey` + `inputCode`(연계식별키) | `상태`, `시작/종료등기번호`, `순번등기번호` |

- **BASE**: 테스트 `https://t.postplus.co.kr` / 운영 = 별도 서브도메인(포스트플러스 안내). env `POSTPLUS_BASE_URL`.
- **master(25필드)**: 버전(`v1.10`)·테스트여부(Y/N)·서비스(`PST`)·연계식별키·봉투·봉투창·흑백칼라·단면양면·**배달(=내용증명)**·템플릿·수취인수·발송인 5필드 등. **컬럼 순서 고정**.
- **detail(첨부파일 방식)**: 순번·이름·우편번호·주소·상세주소·전화번호·**첨부파일**(= 함께 올리는 직인 PDF 파일명과 일치).
- **연계식별키 = `KeepzipCase.id`** 로 매핑 → 중복 접수 방지 + 상태조회 키로 재사용.
- **상태 전이값**: `접수대기→검수→출력→봉입→우체국접수중→제작발송완료(=과금·발송완료)→[접수취소/확인불가]`. **"제작발송완료" + 등기번호 확보 시점**을 `PostalTracking.step` 진행·정산 트리거로 연결.
- **에러코드**: `E_10000`(일반 예외), `E_12070`(연계식별키 미존재).
- ⚠️ **배달="내용증명" 문자열**은 규격서 상태조회 예시엔 (일반/등기/준등기/익일특급)만 노출됨 → 접수 필드의 정확한 값은 **템플릿 협의(선결)에서 확정**. 어댑터는 상수+주석으로 표기.
- ⚠️ **env**: `POSTPLUS_API_KEY` / `POSTPLUS_BASE_URL` / `POSTPLUS_TEST_MODE`(Y/N). 모두 `lib/env.ts` 등록 완료(선택 변수, 미설정 시 기능 비활성).

### 14.3 추적 — 종적조회 오픈API 🟢

- **API**: 공공데이터포털 "우체국 종적조회 OPEN API" (제공: 과학기술정보통신부 우정사업본부)
- **기능**: 등기번호로 배달상태(배달완료/미배달)·처리일시·처리장소·수령일 조회
- **인증/한도**: 공공데이터포털 서비스키 필수, 활용신청 자동승인, 개발계정 일 10,000건
- **적용**: `postal-tracking.ts` → `PostalTracking.step`/`deliveredAt` 자동 갱신. 문서2 "우체국 추적센터"(5단계) 실동작. Phase 1부터 가능.
- **정산 연동**: "배달완료" → `delivered` → 이의기간 카운트 → 지급대행 정산(§7.3·§7.4).

### 14.4 ⚠️ 대장·제휴 확인 필요 (외부 계약) — 2026-08-22 갱신

**월요일 포스트플러스 전화(1577-8114) 시 확인·처리할 선결 5가지** (코드로 불가):

| # | 항목 | 비고 |
|---|---|---|
| 1 | **기업/기관 회원가입** | 개인 불가 — API 연동은 기업 회원만 |
| 2 | **API Key 발급** | 1:1문의/1577-8114, 자동발급 아님(심사) → `POSTPLUS_API_KEY` |
| 3 | **템플릿 협의 선행** | 규격서 명시 *"템플릿 협의 후 서비스 이용 가능"*. 내용증명 배달값 정확한 표기도 이때 확정 |
| 4 | **예치금/기관 후불 결제** | 요금이 §7.2 실비(소비자 pass-through) |
| 5 | **발송 IP 등록** | 화이트리스트 → **🔴 아래 Vercel 이슈 반드시 질의** |

- 🔴 **Vercel 고정 IP 이슈**: 베스트라는 Vercel 서버리스라 outbound IP가 유동적 → IP 화이트리스트와 충돌 가능. 포스트플러스에 ①IP 화이트리스트 필수 여부 ②Key만으로 허용 가능한지 확인. 필수면 해결책(Vercel 고정 IP/프록시/별도 발송 워커) 별도 검토.
- **내용증명 건당 단가**(§7.2 실비): 등기 취급 +2,100원, 준등기 1,800원/통, 제작비 A4 200~300원·추가 100원(웹 참고치). 시세: 우체국 창구 3p ≈ 4,780원 / 리테일 대행 ≈ 14,900원. **내용증명 단가는 견적으로 확정**.
- 대안 벤더(다른 우편 API) 유무 — 어댑터 이중화 대비.
- 경로 B(e그린우편 직접계약) 병행 여부: 우체국 1588-1300 / posa.

### 14.5 진행 순서

```
Phase 1 (지금):   발송 = 포스트플러스 API (초기엔 웹 수동 폴백 허용)
                  추적 = 종적조회 오픈API 자동화
Phase 2 (검증 후): 발송 = 완전 자동 + 벤더 이중화(어댑터)
                  추적 = 동일
```

---

## 15. 베스트라 통합 전략 (액션 레이어 + 데이터 피더) ⭐

집키퍼는 독립 수익을 목표로 하지 않는다. 역할은 **베스트라의 전환·리텐션·데이터를 끌어올리는 엔진**이다.

### 15.1 진단 → 액션 퍼널 연결

베스트라의 기존 진단 결과에서 집키퍼로 자연 유입시킨다(컨텍스트 자동 전달).

| 유입 지점(기존 기능) | CTA | keepzip 전달 컨텍스트 |
|---|---|---|
| `jeonse/analysis` (전세 위험 진단) | "보증금 반환 내용증명 보내기" | 주소·보증금·임대인 |
| `jeonse/lease-registration` (임차권등기 가이드) | "내용증명부터 발송" | 사건 정보 |
| `rights` / `registry` 모니터링 (위험 신호 감지) | "대응 내용증명 작성" | 등기 위험 요약 |
| `expert-connect` / `contract` (§4 노출) | 변호사 카드 | 사건 유형 |
| **마이페이지 "내용증명" 메뉴** | 변호사 목록으로 이동 | 재방문·배송현황 확인 |

→ 사용자는 "위험 발견 → 즉시 행동"으로 이어져 이탈이 줄고, 마이페이지 내용증명 메뉴로 재방문·배송현황 확인 동선이 생긴다.

### 15.2 데이터 플라이휠 (집키퍼 → fraud-risk)

- `KeepzipCase`의 **분쟁 데이터**(임대인·주소·분쟁유형·회수 결과)를 **익명화·집계**하여 `lib/fraud-risk-model.ts`의 지역 사기율·임대인 위험 피처에 피드백.
- 사건이 쌓일수록 베스트라 위험진단 정밀도↑ → 진단이 더 많은 액션(집키퍼)을 유발 → 데이터가 더 쌓이는 **선순환**.
- 이것이 사업계획서의 4중 모트 ①(위험건물 데이터 플라이휠)을 베스트라 안에서 실현하는 경로. (개인정보·목적외 이용 범위는 약관·개인정보처리방침으로 확정 — 로펌/개인정보 검토 대상)

### 15.3 통합에 따른 리스크 관리 (격리 대신 관리)

통합이므로 변호사법 이슈가 베스트라 본체로 전이될 수 있다(§12). 완화:
- **표기 분리**: 집키퍼 화면·약관에 "**제휴 변호사가 제공하는 법률서비스**이며 베스트라는 플랫폼(도구·연결) 제공자"임을 명시. 베스트라가 법률사무 주체가 아님을 분명히.
- **kill switch**: 집키퍼 기능을 feature flag로 즉시 비활성화 가능하게 설계 → 규제 이슈 시 본체 보호.
- **컴플라이언스 상시**: 로펌 자문 주기적, 대한변협 동향 모니터링.

---

## 16. 변호사 랭킹·후기 시스템 (대장 확정)

### 16.1 평가 5개 항목 (각 1~5점)
① 전문성(실력) ② 응답 속도 ③ 소통·친절 ④ 결과 만족도 ⑤ 비용 대비 만족.

### 16.2 작성 자격·시점
- **사건(내용증명)이 완료된 후에만** 해당 이용자가 후기 작성 → `LawyerRating.caseId` 유니크로 **실이용자·1사건 1후기** 강제(허위·중복 후기 차단).

### 16.3 랭킹 정렬
- 변호사 목록(`keepzip/page.tsx`)은 **`avgRating`(5항목 평균) 높은 순** 상위 노출.
- 표본 적은 변호사 왜곡 방지: **베이지안 평균**(전체 평균으로 가중) 권장. 후기 수(`ratingCount`)도 함께 표시.
- 목록 카드: 변호사 프로필 + 평균점수·후기수 + 후기 미리보기.

---

## 17. 실시간 상담 채팅 (presence)

- 변호사 상세 페이지(`keepzip/lawyers/[slug]`) 내 **채팅 탭**. 이용자 ↔ 변호사 1:1(`ChatThread`).
- **온라인 표시(presence)**: 원형 심볼 — 🟢 초록(접속 중) / ⚪ 회색(오프라인). 2단계.
- ⚠️ **실시간 인프라 결정 필요(미결정)**: 베스트라는 Vercel 서버리스라 상시 WebSocket이 어렵다. 옵션:
  - (a) **외부 실시간 서비스**: Pusher / Ably / Supabase Realtime — **presence 기본 제공, 권장**.
  - (b) **SSE + 폴링**: 경량, presence는 `lastSeenAt` 하트비트로 근사.
- 기존 베스트라 `chat`(`api/chat`)은 **AI 어시스턴트용일 가능성** → 사람-사람 채팅은 별도 확인·구축 필요.
- **Phase 1(Concierge)**: 채팅을 카톡/문의로 대체하고, 실시간 채팅+presence는 **Phase 2**로 미뤄도 됨.

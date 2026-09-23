# 부동산업자 등급별 추천 인센티브 제도 (Referral Incentive)

> 작성일: 2026-09-23 · 상태: **설계 확정, 구현 전** · 담당: 크로미
> 목적: 부동산업자(공인중개사·임대사업자)의 베스트라 구독 유치를 촉진하는 **등급별 추천 보상 제도** 설계

---

## 0. 한 줄 요약

부동산 회원이 **월 15만원** 구독료를 내면, 그 중 **5만원/인/월**을 추천인 보상 풀로 배정한다.
추천인은 자신이 데려온 회원이 **구독을 유지하는 한 매월** 커미션을 받되, 요율은 **그 시점 자신의 등급(베이직~엘리트, 1~5만원)** 으로 결정된다.
여기에 **① 구독료 상계 옵션 · ② 신규 회원 첫 달 혜택 · ③ 활성·유지 품질 필터** 세 가지 개선을 얹는다.

---

## 1. 법적 성격 (⚠️ 반드시 지켜야 할 전제)

- **본 제도는 방문판매법상 "다단계판매"가 아니다.** 보상은 **"내가 직접 추천한 1단계"** 에만 지급되며, 하위의 하위(2단계 이상)는 보상하지 않는다. → 다단계판매 등록 의무·후원수당 35% 상한 **적용 대상 아님**.
- **실질 재화/용역(베스트라 구독 서비스)이 존재**하므로, 방문판매법 제24조가 금지하는 "금전거래형 피라미드"에도 해당하지 않는다.
- 🔴 **구현 시 절대 금지**: 추천 트리를 2단계 이상으로 확장(추천인의 추천인에게도 보상)하는 순간 다단계판매로 전환되어 등록 의무·형사 리스크가 발생한다. **1단계 직접 추천 원칙을 코드·정책 레벨에서 강제**한다.
- **세무**: 현금 커미션은 소득 발생 → 원천징수·지급명세서 의무. 구독료 상계 방식은 부담이 작으나 과세 성격 판단 필요. → **세무사 자문 필수(미결 항목)**.

---

## 2. 확정 정책 (파라미터)

| 항목 | 값 | 비고 |
|---|---|---|
| 대상(추천인=피추천 회원) | 부동산 회원 (`REALESTATE` 공인중개사, `RENTAL_BIZ`/`BUSINESS` 임대사업자) | 추후 범용 추천 트랙 확장 여지(이번 범위 제외) |
| 구독료 | **월 15만원** (신규 요금제, 현재 미존재) | 현행 FREE/PRO(2.99만)/BUSINESS(9.9만)와 별도 |
| 인센티브 풀 | **50,000원 / 유치회원 1인 / 월** | 구독료의 1/3 |
| 커미션 지급 기간 | 유치회원이 **구독 유지되는 한 매월 반복(무제한)** | 감쇄/상한 없음(대장 결정) |
| 요율 기준 시점 | **정산월 시점의 추천인 현재 등급** | 등급 오르면 기존 유치분 요율도 상승 |
| 본사 몫 | `50,000 - 추천인 몫` (최소 0 ~ 최대 4만) | 본사는 어떤 경우에도 구독료 중 **최소 10만원(66%) 확보** |

### 2.1 등급 체계 — 기준: "**현재 활성·유지 중인 내 유치 회원 수**"

| 등급 | 유지 중 유치 회원 | 추천인 몫/인/월 | 본사 몫/인/월 | 본사 총수취/인/월 |
|---|---|---|---|---|
| 베이직 (Basic) | 0~4명 | 10,000 | 40,000 | 140,000 |
| 플러스 (Plus) | 5~9명 | 20,000 | 30,000 | 130,000 |
| 프로 (Pro) | 10~29명 | 30,000 | 20,000 | 120,000 |
| 프리미엄 (Premium) | 30~49명 | 40,000 | 10,000 | 110,000 |
| 엘리트 (Elite) | 50명+ | 50,000 | 0 | 100,000 |

- 등급 산정 지표 = **정산 스냅샷 시점에 "활성 + 구독 유지 중"인 유치 회원 수**(품질 필터 통과분만 카운트, §3.3 참조).
- 등급은 저장값이 아니라 **매월 정산 배치가 재계산**한다(조회 성능용 캐시 필드는 별도).

---

## 3. 개선 3종 (핵심)

### ① 커미션 "구독료 상계" 옵션
- 추천인은 커미션 수령 방식을 **(a) 현금 지급 / (b) 본인 구독료 상계** 중 선택.
- **(b) 상계**: 해당 월 커미션을 추천인의 다음 구독료(15만원)에서 차감. 초과분은 **크레딧 잔액으로 이월**(현금화는 별도 신청 → 세무 처리).
- **후크**: 플러스(2만) × 8명 = 월 16만 > 구독료 15만 → **대여섯 명만 유지시키면 본인 구독이 사실상 공짜**.
- **효과**: 본사 현금 유출·세무 부담 감소, 추천인 이탈 억제.

### ② 양방향 혜택 — 신규 회원 첫 달 혜택
- 추천 코드로 가입한 신규 부동산 회원에게 **첫 달 50% 할인(또는 첫 달 무료)** 제공. (기본값: 첫 달 50% 할인, 정책 플래그로 조정)
- **첫 달(혜택월)에는 인센티브 풀·커미션·등급 카운트가 발생하지 않는다.** 정식 정가 결제가 시작되는 달(`firstBilledAt`)부터 커미션·등급 산정 시작. → 계산 단순화 + 어뷰징 방지.

### ③ 활성·유지 품질 필터
- 특정 월에 커미션이 인정되고 등급 카운트에 포함되려면, 유치회원이 그 달에 **(a) 구독 정가 결제 완료 AND (b) 활성 사용**(월 1회 이상 로그인 + 핵심 기능 1회 이상 사용: 분석/매물등록/모니터링 등) 조건을 모두 충족해야 한다.
- 결제만 되고 미사용(유령/명의만 가입)인 회원은 **그 달 커미션 미지급 + 등급 카운트 제외**.
- **효과**: 유령가입·조기이탈 어뷰징 차단, 진짜 가치 있는 회원만 보상.

---

## 4. 커미션 계산 로직

### 4.1 월별 정산 규칙 (매월 1회 배치)
```
정산 대상 = 상태 active 인 모든 ReferralRelation
FOR 각 추천인:
  activeCount = (그 추천인의 유치회원 중, 이번 정산월에 품질필터(§3.3) 통과한 수)
  tier       = 등급표(activeCount)         # 스냅샷 등급
  rate       = 등급별 요율(tier)            # 10,000 ~ 50,000
  FOR 각 유치회원 r (품질필터 통과분):
     poolAmount     = 50,000
     referrerAmount = rate
     companyAmount  = 50,000 - rate
     Ledger 1행 생성 (periodYm, tier, rate, 금액, 지급방식, status=pending)
```
- **요율 스냅샷**: `tier`는 정산 시점 activeCount로 확정하며, 그 달 전체 유치분에 동일 적용.
- **첫 달 혜택월**은 대상에서 제외(§3.2).

### 4.2 상태 전이 & 환불 처리
- Ledger `status`: `pending → released → paid`(현금) / `pending → released → offset`(상계) / 예외 `refunded | void`.
- **환불 기간 가드**: 유치회원의 해당 월 결제가 환불 가능 기간(예: 7일) 내이면 `pending` 유지, 경과 후 `released`. 환불 발생 시 `void`(미지급) 또는 이미 지급 시 `refunded`(차기 상계 회수, clawback).
- 유치회원 구독 해지 → `ReferralRelation.status = churned` → 다음 달부터 커미션·등급 카운트 제외.

### 4.3 예시
- 프로(유지 12명)인 추천인: 12명 전원 품질필터 통과 시 → 12 × 3만 = **월 36만원**, 본사는 12 × 12만 = 144만원.
- 그 중 8명이 이탈 → activeCount 4 → 베이직으로 강등 → 남은 4명 × 1만 = 월 4만원.

---

## 5. 정산 / 지급

- **현금 지급**: 기존 **토스 지급대행(payout)** 인프라 재활용(`LawyerPartner.payoutSellerId`·`KeepzipCase.payoutId` 패턴). 추천인 정산 셀러 등록 → 월별 일괄 지급.
- **구독료 상계**: 다음 결제 주기에서 커미션만큼 청구액 차감, 초과분은 `referralCreditBalance` 이월.
- **원천징수·지급명세서**: 현금 지급분에 대해 처리(세무사 자문 후 확정).
- **정산 스케줄**: 매월 특정일(예: 매월 5일) 전월분 정산 배치 → 환불기간 경과분 released → 지급/상계.

---

## 6. 데이터 모델 (Prisma)

> ⚠️ 운영 DB는 Prisma Migrate 미관리 → `prisma db execute`로 수동 DDL 적용(IF NOT EXISTS, 대장 승인 후). 로컬은 `db push`.

```prisma
// 프로그램 정책 (단일 활성 레코드, 버전 관리 가능)
model ReferralProgram {
  id                    String   @id @default(cuid())
  name                  String
  targetRoles           String   // CSV: "REALESTATE,RENTAL_BIZ,BUSINESS"
  monthlyPoolPerReferee Int      @default(50000)
  tierRates             Json     // {"BASIC":10000,"PLUS":20000,"PRO":30000,"PREMIUM":40000,"ELITE":50000}
  tierThresholds        Json     // {"PLUS":5,"PRO":10,"PREMIUM":30,"ELITE":50}
  newMemberDiscountPct  Int      @default(50) // ② 첫 달 할인율(%)
  activeUsageRequired   Boolean  @default(true) // ③ 품질 필터 on/off
  refundGuardDays       Int      @default(7)
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

// 추천 코드 (추천인당 발급)
model ReferralCode {
  id         String   @id @default(cuid())
  userId     String   // 추천인 User.id
  code       String   @unique
  status     String   @default("active") // active | disabled
  usageCount Int      @default(0)
  user       User     @relation("ReferralCodesIssued", fields: [userId], references: [id], onDelete: Cascade)
  relations  ReferralRelation[]
  createdAt  DateTime @default(now())
  @@index([userId, status])
  @@index([code])
}

// 추천 관계 1건 = 유치 회원 1명 (1단계 직접 추천만)
model ReferralRelation {
  id            String    @id @default(cuid())
  referrerId    String    // 추천인
  refereeId     String    @unique // 유치 회원 (1인은 1명에게만 추천됨)
  codeId        String
  status        String    @default("pending") // pending(첫달혜택중) | active(정가결제중) | churned(해지)
  firstBilledAt DateTime? // 정식 정가 결제 시작월 → 커미션 카운트 시작
  churnedAt     DateTime?
  referrer      User      @relation("ReferralsMade", fields: [referrerId], references: [id], onDelete: Cascade)
  referee       User      @relation("ReferralReceived", fields: [refereeId], references: [id], onDelete: Cascade)
  code          ReferralCode @relation(fields: [codeId], references: [id], onDelete: Cascade)
  ledgers       ReferralLedger[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([referrerId, status])
}

// 월별 정산 원장 (추천관계 × 정산월)
model ReferralLedger {
  id             String   @id @default(cuid())
  relationId     String
  referrerId     String
  refereeId      String
  periodYm       String   // "2026-10"
  refereeActive  Boolean  // 품질 필터 판정 결과
  tierAtPeriod   String   // 스냅샷 등급
  poolAmount     Int      @default(50000)
  referrerAmount Int      // 추천인 몫
  companyAmount  Int      // 본사 몫
  payoutMethod   String   @default("cash") // cash | credit
  status         String   @default("pending") // pending | released | paid | offset | refunded | void
  releasedAt     DateTime?
  paidAt         DateTime?
  relation       ReferralRelation @relation(fields: [relationId], references: [id], onDelete: Cascade)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@unique([relationId, periodYm])
  @@index([referrerId, periodYm])
  @@index([status])
}
```
**User 모델 추가 필드/관계**
```prisma
// 관계
referralCodesIssued ReferralCode[]     @relation("ReferralCodesIssued")
referralsMade       ReferralRelation[] @relation("ReferralsMade")
referralReceived    ReferralRelation?  @relation("ReferralReceived")
// 캐시/잔액 (배치 갱신)
referralTier         String? // 현재 등급 캐시
referralActiveCount  Int     @default(0) // 현재 활성 유치 수 캐시
referralCreditBalance Int    @default(0) // ① 상계 크레딧 잔액(원)
```

---

## 7. API 설계

> 폴더: `app/api/referral/**` · 인증 필수(부동산 role) · 모든 변이 핸들러 **CSRF(validateOrigin) + rate limit** · 서버 검증 필수.

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/referral/code` | 내 추천 코드 발급(없으면 생성) |
| GET | `/api/referral/code` | 내 코드·현황 조회 |
| GET | `/api/referral/code/[code]/validate` | (공개) 코드 유효성 — 가입 화면용 |
| GET | `/api/referral/dashboard` | 내 등급·활성 유치 수·이번달 예상 커미션·크레딧 잔액 |
| GET | `/api/referral/ledger` | 정산 내역(월별, 페이지네이션 take 상한) |
| POST | `/api/referral/payout` | 현금 정산 신청 / 지급방식(cash·credit) 설정 |
| POST | `/api/cron/referral-settle` | (Cron) 월별 정산 배치 — CRON_SECRET Bearer, `$transaction` 원자화, `maxDuration` 설정 |
| GET/POST | `/api/admin/referral/**` | (Admin, `withAdminAuth`) 프로그램 설정·정산 관리·어뷰징 모니터링 |

- **가입 연동**: 회원가입/구독 시작 플로우에 `referralCode` 입력 → `ReferralRelation(status=pending)` 생성. 첫 정가 결제 시 `status=active`, `firstBilledAt` 기록.
- **1단계 강제**: `ReferralRelation` 생성 시 추천인 자신이 누군가에게 추천받은 관계가 있어도 **상위로 전파하지 않음**(스키마상 세대 개념 자체가 없음).

---

## 8. UI / 화면

- 부동산 회원 마이페이지에 **"추천 인센티브" 탭** 신설(`profile` 탭 패턴 재사용):
  - 대시보드: 현재 등급·등급 진행바(다음 등급까지 N명)·활성 유치 수·이번 달 예상/확정 커미션·크레딧 잔액.
  - 내 추천 코드/링크 복사·공유.
  - 정산 내역(월별) + 지급방식(현금/상계) 선택 토글.
- 신규 가입 화면: 추천 코드 입력 필드 + 첫 달 혜택 안내 배지.
- 어드민: 프로그램 요율/임계값 설정, 월별 정산 대시보드, 어뷰징 의심 목록.

---

## 9. 선행 과제 (🔴 이 제도의 대전제)

1. **월 15만원 부동산 요금제 신설** — 현재 요금제(FREE/PRO/BUSINESS)에 없음. `Subscription.plan` 값 추가(예: `REALTOR`) + 가격/권한 정의.
2. **결제(PG) 완성** — 현재 토스 결제 미완성("유료 플랜 자가 활성화 금지" 상태). **실제 결제가 돌아야 "결제 완료 → 커미션" 이 성립.** 리퍼럴 완성의 필수 선행.
3. **활성 사용 로깅 기반** — 품질 필터(③)를 위해 로그인·핵심기능 사용 이벤트를 월 단위로 집계할 수 있어야 함(기존 사용 로그 활용 가능 여부 확인 필요).

---

## 10. 보안 · 검증 (플랫폼 개발 5대 원칙 반영)

- **서버 검증**: 추천 코드 유효성·중복 추천·자기 추천 차단은 **서버에서** 판정. 금액 계산은 전적으로 서버.
- **어뷰징 방지**: 자기 추천 금지, 동일 결제수단/기기/IP 다중 가입 탐지, 품질 필터(③)로 유령가입 무력화, 환불 clawback.
- **단일 책임·파일 분리**: 정산 계산 로직은 `lib/referral/*`(순수 함수), API 라우트는 얇게, UI/훅/서버액션 분리. 페이지 500줄·파일 400줄 초과 시 분리.
- **성능**: 정산 배치는 N+1 차단(관계·결제·사용로그 배치 조회), 목록 API take 상한/페이지네이션.
- **IDOR**: 정산 내역·코드 조회는 본인 것만(`referrerId === session.userId`).
- **CSRF/CI 게이트**: 모든 변이 핸들러 `validateOrigin`, `scripts/audit-api-auth.mjs` 인증 게이트 통과.

---

## 11. 개발 단계 (Phase)

| Phase | 내용 | 산출물 |
|---|---|---|
| **0 (선행)** | 15만원 요금제 신설 + 토스 결제 완성 + 활성사용 집계 기반 | 실결제 동작 |
| **1** | 데이터 모델(4테이블+User필드) + 추천코드 발급/가입 연동 | 추천 관계 생성 |
| **2** | 월별 정산 배치(등급 스냅샷·커미션 계산·원장) `$transaction` | Ledger 생성 |
| **3** | 지급: 현금(토스 payout 재활용) + 구독료 상계/크레딧 | 실지급 |
| **4** | ② 첫 달 혜택 + ③ 품질 필터 결합 | 어뷰징 방지 |
| **5** | 대시보드 UI + 어드민 | 회원/관리자 화면 |
| **6** | 운영 검증(실결제·실정산·실지급 실화면) + 적대적 코드리뷰 | 완료 |

---

## 12. 미결 / 리스크

- 🔴 **세무사 자문**: 현금 커미션 원천징수·지급명세서, 구독료 상계의 과세 성격. **개시 전 필수**.
- 🔴 **결제(PG) 완성 의존성**: Phase 0 없이는 제도 자체가 성립 불가.
- **상계 초과분 처리**: 이월(크레딧) vs 현금화 — 크레딧 현금화 시 세무 재검토.
- **무제한 반복의 장기 LTV**: 본사 최소 66% 마진은 확보되나, 추천 회원 비중이 커지면 평균 마진 하락. 추후 감쇄/상한 도입 여지(현재는 미적용).
- **활성 사용 정의**: "핵심 기능 사용"의 구체 기준(어떤 이벤트, 최소 횟수) 확정 필요.
- **등급 강등 통지**: 유치회원 이탈로 등급이 내려갈 때 추천인 통지·유예 정책.

---

## 13. 확정 요약 (의사결정 로그)

- 최고 등급(엘리트) 기준: **50명** (100명은 명예 표시로만 활용 가능)
- 등급 유지: **기간실적형 = 현재 활성·유지 중인 유치 회원 수 기준**
- 구독료: **월 15만원**
- 커미션: **유지되는 한 매월 반복(무제한), 요율은 정산월 현재 등급**
- 개선 반영: **① 구독료 상계 · ② 신규 첫 달 혜택 · ③ 활성·유지 품질 필터** (④ 추천 주체 확대·감쇄형은 이번 범위 제외)

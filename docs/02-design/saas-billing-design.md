# VESTRA SaaS 결제·구독 설계서

> 작성: 2026-08-17 (리뉴얼 ④단계 구현 대비 설계 확정본)
> 상태: **설계 확정 / 구현 대기(로드맵 ④단계)**
> 관련: 회원등급 체계는 `RENTAL_BIZ`(임대사업자) 등급 추가 완료(v5.72.0)

리뉴얼 ①단계(UI) 진행 중 시점에 결제 설계를 확정해 둔다. 실제 구현은 ④단계(마스터관리자·기업회원 연동)에서 이 문서대로 진행하면 되며, 등급 체계는 이미 최종 형태로 반영돼 있어 **재작업 없이 결제 레이어만 얹으면 된다.**

---

## 1. 현황 (2026-08-17 조사)

### 있는 것
- **모델**: `Subscription`(plan: FREE|PRO|BUSINESS, status, startDate/endDate, canceledAt), `Payment`(amount, method, status, orderId, receiptUrl) — `prisma/schema.prisma`
- **일일 한도 제어 동작**: plan → role → `dailyLimit`. 10여 개 분석 API에서 `session.user.dailyLimit` 검증 (예: `/api/analyze-unified`, `/api/loan/simulate`, `/api/guarantee/check`)
- **구독 조회/해지**: `GET /api/subscription`, `POST /api/subscription/cancel`
- **토스페이먼츠 연동 자산**: `@tosspayments/tosspayments-sdk`, 키 관리(`lib/system-settings.ts`의 `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`, 관리자 DB 동적 저장), **등기부 1회성 결제**에 실사용(`/api/registry/payment/confirm`, `RegistryIssueSection.tsx`)

### 없는 것 (구현 필요)
- **유료 구독 결제 자체** — `pricing` 페이지 "구독하기" 버튼에 핸들러 없음, `POST /api/subscription`은 PG 호출 없이 DB만 갱신 → **사용자가 유료 플랜을 살 수 없음**
- 구독 결제 성공 → 활성화 → **자동 갱신(빌링)** 로직
- 결제수단(카드) 관리 API

**결론**: 뼈대(모델·한도제어)는 있으나 **결제 플로우 미구현**. 토스 연동 경험은 있으니 재활용 가능.

---

## 2. 회원등급 ↔ 요금제 매핑 (확정)

| 등급(role) | 대상 | 사업자 승인 | 요금제 |
|-----------|------|:----------:|--------|
| GUEST | 비로그인 | - | (일 2회) |
| PERSONAL / TENANT | 개인 임차·매수인 | ✕ | FREE / PRO |
| PERSONAL / LANDLORD | 개인 임대·매도인 | ✕ | FREE / PRO |
| **RENTAL_BIZ** | 임대사업자 | ✅ | BUSINESS 요금제 |
| REALESTATE | 부동산 중개사 | ✅ | BUSINESS 요금제 |
| BUSINESS | 기업 | ✅ | BUSINESS 요금제 |
| ADMIN | 관리자 | - | 무제한 |

- 개인(PERSONAL): FREE(무료) / PRO(유료 구독)
- 사업자 3종(RENTAL_BIZ·REALESTATE·BUSINESS): BUSINESS 요금제 (등급별 한도는 `ROLE_LIMITS` 유지 — RENTAL_BIZ 50 / BUSINESS 50 / REALESTATE 100)
- 현재 `/api/subscription`의 plan(FREE/PRO/BUSINESS)과 role 매핑 로직은 이 표 기준으로 재정비 필요

---

## 3. 구독 결제 플로우 설계 (토스페이먼츠 재활용)

### 1차: 단건 결제 기반 구독 (MVP)
```
① pricing "구독하기" 버튼 → 결제 위젯(toss) 오픈
② 결제 승인 → POST /api/subscription (결제 confirm 포함)
   - 등기부 결제(/api/registry/payment/confirm) 승인 코드 재활용
③ 승인 성공 → Subscription active + endDate = now + 1개월(또는 연간)
   → role/dailyLimit 동기화, Payment 이력 저장
④ 만료 시 재결제 유도(수동)
```

### 2차: 자동 갱신 (빌링키)
```
- 토스 빌링키(카드 자동결제) 발급 → 정기결제
- 매월 CRON 또는 토스 webhook으로 자동 청구·갱신
- 결제수단 관리 API(등록/변경/삭제)
```

---

## 4. 구현 체크리스트 (④단계)

- [ ] `pricing` 페이지 "구독하기" 버튼 → 결제 플로우 연결 (핸들러 추가)
- [ ] `POST /api/subscription`에 토스 결제 승인 로직 추가 (등기부 결제 코드 재활용)
- [ ] 결제 성공 → Subscription active/endDate + role·dailyLimit 동기화 + Payment 저장
- [ ] plan ↔ role 매핑을 §2 표 기준으로 정비
- [ ] 구독 상태 만료 처리 (endDate 경과 시 FREE로 강등)
- [ ] (2차) 토스 빌링키 자동 갱신 + webhook + 결제수단 관리 API
- [ ] 마이페이지 등급·구독 탭에 "업그레이드/결제" 액션 연결 (`ProfileTierPanel`)

---

## 5. 주의사항 (절대규칙)

- 결제·구독은 **운영 DB 쓰기**가 발생하므로, 리뉴얼 절대규칙에 따라 **실제 결제 연동·테이블 변경 전 대장 확인 필수**
- Payment 모델에 PG 승인번호(paymentKey 등) 필드 추가가 필요할 수 있음 → 스키마 변경은 baseline/preview 검증 후 진행
- 토스 키는 코드·로그에 노출 금지 (현행 `system-settings` 암호화 저장 유지)

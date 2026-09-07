# 구(舊) UI → renewal 전환 계획서

> 작성 2026-09-07 | 현행 코드 기준 정밀 재조사(3갈래 병렬) 종합 | 이전 `legacy-ui-links-audit.md`(2026-09-01) 갱신본
> 상태: **조사·계획 단계 (실행 전, 대장 승인 대기)**

---

## 0. 한 줄 요약

리뉴얼은 **"구 페이지 삭제"가 아니라 "renewal 라우트를 새로 추가 + 링크를 renewal로 전환"** 방식으로 진행됐다.
그래서 구 UI(`app/(app)/*`)가 **물리적으로 그대로 병존**하며, ①인증 흐름이 아직 구 `/login`·`/dashboard`로 보내고, ②구 개인기능 페이지를 **중개사가 공유**하고 있어 함부로 지울 수 없다.

---

## 1. 왜 `/login` 등 구 UI가 안 죽는가 (인증 흐름)

### 로그인 후 역할별 목적지
소셜 로그인 → `callbackUrl=/dashboard` → **`/dashboard` 허브**(`app/(app)/dashboard/page.tsx`)가 역할 분배:

| 역할 | 목적지 | UI |
|------|--------|-----|
| ADMIN | `/admin` | 구 UI (유지 필수) |
| LAWYER | `/lawyer` | 구 UI (유지 필수) |
| REALESTATE | `/realtor` | 구/biz UI |
| PERSONAL | `/home` | **renewal** |
| RENTAL_BIZ / BUSINESS | `/dashboard` 유지 | 구 UI |

미들웨어(`proxy.ts`)의 루트(`/`) 접근도 동일 분배.

### 구 `/login`이 살아있는 지점 (직접 원인)
| 위치 | 동작 |
|------|------|
| `proxy.ts:84,91` | 미인증으로 `/admin`·`/profile`·`/dashboard` 접근 → **`/login`** |
| `components/auth/session-guard.tsx:43,57` | 세션 만료·비활성 1시간 → `signOut({ redirectTo: "/login" })` |
| `app/(app)/signup/page.tsx:139` | "이미 계정이 있으신가요?" → `/login` |
| 랜딩 다수 (`PricingSection`·`SampleReportModal`·`MobilePricing`·`sample-report` 등) | CTA → `/login` |

> 미가입·탈퇴 소셜 로그인은 **이미 renewal로 전환됨**: `lib/auth.ts`가 `/home?auth=not_registered|withdrawn`로 보내고 `RenewalGnb`가 감지해 renewal 모달을 연다. (정상 작동 확인)
> 즉 **온보딩(신규/탈퇴)은 renewal, 세션만료·미들웨어 차단은 아직 구 `/login`**로 이원화돼 있음.

---

## 2. 페이지 인벤토리 & renewal 대응 매핑

구 `app/(app)/` 라우트 **약 52개**, renewal `app/(personal-home)/renewal/` **약 23개**.

### A. renewal 대응 완료 (11개) — 개인은 전환 가능
`assistant · contract · decision-report · jeonse · listing-new · loan-check · monitoring · official-price · rights · tax · price-map`
→ 각 `/renewal/*` 존재.

### B. 구 UI 유지 필수 (renewal 대응 없음)
`admin(관리자) · lawyer(변호사) · agent(중개관리) · dashboard(사업자 허브) · feasibility(사업성) · prediction(시세전망) · registry · report · applications · chat · ai-trust · verification · pricing · (map)/neighborhood · (biz)/realtor · (landing)/*`

### C. 구조 변경 주의 (단순 매핑 불가)
- **매물**: 구 `/listings/[id]` → renewal은 `/renewal/listing-detail(+mobile)` + `/renewal/listing-db-detail(+mobile)` 로 **다중 분리**. 1:1 아님.
- **keepzip**: 구 `new`/`received` 분리 → renewal 통합.
- **monitoring**: 구 `/[id]` 개별 → renewal 일반화.

---

## 3. 구 경로 참조 현황 (총 ~201개)

구 경로로 향하는 `href`/`router.push`/`redirect`/`callbackUrl`/`signOut` 참조 **약 201개**.

| 구 경로 | 참조 수 | 성격 |
|---------|--------|------|
| `/rights` | 33 | 개인+중개사 공유 |
| `/jeonse/*` | 26 | 개인 |
| `/dashboard` | 24 | 인증 허브·사업자 |
| `/login` | 14 | 인증 |
| `/profile` | 14 | 개인(renewal에도 존재) |
| `/contract` `/tax` `/assistant` | 각 11 | 개인+중개사 공유 |
| `/prediction` | 10 | 구 UI 필수 |
| `/listings/*` | 10 | 중개사 |
| 기타 | 나머지 | — |

### 하드코딩 상수 (전환 시 핵심 타깃)
- `app/(biz)/_shared/realtor-config.ts` — 중개사 전용 15개 경로(`/rights`·`/contract`·`/listings/*` 등). **중개사가 구 개인기능 페이지를 공유**하는 근거.
- `app/(personal-home)/renewal/_shared/renewal-config.ts` — `/login`·`/signup`·`/profile` 공통 경로.
- `components/layout/sidebar-menu-data.ts` — 구 사이드바 메뉴 15개.
- `components/layout/footer.tsx` — 푸터가 구 경로.

---

## 4. 리스크 (왜 신중해야 하는가)

1. **🔴 중개사-개인 페이지 공유**: 구 `/rights`·`/contract`·`/tax`·`/assistant`를 **REALESTATE 중개사도 사용**(`realtor-config.ts`). 이 구 페이지를 무조건 renewal로 redirect하면 **중개사 도구가 깨진다**. → **역할 분기 없이는 못 지움.**
2. **🔴 사업자 renewal 미커버**: RENTAL_BIZ·BUSINESS·REALESTATE의 전용 기능(사업성분석·중개관리 등)이 renewal에 없음. 사업자는 `/dashboard` 허브·구 UI에 계속 의존.
3. **🟡 매물 구조 변경**: `/listings/[id]` → renewal 다중 라우트라 1:1 redirect 불가. 매핑 로직 필요.
4. **🟢 랜딩/온보딩**: 대부분 개인 대상이라 renewal 전환이 비교적 안전.

---

## 5. 단계별 전환 계획 (안전 순서)

> 원칙: **역할 분기 우선**, 개인(PERSONAL)부터, 삭제는 맨 마지막. 각 단계 후 `t-vestra` 검증.

### Phase 1 — 세션/미인증 흐름을 renewal로 (개인 한정, 저위험)
- `session-guard.tsx`의 `signOut redirectTo: /login` → 개인 컨텍스트는 `/home?auth=login`.
- `proxy.ts`의 미인증 차단 목적지 `/login` → `/home?auth=login` (단, `/admin` 등 관리자 경로는 기존 유지).
- 랜딩 CTA(`/login`) → renewal 로그인 모달 트리거(`/home?auth=login`).
- **효과**: 구 `/login` 직접 진입 경로가 사실상 사라짐. 페이지 파일은 아직 유지(안전).

### Phase 2 — 개인 중복 페이지 역할 분기 redirect (중위험)
- 대응 완료 11개 구 라우트(`/rights` 등)에 **레이아웃 레벨 가드** 추가:
  - `PERSONAL` 접근 → `/renewal/*`로 redirect.
  - `REALESTATE`(중개사)·기타 → **구 페이지 그대로** (공유 유지).
- 구현 위치: 각 구 라우트의 `layout.tsx` 또는 `proxy.ts` 역할 분기. (중개사 공유 페이지 목록을 화이트리스트로 관리)
- **효과**: 개인은 renewal만 보게 되고, 중개사·사업자는 무영향.

### Phase 3 — 공통 컴포넌트/랜딩 링크 정리 (저위험)
- `footer.tsx`, 랜딩 `FeaturesSection`·`SituationSection` 등 **개인 대상 링크**를 renewal 경로로 교체.
- 중개사 전용 `realtor-config.ts`·`sidebar-menu-data.ts`는 **건드리지 않음**(구 UI 유지 대상).

### Phase 4 — (장기) 사업자 renewal 대응물 구축
- 사업성분석·중개관리·사업자 대시보드의 renewal 버전 설계·구현.
- 완료 후에야 사업자 `/dashboard` 의존 해제 가능.

### Phase 5 — 미사용 확정 구 페이지 물리 삭제
- Phase 1~4 후 **접근 경로가 완전히 사라진** 구 개인 페이지만 삭제.
- 삭제 전 접근 로그/참조 0 확인. admin·lawyer·feasibility·prediction·registry 등은 **삭제 대상 아님**.

---

## 6. 지금 결정이 필요한 것

1. **Phase 1만 우선 실행**할지(구 `/login` 진입 차단 — 체감 큰 개선, 저위험), 아니면 계획 전체 승인 후 순차 진행할지.
2. **중개사 공유 페이지 화이트리스트**(구 유지할 개인기능 페이지 목록) 확정 — Phase 2 전제.
3. 사업자 renewal 전환(Phase 4)은 별도 대형 과제로 분리할지.

---

## 부록 — 근거 파일

- 인증: `proxy.ts:60-93`, `lib/auth.ts:85-137`, `app/(app)/dashboard/page.tsx:21-39`, `components/auth/session-guard.tsx:42-59`, `RenewalGnb.tsx:31-49`
- 매핑: `app/(app)/*`, `app/(personal-home)/renewal/*`
- 참조 상수: `app/(biz)/_shared/realtor-config.ts`, `renewal-config.ts`, `components/layout/sidebar-menu-data.ts`, `footer.tsx`

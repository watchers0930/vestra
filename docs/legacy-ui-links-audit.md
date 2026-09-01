# 예전 UI(구 버전) 이동 연결부 전수 조사

> 작성 2026-09-01 | renewal(신규 UI) 전환 사전 조사 | 총 **70개** 연결부 발견

## 요약 (카테고리별)

| 카테고리 | 개수 | 핵심 위험도 |
|----------|------|------------|
| 인증 흐름 (미들웨어·콜백·signOut) | 13 | 🔴 최고 |
| 로그인/회원가입 페이지 내부 링크 | 25 | 🟢 (구 페이지 제거 시 함께 사라짐) |
| 공통 컴포넌트 (footer·sidebar·menu) | 12 | 🟡 중 |
| 분석 기능 페이지 (rights·contract 등) | 15 | 🟢 |
| 기타 (초대·프로필) | 5 | 🟢 |

## 🔴 인증 흐름 — 최우선 (가장 중요)

| # | 파일:라인 | 형태 | 목적지 | 맥락 |
|---|-----------|------|--------|------|
| 1 | `lib/auth.ts:118` | signIn 콜백 return | `/login?error=not_registered` | **미가입 소셜 계정** → 예전 로그인 페이지 |
| 2 | `lib/auth.ts:90` | signIn 콜백 return | `/login?error=withdrawn` | 탈퇴 30일 이내 재가입 차단 |
| 3 | `proxy.ts:64` | redirect | `/admin` | 관리자 로그인 상태 |
| 4 | `proxy.ts:66` | redirect | `/dashboard` | 일반 로그인 상태 |
| 5 | `proxy.ts:73` | redirect | `/login` | 비로그인 /admin 접근 |
| 6 | `proxy.ts:80` | redirect | `/login` | 비로그인 /profile·/dashboard 접근 |
| 7 | `components/auth/session-guard.tsx:43` | signOut redirectTo | `/login` | 세션 만료 강제 로그아웃 |
| 8 | `components/auth/session-guard.tsx:57` | signOut redirectTo | `/login` | 1시간 비활성 |
| 9 | `app/(app)/login/page.tsx:42` | signIn callbackUrl | `/dashboard?next=` | 소셜 로그인 복귀 |
| 10 | `app/(app)/lawyer/layout.tsx:11` | redirect | `/login?next=/lawyer` | 비로그인 /lawyer |
| 11 | `app/(landing)/components/LoginModal.tsx:37` | signIn callbackUrl | `/dashboard` | 랜딩 로그인 모달 |
| 12 | `app/(personal-home)/renewal/_shared/RenewalLoginModal.tsx:34` | signIn callbackUrl | `/dashboard?next=` | renewal 로그인 모달 |
| 13 | `app/(personal-home)/renewal/_shared/RenewalSignupModal.tsx:27` | signIn redirectTo | `/signup/complete?intendedRole=` | renewal 가입 모달 (정상, 유지) |

## 예전 경로 → renewal 대응 매핑

| 예전 경로 | renewal 대응 | 존재 |
|-----------|-------------|------|
| `/login` | RenewalLoginModal (모달) | ✅ |
| `/signup` | RenewalSignupModal (모달) | ✅ |
| `/signup/complete` | `(personal-home)/signup/complete` | ✅ |
| `/dashboard` | `/home` (renewal 홈, 역할 분배) | ✅ |
| `/profile` | `(personal-home)/profile` | ✅ |
| `/rights` | `/renewal/rights` | ✅ |
| `/contract` | `/renewal/contract` | ✅ |
| `/jeonse`, `/jeonse/analysis` | `/renewal/jeonse` | ✅ |
| `/monitoring` | `/renewal/monitoring` | ✅ |
| `/tax` | `/renewal/tax` | ✅ |
| `/official-price` | `/renewal/official-price` | ✅ |
| `/price-map` | `/renewal/price-map` | ✅ |
| `/assistant` | `/renewal/assistant` | ✅ |
| `/expert-connect` | `/renewal/expert` | ✅ |
| `/listings` | `/renewal/listings-list` | ✅ |
| **`/admin`** | (없음) | ❌ 구 UI 유지 |
| **`/lawyer`** | (없음) | ❌ 구 UI 유지 |
| **`/prediction`** | `/renewal/price-map`로 대체 | ⚠️ |
| **`/feasibility`** | (없음) | ❌ 구 UI 유지 |
| **`/jeonse/neighborhood`** | (없음) | ❌ |

## 공통 컴포넌트 (🟡 renewal 전환 시 일괄 변경 대상)

- `components/layout/footer.tsx:23-29` → `/rights`,`/contract`,`/tax`,`/jeonse`,`/assistant` 등 (구 경로)
- `components/layout/sidebar.tsx:360` → `/dashboard`
- `components/auth/user-menu.tsx:70,109` → `/profile`, signOut `/`
- `components/common/DashboardPageChrome.tsx:54` → `/profile`

## 랜딩 페이지 (`app/(landing)/`) — 예전 `/login`·`/rights` 다수

- `layout.tsx:41-42`, `sample-report/page.tsx:60,84`, `PricingSection.tsx:60`,
  `mobile/MobilePricing.tsx:28`, `CtaSection.tsx:24`, `HeroSearchInput.tsx:29,40`,
  `mobile/MobileCta.tsx:25`, `SampleReportModal.tsx:22` → 대부분 `/login` 또는 `/rights`

## 주의: renewal 대응물 없어 구 UI 유지 필요

- `/admin`(관리자), `/lawyer`(변호사): renewal 미지원 → **구 UI 유지**
- `/feasibility`(사업성), `/jeonse/neighborhood`(동네): renewal 미포함
- `/login?error=withdrawn|not_registered`: 특수 에러 → 모달 전환 시 별도 처리 필요

---

*상세 70개 항목은 조사 세션 기록 참조. 이 문서는 renewal 전환 작업의 기준 목록.*

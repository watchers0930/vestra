# pro 백엔드 구현·검증 인계

기준: `docs/02-design/features/pro.design.md` (2026-10-19).

## 구현

- `pricing.ts`: BUSINESS/REALESTATE 유료 선택지를 PREMIUM으로 제한, `ROLE_FREE_ALLOWED` 추가.
- `onboarding.ts`: 순수 판정, 서버 DB 조립, `requireOnboardingComplete` 제공.
- `GET /api/signup/onboarding-status`: 세션 인증, read 120 제한, no-store, 기존 회원 오류 봉투.
- `types/member-subscription.ts`: 온보딩 응답 타입만 가산. 기존 결제 DTO 불변.
- 같은 DB 스냅샷에서 entitlement 1회와 requestedRole 최소 조회 1회. 쓰기 없음.
- 주문·콜백·복구·체험·setup-role·비회원 구현과 DB 스키마 변경 없음.

## 누락·위험·우선순위

### P0 — 미결제 주문으로 신규 가드 면제 가능 (설계 계약 충돌)

§4.4를 그대로 구현하여 membershipPolicy가 있으면 isNewSignup=false이다.
하지만 기존 `orders.ts`의 createMemberOrder는 결제 전 ensurePolicy를 호출한다.
따라서 신규 BUSINESS/REALESTATE가 주문을 생성한 뒤 결제하지 않아도
온보딩은 complete=true가 된다. trial 또한 정책 레코드를 만든다.
이것은 PREMIUM 활성 판정 자체의 문제가 아니라 신규 가드 대상 판별의 문제다.
보호 파일/스키마 불변 조건 아래 임의로 규칙을 변경하지 않았다.
신규 계정과 실제 기존/backfill 계정을 구별하는 기준을 설계에서 확정해야 한다.
이 문제가 해결되기 전에는 결제 필수 가입의 출시 완료로 볼 수 없다.

### P0 — 보호 앱 진입 지점 연결 미수행 (수정 범위 제한)

requireOnboardingComplete는 구현·테스트했으나 호출하는 보호 앱 진입 지점이 없다.
서버 레이아웃/페이지 또는 proxy.ts는 이번 수정 허용 경로 밖이다.
프론트 담당자가 보호 서버 진입점에서 인증된 사용자 ID로 호출하고,
forbidden만 가입 재개로 안내해야 한다. DB 장애를 가입 완료로 처리하면 안 된다.
가입·사업자 인증·플랜·결제·복구·구독 조회·본인 데이터/내보내기·지원은 열어둔다.
클라이언트 상태 검사만으로 연결하면 서버 접근 통제를 충족하지 않는다.

### P1 — PERSONAL 초기 역할 선택 여부를 구별할 데이터 없음

§4.2의 첫 번째와 세 번째 행은 현재 OnboardingFacts와 DB 값만으로 구별 불가능하다.
User.role 기본값이 PERSONAL이고 setup-role은 userType을 생략할 수 있다.
클라이언트 힌트로 추정하지 않고 저장된 PERSONAL + requestedRole 없음은 complete로 판정한다.
role/plan 타입은 계약대로 제공하지만 초기 PERSONAL의 role 단계는 구현할 근거가 없다.
역할 선택 완료를 구별할 서버 영속 기준을 후속 설계해야 한다.

### P1 — 기존 PRO 기준선의 보존 범위

기존 policyVersion 없는 구독 및 grandfather snapshot의 PRO 권한은 보존됨을 검증했다.
반면 BUSINESS/REALESTATE의 신정책 PRO 구독이 grandfather 기준선 없이 존재하면,
허용 플랜 축소로 기존 effectiveEntitlement의 monitoringLimit가 0이 된다.
온보딩 isNewSignup 분리는 이 유료 권한 계산을 복원하지 않는다.
출시 전 실제 계정의 기준선/backfill 상태를 점검해야 한다. 운영 DB를 변경하지 않았다.

### 검증 한계

격리 DB 및 외부 결제 환경이 없는 통합 테스트는 기존 설정대로 건너뛴다.
실제 DB 저장·결제·t-vestra 무출금 검증과 운영 배포는 수행하지 않았다.

## 실행 결과

- 기본 테스트: 44개 파일, 1,004개 테스트 통과.
- 회원 테스트: 15개 파일 통과, 191개 통과 / 격리 DB 테스트 9개 생략.
- 비회원 회귀: 18개 파일 통과, 329개 통과 / 환경 의존 테스트 28개 생략.
- 전체 lint: 오류 0, 기존 경고 33. 수정 파일 lint 경고/오류 0.
- TypeScript 별도 검사 및 production build 통과. 새 API 동적 라우트 생성 확인.
- API 인증 감사 및 기존 보안 회귀 게이트 통과.
- 변경 코드/테스트 각 500줄 이하. 보호 구현 파일 diff 0. 허용 경로 밖 수정 0.
- 종합: 구조/성능 충족. 서버 API 보안 검증은 통과했으나 위 P0 사유로
  전체 앱의 온보딩 접근 통제 완료/출시 가능 판정은 보류.

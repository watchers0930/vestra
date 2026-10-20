# Renewal 백엔드 계약 검증

기준: `docs/02-design/features/renewal.design.md` §0, §3, §4.1.
검증일: 2026-10-20.

## 적용 범위

설계서가 명시한 기존 구현 보존·회귀 검증을 적용했다. 신규 API, 서버 동작,
요청/응답 계약, DB, 환경변수, 정책 상수는 변경하지 않았다.
수정 허용 경로를 지키기 위해 설계서 자체는 편집하지 않고 차이를 여기에 기록한다.
프론트엔드, 인증/JWT, 2A 보호 경계, agent routes, monitoring-targets,
guest 코드와 기존 사용자 변경은 수정하지 않았다.

## API 대조

| 설계 | API | 대조 결과 |
|---|---|---|
| §3.1 | GET /api/signup/onboarding-status | 정확한 DTO, 인증, 삭제 사용자, 역할 거부, 120/min, no-store, 503 처리 확인 |
| §3.2 | POST /api/user/setup-role | 개인 저장·사업자 pending·422 응답 보존. 입력 검증·오류 복구·헤더 차이는 아래 참조 |
| §3.3 | POST /api/member-subscription/orders | strict 입력·UUIDv4·금액 서버 계산·플랜/승인 정책·멱등 확인. 상품 조합 제한은 아래 참조 |
| §3.4 | GET /api/member-subscription/orders/[orderId] | 소유권·형식 오류 404·120/min·실제 appliedAt 기반 applied·기간 필드 확인 |
| §3.5 | POST /api/member-subscription/orders/[orderId]/recover | 소유권·CSRF·주문별 15/min 확인. 일부 상태의 HTTP 코드 차이는 아래 참조 |
| §3.6 | POST /api/member-subscription/payment/callback | 소유권·HMAC·nonce·CSRF·주문별 15/min 확인. 허용 문자·오류코드 차이는 아래 참조 |
| §3.7 | GET /api/member-subscription/status | DTO·인증·120/min·no-store 확인. 영수증 최대 10개, 독립 조회 병렬 실행 |
| §3.8 | POST /api/member-subscription/trial | 201·strict 입력·플랜/승인·중복 체험 거부 확인 |
| §3.9 | GET/POST /api/admin/verify | ADMIN 제한·목록 select·승인 역할/한도·반려·CSRF·감사 이벤트 검증. 헤더/예외는 아래 참조 |
| §3.10 | GET /api/health | 공개 응답의 status/service/version/timestamp 확인. 명시적 no-store 누락 |
| §3.11 | 의도 저장소 | 변경 없음. 결제·사업자 정보를 저장하는 신규 코드 없음. 프론트 저장소 동작은 이번 검증 범위 밖 |

## 누락·위험·우선순위

### P1 — setup-role 서버 검증 및 실패 복구

- `app/api/user/setup-role/route.ts:76`: 사업자번호 검사는 문자열과 최소 길이(10)뿐이다.
  숫자/하이픈 형식을 검증하지 않아 10자 이상의 임의 문자가 통과한다.
  §3.2의 “사업자번호 형식 오류 400” 보장을 충족하지 못한다.
- 같은 파일 16행: malformed JSON, null body 및 DB 예외를 라우트가 처리하지 않는다.
  안정적인 사용자용 오류 응답이 없으며 이는 플랫폼 예외 복구 기준의 누락이다.
- 같은 파일 97행: 감사 detail에 companyName/representName을 전달한다.
  `lib/audit-log.ts` 마스킹 목록은 이 키들을 포함하지 않는다.
  플랫폼의 개인정보 로그 금지 기준과 충돌하므로 별도 수정이 필요하다.

### P1 — 복구 상태의 계약 차이

- `lib/member-subscription/recovery.ts:17-21`: 새로 발견한 payment_needs_review와
  payment_pending은 200 `{ status: "needs_review"|"pending", applied: false }`로 변환한다.
  이미 needs_review인 주문만 즉시 409를 반환한다.
  §3.5는 두 코드를 409 오류로 기재한다. 기존 `recovery.test.ts`는 현재의 200 경로를 검증한다.
  문서 정정 또는 프론트 복구 소비자와 함께하는 별도 계약 변경이 필요하다.

### P2 — 공통 Cache-Control 헤더 누락

- `app/api/user/setup-role/route.ts`, `app/api/admin/verify/route.ts`,
  `app/api/health/route.ts`는 명시적 `Cache-Control: no-store`를 설정하지 않는다.
  setup-role/admin의 공통 CSRF·인증 거부 응답에도 설정이 없다.
  member-subscription 및 onboarding-status 응답은 no-store를 설정한다.
  Next.js 기본 캐시 동작과 명시적 응답 헤더 계약 준수는 구별해야 한다.

### P2 — 콜백 입력 계약의 세부 차이

- `lib/member-subscription/schemas.ts:16`: callbackContext는 영숫자 외 `_`, `-`도 수용한다.
  §3.6의 “영숫자”보다 넓다. 서버가 발행하는 컨텍스트 형식과 함께 문서화해야 한다.
- `app/api/member-subscription/payment/callback/route.ts:10`: 입력 파싱 실패는
  invalid_input 대신 payment_failed로 통일한다(§3.6에는 두 코드가 열거되어 있지만 구분 조건은 없다).
  HTTP 400은 동일하다. 프론트는 기존 오류코드 처리를 유지해야 한다.

### P2 — 주문 상품 조합 제한의 문서 누락

- `lib/member-subscription/pricing.ts:24`: standard는 1개월을 허용하지 않는다.
  paid_trial은 PERSONAL의 PRO 1개월만 가능하다(`orders.ts`, `schemas.ts`).
  §3.3의 개별 enum 조합이 모두 구매 가능한 것은 아니다. 정책을 변경하지 않았다.

### P2 — 관리자 예외 및 목록 규모

- `app/api/admin/verify/route.ts`는 JSON/DB 예외를 자체 정규화하지 않고,
  pending 목록 조회에 take/cursor가 없다. 신규 N+1은 없지만 대기자 증가 시 응답이 커진다.
  페이지네이션을 도입하려면 기존 배열 응답 소비자를 포함한 별도 검토가 필요하다.

## 보강한 자동 검증

- `tests/setup-role-contract.test.ts`: 인증·CSRF·역할 제한·세부유형·사업자 접수·422·입력 길이·세션 소유자만 쓰기.
- `tests/admin-verification-contract.test.ts`: ADMIN 전용·정확한 목록 select·빈 목록·승인 역할/한도·반려·stale 승인·CSRF·감사 이벤트.
- `tests/renewal-release-gate.test.ts`: 실제 release config를 통해 enabled off,
  정책/가격 버전 누락, 시행일 전, 날짜 누락/오류를 검증한다.
  신규 미분류 사용자는 접근을 유지하고 분류된 만료 회원의 감시 차단은 유지한다.
  시행 시각 경계(직전 1ms/정각)도 검증한다.
- 기존 onboarding 테스트로 BUSINESS/REALESTATE의 PREMIUM active 완료와
  trial/grace/미적용 주문의 미완료, 역할별 허용 플랜 및 verification_required를 재검증한다.

## 검증의 한계

실행 결과: member 283개 통과/9개 미실행, guest 329개 통과/28개 미실행.
신규 테스트 3개의 ESLint, `tsc --noEmit --incremental false`, `git diff --check` 통과.
신규 파일은 각각 500줄 미만이다. 테스트/검증 기록만 추가하여 제품 빌드는 실행하지 않았다.

자동 테스트는 인증·DB·PG 경계를 mock한 단위/회귀 검증이다.
격리 DB가 제공되지 않아 member의 실제 DB 통합 9개,
guest의 DB 통합/외부 SMS 검증 28개는 실행하지 않았다.
실데이터 저장·실결제·실브라우저·테스트 배포·운영 배포는 수행하지 않았다.
기존 설계서와 구현이 100% 일치한다거나 전체 보안 검증을 완료했다고 판정하지 않는다.
테스트만 추가했으므로 README/위키에 제품 동작 변경 사항은 없다.

## 플랫폼 점검 판정

1. 파일 500줄 제한: ✅ (이번 추가 파일 기준)
2. 단일 책임: ✅ (역할 설정·관리자 승인·release 경계 테스트 분리)
3. 서버 검증·보안: ❌ (기존 사업자번호 형식 검증·개인정보 로그·예외 처리 누락)
4. 성능: ❌ (기존 관리자 대기 목록 무제한 조회; 신규 성능 저하 없음)
5. 폴더 구조: ✅ (변경은 허용된 lib/ 아래로 한정)

## 2026-10-20 HIGH·MED 수정 후 재검증

이 절은 위 최초 감사 시점의 setup-role/admin 예외·PII 관련 미해결 판정을 대체한다.
사용자의 후속 수정 요청에 따라 기존 결함을 서버 코드에서 수정했다.

- setup-role: 사업자번호는 숫자 10자리 또는 `000-00-00000` 형식만 허용한다.
  앞뒤 공백은 제거한다. 일부 필드만 전달하거나 빈 값/null을 전달한 경우 400이며,
  기존 사업자 정보 재사용은 세 필드가 모두 생략된 요청에만 적용한다.
- setup-role/admin verify: 잘못된 JSON·빈 본문·null·배열·기본형 본문은 400,
  DB 조회/쓰기 실패는 내부 예외 정보 없는 503으로 정규화한다.
  CSRF→인증 순서와 세션 사용자만 갱신하는 경계는 유지한다.
- setup-role 감사 detail에서 회사명·대표자명을 제거했다. 공통 감사 로거는
  회사명·대표자명·사업자번호를 중첩 객체/배열에서도 완전히 가린다.
  실패 로그에도 원래 Prisma 예외를 남기지 않는다. 기존 DB 로그를 변경하지는 않는다.
- admin verify의 명시 역할/저장된 신청 역할도 사업자 역할만 승인하며,
  유효한 오버라이드와 기존 BUSINESS 기본값은 유지한다.

복구 API의 소비자용 계약은 다음과 같다. HTTP 200 자체는 결제 적용을 의미하지 않는다.

| 상황 | HTTP | 본문 |
|---|---|---|
| 이번 재검증에서 결제 대기 발견 | 200 | `{ status: "pending", applied: false }` |
| 이번 재검증에서 추가 검토 필요 발견 | 200 | `{ status: "needs_review", applied: false }` |
| 기존 주문이 이미 needs_review | 409 | `{ code: "payment_needs_review", error: string }` |
| 검증과 구독 적용 완료 | 200 | `{ status: "paid", applied: true }` |

`tests/recovery-http-contract.test.ts`는 실제 라우트→HTTP 어댑터→복구 서비스를
연결해 이 차이를 고정한다(인증·DB·PG는 mock). 기존 결제 계약은 변경하지 않았다.
설계서 §3.5 정정과 프론트 소비자 확인은 허용된 백엔드 경로 밖이므로 수행하지 않았다.
따라서 해당 MED의 문서 측 불일치는 여전히 후속 정정 대상이다.
이번 변경의 API/보안 동작과 검증 기록은 이 문서에 남기며 위키는 직접 수정하지 않는다.

자동 테스트 결과: 기본 1,004개 통과, member 338개 통과/DB 통합 9개 미실행,
guest 329개 통과/DB·외부 SMS 28개 미실행. 신규 회귀에는 JSON/사업자번호/부분입력,
DB read/write 실패, 개인정보 중첩 마스킹·실패 로그, 관리자 역할 검증을 포함한다.
실DB·실결제·테스트 배포·운영 배포는 수행하지 않았다.
최종 TypeScript 검사, 변경 소스/테스트 ESLint, `git diff --check`, 프로덕션 빌드 통과.
빌드 사전 API 인가 게이트(166 routes)와 보안 회귀 게이트도 통과했다.

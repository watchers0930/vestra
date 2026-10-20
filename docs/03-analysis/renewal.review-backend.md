# Renewal 백엔드 교차검수 (Codex 구현분 → Claude 검수)

> 검수일: 2026-10-20
> 검수자: Claude (크로미)
> 대상 커밋 전 변경분: `git status`/`git diff` 기준 미커밋 상태
> 기준 설계서: `docs/02-design/features/renewal.design.md` (§0·§3·§4.1)
> 검토 관점: 보안(인증·CSRF·입력검증·SQLi/XSS)·버그·성능(N+1·중복호출)·설계 스펙 일치

---

## 0. 검수 전제 — "이번 백엔드 작업"의 성격

설계서 §0·§4.1에 따라 이번 renewal 기능의 **백엔드 범위는 신규 서버 코드 작성이 아니라 "계약 보존 + 회귀 기준 고정 + 서버 검증 재확인"** 이다. 따라서 Codex가 실제로 산출한 백엔드 변경분은 아래 **4개 파일**뿐이며, `app/api/`·`actions/`·`schemas/`·`prisma/`의 소스 코드는 **변경되지 않았다**(git diff로 확인).

| 파일 | 종류 |
|---|---|
| `lib/member-subscription/tests/setup-role-contract.test.ts` | 신규 회귀 테스트 |
| `lib/member-subscription/tests/admin-verification-contract.test.ts` | 신규 회귀 테스트 |
| `lib/member-subscription/tests/renewal-release-gate.test.ts` | 신규 회귀 테스트 |
| `lib/member-subscription/renewal-contract-audit.md` | 계약 대조 감사 문서 |

**범위 준수 판정: ✅ 합격.** 보호 경계(`onboarding*`/`protected-paths`/`proxy`/`lib/auth` JWT)·member/guest 결제 계약·정책 상수·DB·env를 **일절 변경하지 않았다.** 설계서 §0 P0 불변 조건(신규 API·DB·정책 상수 금지)을 지켰다.

---

## 1. 종합 판정

- **테스트 3종은 실제 라우트/모킹과 1:1로 정확히 대응**한다. 허위양성(false-positive) 테스트나 깨질 단언(assertion)은 발견되지 않았다. (아래 §2에서 라인 단위 대조)
- **감사 문서(`renewal-contract-audit.md`)의 지적은 실제 소스와 모두 일치**한다. 스팟체크한 7개 지적(setup-role 사업자번호·예외처리·PII 로그, recovery 상태코드, schemas callbackContext, pricing 1개월, health no-store)이 전부 실제 코드와 부합했다.
- 다만 아래 **MED 2건 / LOW 3건**의 보강 여지가 있다. 핵심은 ① 설계서 §3.5 계약 불일치가 "문서에 반영되지 않은 채" 남아 FE/BE 계약 드리프트가 존재한다는 점과, ② 감사가 지적한 기존 코드 결함(사업자번호 형식·예외처리·PII 로그)의 **심각도를 상향**해 별도 작업으로 반드시 처리해야 한다는 점이다.
- 감사가 지적한 항목들은 **전부 기존(pre-existing) 코드의 결함**이며, Codex가 범위를 지켜 수정하지 않고 문서화한 것은 설계서 §4.1("변경이 필요한 결함은 별도 작업으로 분리") 지침에 부합한다.

---

## 2. 테스트 정확성 검증 (허위양성 여부)

실제 라우트 코드와 테스트 단언을 라인 단위로 대조한 결과 **모두 정확**.

- `setup-role-contract.test.ts`
  - CSRF→인증 순서 단언(L30-34)이 실제 `route.ts:8-14`(validateOrigin 먼저, 그 다음 auth)와 일치. 미인증 401 전 저장소 미접근(L23-29)도 일치.
  - **IDOR 방어 검증이 우수**: 바디에 `userId:"other-user"`를 섞어도 `where:{id:"session-user"}`로만 쓰는지 단언(L39-46) → 실제 `route.ts:29-32`가 세션 id만 사용함을 정확히 고정.
  - 사업자 pending 기록(role 미승격) 단언(L47-55)이 `route.ts:57-60,87-96`와 일치. 422 분기(L56-61), 저장된 정보 재사용(L62-68), 입력 검증 경계값(L69-76)도 실제 검증 로직(`route.ts:76-84`)과 정확히 대응.
- `admin-verification-contract.test.ts`
  - "CSRF를 관리자보다 먼저"(L65-70, `f.auth` 미호출 단언)가 실제 `with-admin-auth.ts:24-27`(validateOrigin → auth 순서)와 정확히 일치. **이 순서가 중요한 보안 속성이며 테스트가 올바르게 고정**한다.
  - 비관리자/널 세션 403(L23-30), 계약된 select 컬럼만 조회(L31-41), 역할별 dailyLimit 승인(L42-52), stale 승인 타깃 404(L60-64)가 `route.ts`와 전부 일치.
- `renewal-release-gate.test.ts`
  - 별도 Explore 교차검증 결과, `config.ts`(6개 비활성 조건)·`onboarding.ts`(isNewSignup/complete/stage 계산)·`onboarding-access.ts`(307·step-3 리다이렉트)·`monitoring-targets.ts`(findMany 1회·분류 만료회원 차단 유지) 모두와 모킹·단언이 일치. 시행 시각 경계(정각/직전 1ms) 테스트도 정확.

---

## 3. 지적 사항

### [MED] 설계서 §3.5 계약 불일치가 단일 진실 소스에 반영되지 않음
- **파일**: `lib/member-subscription/recovery.ts:17-21` vs `docs/02-design/features/renewal.design.md:211` / `renewal-contract-audit.md:43-49`
- **문제**: `recovery.ts`는 **신규 발견된** `payment_needs_review`·`payment_pending`을 HTTP **200** `{ status:"needs_review"|"pending", applied:false }`로 변환해 반환한다(이미 needs_review인 주문만 `fail()`→409, `errors.ts:13-14`에서 409 매핑 확인). 그러나 설계서 §3.5는 두 코드를 **409 오류**로 명시한다. 설계서 §4.3은 "백엔드가 B-2에서 문서↔코드 불일치를 발견하면 **문서를 코드 기준으로 정정**"하라고 지시했으나, Codex는 설계서를 수정하지 않고 감사 문서에만 기록했다. 결과적으로 **단일 진실 소스(§3.5)에는 여전히 틀린 409가 적혀 있어** FE 결제복구 소비자가 409를 기대하다가 실제 200을 받으면 상태 분기를 놓칠 수 있다(복구 화면이 "성공처럼" 처리될 위험).
- **수정 제안**: 설계서 §3.5를 코드 기준(신규 발견 시 200 + `status` 필드)으로 정정하고, FE `renewal.review-frontend.md` 소비자(결제 복구 핸들러)가 `status==="needs_review"|"pending"`을 200 응답 안에서 분기하는지 확인. 코드는 변경하지 말 것(계약 동결).

### [MED] 감사가 지적한 기존 결함 3종의 심각도 상향 + 별도 작업 필요
- **파일**: `app/api/user/setup-role/route.ts` (16·76·101행)
- **문제(감사 P1 재확인, 전부 실제 코드와 일치)**:
  1. **사업자번호 형식 미검증**(`route.ts:76`): `typeof === "string" && trim().length >= 10`만 검사. 하이픈·숫자 패턴 미검증으로 10자 이상 임의 문자열 통과 → 설계서 §3.2 "사업자번호 형식 오류 400" 보장 미충족.
  2. **예외 미처리**(`route.ts:16`): `await req.json()`이 malformed JSON·빈 바디에서 throw → 라우트가 catch하지 않아 500. prisma 예외도 동일. 플랫폼 "예외 복구" 기준 위반(admin/verify도 동일, `route.ts:29`).
  3. **감사 로그 PII 평문 저장**(`route.ts:101`): detail에 `companyName`·`representName`(대표자 성명=개인정보)을 전달하나 `audit-log.ts:57-65` `SENSITIVE_KEYS`에 두 키가 없어 **평문으로 DB 감사 테이블에 영구 저장**된다. CLAUDE.md 최우선 규칙 및 플랫폼 보안 규칙("개인정보는 로그에 남기지 않는다")과 정면 충돌.
- **심각도 의견**: 감사는 P1로 묶었으나, **③ PII 평문 로그는 CLAUDE.md 0번 절대규칙 관점에서 HIGH로 다룰 것을 권고**(기존·어드민 전용 테이블이라 노출면은 제한적이나 "로그에 PII 금지"는 예외 없는 규칙). ①②는 MED.
- **수정 제안**: 모두 renewal 범위 밖 기존 결함이므로 **별도 작업으로 분리**해 대장 승인 후 처리. ③은 `maskSensitiveFields` 대상 키에 추가하거나 detail에서 제외. ①은 사업자번호 정규식(`^\d{3}-?\d{2}-?\d{5}$` 등) 추가. ②는 `req.json()`/prisma 호출을 try-catch로 감싸 400/503 정규화.

### [LOW] admin/verify 승인 분기 일부 미커버 + 임의 role 문자열 수용
- **파일**: `app/api/admin/verify/route.ts:46-47`
- **문제**: 테스트는 `requestedRole` 기반 승인만 검증하고, 관리자가 명시한 `role` **오버라이드 경로**와 `role||requestedRole||"BUSINESS"` 기본 폴백 경로는 미커버. 또한 `approvedRole`에 임의 문자열이 들어오면 `ROLE_LIMITS[approvedRole] || ROLE_LIMITS.BUSINESS`로 폴백 저장된다(알 수 없는 role 승격 가능성). 어드민 전용·기존 코드라 위험은 낮으나 회귀 고정 가치가 있다.
- **수정 제안**: 승인 테스트에 `role` 명시 오버라이드 케이스와 허용 역할 화이트리스트 검증을 추가(테스트만, 코드 변경은 별도 판단).

### [LOW] 신규 테스트가 500/예외 경로를 전혀 커버하지 않음
- **파일**: `setup-role-contract.test.ts`, `admin-verification-contract.test.ts`
- **문제**: §3.3의 MED(예외 미처리)와 짝을 이루는 "현재 500으로 깨짐"을 고정하는 테스트가 없다. 라우트가 예외를 처리하지 않으므로 지금은 "좋은 동작"을 단언할 수 없어 정당한 공백이나, 향후 수정 시 회귀 기준이 없다.
- **수정 제안**: §3의 예외처리 보강 작업 때 malformed JSON→400/503 단언 테스트를 함께 추가.

### [LOW] 공통 `Cache-Control: no-store` 헤더 누락 (감사 P2 재확인)
- **파일**: `app/api/user/setup-role/route.ts`, `app/api/admin/verify/route.ts`, `app/api/health/route.ts`
- **문제**: 설계서 §3 공통 헤더 "`Cache-Control: no-store`"를 이 3개 라우트는 명시하지 않는다(member-subscription·onboarding-status는 설정함). `health/route.ts`는 헤더 자체가 전무함을 코드로 확인. 민감 응답은 아니나 계약 일관성·캐시 안전성 측면에서 보강 권장.
- **수정 제안**: 별도 작업으로 응답에 `no-store` 추가(계약 동결 범위 밖, 대장 판단).

---

## 4. 성능·보안 스윕 결과

- **N+1·중복호출**: 신규 코드 없음. `monitoring-targets.ts`는 `prisma.user.findMany`·`monitoredProperty.groupBy`를 각 1회(Promise.all 병렬)만 호출함을 테스트가 고정. onboarding 상태는 `$transaction` 1회 조회. **신규 성능 저하 없음.**
- **기존 성능 메모(감사 P2)**: `admin/verify` 대기목록 조회에 `take`/`cursor` 없음(`route.ts:9-23`) → 대기자 급증 시 응답 비대. N+1은 아니며 기존 배열 응답 소비자 영향으로 별도 검토 필요. **LOW(기존)**.
- **인증 없는 변이 핸들러(CLAUDE.md API 체크리스트)**: 검수한 renewal 계약 라우트는 모두 인증·CSRF 적용 확인. 다만 Codex 감사 범위가 renewal 계약 엔드포인트에 한정되어 **`app/api/` 전체 스윕(인증 없는 POST/PUT/DELETE·dead-code endpoint)은 이번 산출물에 포함되지 않음** → 배포 전 전체 스윕은 별도 수행 권장.
- **SQLi/XSS**: Prisma 파라미터 바인딩만 사용, raw query 없음. 입력은 zod strict(`schemas.ts`) 또는 명시적 타입/길이 검증. 신규 주입면 없음.

---

## 5. 플랫폼 개발 원칙 점검 (검수 대상 산출물 기준)

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (Codex 백엔드 산출물)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 신규 테스트 3종 모두 500줄 미만
2. 단일 책임           : ✅ 역할설정/관리자승인/릴리즈게이트 테스트 분리
3. 서버 검증·보안      : ⚠️ 신규 코드는 합격. 단 감사가 지적한 기존 결함
                          (사업자번호 형식·예외처리·PII 평문 로그)은
                          별도 작업으로 반드시 처리 (§3 MED 참조)
4. 성능 (중복·N+1)     : ✅ 신규 성능 저하 없음 (기존 admin 목록 무제한은 LOW)
5. 폴더 구조           : ✅ 변경이 허용된 lib/ 테스트·문서로 한정
─────────────────────────────────────────────────
위반 항목: 신규 산출물 없음 / 기존 코드 결함은 별도 작업으로 분리 필요
─────────────────────────────────────────────────
```

---

## 6. 결론 및 권고

1. **Codex의 백엔드 산출물(테스트 3 + 감사 1)은 정확하고 범위를 준수했다.** 회귀 기준 고정 목적을 충실히 달성했으며 허위양성 테스트가 없다 → **승인 가능**.
2. **배포 전 필수 후속(별도 작업)**: §3의 ③ PII 평문 감사 로그(HIGH 권고)를 우선 처리. ①②(사업자번호 형식·예외처리)는 MED로 뒤이어.
3. **계약 정합성**: §3.5(recovery 상태코드) 설계서 정정 후 FE 복구 소비자와 교차 확인(MED). 설계서는 코드 기준으로 맞춘다(코드 동결).
4. **배포 게이트**: `app/api/` 전체 보안 스윕(인증 없는 변이·dead-code)과 `vitest`(member config) 회귀 통과를 배포 전 확인. 테스트·실결제·실화면 검증은 미수행 상태임(감사 문서 "검증의 한계" 참조) — 운영 반영 전 `t-vestra` 테스트 배포·smoke check 필수.

---
topic: api
last_compiled: 2026-08-22
sources: 8
---

# API

## Purpose

[coverage: high -- 3 sources]

VESTRA 플랫폼의 모든 서버 엔드포인트 인터페이스 명세. Next.js 16 App Router 기반 Vercel 서버리스 함수로 구현되어 있으며, 등기부등본 분석, 계약서 검토, 시세전망, 권리분석, AI 채팅 등 부동산 AI 서비스 외에 매물 등록·의향서·전자/가계약서·부동산 모니터링·사업성분석(기업 전용)·중개관리 등 거래 워크플로우 API를 포함한다. 핵심 목적은 이 기능들을 안전하게 외부에 노출하는 것이며, 모든 OpenAI 호출은 서버사이드에서만 실행된다. 모든 변이(POST/PUT/PATCH/DELETE) 요청은 `validateOrigin` CSRF 가드와 세션 인증을 우선 통과한다.

- 프로덕션 베이스 URL: `https://vestra-plum.vercel.app`
- 테스트 베이스 URL: `https://t-vestra.vercel.app`
- 개발 베이스 URL: `http://localhost:3000`

---

## Architecture

[coverage: high -- 3 sources]

### 런타임 구조

```
Client (Browser / Next.js SSR)
        │ HTTPS
Vercel Serverless Functions
  ├── CSRF Guard (validateOrigin — 변이 요청 전면 적용)
  ├── Auth (JWT, NextAuth v5)
  ├── Rate Limit (슬라이딩 윈도우, DB 기반)
  ├── Role/VerifyStatus Guard (역할·인증 상태 기반 접근 통제)
  └── Core Engine
        ├── V-Score / Cross-Analysis / Fraud Risk / Feasibility
        ├── Cascade / Confidence / Registry Parser
        └── OpenAI gpt-4.1-mini (서버사이드 전용)
        │
        ├── Neon PostgreSQL (Prisma ORM)
        ├── OpenAI API
        ├── Web Push (lib/push-subscriptions — sendPushToUser)
        └── 공공/외부 API (MOLIT, 건축물대장, 대법원, ECOS, Tilko, Kakao geocoding)
```

### 인증 방식

- 프레임워크: NextAuth v5 (beta), 세션 전략 JWT (JWE 암호화)
- 소셜 로그인: Google, Naver (카카오는 설정 중)
- Credentials 로그인: 이메일 + bcrypt 비밀번호
- 세션 전달: httpOnly 쿠키 (Secure, SameSite=lax)
- 동적 OAuth: DB(`SystemSetting`) 기반 OAuth 키를 AES-256-GCM 암호화 저장, 관리자가 변경 가능
- 세션 사용자에 `role`(GUEST/PERSONAL/RENTAL_BIZ/BUSINESS/REALESTATE/ADMIN 등), `userType`(TENANT 등), `verifyStatus`(사업자 인증 상태) 필드가 포함되며 서버 가드에서 활용

### 접근 통제 계층 (거래 API 공통)

| 가드 유형 | 적용 방식 | 예시 |
|-----------|-----------|------|
| CSRF | `validateOrigin(req)` — 모든 변이 요청 진입 시 | listings·monitoring·contract-applications·e-contracts·feasibility POST |
| 세션 인증 | `auth()` 후 `session.user.id` 확인 | 위 전 라우트 |
| userType 차단 | `session.user.userType === "TENANT"` → 403 | 매물 등록 |
| 사업자 인증 상태 | `role ∈ {RENTAL_BIZ,BUSINESS,REALESTATE}` && `verifyStatus !== "verified"` → 403 | 매물 등록 |
| 기업 전용 가드 | `assertFeasibilityAccess` (`lib/feasibility-guard`) — `role ∈ {BUSINESS,ADMIN}` | 사업성분석 5종 |
| 중개인 래퍼 | `withAgentAuth` (`lib/with-agent-auth`) + 리소스 소유권(`agentId`) | agent/clients |
| 리소스 소유권 | `ownerId`/`applicantId`/`landlordId` 대조 | 의향서·가계약 처리 |

### Rate Limit 정책

| 구분 | 방식 | 저장소 |
|------|------|--------|
| 분당 제한 | 슬라이딩 윈도우(`rateLimit(key, limit)`) | Neon PostgreSQL `RateLimit` 테이블 |
| 일일 제한 | 역할별 카운터(`checkDailyUsage`) | `DailyUsage` 테이블 |
| Cost Guard | OpenAI API 일일 호출 제한(`checkOpenAICostGuard`) | 별도 카운터 |

Rate Limit 응답 헤더: `X-RateLimit-Remaining`, `X-RateLimit-Reset`. 식별자: `userId || IP`.

### Web Push 알림 연동

`lib/push-subscriptions.ts`의 `sendPushToUser(userId, {title, body, url})`로 특정 사용자에게 브라우저 Web Push 발송. fire-and-forget(`.catch(() => {})`)이며 실패해도 원 트랜잭션에 영향 없음. 의향서 제출/수락/거절 이벤트에서 사용.

### Cron Jobs

| 작업 | 경로 | 스케줄 | 보안 |
|------|------|--------|------|
| 등기변동 모니터링 | `/api/cron/registry-monitor` | 매일 09:00 (`0 9 * * *`) | CRON_SECRET, 프로덕션 강제 |
| 전세사기 데이터 수집 | `/api/cron/fraud-import` | 매주 월 03:00 (`0 3 * * 1`) | CRON_SECRET |

---

## API Surface (전체 엔드포인트 목록)

[coverage: high -- 3 sources]

### 분석 API

| Method | URL | 인증 | 역할 제한 | Rate Limit |
|--------|-----|------|----------|-----------|
| POST | `/api/analyze-unified` | 선택 | - (미로그인 GUEST 한도) | 10/min + 일일 |
| POST | `/api/analyze-contract` | 선택 | PERSONAL+ | 30/min + 일일 + Cost Guard |
| POST | `/api/analyze-rights` | 선택 | - | 30/min + 일일 + Cost Guard |
| POST | `/api/predict-value` | 선택 | - | 30/min + 일일 + Cost Guard |

### 문서 처리 API

| Method | URL | 인증 | Rate Limit |
|--------|-----|------|-----------|
| POST | `/api/generate-document` | 불필요 | 30/min + Cost Guard(analyze 타입) |
| POST | `/api/extract-pdf` | 불필요 | 10/min |
| POST | `/api/parse-registry` | 불필요 | - |

### 매물·거래 API (이번 세션 반영)

| Method | URL | 인증 | 접근 제한 | 비고 |
|--------|-----|------|-----------|------|
| GET | `/api/listings` | 선택(mine=true 시 필수) | - | 필터: listingType/roomType/region/minSize/maxSize/mine, 페이지네이션 |
| POST | `/api/listings` | 필수 | TENANT 차단 + 사업자 verified 가드 | 매물 등록, 등록 후 Kakao geocoding(fire-and-forget) |
| GET | `/api/contract-applications` | 필수 | 임대인(내 매물) | 받은 의향서 목록, status 필터 |
| POST | `/api/contract-applications` | 필수 | 본인 매물 제외 | 의향서 제출 → 소유자 Web Push |
| GET | `/api/contract-applications/[id]` | 필수 | 당사자(신청자/소유자) | 채팅방 진입용 단건 |
| PATCH | `/api/contract-applications/[id]` | 필수 | 소유자=수락/거절, 신청자=철회 | 수락 시 매물 CONTRACTED + 신청자 Web Push |
| DELETE | `/api/contract-applications/[id]` | 필수 | 신청자(WITHDRAWN)·소유자(REJECTED/WITHDRAWN) | 물리 삭제 |
| GET | `/api/e-contracts` | 필수 | 임대인/작성자/연결 임차인/중개 | 내 가계약 목록(tenantId 포함), 페이지 20건 |
| POST | `/api/e-contracts` | 필수 | 의향서 연결 시 본인 매물 소유자 | 가계약서 생성(양측 서명 즉시 COMPLETED) |
| GET | `/api/e-contracts/[id]/pdf` | (계약 참여자) | - | 온디맨드 PDF 렌더링 |
| POST | `/api/sign/[token]/complete` | 서명 토큰 | 토큰 검증(만료 72h) | 이메일 서명 링크 서명 저장 + 상태 진행 |

### 모니터링 API

| Method | URL | 인증 | Rate Limit | 비고 |
|--------|-----|------|-----------|------|
| GET | `/api/monitoring` | 필수 | 30/min | 내 모니터링 목록(status 필터) |
| POST | `/api/monitoring` | 필수 | 10/min | 등록/재활성화, listingId FK 연결(유효 시), 역할별 한도 |
| DELETE | `/api/monitoring` | 필수 | 10/min | 주소 기준 paused 처리(소프트) |
| GET/PATCH | `/api/monitoring/alerts` | 필수 | - | 알림 조회/일괄 읽음 |
| PATCH | `/api/monitoring/alerts/[id]` | 필수 | - | 개별 알림 읽음 |

### 사업성분석 API (기업 전용 — assertFeasibilityAccess)

| Method | URL | 가드 | Rate Limit | 비고 |
|--------|-----|------|-----------|------|
| POST | `/api/feasibility/parse` | BUSINESS·ADMIN | 30/min + 일일 | 단일 파일 파싱(4MB↑ gzip) |
| POST | `/api/feasibility/verify` | BUSINESS·ADMIN | 5/min + 일일 + Cost Guard | 주장 검증·점수 산출 |
| POST | `/api/feasibility/merge` | BUSINESS·ADMIN | 10/min | 파싱 결과 병합·불일치 감지 |
| POST | `/api/feasibility/scr-report` | BUSINESS·ADMIN | 5/min | SCR 보고서 생성 |
| POST | `/api/feasibility/scr-report/stream` | BUSINESS·ADMIN | 5/min | SCR 보고서 스트리밍 생성 |
| GET | `/api/feasibility/scr-report/[id]` | (조회) | 20/min | SCR 보고서 조회 (가드 미적용) |
| POST | `/api/feasibility/report` | (미적용) | 10/min | 레거시 리포트 (가드 미적용) |

### 중개관리 API (withAgentAuth)

| Method | URL | 인증 | 비고 |
|--------|-----|------|------|
| GET | `/api/agent/clients/[id]` | 중개인(소유권) | 고객 상세 + 물건 목록 + (clientUserId 있으면) 고객 매물·받은 의향서 |
| PUT | `/api/agent/clients/[id]` | 중개인(소유권) | 고객 정보 수정 |
| DELETE | `/api/agent/clients/[id]` | 중개인(소유권) | 소프트 삭제(inactive + email/userId null 클리어) |

### 사용자·관리자·기타 API

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/user/profile`, `/api/user/usage` | 프로필/사용량 |
| POST | `/api/user/setup-role`(CSRF), `/api/user/migrate-data` | 역할 설정/데이터 이관 |
| GET/PATCH/DELETE | `/api/admin/*` | 관리자(users, settings, stats, announcements, audit-logs 등) |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth v5 핸들러 |
| POST | `/api/chat` | AI 채팅 (PERSONAL+, 30/min + Cost Guard) |
| GET/POST | `/api/subscription`, POST `/api/subscription/cancel` | 구독 |
| POST | `/api/fraud-risk`, `/api/credit-check`(Mock) | 사기위험도/신용조회 |
| GET/POST | `/api/fraud-cases`, `/api/verification/*` | 피해사례/상호검증 |
| GET | `/api/cron/registry-monitor`, `/api/cron/fraud-import` | Cron |

### 역할별 일일 분석 한도

| 역할 | 일일 한도 | 모니터링 등록 한도 |
|------|----------|------------------|
| GUEST | 2회 | 1건 |
| PERSONAL | 5회 | 3건 |
| RENTAL_BIZ | (사업자) | 10건 |
| BUSINESS | 50회 | 10건 |
| REALESTATE | 100회 | 30건 |
| ADMIN | 무제한 | 100건 |

---

## Data Models (거래 API 연관 모델·상태)

[coverage: high -- 2 sources]

### 상태 머신 및 FK 연결

- **Listing.status**: `ACTIVE` → 의향서 수락 시 `CONTRACTED` → 계약 완료 시 `COMPLETED`. 매물 목록 GET은 기본 `ACTIVE`만(mine=true는 전 상태).
- **ContractApplication.status**: `PENDING` → `ACCEPTED`/`REJECTED`(임대인) / `WITHDRAWN`(신청자). PENDING 중복 제출 차단.
- **EContract.status**: 이메일 서명 흐름은 `PENDING_LANDLORD → PENDING_TENANT → (PENDING_BROKER) → COMPLETED`. 가계약(POST /api/e-contracts)은 양측 서명 즉시 `COMPLETED`.
- **EContract FK**: `listingId`·`applicationId`·`tenantId`를 의향서(`ContractApplication`) 기반 생성 시 자동 연결. `landlordId`/`creatorId`는 세션 사용자.
- **MonitoredProperty**: `userId_address` 유니크. `listingId`로 매물 연결 가능(유효 매물일 때만). `commUniqueNo`·`baselineData`·`lastHash`(sha256)로 등기 변동 감지.

---

## Security

[coverage: high -- 3 sources]

### 보안 모듈 목록

| 모듈 | 파일 | 내용 |
|------|------|------|
| CSRF 방어 | `lib/csrf.ts` | `validateOrigin` — 모든 변이 라우트 진입 시 Origin 검증 |
| 기업 전용 가드 | `lib/feasibility-guard.ts` | `assertFeasibilityAccess` — BUSINESS·ADMIN 외 403 |
| 중개인 인증 래퍼 | `lib/with-agent-auth.ts` | `withAgentAuth` — 중개 역할 + 세션 주입 |
| 암호화 | `lib/crypto.ts` | AES-256-GCM (OAuth 키·시스템 설정) |
| XSS 방지 | `lib/sanitize.ts` | DOMPurify 기반 입력 살균 |
| Rate Limit | `lib/rate-limit.ts` | DB 기반 분당/일일 제한 |
| 감사 로그 | `lib/audit-log.ts` | 관리자 활동·분석·모니터링 기록(IP·UA·PII 마스킹) |
| Web Push | `lib/push-subscriptions.ts` | `sendPushToUser` 알림 발송 |

### 매물·거래 API 입력 검증

- `listings` POST: `createListingSchema`(zod) — listingType enum, address min 5, deposit 양의 정수, photos/safetyDocuments URL·개수 제한.
- `contract-applications` POST: `createSchema`(zod) — moveInDate는 오늘 이후, duration 1~36, memo≤500, deposit≥0.
- `contract-applications` PATCH: `patchSchema` — status enum(ACCEPTED/REJECTED/WITHDRAWN).
- `e-contracts` POST: 자체 검증 — contractType enum(JEONSE/MONTHLY/SALE), 주민 앞자리 형식(`######-[1-4]`), 서명은 `data:image` 필수, 금액 상한 1조 원.
- `sign/[token]/complete`: 서명 이미지 2MB·image/* 제한, 서명자 이름 30자·연락처 20자 제한, 토큰 만료 72h.
- `agent/clients/[id]` PUT: 고객명 2~30자, 이메일 정규식, status 화이트리스트(active/inactive/invited).

### 소유권·권한 검증 (변이 시 리소스 대조)

- 가계약 생성 시 의향서 연결은 해당 의향서 매물의 `ownerId === session.user.id`만 허용(403).
- 의향서 수락/거절은 매물 소유자만, 철회·해당 삭제는 신청자만.
- 가계약·중개 고객 조회/수정은 리소스 소유자(landlord/agent)만.

### 공통 에러 코드

| HTTP | 설명 |
|------|------|
| 400 | 유효성 검증 실패 |
| 401 | 인증 필요 |
| 403 | 권한 부족(역할·userType·verifyStatus·소유권) |
| 404 | 리소스 없음 |
| 409 | 중복/상태 충돌(이미 처리된 의향서, 이미 모니터링 중 등) |
| 422 | 처리 불가 상태(비활성 매물, 본인 매물 의향서 등) |
| 429 | Rate Limit/한도 초과 |
| 500 | 서버 내부 오류 |

공통 에러 응답 형식: `{ "error": "에러 메시지 (한글)" }`

---

## Key Decisions

[coverage: high -- 4 sources]

1. **가계약서는 양측 서명 즉시 COMPLETED** — `POST /api/e-contracts`는 이메일 서명 링크 흐름(sign/[token])과 달리, 임대인+임차인 손글씨 서명을 요청 시점에 동시 기록하고 상태를 바로 `COMPLETED`로 만든다. 출력·보관용 즉시 계약서 발급 목적. `tenantEmail`은 빈 문자열(이메일 링크 미사용).

2. **의향서 기반 가계약 FK 자동 연결 + 매물 동기화** — `applicationId`가 오면 의향서에서 `listingId`/`applicationId`/`tenantId`를 계약에 연결하고, 연결 매물을 `COMPLETED`로 동기화한다. 이메일 서명 흐름(`sign/[token]/complete`)도 최종 완료 시 연결 매물을 `COMPLETED`로 동기화한다. 소유권(본인 매물 의향서)만 연결 허용.

3. **매물 등록 사업자 인증 가드 추가** — 기존 TENANT 차단에 더해, 사업자 회원(`RENTAL_BIZ`/`BUSINESS`/`REALESTATE`)은 `verifyStatus === "verified"`일 때만 매물을 등록할 수 있다. 개인 임대인(PERSONAL/LANDLORD)·관리자는 인증 대상이 아니다. 클라이언트 게이트의 서버측 강제로 우회 방지.

4. **모니터링 매물 연결(listingId)** — `POST /api/monitoring`이 `listingId`를 받아 매물 상세에서 진입한 모니터링을 매물에 FK 연결한다. 단, 실제 존재하는 매물일 때만 연결(존재 검증 후 `validListingId`). 재활성화·신규 생성 양쪽에 적용.

5. **거래 이벤트 Web Push 알림** — 의향서 제출 시 매물 소유자에게, 수락/거절 시 신청자에게 `sendPushToUser`로 알림. 철회는 본인 행위이므로 알림 없음. 알림은 fire-and-forget으로 원 트랜잭션 실패에 영향 주지 않는다.

6. **사업성분석 기업 전용화** — 파싱·검증·병합·SCR생성·SCR스트리밍 5종 생성 API에 `assertFeasibilityAccess`(BUSINESS·ADMIN) 가드를 일괄 적용. 역할 계층상 부동산/임대사업자는 사업자 기본 기능, 기업은 기본+사업성분석, 관리자는 전 기능. 조회(scr-report/[id])와 레거시 report는 가드 미적용.

7. **중개관리 고객 상세에 고객 소유 매물·의향서 포함** — `GET /api/agent/clients/[id]`는 고객이 VESTRA 가입회원(`clientUserId` 존재)일 때 그 고객의 매물 목록과 받은 의향서를 함께 조회해 반환(각 최대 50건). 중개인이 담당 고객의 거래 현황을 한 화면에서 파악하도록 설계.

8. **`generate-document` jeonse/lease 법원 공식 양식** — `type=jeonse`/`type=lease`는 OpenAI 미호출, 법원 서식 정적 템플릿 반환(등기부 파싱 값 자동 삽입, 미입력은 `(기재 필요)`). `type=analyze`만 OpenAI GPT-4.1-mini + Cost Guard.

---

## Gotchas

[coverage: medium -- 3 sources]

- **가계약 vs 전자계약 흐름 혼동 주의** — `POST /api/e-contracts`(가계약: 즉시 COMPLETED, 양측 손글씨)와 `POST /api/sign/[token]/complete`(전자계약: 순차 이메일 서명, 상태 단계 진행)는 별개 흐름. 전자는 CSRF+세션, 후자는 서명 토큰(72h 만료)으로 인증.

- **매물 등록 403 두 갈래** — TENANT는 `userType` 기준, 사업자 미인증은 `role + verifyStatus` 기준으로 각각 403. 에러 메시지가 다르므로 프론트에서 구분 처리 필요.

- **모니터링 listingId는 유효할 때만 연결** — 존재하지 않는 `listingId`를 보내면 조용히 무시(에러 없이 미연결). FK 무결성 위반 방지 목적.

- **사업성분석 조회 API 가드 미적용** — 생성 5종은 BUSINESS·ADMIN 가드가 있으나 `scr-report/[id]` GET과 `report` POST에는 `assertFeasibilityAccess`가 없다. 조회는 Rate Limit만 적용.

- **`e-contracts` GET 조회 범위** — landlordId/tenantId(연결 임차인)/tenantEmail/brokerEmail(소문자) OR 조건으로 조회. 이번 세션에서 tenantId 조건이 포함되어, 의향서 기반 가계약의 임차인도 자기 목록에서 확인 가능.

- **의향서 수락 시 매물 CONTRACTED, 계약 완료 시 COMPLETED** — 수락(PATCH)에서 `CONTRACTED`로, 가계약 생성 또는 최종 서명 완료에서 `COMPLETED`로 두 단계에 걸쳐 매물 상태가 전이된다. 매물 목록(ACTIVE 필터)에서 자동으로 빠진다.

- **Web Push 실패는 무시됨** — `sendPushToUser(...).catch(() => {})` 이므로 구독 미등록·발송 실패해도 의향서 제출/처리는 정상 완료. 알림 도달을 거래 성공의 보증으로 간주하면 안 됨.

- **파라미터 실증 미검증** — V-Score 가중치, 감점 수치, 증폭계수, 사기 피처 가중치 등은 전문가 휴리스틱 초기값이며 실제 사고 데이터 캘리브레이션 미완료. 위험도 수치는 참고용.

---

## Sources

- [[app/api/e-contracts/route.ts]]
- [[app/api/e-contracts/[id]/pdf/route.ts]]
- [[app/api/listings/route.ts]]
- [[app/api/monitoring/route.ts]]
- [[app/api/contract-applications/route.ts]]
- [[app/api/contract-applications/[id]/route.ts]]
- [[app/api/feasibility/parse/route.ts]]
- [[app/api/feasibility/verify/route.ts]]
- [[app/api/feasibility/merge/route.ts]]
- [[app/api/feasibility/scr-report/route.ts]]
- [[app/api/feasibility/scr-report/stream/route.ts]]
- [[app/api/agent/clients/[id]/route.ts]]
- [[app/api/sign/[token]/complete/route.ts]]
- [[lib/feasibility-guard.ts]]
- [[lib/push-subscriptions.ts]]
- [[docs/04-API-Spec.md]]
- [[docs/security/access-control-matrix.md]]

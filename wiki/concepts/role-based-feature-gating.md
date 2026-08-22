---
concept: 역할 기반 기능 게이팅
last_compiled: 2026-08-22
topics_connected: [platform-overview, api, security, features]
status: active
---

# 역할 기반 기능 게이팅 (Role-Based Feature Gating)

## Pattern
Vestra는 기능 접근을 회원 역할(`role`)·유형(`userType`)·인증상태(`verifyStatus`)의 조합으로 **서버에서 최종 판정**하고, 클라이언트 게이트는 UX 유도용으로만 둔다. 역할 계층이 곧 기능 경계다 — 부동산·임대사업자는 사업자 기본 기능, 기업은 그 위에 사업성분석이 얹히고, 인증(verified)을 통과해야 쓰기 기능이 열린다. 같은 "역할로 문을 여닫는" 판단이 매물등록·사업성분석·중개사 CRM 세 곳에서 동일한 형태로 반복된다.

## Instances
- **2026-08-22** [[../topics/features]]·[[../topics/security]]: 매물 등록(`POST /api/listings`)에 사업자(RENTAL_BIZ/BUSINESS/REALESTATE) `verifyStatus=verified` 가드 추가. TENANT 차단 + 미인증 사업자 차단. 클라(`ListingNewClient`)는 "인증 대기" 안내, 서버가 최종 판정.
- **2026-08-22** [[../topics/api]]·[[../topics/security]]: 사업성분석을 기업 전용으로 — `lib/feasibility-guard.assertFeasibilityAccess`(BUSINESS·ADMIN만)를 생성 API 5종 + 화면에 적용. "부동산/임대사업자=기본, 기업=기본+사업성분석" 계층 구현.
- **2026-08-22** [[../topics/api]]: 중개사 CRM(`/api/agent/*`)은 `withAgentAuth`(REALESTATE + verified)로 보호. 고객(clientUserId) 매물·의향서 조회도 이 게이트 안에서만.

## What This Means
역할 계층은 요금/마케팅 구분이 아니라 **실제 기능 경계**로 코드에 박혀 있어야 의미가 있다. 이번 세션 전까지 기업(BUSINESS)은 이름만 있고 게이팅이 없어 팬텀 역할이었는데, 사업성분석 전용화로 실체를 얻었다. 교훈: **새 기능을 추가할 때 "어느 역할까지, 인증 필요 여부"를 서버 가드로 함께 정의**해야 하며, 클라이언트 게이트만으로는 우회 가능하다(서버가 항상 최종 판정). 게이트가 빠진 기능은 조회/조작 권한 구멍이 된다.

## Sources
- [[../topics/security]]
- [[../topics/api]]
- [[../topics/features]]
- [[../topics/platform-overview]]

# VESTRA 소프트웨어 요구분석서 (SRS)

| 항목 | 내용 |
|------|------|
| 문서 번호 | VESTRA-SRS-2026-001 |
| 버전 | 1.0.0 |
| 작성일 | 2026-03-11 |
| 프로젝트명 | VESTRA - AI 자산관리 플랫폼 |
| 분류 | 소프트웨어 요구분석서 (Software Requirements Specification) |

---

## 1. 문서 개요

### 1.1 목적

본 문서는 VESTRA AI 자산관리 플랫폼의 소프트웨어 요구사항을 정의한다. 시스템이 제공해야 할 기능 요구사항, 비기능 요구사항, 인터페이스 요구사항 및 제약사항을 명세하여 개발, 테스트, 감리의 기준 문서로 활용한다.

### 1.2 범위

VESTRA는 LLM(대규모 언어 모델) 기반 통합 AI 부동산 자산관리 플랫폼으로, 다음 서비스를 제공한다.

- 등기부등본 파싱 및 권리분석
- 부동산 계약서 AI 분석
- 취득세/양도세/종합부동산세 계산
- 시세전망 (3가지 시나리오)
- 전세 안전성 분석 및 보호 서비스
- AI 어시스턴트 (부동산 법률 상담)
- 관리자 대시보드
- 감사 로그 (Audit Trail)

### 1.3 용어 정의

| 용어 | 설명 |
|------|------|
| 등기부등본 | 부동산 권리관계를 공시하는 공적 장부 |
| 권리분석 | 등기부등본 기반으로 소유권, 근저당, 가압류 등 권리 상태를 분석하는 행위 |
| 전세보호 | 전세 계약의 안전성을 평가하고 보증금 반환 위험도를 산정하는 서비스 |
| RBAC | Role-Based Access Control. 역할 기반 접근 제어 |
| Rate Limit | 단위 시간당 API 호출 횟수를 제한하는 보안 메커니즘 |
| MOLIT | 국토교통부 (Ministry of Land, Infrastructure and Transport) |
| OCR | Optical Character Recognition. 광학 문자 인식 |
| JWT | JSON Web Token. 인증 토큰 방식 |
| AES-256-GCM | 256비트 키를 사용하는 AES 갈루아/카운터 모드 암호화 |
| PII | Personally Identifiable Information. 개인식별정보 |

### 1.4 참조 문서

- 개인정보 보호법 (법률 제19234호)
- 전자정부 SW 개발/운영자를 위한 소프트웨어 개발보안 가이드 (행정안전부)
- 소프트웨어 사업 감리 기준 (과학기술정보통신부 고시)
- IEEE 830-1998 (Recommended Practice for Software Requirements Specifications)

---

## 2. 시스템 개요

### 2.1 시스템 구성도

```
┌─────────────────────────────────────────────────────────┐
│                      클라이언트 (브라우저)                    │
│   React (Next.js App Router) + Tailwind CSS v4          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│                  Next.js 16 서버 (Vercel)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ API Route│  │ SSR/RSC  │  │Middleware│              │
│  │ Handlers │  │ 페이지    │  │(Auth/Rate│              │
│  └────┬─────┘  └──────────┘  │ Limit)  │              │
│       │                      └──────────┘              │
│  ┌────▼──────────────────────────────┐                 │
│  │       비즈니스 로직 엔진 (lib/)       │                 │
│  │  registry-parser  │ risk-scoring  │                 │
│  │  validation-engine│ tax-calculator│                 │
│  │  contract-analyzer│ prediction    │                 │
│  │  confidence-engine│ crypto        │                 │
│  └────┬──────────────────────────────┘                 │
└───────┼────────────────────────────────────────────────┘
        │
┌───────▼────────┐  ┌────────────────┐  ┌────────────────┐
│  PostgreSQL    │  │  OpenAI API    │  │  공공데이터 API  │
│  (Neon)        │  │  (GPT-4o)      │  │  MOLIT/건축물   │
│  + Prisma ORM  │  │                │  │  대장/대법원     │
└────────────────┘  └────────────────┘  └────────────────┘
```

### 2.2 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16 |
| 언어 | TypeScript | 5.x |
| 스타일링 | Tailwind CSS | v4 |
| 데이터베이스 | PostgreSQL (Neon Serverless) | 16 |
| ORM | Prisma | 6.x |
| 인증 | NextAuth (Auth.js) | v5 (beta) |
| AI | OpenAI API | GPT-4o |
| 지도 | Kakao Maps SDK, Leaflet | - |
| 차트 | Recharts | - |
| 배포 | Vercel (Serverless) | - |
| 암호화 | Node.js crypto (AES-256-GCM) | - |

---

## 3. 기능 요구사항

### FR-001 권리분석

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-001 |
| 요구사항명 | 등기부등본 기반 권리분석 |
| 우선순위 | 상 |
| 설명 | 사용자가 등기부등본(PDF/텍스트)을 업로드하면 시스템이 자동 파싱하여 소유권, 근저당, 가압류, 전세권 등 권리 상태를 분석하고 위험도를 산정한다. |
| 세부 기능 | 1. PDF 업로드 및 OCR/텍스트 추출 (registry-parser, 598줄)<br>2. 4단계 유효성 검증 (validation-engine, 1,232줄)<br>3. 12항목 위험도 스코어링 (risk-scoring, 937줄)<br>4. 신뢰도 전파 엔진 (confidence-engine, 263줄)<br>5. 분석 결과 시각화 (ScoreGauge, KpiCard) |
| 입력 | 등기부등본 PDF 또는 텍스트 |
| 출력 | 권리분석 리포트 (위험도 점수, 항목별 분석, 권고사항) |
| 관련 API | `/api/analyze-rights`, `/api/parse-registry` |

### FR-002 계약서 분석

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-002 |
| 요구사항명 | AI 부동산 계약서 분석 |
| 우선순위 | 상 |
| 설명 | 매매/임대차 계약서를 업로드하면 AI가 특약사항, 불리한 조항, 누락 항목을 분석하고 법적 검토 의견을 제공한다. |
| 세부 기능 | 1. 계약서 PDF 파싱 및 텍스트 추출<br>2. AI 기반 조항 분석 (contract-analyzer, 597줄)<br>3. 위험 조항 식별 및 경고<br>4. 법률 조언 생성 (OpenAI GPT-4o) |
| 입력 | 부동산 계약서 PDF/텍스트 |
| 출력 | 분석 리포트 (위험 조항, 누락 항목, 권고사항) |
| 관련 API | `/api/analyze-contract` |

### FR-003 세금 계산

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-003 |
| 요구사항명 | 부동산 3종 세금 계산 |
| 우선순위 | 상 |
| 설명 | 취득세, 양도소득세, 종합부동산세를 물건 정보 및 보유 현황에 따라 자동 계산한다. |
| 세부 기능 | 1. 취득세 계산 (주택/비주택, 다주택 중과세율)<br>2. 양도소득세 계산 (보유기간, 장기보유특별공제)<br>3. 종합부동산세 계산 (공시가격, 공제액)<br>4. 세금 계산 엔진 (tax-calculator, 334줄) |
| 입력 | 물건 유형, 매매가, 보유 기간, 주택 수 등 |
| 출력 | 세금 항목별 산출 내역, 총 세액, 적용 세율 |
| 관련 API | `/api/analyze-unified` |

### FR-004 시세 전망

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-004 |
| 요구사항명 | AI 시세 전망 (3가지 시나리오) |
| 우선순위 | 중 |
| 설명 | 국토교통부 실거래가 데이터와 AI 분석을 결합하여 낙관/중립/비관 3가지 시나리오로 향후 시세를 전망한다. |
| 세부 기능 | 1. 실거래가 데이터 조회 (MOLIT API)<br>2. 3시나리오 예측 엔진 (prediction-engine, 475줄)<br>3. 지역별 시세 추이 차트 (Recharts)<br>4. 지도 기반 시세 시각화 (Kakao Maps) |
| 입력 | 주소, 물건 유형, 면적 |
| 출력 | 3개 시나리오 예측 가격, 추이 차트, 지도 시각화 |
| 관련 API | `/api/predict-value`, `/api/real-price` |

### FR-005 전세 보호 서비스

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-005 |
| 요구사항명 | 전세 안전성 분석 및 보호 |
| 우선순위 | 상 |
| 설명 | 전세 계약의 보증금 반환 위험도를 분석하고, 확정일자/전입신고 가이드, 양도담보 시뮬레이션, 보증보험 정보를 제공한다. |
| 세부 기능 | 1. 전세가율 안전성 분석<br>2. 보증금 반환 리스크 스코어링<br>3. 확정일자/전입신고 절차 안내<br>4. 양도담보 시뮬레이션 (redemption-simulator)<br>5. 보증보험 가입 안내 |
| 입력 | 전세 보증금, 주소, 매매 시세 |
| 출력 | 안전성 점수, 위험 항목, 보호 조치 가이드 |
| 관련 페이지 | `/jeonse/*` (분석, 양도, 확정일자 등) |

### FR-006 AI 어시스턴트

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-006 |
| 요구사항명 | 부동산 AI 챗봇 어시스턴트 |
| 우선순위 | 중 |
| 설명 | 부동산 관련 법률, 세금, 시세 등의 질문에 실시간으로 응답하는 AI 챗봇을 제공한다. |
| 세부 기능 | 1. OpenAI GPT-4o 기반 대화형 응답<br>2. 부동산 도메인 전문 프롬프트 (prompts.ts)<br>3. 대화 히스토리 관리<br>4. 학술 자료 검색 연동 (scholar.ts) |
| 입력 | 사용자 자연어 질문 |
| 출력 | AI 응답 (법률 조언, 세금 안내, 시세 정보 등) |
| 관련 API | `/api/chat`, `/api/scholar/search` |

### FR-007 관리자 대시보드

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-007 |
| 요구사항명 | 시스템 관리자 대시보드 |
| 우선순위 | 상 |
| 설명 | ADMIN 역할 사용자에게 회원 관리, 분석 현황, 시스템 설정, 공지사항 관리, 감사 로그 조회 기능을 제공한다. |
| 세부 기능 | 1. 사용자 목록 조회/수정/삭제/역할변경<br>2. 사업자 인증 승인/반려<br>3. 분석 이력 조회<br>4. 시스템 통계 대시보드<br>5. OAuth 키 관리 (DB 저장, AES-256-GCM 암호화)<br>6. 공지사항 CRUD<br>7. 감사 로그 조회/필터링 |
| 관련 API | `/api/admin/users`, `/api/admin/stats`, `/api/admin/settings`, `/api/admin/announcements`, `/api/admin/audit-logs`, `/api/admin/verify`, `/api/admin/analyses` |

### FR-008 사용자 인증 및 계정 관리

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-008 |
| 요구사항명 | 소셜 로그인 및 역할 기반 계정 관리 |
| 우선순위 | 상 |
| 설명 | Google/카카오/네이버 소셜 로그인과 관리자 자격증명 로그인을 지원하며, 5단계 역할(GUEST, PERSONAL, BUSINESS, REALESTATE, ADMIN)에 따른 접근 제어를 적용한다. |
| 세부 기능 | 1. NextAuth v5 기반 소셜 로그인 (Google, Kakao, Naver)<br>2. 관리자 자격증명 로그인 (bcrypt 비밀번호 해싱)<br>3. JWT 세션 전략<br>4. 역할별 일일 분석 횟수 제한 (GUEST:2, PERSONAL:5, BUSINESS:50, REALESTATE:100, ADMIN:9999)<br>5. 동적 OAuth 프로바이더 (DB 우선, 환경변수 폴백)<br>6. 사업자 인증 요청/승인 워크플로우<br>7. 프로필 관리, 역할 설정 |
| 관련 API | `/api/auth/[...nextauth]`, `/api/user/profile`, `/api/user/setup-role`, `/api/user/usage` |

### FR-009 감사 로그 (Audit Trail)

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-009 |
| 요구사항명 | 시스템 감사 로그 기록 |
| 우선순위 | 상 |
| 설명 | 모든 주요 사용자 활동과 관리자 작업을 감사 로그로 기록하여 추적 가능성을 보장한다. |
| 세부 기능 | 1. 자동 로깅 대상: LOGIN, LOGOUT, LOGIN_FAILED, SIGNUP, ANALYSIS_REQUEST, RATE_LIMIT_EXCEEDED, ROLE_CHANGE<br>2. 관리자 작업 로깅: ADMIN_USER_UPDATE, ADMIN_USER_DELETE, ADMIN_SETTINGS_CHANGE<br>3. IP 주소, User-Agent 기록<br>4. JSON 형태 상세 정보 저장<br>5. 관리자 대시보드 조회/필터링 |
| 데이터 저장 | AuditLog 테이블 (userId, action, target, detail, ipAddress, userAgent, createdAt) |
| 관련 API | `/api/admin/audit-logs` |

### FR-010 구독 및 결제

| 항목 | 내용 |
|------|------|
| 요구사항 ID | FR-010 |
| 요구사항명 | 구독 플랜 관리 및 결제 |
| 우선순위 | 중 |
| 설명 | FREE/PRO/BUSINESS 3단계 구독 플랜을 제공하고, 결제/취소/환불 워크플로우를 관리한다. |
| 세부 기능 | 1. 구독 플랜 선택 (FREE, PRO, BUSINESS)<br>2. 결제 수단 (카드, 이체, 카카오페이)<br>3. 구독 상태 관리 (active, canceled, expired)<br>4. 결제 이력 조회<br>5. 구독 취소 처리 |
| 관련 API | `/api/subscription`, `/api/subscription/cancel` |

---

## 4. 비기능 요구사항

### NFR-001 성능

| 항목 | 내용 |
|------|------|
| 요구사항 ID | NFR-001 |
| 요구사항명 | 시스템 성능 요구사항 |
| API 응답 시간 | 일반 API: 500ms 이내, AI 분석 API: 30초 이내 |
| 동시 사용자 | 최소 100명 동시 접속 지원 (Vercel Serverless 자동 확장) |
| Rate Limit | 분당 30회 (IP 기반), 역할별 일일 제한 |
| 페이지 로드 | FCP(First Contentful Paint) 2초 이내 |

### NFR-002 보안

| 항목 | 내용 |
|------|------|
| 요구사항 ID | NFR-002 |
| 요구사항명 | 보안 요구사항 |
| 인증 | NextAuth v5 JWT 세션, 소셜 OAuth 2.0 |
| 암호화 | AES-256-GCM (시스템 설정, PII), bcrypt (관리자 비밀번호) |
| 전송 보안 | HTTPS (TLS 1.3) 전 구간 적용 |
| Rate Limiting | DB 기반 분당 제한 + 역할별 일일 제한 |
| 입력 검증 | 서버사이드 입력 검증 및 새니타이즈 (sanitize.ts) |
| CSP | Content Security Policy 헤더 적용 |

### NFR-003 가용성

| 항목 | 내용 |
|------|------|
| 요구사항 ID | NFR-003 |
| 요구사항명 | 가용성 요구사항 |
| 가용성 목표 | 99.9% (월간 SLA) |
| 장애 대응 | Vercel 자동 복구, Neon Serverless DB 자동 스케일링 |
| DB 오류 시 정책 | Rate Limit DB 오류 시 요청 허용 (가용성 우선) |

### NFR-004 확장성

| 항목 | 내용 |
|------|------|
| 요구사항 ID | NFR-004 |
| 요구사항명 | 확장성 요구사항 |
| 수평 확장 | Vercel Serverless 함수 자동 스케일링 |
| DB 확장 | Neon Serverless PostgreSQL 자동 스케일링 |
| 모듈 확장 | 비즈니스 로직 엔진 독립 모듈화 (lib/ 디렉토리) |

### NFR-005 접근성

| 항목 | 내용 |
|------|------|
| 요구사항 ID | NFR-005 |
| 요구사항명 | 웹 접근성 요구사항 |
| 표준 | WCAG 2.1 AA 수준 준수 |
| 반응형 | 모바일/태블릿/데스크톱 반응형 레이아웃 |
| 언어 | 한국어 UI 기본 제공 |

### NFR-006 데이터 보호

| 항목 | 내용 |
|------|------|
| 요구사항 ID | NFR-006 |
| 요구사항명 | 개인정보 보호 요구사항 |
| 법적 근거 | 개인정보 보호법 준수 |
| PII 암호화 | AES-256-GCM으로 개인식별정보 암호화 저장 |
| PII 마스킹 | 사업자등록번호, 이메일 등 표시 시 마스킹 처리 |
| 검색용 해시 | SHA-256 HMAC 해시로 암호화 필드 검색 지원 |
| 키 파생 | AUTH_SECRET 기반 scrypt 키 파생 (PII 전용 salt) |

### NFR-007 호환성

| 항목 | 내용 |
|------|------|
| 요구사항 ID | NFR-007 |
| 요구사항명 | 브라우저 호환성 요구사항 |
| 지원 브라우저 | Chrome 90+, Safari 15+, Firefox 90+, Edge 90+ |
| 모바일 | iOS Safari, Android Chrome 최신 2개 버전 |

### NFR-008 유지보수성

| 항목 | 내용 |
|------|------|
| 요구사항 ID | NFR-008 |
| 요구사항명 | 유지보수성 요구사항 |
| 코드 품질 | TypeScript strict mode, ESLint 적용 |
| 테스트 | Vitest 기반 단위/통합 테스트 |
| 문서화 | JSDoc 주석, API 명세 문서 |
| 모듈화 | 비즈니스 로직 엔진 독립 모듈 분리 |

---

## 5. 인터페이스 요구사항

### 5.1 외부 API 인터페이스

| 인터페이스 ID | 외부 시스템 | 프로토콜 | 용도 | 비고 |
|--------------|-------------|----------|------|------|
| IF-001 | 국토교통부 실거래가 API (MOLIT) | REST/XML | 아파트/단독/연립 실거래가 조회 | 공공데이터포털 인증키 사용 (molit-api.ts) |
| IF-002 | 건축물대장 API | REST/XML | 건물 정보 조회 (용도, 면적, 층수 등) | 공공데이터포털 인증키 사용 (building-api.ts) |
| IF-003 | 대법원 판례 API | REST/JSON | 부동산 관련 판례 검색 | court-api.ts |
| IF-004 | OpenAI API | REST/JSON | GPT-4o 기반 AI 분석/대화 | API Key 인증, 서버사이드 호출 (openai.ts) |
| IF-005 | Kakao Maps SDK | JavaScript SDK | 지도 시각화, 주소 검색, 지역 시세 표시 | 클라이언트 SDK 키 사용 |

### 5.2 내부 인터페이스

| 인터페이스 | 설명 |
|-----------|------|
| Prisma ORM | PostgreSQL(Neon) 데이터 접근 계층 |
| NextAuth v5 | 인증/세션 관리 미들웨어 |
| Next.js App Router | 클라이언트-서버 라우팅 |

---

## 6. 제약사항

| 제약 ID | 분류 | 내용 |
|---------|------|------|
| CON-001 | 기술 | Next.js 16 App Router 기반으로 개발하며, pages/ 디렉토리는 사용하지 않는다 |
| CON-002 | 기술 | 서버리스 환경(Vercel)에서 운영하므로 함수 실행 시간 제한(10초~60초)이 존재한다 |
| CON-003 | 기술 | Neon Serverless PostgreSQL을 사용하며, 연결 풀링 제한에 따른 동시 연결 수 제약이 있다 |
| CON-004 | 비용 | OpenAI API 호출 비용 제어를 위해 역할별 일일 사용량 제한을 적용한다 |
| CON-005 | 법률 | 개인정보 보호법에 따라 PII 데이터를 AES-256-GCM으로 암호화 저장해야 한다 |
| CON-006 | 법률 | 본 시스템의 분석 결과는 참고 정보이며 법적 효력이 없음을 사용자에게 고지해야 한다 |
| CON-007 | 운영 | 인증 없이 API를 공개하되, Rate Limit과 Cost Guard로 비용을 보호한다 |
| CON-008 | 데이터 | 공공데이터 API(MOLIT, 건축물대장)의 응답 지연 및 일시적 장애에 대한 폴백 처리가 필요하다 |

---

## 부록 A. API 엔드포인트 목록

| 번호 | 엔드포인트 | 메소드 | 설명 |
|------|-----------|--------|------|
| 1 | `/api/analyze-rights` | POST | 권리분석 |
| 2 | `/api/analyze-contract` | POST | 계약서 분석 |
| 3 | `/api/analyze-unified` | POST | 통합 분석 (세금 포함) |
| 4 | `/api/predict-value` | POST | 시세 전망 |
| 5 | `/api/real-price` | GET | 실거래가 조회 |
| 6 | `/api/parse-registry` | POST | 등기부등본 파싱 |
| 7 | `/api/extract-pdf` | POST | PDF 텍스트 추출 |
| 8 | `/api/chat` | POST | AI 어시스턴트 대화 |
| 9 | `/api/generate-document` | POST | 문서 생성 |
| 10 | `/api/scholar/search` | GET | 학술 자료 검색 |
| 11 | `/api/auth/[...nextauth]` | GET/POST | 인증 라우트 |
| 12 | `/api/user/profile` | GET/PUT | 프로필 조회/수정 |
| 13 | `/api/user/usage` | GET | 사용량 조회 |
| 14 | `/api/user/setup-role` | POST | 역할 설정 |
| 15 | `/api/user/notifications` | GET/PUT | 알림 설정 |
| 16 | `/api/user/migrate-data` | POST | 데이터 마이그레이션 |
| 17 | `/api/subscription` | GET/POST | 구독 관리 |
| 18 | `/api/subscription/cancel` | POST | 구독 취소 |
| 19 | `/api/admin/users` | GET | 사용자 목록 |
| 20 | `/api/admin/users/[id]` | PUT/DELETE | 사용자 수정/삭제 |
| 21 | `/api/admin/stats` | GET | 시스템 통계 |
| 22 | `/api/admin/settings` | GET/PUT | 시스템 설정 |
| 23 | `/api/admin/announcements` | GET/POST | 공지사항 목록/생성 |
| 24 | `/api/admin/announcements/[id]` | PUT/DELETE | 공지사항 수정/삭제 |
| 25 | `/api/admin/audit-logs` | GET | 감사 로그 조회 |
| 26 | `/api/admin/verify` | POST | 사업자 인증 승인 |
| 27 | `/api/admin/analyses` | GET | 분석 이력 조회 |
| 28 | `/api/admin/account` | PUT | 관리자 계정 관리 |

---

*문서 끝*

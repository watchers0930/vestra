---
topic: platform-overview
last_compiled: 2026-04-18
sources: 7
---

# 플랫폼 전체 개요 (Platform Overview)

---

## Purpose
[coverage: high -- 5 sources]

VESTRA는 LLM 기반 통합 AI 부동산 자산관리 플랫폼이다. 전세사기 예방, 등기부등본 권리분석, 계약서 AI 검토, 세금 시뮬레이션, 시세전망 등 부동산 거래 전 과정에서 AI 분석을 제공한다.

**핵심 가치**:
- 비전문가도 부동산 권리관계를 이해할 수 있는 직관적 AI 리포트 생성
- 핵심 분석 엔진은 LLM에 의존하지 않는 순수 TypeScript 구현 (비용 예측 가능성 + 결과 일관성 확보)
- 전세사기 등 부동산 거래 피해를 사전에 예방하는 AI 위험 진단

**운영사**: BMI C&S (대표이사 김동의)  
**배포 URL**: https://vestra-plum.vercel.app  
**GitHub**: bmicns/vestra (Private)  
**현재 버전**: v5.12.0 (package.json 기준)  
**개발 기간**: 2026-02-24 ~ 현재 (초기 18일 집중 개발, 총 커밋 89회+)

---

## Architecture
[coverage: high -- 4 sources]

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                     │
│  React 19 + Tailwind CSS v4 + Kakao Maps + Recharts     │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│              Vercel Edge Network (CDN)                    │
│  ┌─────────────────────────────────────────────────┐     │
│  │  middleware.ts — JWT 검증, 경로 보호, RBAC        │     │
│  └─────────────────────┬───────────────────────────┘     │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│               Next.js App Router (Serverless)            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  페이지 (26)  │  │  API (49)    │  │  서버 컴포넌트│  │
│  └──────────────┘  └──────┬───────┘  └──────────────┘  │
│                           │                              │
│  ┌────────────────────────▼─────────────────────────┐   │
│  │              lib/ (비즈니스 로직, 47 모듈)          │   │
│  │                                                    │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │  핵심 엔진 (LLM 비의존, 순수 TypeScript)       │ │   │
│  │  │  - registry-parser.ts    (598 LOC)            │ │   │
│  │  │  - validation-engine.ts  (1,232 LOC)          │ │   │
│  │  │  - risk-scoring.ts       (937 LOC)            │ │   │
│  │  │  - v-score.ts            (850 LOC)            │ │   │
│  │  │  - fraud-risk-model.ts   (680 LOC)            │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  │                                                    │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │  AI 보조 엔진 (OpenAI 활용)                    │ │   │
│  │  │  - contract-analyzer.ts  (597 LOC)            │ │   │
│  │  │  - prediction-engine.ts  (465 LOC)            │ │   │
│  │  │  - tax-calculator.ts     (334 LOC)            │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
    ┌──────────▼──┐  ┌───────▼────┐  ┌──────▼──────────┐
    │  Neon DB    │  │  OpenAI    │  │  외부 공공 API   │
    │  PostgreSQL │  │  gpt-4.1   │  │  MOLIT, 건축물대장│
    │  25 모델    │  │  -mini     │  │  대법원, 학술검색 │
    └─────────────┘  └────────────┘  └──────────────────┘
```

### 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| 언어 | TypeScript (strict) | 5.x |
| UI | React | 19.2.3 |
| 스타일링 | Tailwind CSS | v4 (PostCSS) |
| DB | PostgreSQL (Neon Serverless) | - |
| ORM | Prisma | 6.19.2 |
| 인증 | NextAuth v5 | beta.30 |
| AI | OpenAI API | gpt-4.1-mini |
| 지도 | Kakao Maps SDK, Leaflet | 1.2.1 / 1.9.4 |
| 차트 | Recharts | 3.7.0 |
| 테스트 | Vitest | 4.0.18 |
| PWA | Serwist | 9.5.7 |
| 배포 | Vercel | Serverless |
| 암호화 | AES-256-GCM | Node.js crypto |

### 데이터 흐름 예시 — 등기부등본 분석

```
사용자 입력 (등기부 텍스트)
    │
    ▼
[1] registry-parser.ts ── 텍스트 정규화 → 섹션 분리 → 필드 추출
    │                      (6단계 파이프라인, 순수 TypeScript)
    ▼
[2] validation-engine.ts ── 포맷 검증 → 논리 검증 → 위험 패턴 → 신뢰도
    │                        (4단계 검증)
    ▼
[3] risk-scoring.ts ──── 12개 위험 요소 → 100점 스케일 점수
    │
    ├──▶ [4] v-score.ts ─────── 5개 정보원 가중 융합 → V-Score
    ├──▶ [5] fraud-risk-model.ts ── 15개 특성 앙상블 → 사기 위험도
    ├──▶ [6] molit-api.ts ──── 실거래가, 전세가율 조회
    └──▶ [7] OpenAI ────────── AI 종합 의견 생성
    │
    ▼
통합 분석 결과 반환
```

### 코드 규모 (TECHNICAL-STATUS-REPORT.md v2.3.1 기준)

| 항목 | 수치 |
|------|------|
| 총 소스 코드 | 31,315 LOC |
| 테스트 코드 | 1,497 LOC |
| 문서 | 3,549 LOC |
| 페이지 수 | 26개 |
| API 라우트 수 | 49개 |
| 컴포넌트 수 | 37개 |
| 라이브러리 모듈 수 | 47개 |
| DB 모델 수 | 25개 |
| 독자 알고리즘 | 8종 (특허 출원 대상) |
| 외부 API 연동 | 6개 |
| 테스트 파일 수 | 9개 |

---

## Features
[coverage: high -- 4 sources]

### 핵심 분석 기능 (6종)

| 기능 | 경로 | 주요 API | 설명 |
|------|------|----------|------|
| 권리분석 | /rights | /api/analyze-rights | 등기부등본 업로드 → AI 권리관계 분석 |
| 계약서 AI 검토 | /contract | /api/analyze-contract | 계약서 조항별 위험도 분석, 누락 조항 감지, 판례 인용 |
| 세무 시뮬레이션 | /tax | 내부 계산 | 취득세/양도세/종합부동산세 (2024-2026 시나리오) |
| 시세전망 | /prediction | /api/predict-value | 3시나리오(상승/기본/하락) 예측, Kakao Maps 히트맵 |
| 등기부 파싱 | /registry | /api/parse-registry | PDF/이미지 OCR + 텍스트 파싱 |
| AI 어시스턴트 | /assistant | /api/chat | 법률 Q&A, 판례 검색 연동, 부동산 AI 챗봇 |

### 전세 보호 기능 (7종)

| 기능 | 경로 | 상태 |
|------|------|------|
| 전세 안전 분석 | /jeonse/analysis | 완료 |
| 절차 안내 | /jeonse | 완료 |
| 전입신고 | /jeonse/transfer | 완료 |
| 확정일자 | /jeonse/fixed-date | 완료 |
| 전세권설정등기 | /jeonse/jeonse-right | 완료 |
| 임차권등기명령 | /jeonse/lease-registration | 완료 |
| 주택임대차 신고 | /jeonse/lease-report | 완료 |

### 부가 기능

| 기능 | 경로 | 설명 |
|------|------|------|
| 대시보드 (포트폴리오) | /dashboard | 사용자 자산 현황 |
| 상호검증 | /verification | 임대인/임차인 교차 검증 |
| 분석보고서 | /report | PDF 다운로드 포함 |
| 전세사기 위험 진단 | - | /api/fraud-risk, 15-피처 위험도 산출 |
| 실거래가 조회 | - | /api/real-price, MOLIT 연동 |
| 부동산 모니터링 | - | /api/monitoring, 등기 변동 실시간 알림 |
| 사기사례 DB | - | /api/fraud-cases, 지도 기반 히트맵 |
| 문서 생성 | - | /api/generate-document, 전세권설정등기 신청서 등 |
| API 데이터 허브 | /api-hub | 공공 API 통합 대시보드 |
| 관리자 대시보드 | /admin | 사용자 관리, 감사 로그, ML 학습 데이터 관리 |

### 독자 알고리즘 (8종, 특허 출원 대상)

| # | 알고리즘 | 파일 | LOC | 설명 |
|---|----------|------|-----|------|
| 1 | **V-Score** | v-score.ts | 850 | 5개 정보원 가중 융합 통합 위험 지수 |
| 2 | **리스크 스코어링** | risk-scoring.ts | 937 | 12개 위험 요소 기반 100점 스케일 종합 점수 |
| 3 | **사기 위험 모델** | fraud-risk-model.ts | 680 | 15개 피처 Gradient Boosting 앙상블 (SHAP 유사 기여도) |
| 4 | **등기부 파서** | registry-parser.ts | 598 | 순수 TypeScript 비정형 한글 등기 텍스트 파싱 (6단계 파이프라인) |
| 5 | **검증 엔진** | validation-engine.ts | 1,232 | 데이터 품질 4단계 검증 |
| 6 | **시세 예측** | prediction-engine.ts | 465 | 5-모델 앙상블 3시나리오 예측 |
| 7 | **이상 탐지** | anomaly-detector.ts | - | Holt/CUSUM/Bollinger 기반 |
| 8 | **가중치 튜닝** | adaptive-weight-tuner.ts | - | Thompson Sampling 기반 자동 캘리브레이션 |

**V-Score 정보원 가중치** (5개):

| 정보원 | 가중치 | 분석 대상 |
|--------|-------|----------|
| 등기 권리 | 30% | 소유권, 근저당, 가압류 |
| 가격/전세 비율 | 25% | 시장 안정성 |
| 계약 조건 | 20% | 계약 리스크 |
| 임대인 지표 | 15% | 임대인 재무 위험 |
| 지역 위험 | 10% | 사기 발생 빈도 |

**리스크 스코어링 등급 체계**: A (85+) / B (70-84) / C (50-69) / D (30-49) / F (30 미만)

### 자동화 (Cron Jobs)

| 작업 | 스케줄 | 설명 |
|------|--------|------|
| 등기 모니터링 | 매일 09:00 | 감시 중인 부동산 등기 변동 확인 |
| 사기 데이터 수집 | 매주 월 03:00 | 전세사기 사례 데이터 자동 수집 |

### 요금제 및 비즈니스 모델

| 플랜 | 월 요금 | 일일 한도 | 주요 기능 |
|------|--------|---------|---------|
| 무료 | 0원 | 2~5회 | 권리분석, 기본 대시보드, AI 어시스턴트 (제한) |
| 프로 | 50,000원 | 50회 | 모든 분석 기능, 계약서 AI 검토, PDF 리포트, AI 무제한 |
| 비즈니스 | 100,000원 | 100회 | 프로 + 포트폴리오 관리, 우선 지원 |

### 테스트 현황

| 테스트 파일 | 대상 모듈 |
|-------------|-----------|
| registry-parser.test.ts | 등기부등본 파싱 정확도 |
| validation-engine.test.ts | 4단계 검증 로직 |
| risk-scoring.test.ts | 리스크 점수 계산 |
| tax-calculator.test.ts | 세금 계산 시나리오 |
| contract-analyzer.test.ts | 계약 조항 분석 |
| price-estimation.test.ts | 유사 매물 매칭 |
| prediction-engine.test.ts | 예측 모델 |
| crypto.test.ts | 암호화/복호화 |
| csrf.test.ts | CSRF 토큰 검증 |

커버리지 기준: Statements 50% / Branches 40% / Functions 50% / Lines 50%

---

## Data Models
[coverage: high -- 3 sources]

Prisma 기반 25개 모델 (PostgreSQL):

| 카테고리 | 모델 | 설명 |
|----------|------|------|
| 인증 | User, Account, Session, VerificationToken | NextAuth v5 표준 스키마 |
| 핵심 비즈니스 | Analysis, Asset | 분석 결과 저장, 사용자 자산 포트폴리오 |
| 구독/결제 | Subscription, Payment | 플랜 관리 (FREE/PRO/BUSINESS), 결제 기록 |
| 사용량 관리 | RateLimit, DailyUsage | 분당 슬라이딩 윈도우, 역할별 일일 카운터 |
| 알림/모니터링 | NotificationSetting, MonitoredProperty, MonitoringAlert, Announcement | 등기 변동 감시, 알림 설정 |
| 검증/공유 | VerificationRequest, SharedReport | P2P 교차 검증, 리포트 공유 |
| ML/사기 데이터 | FraudCase, TrainingData, DomainVocabulary, SystemSetting | 사기 사례 히트맵, AI 학습 데이터 (암호화 저장), 부동산 용어 사전 |
| 감사 | AuditLog | 완전한 감사 추적 (사용자, 행위, IP, 타임스탬프) |

**역할별 일일 분석 한도**:

| 역할 | 한도 | 설명 |
|------|------|------|
| GUEST | 2회 | 미인증 (IP 기반) |
| PERSONAL | 5회 | 일반 사용자 |
| BUSINESS | 50회 | 사업자 계정 |
| REALESTATE | 100회 | 공인중개사 |
| ADMIN | 9,999회 | 관리자 |

**인증 방식**: NextAuth v5, JWT(JWE 암호화) + httpOnly 쿠키  
**소셜 로그인**: Google, Naver OAuth (카카오는 개발자 콘솔 설정 미완료로 비활성화)  
**비밀번호**: bcryptjs 해싱

---

## External Integrations
[coverage: high -- 3 sources]

| API | 제공기관 | 용도 | 호출 방식 |
|-----|---------|------|-----------|
| OpenAI (gpt-4.1-mini) | OpenAI | 자연어 분석, 계약서 해석, AI 채팅, 학습 데이터 피드백 | 서버사이드 전용, Cost Guard 적용 |
| MOLIT 실거래가 | 국토교통부 | 아파트/전세 실거래 데이터 (12개월 이력, 전세가율) | REST API |
| 건축물대장 | 국토교통부 | 건물 정보 조회 (건축 연도, 구조, 면적) | REST API |
| 대법원 판례 | 법제처 | 부동산 관련 판례 검색 | REST API |
| ECOS 기준금리 | 한국은행 | 거시경제 지표 | REST API |
| Kakao Maps SDK | 카카오 | 지도 시각화, 지오코딩 | 클라이언트 SDK |

**환경 변수 목록**:
- `OPENAI_API_KEY` — OpenAI API 키
- `DATABASE_URL` — Neon PostgreSQL 연결 문자열
- `DIRECT_URL` — 마이그레이션용 직접 연결
- `AUTH_SECRET` — NextAuth 암호화 키
- `NEXT_PUBLIC_KAKAO_MAP_KEY` — Kakao Maps 공개 키 (클라이언트 노출)
- `MOLIT_API_KEY` — 국토교통부 API 키

---

## Deployment
[coverage: high -- 3 sources]

| 항목 | 설정 |
|------|------|
| 호스팅 플랫폼 | Vercel (Serverless Functions + Edge Network CDN) |
| 런타임 | Node.js Serverless + Edge (middleware) |
| DB 호스팅 | Neon Serverless PostgreSQL (Connection Pooling 자동 관리) |
| 도메인 | vestra-plum.vercel.app |
| GitHub | watchers0930/vestra (기술 보고서 기준), bmicns/vestra (완료보고서 기준) |
| CI/CD | Vercel 자동 배포 (Git Push 트리거) |
| 환경 분리 | Production / Development |

**보안 헤더 (next.config.ts)**:
- `Content-Security-Policy` (OpenAI + Kakao Maps 허용)
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (max-age=31536000; includeSubDomains)
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (카메라, 마이크, 위치 차단)

**보안 모듈**:

| 모듈 | 파일 | 내용 |
|------|------|------|
| 암호화 | crypto.ts | AES-256-GCM (학습 데이터, 시스템 설정, 세션 토큰 JWE) |
| CSRF 방어 | csrf.ts | 토큰 기반 검증 |
| XSS 방지 | sanitize.ts | DOMPurify 기반 입력 살균 (기본 50,000자, 필드별 500자 제한) |
| Rate Limit | rate-limit.ts | DB 기반 분당/일일 제한 (슬라이딩 윈도우) |
| 감사 로그 | audit-log.ts | 전체 관리자 활동 기록 (IP, UserAgent, PII 마스킹) |

**GAP 분석 결과** (v2.0.0 commercialization, 2026-03-02):
- 전체 설계 일치율: 88% (PASS)
- 아키텍처 준수율: 90% (PASS)
- 컨벤션 준수율: 93% (PASS)

---

## Key Decisions
[coverage: high -- 3 sources]

| 결정 | 근거 |
|------|------|
| 핵심 분석에 LLM 미사용 | 비용 예측 가능성, 응답 일관성, 오프라인 가용성 확보 |
| App Router Only | pages/ 디렉토리 미사용, 서버 컴포넌트 초기 로딩 최적화 |
| DB 기반 Rate Limit | 서버리스 인스턴스 간 정확한 카운트 보장 |
| JWT 암호화 (JWE) | Edge 미들웨어에서 Prisma 없이 인증 처리 |
| AES-256-GCM | 민감 학습 데이터 및 시스템 설정 보호 |
| 규칙 기반 Gradient Boosting | ML 라이브러리 의존성 없이 설명 가능한 사기 탐지 (SHAP 유사 기여도) |
| V-Score 가중 융합 | 이질적 데이터를 단일 지표로 통합, 비선형 상호작용 반영 |
| gpt-4.1-mini 선택 | 비용 효율적 AI 의견 생성 (핵심 분석은 자체 알고리즘이 수행) |
| Neon Serverless PostgreSQL | Vercel 서버리스 환경과의 호환성, 연결 풀링 자동 관리 |
| 인증 없이 API 공개 | Rate Limit + Cost Guard로 비용 보호 (진입 장벽 최소화) |

---

## Gotchas
[coverage: high -- 4 sources]

**운영 환경**:
- Vercel 함수 타임아웃: 10~60초. AI 분석 API는 타임아웃 발생 가능성 있음
- Neon Serverless 연결 제한: 동시 연결 수 초과 시 에러 가능. `DIRECT_URL`은 마이그레이션 전용 (Pooling vs Direct URL 분리 필수)
- Rate Limit DB 오류 시 요청 허용 (가용성 우선 정책)
- `AUTH_SECRET` 미설정 시 서버 시작 차단 (env.ts에서 필수화)

**알고리즘 파라미터 미검증 경고**:
- 위험도 스코어링의 감점 수치(30/25/20점 등), V-Score 가중치, 15-피처 가중치, 증폭계수(1.3~1.7)는 **도메인 전문가 휴리스틱 기반 초기값**이며, 실증 데이터(HUG 보증사고, 법원 경매 등)를 통한 캘리브레이션이 아직 완료되지 않음
- 세법 기반 수식과 ARIMA 등 학술 표준 방법론은 검증 완료
- 특허 출원은 실증 검증 완료 후 진행 예정

**검증 로드맵**:
- Phase 1 (1~2개월): HUG, 법원 경매, 전세사기 판례 데이터 수집
- Phase 2 (2~3개월): 후향적 검증 (목표: 민감도 80%+, 오경보율 20% 이하)
- Phase 3 (1~2개월): Thompson Sampling 기반 자동 캘리브레이션
- Phase 4 (지속): 실서비스 A/B 테스트 및 분기별 리뷰

**알려진 미완성 항목**:
- 카카오 로그인: 개발자 콘솔 설정 미완료로 비활성화 상태
- AiDisclaimer 컴포넌트: 구현은 완료됐으나 분석 결과 페이지에 실제 렌더링 미연결 (법적 준수 위험)
- PdfDownloadButton 컴포넌트: 구현 완료, 페이지 연결 미완
- PWA Service Worker: manifest + 아이콘은 완료, SW 미등록으로 오프라인 지원 불가
- 구독 취소 UI: API는 구현됐으나 프로필 페이지 버튼 미연결
- 결제 게이트웨이(PG): 구독 API 구조는 준비됐으나 실제 PG 미연동 ("결제 시스템 준비 중")

**리팩터링 대기 파일** (500줄 초과):
- `app/(app)/admin/page.tsx` — 1,099줄
- `app/(app)/prediction/page.tsx` — 950줄
- `app/(app)/contract/page.tsx` — 882줄
- `app/(app)/dashboard/page.tsx` — 664줄
- `app/(app)/expert-connect/page.tsx` — 621줄
- `app/(map)/price-map/page.tsx` — 616줄
- `app/(app)/rights/page.tsx` — 597줄
- `app/(app)/jeonse/analysis/page.tsx` — 518줄
- `app/(app)/feasibility/page.tsx` — 508줄

---

## Sources

- `/Users/watchers/Desktop/vestra/CLAUDE.md`
- `/Users/watchers/Desktop/vestra/README.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/VESTRA-플랫폼-완료보고서.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-REPORT-v2.3.1.md`
- `/Users/watchers/Desktop/vestra/docs/03-analysis/vestra-v2-commercialization.analysis.md`
- `/Users/watchers/Desktop/vestra/package.json`

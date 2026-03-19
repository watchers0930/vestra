# VESTRA 기술 현황 보고서

**버전**: v2.3.1
**작성일**: 2026-03-13
**프로젝트 기간**: 2026-02-24 ~ 현재 (18일)
**총 커밋**: 89회
**프로덕션 URL**: https://vestra-plum.vercel.app

---

## 1. 프로젝트 개요

VESTRA는 LLM 기반 통합 AI 부동산 자산관리 플랫폼으로, 전세 안전성 분석, 등기부등본 권리분석, 계약서 검토, 세금 시뮬레이션, 시세전망 등 부동산 관련 AI 서비스를 제공한다. 특허 출원 대상인 8종의 독자 알고리즘을 포함하며, 한국 부동산 시장에 특화된 분석 엔진을 갖추고 있다.

---

## 2. 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| 런타임 | React | 19.2.3 |
| 언어 | TypeScript | 5.x (strict) |
| 스타일링 | Tailwind CSS | v4 (PostCSS) |
| 데이터베이스 | PostgreSQL (Neon Serverless) | - |
| ORM | Prisma | 6.19.2 |
| 인증 | NextAuth | v5-beta.30 |
| AI | OpenAI API (gpt-4.1-mini) | - |
| 지도 | Kakao Maps SDK, Leaflet | 1.2.1 / 5.0.0 |
| 차트 | Recharts | 3.7.0 |
| 테스트 | Vitest | 4.0.18 |
| 배포 | Vercel | - |

---

## 3. 코드 규모

| 항목 | 수치 |
|------|------|
| 총 소스 코드 (app + lib + components) | 31,315 LOC |
| 테스트 코드 | 1,497 LOC |
| 문서 | 3,549 LOC |
| 페이지 수 | 26개 |
| API 라우트 수 | 49개 |
| 컴포넌트 수 | 37개 |
| 라이브러리 모듈 수 | 47개 |
| DB 모델 수 | 25개 (Prisma, 374 LOC) |
| 테스트 파일 수 | 9개 |

---

## 4. 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│                    Client (Browser)              │
│  Next.js App Router (SSR + CSR)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ 26 Pages │ │ 37 Comps │ │ Kakao/Leaflet Map│ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────────┬───────────────────────────┘
                       │ HTTPS
┌──────────────────────▼───────────────────────────┐
│               Vercel Serverless Functions         │
│  ┌──────────────────────────────────────────────┐│
│  │ 49 API Routes                                ││
│  │ ┌──────────┐ ┌────────────┐ ┌─────────────┐ ││
│  │ │Rate Limit│ │ CSRF Guard │ │ Auth (JWT)  │ ││
│  │ └──────────┘ └────────────┘ └─────────────┘ ││
│  │ ┌──────────────────────────────────────────┐ ││
│  │ │ Core Analysis Engine                     │ ││
│  │ │ V-Score, Cross-Analysis, Fraud Risk,     │ ││
│  │ │ Cascade, Confidence, Registry Parser     │ ││
│  │ └──────────────────────────────────────────┘ ││
│  └──────────────────────────────────────────────┘│
└──────┬──────────────┬──────────────┬─────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼──────────────┐
│ Neon PgSQL  │ │ OpenAI API│ │ 공공 API            │
│ (Prisma ORM)│ │ gpt-4.1   │ │ MOLIT, 건축물대장,  │
│ 25 Models   │ │ -mini     │ │ 대법원, 학술검색     │
└─────────────┘ └───────────┘ └────────────────────┘
```

---

## 5. 주요 기능 현황

### 5.1 핵심 분석 기능 (6종)

| 기능 | 경로 | 상태 | 설명 |
|------|------|------|------|
| 권리분석 | /rights | 완료 | 등기부등본 기반 권리관계 분석 |
| 계약검토 | /contract | 완료 | 계약서 조항별 위험도 탐지 |
| 세무시뮬레이션 | /tax | 완료 | 취득세/양도세/종부세 계산 |
| 시세전망 | /prediction | 완료 | 1년/5년/10년 가격 예측 |
| 등기분석 | /registry | 완료 | 등기부등본 파싱 및 분석 |
| AI 어시스턴트 | /assistant | 완료 | OpenAI 기반 대화형 상담 |

### 5.2 전세 보호 기능 (7종)

| 기능 | 경로 | 상태 |
|------|------|------|
| 절차 안내 | /jeonse | 완료 |
| 전세 안전 분석 | /jeonse/analysis | 완료 |
| 전입신고 | /jeonse/transfer | 완료 |
| 확정일자 | /jeonse/fixed-date | 완료 |
| 전세권설정등기 | /jeonse/jeonse-right | 완료 |
| 임차권등기명령 | /jeonse/lease-registration | 완료 |
| 주택임대차 신고 | /jeonse/lease-report | 완료 |

### 5.3 부가 기능

| 기능 | 경로 | 상태 |
|------|------|------|
| 대시보드 (포트폴리오) | /dashboard | 완료 |
| 상호검증 (임대인/임차인) | /verification | 완료 |
| 분석보고서 | /report | 완료 |
| API 데이터 허브 | /api-hub | 완료 |
| 관리자 대시보드 | /admin | 완료 |
| 프로필 설정 | /profile | 완료 |

---

## 6. 독자 알고리즘 (특허 출원 대상, 8종)

| # | 알고리즘 | 파일 | 설명 |
|---|----------|------|------|
| 1 | **V-Score** | v-score.ts | 5개 데이터 소스 통합 위험도 점수 |
| 2 | **Fraud Risk Model** | fraud-risk-model.ts | 15개 피처 그래디언트 부스팅 앙상블 |
| 3 | **Cross-Analysis** | cross-analysis.ts | 다요소 교차 상관관계 분석 |
| 4 | **Cascade Engine** | cascade-engine.ts | 연쇄적 리스크 증폭 계산 |
| 5 | **Confidence Propagation** | confidence-engine.ts | 데이터 신뢰도 전파 프레임워크 |
| 6 | **Redemption Simulator** | redemption-simulator.ts | 경매 배당 시뮬레이션 |
| 7 | **Registry Parser** | registry-parser.ts | 순수 TypeScript 등기부등본 파싱 |
| 8 | **Domain Vocabulary** | domain-vocabulary.ts | 법률 용어 자동추출 시스템 |

---

## 7. 인증 및 보안

### 7.1 인증
- **방식**: NextAuth v5, JWT 기반 세션
- **소셜 로그인**: Google, Kakao, Naver + Credentials
- **동적 OAuth**: DB 기반 OAuth 키 관리 (관리자 설정 가능)
- **역할 기반 접근 제어**: GUEST → PERSONAL → BUSINESS → REALESTATE → ADMIN

### 7.2 보안 모듈

| 모듈 | 파일 | 내용 |
|------|------|------|
| 암호화 | crypto.ts | AES-256-GCM (학습 데이터, 시스템 설정) |
| CSRF 방어 | csrf.ts | 토큰 기반 검증 |
| XSS 방지 | sanitize.ts | DOMPurify 기반 입력 살균 |
| Rate Limit | rate-limit.ts | DB 기반 분당/일일 제한 |
| 감사 로그 | audit-log.ts | 전체 관리자 활동 기록 (IP, UserAgent) |

### 7.3 보안 헤더 (next.config.ts)
- Content-Security-Policy (CSP)
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options: nosniff
- Permissions-Policy (카메라, 마이크, 위치 차단)

---

## 8. 데이터베이스 모델 (25개)

| 카테고리 | 모델 | 수 |
|----------|------|----|
| 인증 | Account, Session, VerificationToken | 3 |
| 사용자/분석 | User, Analysis, Asset, RateLimit, DailyUsage | 5 |
| 구독/결제 | Subscription, Payment, NotificationSetting | 3 |
| 모니터링 | MonitoredProperty, MonitoringAlert, Announcement | 3 |
| 검증/공유 | VerificationRequest, SharedReport, AuditLog | 3 |
| 사기/ML | FraudCase, TrainingData, DomainVocabulary, SystemSetting | 4 |

**사용자 등급별 일일 분석 한도**:
- GUEST: 2회 / PERSONAL: 5회 / BUSINESS: 50회 / REALESTATE: 100회 / ADMIN: 무제한

---

## 9. 외부 연동 API

| API | 용도 | 호출 방식 |
|-----|------|-----------|
| OpenAI (gpt-4.1-mini) | 자연어 분석, 계약서 해석, AI 채팅 | 서버사이드, Cost Guard 적용 |
| MOLIT (국토교통부) | 실거래가, 공시가격 | REST API |
| 건축물대장 API | 건물 정보 조회 | REST API |
| 대법원 판례 API | 관련 판례 검색 | REST API |
| Kakao Maps SDK | 지도 표시, 지오코딩 | 클라이언트 SDK |
| 학술 검색 | 논문 참고자료 | REST API |

---

## 10. 자동화 (Cron Jobs)

| 작업 | 스케줄 | 설명 |
|------|--------|------|
| 등기 모니터링 | 매일 09:00 | 감시 중인 부동산 등기 변동 확인 |
| 사기 데이터 수집 | 매주 월 03:00 | 전세사기 사례 데이터 자동 수집 |

---

## 11. 테스트 현황

| 테스트 파일 | 대상 모듈 |
|-------------|-----------|
| contract-analyzer.test.ts | 계약서 분석 엔진 |
| crypto.test.ts | 암호화 모듈 |
| csrf.test.ts | CSRF 방어 |
| prediction-engine.test.ts | 시세예측 엔진 |
| price-estimation.test.ts | 가격 추정 |
| registry-parser.test.ts | 등기부등본 파서 |
| risk-scoring.test.ts | 위험도 산정 |
| tax-calculator.test.ts | 세금 계산기 |
| validation-engine.test.ts | 유효성 검증 |

**커버리지**: 핵심 분석 엔진 9개 모듈 테스트 완료 (1,497 LOC)

---

## 12. 최근 개발 이력 (주요 마일스톤)

| 날짜 | 버전 | 주요 내용 |
|------|------|-----------|
| 02-24 | 1.0.0 | 프로젝트 초기 생성 |
| 02-26 | 2.0.0 | 대규모 기능 확장 (전세 보호 모듈) |
| 02-27 | 2.1.0 | 사이드바 리디자인, AI 면책 조항 |
| 03-04~05 | - | 관리자 대시보드 (소셜 로그인/PG 설정) |
| 03-06 | - | 기술특허 강화 알고리즘 8종 구현 |
| 03-08 | - | RFP 기반 9개 고도화 항목, 보안 모듈 |
| 03-09 | - | 관리자 대시보드 강화, 분석 엔진 고도화 |
| 03-10 | - | V-Score/교차분석/사기위험도 파이프라인 완성 (Gap 100%) |
| 03-11 | - | ML 학습관리 탭, 도메인 용어 시스템 |
| 03-12 | - | Apple 디자인 시스템 적용, B/W 아이콘 통일 |
| 03-13 | 2.3.1 | ML 일괄 승인, 사이드바 툴팁 |

---

## 13. 배포 환경

| 항목 | 설정 |
|------|------|
| 플랫폼 | Vercel (Hobby) |
| 런타임 | Node.js Serverless + Edge (Middleware) |
| DB 호스팅 | Neon (Connection Pooling) |
| 도메인 | vestra-plum.vercel.app |
| Git | GitHub (watchers0930/vestra) |
| CI/CD | Vercel 자동 배포 (Git Push 트리거) |

---

## 14. 프로젝트 요약 수치

| 지표 | 값 |
|------|-----|
| 개발 기간 | 18일 |
| 총 커밋 수 | 89회 |
| 일평균 커밋 | ~5회 |
| 소스 코드 | 31,315 LOC |
| 페이지 | 26개 |
| API 엔드포인트 | 49개 |
| DB 모델 | 25개 |
| 독자 알고리즘 | 8종 |
| 외부 API 연동 | 6개 |
| 테스트 | 9개 (1,497 LOC) |

---

*본 보고서는 Vestra v2.3.1 기준으로 자동 생성되었습니다.*

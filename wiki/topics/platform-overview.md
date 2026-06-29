---
topic: platform-overview
last_compiled: 2026-06-22
sources: 13
---

# 플랫폼 전체 개요 (Platform Overview)

---

## Purpose
[coverage: high -- 6 sources]

VESTRA는 LLM 기반 통합 AI 부동산 자산관리 플랫폼이다. 전세사기 예방, 등기부등본 권리분석, 계약서 AI 검토, 세금 시뮬레이션, 시세전망 등 부동산 거래 전 과정에서 AI 분석을 제공한다.

**핵심 가치**:
- 비전문가도 부동산 권리관계를 이해할 수 있는 직관적 AI 리포트 생성
- 핵심 분석 엔진은 LLM에 의존하지 않는 순수 TypeScript 구현 (비용 예측 가능성 + 결과 일관성 확보)
- 전세사기 등 부동산 거래 피해를 사전에 예방하는 AI 위험 진단

**운영사**: BMI C&S (대표이사 김동의)
**배포 URL**: https://vestra-plum.vercel.app
**테스트 URL**: https://t-vestra.vercel.app
**GitHub**: bmicns/vestra (Private)
**현재 버전**: v5.x (package.json 기준)
**사업자**: (주)비엠아이씨엔에스, 초기창업패키지 신청 대상 아이템

**종합 품질 평점**: **9.2/10 (A등급)** — 12개 영역 평가 (2026-03-23, v4.5.1 기준)
- 만점(10.0): UX, 에러핸들링, 디자인시스템 3개 영역
- 9.0 이상: 보안(9.0), 접근성(9.5), 성능(9.5), 랜딩(9.5), API 품질(9.0) 포함 8개 영역

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
│  │  페이지 (27)  │  │  API (51)    │  │  서버 컴포넌트│  │
│  └──────────────┘  └──────┬───────┘  └──────────────┘  │
│                           │                              │
│  ┌────────────────────────▼─────────────────────────┐   │
│  │              lib/ (비즈니스 로직, 88 모듈)          │   │
│  │  핵심 엔진 (LLM 비의존, 순수 TypeScript):          │   │
│  │  registry-parser / validation-engine / risk-scoring│  │
│  │  v-score / fraud-risk-model / prediction-engine   │   │
│  │  integrity-chain / adaptive-weight-tuner 등        │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
    ┌──────────▼──┐  ┌───────▼────┐  ┌──────▼──────────┐
    │  Neon DB    │  │  OpenAI    │  │  외부 공공 API   │
    │  PostgreSQL │  │  gpt-4.1   │  │  10종 (MOLIT,    │
    │  28 모델    │  │  -mini     │  │  BOK, REB, KOSIS,│
    └─────────────┘  └────────────┘  │  VWorld, 건축물  │
                                     │  대장, 대법원 등) │
                                     └──────────────────┘
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
| 지도 | Kakao Maps SDK, Leaflet | - |
| 차트 | Recharts | 3.7.0 |
| 테스트 | Vitest | 4.0.18 |
| PWA | Serwist | 9.5.7 |
| 배포 | Vercel | Serverless |
| 암호화 | AES-256-GCM | Node.js crypto |

### 코드 규모 (v4.5.1 기준)

| 항목 | 수치 |
|------|------|
| API 라우트 수 | 51개 |
| 페이지 수 | 27개 |
| UI 컴포넌트 수 | 80개 |
| 라이브러리 모듈 수 | 88개 |
| DB 모델 수 | 28개 |
| 테스트 파일 수 | 14개 |
| 독자 알고리즘 | 7~9종 (특허 출원 대상) |
| 외부 API 연동 | 10종 |

---

## Features
[coverage: high -- 5 sources]

### 핵심 분석 기능 (AI 기반)

| 기능 | 경로 | 주요 API | 설명 |
|------|------|----------|------|
| 권리분석 | /rights | /api/analyze-unified | 등기부등본 업로드 → 8대 안전진단, 권원보험 평가, 특약 자동 생성 |
| 계약서 AI 검토 | /contract | /api/analyze-contract | 조항별 위험도, 누락 조항 감지, 판례 인용 |
| 세무 시뮬레이션 | /tax | 내부 계산 | 취득세/양도세/종부세 시나리오 비교 |
| 시세전망 | /prediction | /api/predict-value | 5모델 앙상블, 1년/5년/10년 3시나리오, 이상탐지, 백테스팅 |
| 전세 안전 분석 | /jeonse | /api/analyze-unified | V-Score 기반 전세사기 위험도 |
| 사업성분석 (SCR) | /feasibility | /api/feasibility/* | V-Score 기반 사업성 종합 평가 |
| 전세사기 위험 진단 | - | /api/fraud-risk | 15-피처 예측 모델 |

### 도구 기능

| 기능 | 경로 | 설명 |
|------|------|------|
| 시세지도 | /price-map | 카카오 지도 위 아파트별 시세 색상 마커, 가격변화 Top 10 |
| 공시가격 조회 | /official-price | 개별공시지가/공동주택/개별주택 3종 통합 (VWorld API) |
| 등기감시 | /monitoring | 등기부 변동 실시간 감시, Ed25519 서명 무결성 증명서 |
| API 데이터 허브 | /api-hub | 공공 API 연동 현황 대시보드 |
| 대출 가심사 | /loan-check | 7대 은행 전세대출 조건 비교 시뮬레이션 |
| 의사결정 리포트 | /decision-report | 대출+시세+세금+보증보험+임대인 프로파일 통합 Go/NoGo 판정 |
| 임대인 프로파일 | /landlord-profile | 소유부동산, 근저당 비율, 소송 이력 → 안전등급(A~F) |
| 상호검증 | /verification | 임대인/임차인 분석 결과 교차 검증 |
| AI 신뢰도 | /ai-trust | 모델 정확도/전문가 검증 결과 투명 공개 |

### 전세 보호 허브 (/jeonse, 하위 9개 메뉴)

| 메뉴 | 기능 |
|------|------|
| 전세 안전 분석 | 보증금/시세/근저당 → 사기 위험도 + 보증보험 가입 판단 |
| 전입신고 가이드 | 절차 4단계 + 정부24 링크 |
| 확정일자 가이드 | 우선변제권 확보 절차 |
| 전세권설정등기 | 물권화 6단계 + 비용 안내 |
| 임차권등기명령 | 보증금 미반환 시 권리 유지 |
| 주택임대차 신고 | 30일 이내 의무신고 → 확정일자 자동 부여 |
| 계약 체크리스트 | 거래유형별 45~50개 항목 + 진행률 추적 |
| 전세 vs 월세 비교 | 총 비용 비교 시뮬레이터 |
| 이사비용 계산기 | 이사비 + 중개수수료 + 세금 총합 |

### AI 어시스턴트 / 전문가 연결

| 기능 | 경로 | 설명 |
|------|------|------|
| AI 어시스턴트 | /assistant | 최근 분석 이력을 컨텍스트로 활용한 부동산 AI Q&A |
| 전문가 연결 | /expert-connect | 공인중개사/법무사 상담 예약, AI 분석 전문가 검증 |

### 관리자 기능 (13개 탭, ADMIN 전용)

| 카테고리 | 탭 | 설명 |
|---------|-----|------|
| 현황 | 개요 | 사용자/분석/등록자산 KPI, 일일 사용량 추이 |
| 사용자 관리 | 회원 관리 | 역할 변경 (PERSONAL → BUSINESS → REALESTATE → ADMIN), 한도 편집 |
| 사용자 관리 | 인증 관리 | 사업자등록증 기반 기업 인증 심사, 승인 시 역할 업그레이드 |
| 콘텐츠 | 분석 이력 | 전체 사용자 분석 기록 조회/필터 |
| 콘텐츠 | 공지사항 | 서비스 공지 CRUD, 대시보드 자동 노출 |
| 콘텐츠 | 뉴스/정책 | 부동산 뉴스 자동 수집, AI 채팅 컨텍스트 자동 반영 |
| AI/ML | ML 학습관리 | 등기부 파싱 학습 데이터 등록/검수, PII 암호화(AES-256), JSONL 내보내기 |
| AI/ML | 가중치 튜닝 | Beta-binomial 베이지안 기반 모델 가중치 자동 조정 |
| AI/ML | 무결성 감사 | SHA-256 해시 체인 검증, 변조 감지 |
| 시스템 | API KEY | OAuth/PG 등 외부 API 키 AES-256-GCM 암호화 저장 |
| 시스템 | 보증보험 규칙 | HUG/SGI 보증보험 가입 조건 설정 + 버전 관리 |
| 시스템 | 대출 금리 | FSS 연동 7대 은행 전세대출 금리 관리 |
| 시스템 | 계정 설정 | 관리자 비밀번호 변경 |

### 독자 알고리즘 (특허 출원 대상)

| # | 알고리즘 | 파일 | 설명 |
|---|----------|------|------|
| 1 | **V-Score** | v-score.ts | 5개 소스 비선형 결합 통합 위험 지수 |
| 2 | **리스크 스코어링** | risk-scoring.ts | 12개 위험 요소 기반 100점 스케일 |
| 3 | **사기 위험 모델** | fraud-risk-model.ts | 15-피처 예측 + SHAP 유사 기여도 |
| 4 | **등기부 파서** | registry-parser.ts | 순수 TypeScript 등기부등본 파싱 |
| 5 | **검증 엔진** | validation-engine.ts | 4계층 23개 검증기 |
| 6 | **시세 예측** | prediction-engine.ts | 5-모델 앙상블 3시나리오 |
| 7 | **이상 탐지** | anomaly-detector.ts | Holt/CUSUM/Bollinger 기반 |
| 8 | **가중치 튜닝** | adaptive-weight-tuner.ts | Thompson Sampling 자동 캘리브레이션 |
| 9 | **SCR 오케스트레이터** | scr-orchestrator.ts | 사업성 분석 파이프라인 |

### 요금제 및 비즈니스 모델

| 플랜 | 월 요금 | 일일 한도 | 주요 기능 |
|------|--------|---------|---------|
| 무료 | 0원 | 2~5회 | 권리분석, 기본 대시보드, AI 어시스턴트 (제한) |
| 프로 | 50,000원 | 50회 | 모든 분석 기능, 계약서 AI 검토, PDF 리포트 |
| 비즈니스 | 100,000원 | 100회 | 프로 + 포트폴리오 관리, 우선 지원 |

---

## Data Models
[coverage: high -- 3 sources]

Prisma 기반 28개 모델 (PostgreSQL):

| 카테고리 | 모델 | 설명 |
|----------|------|------|
| 인증 | Account, Session, VerificationToken | NextAuth v5 표준 스키마 |
| 사용자 | User | 역할 기반(5등급) 사용자 |
| 핵심 비즈니스 | Analysis, Asset | 분석 결과 저장, 사용자 자산 포트폴리오 |
| 구독/결제 | Subscription, Payment | 플랜 관리, 결제 기록 |
| 사용량 관리 | RateLimit, DailyUsage | 슬라이딩 윈도우, 역할별 일일 카운터 |
| 알림/모니터링 | NotificationSetting, MonitoredProperty, MonitoringAlert, Announcement | 등기 변동 감시 |
| 검증/공유 | VerificationRequest, SharedReport | P2P 교차 검증 |
| ML/사기 데이터 | FraudCase, TrainingData, DomainVocabulary, SystemSetting | 사기 사례 DB (42건), NLP 학습 데이터 (52건) |
| 감사 | AuditLog | 완전한 감사 추적 |
| 사업성 | FeasibilityReport, FeasibilityFile, BenchmarkCache | SCR 보고서 |
| 적응형 | WeightConfig, WeightFeedback | 가중치 자동 튜닝 |
| 무결성 | IntegrityRecord | Merkle 트리 무결성 체인 |

**역할별 일일 분석 한도**:

| 역할 | 한도 | 설명 |
|------|------|------|
| GUEST | 2회 | 미인증 (IP 기반) |
| PERSONAL | 5회 | 일반 사용자 |
| BUSINESS | 50회 | 사업자 계정 |
| REALESTATE | 100회 | 공인중개사 |
| ADMIN | 9,999회 | 관리자 |

**인증 방식**: NextAuth v5, JWT(JWE 암호화) + httpOnly 쿠키
**소셜 로그인**: Google, Naver OAuth
**비밀번호**: bcryptjs 해싱

---

## External Integrations
[coverage: high -- 3 sources]

| API | 제공기관 | 용도 |
|-----|---------|------|
| OpenAI (gpt-4.1-mini) | OpenAI | 자연어 분석, 계약서 해석, AI 채팅 |
| MOLIT 실거래가 | 국토교통부 | 아파트/전세 실거래 데이터 |
| BOK 기준금리 | 한국은행 | 거시경제 지표 |
| REB 가격지수 | 한국부동산원 | 매매/전세 가격지수 |
| 건축물대장 | 건축물대장 API | 건물 상세 정보 |
| 대법원 판례 | 법제처 | 부동산 관련 판례 검색 |
| VWorld NED | 공간정보 오픈플랫폼 | 공시가격 (개별공시지가/공동주택/개별주택) |
| K-apt | 국토교통부 | 공동주택 단지목록/기본정보/상세정보 |
| KOSIS 통계 | 통계청 | 인구 동향, 주택 공급 |
| Kakao Maps SDK | 카카오 | 지도 시각화, 지오코딩 (JS Key: 5ec282d2...) |

---

## Deployment
[coverage: high -- 3 sources]

| 항목 | 설정 |
|------|------|
| 호스팅 플랫폼 | Vercel (Serverless Functions + Edge Network CDN) |
| 런타임 | Node.js Serverless + Edge (middleware) |
| DB 호스팅 | Neon Serverless PostgreSQL (Connection Pooling 자동 관리) |
| 프로덕션 도메인 | vestra-plum.vercel.app |
| 테스트 도메인 | t-vestra.vercel.app |
| CI/CD | Vercel 자동 배포 (Git Push 트리거) |

자세한 배포 절차는 → [[deployment]]

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
| 규칙 기반 Gradient Boosting | ML 라이브러리 의존성 없이 설명 가능한 사기 탐지 |
| 2단계 배포 모델 | t-vestra에서 검증 후 동일 deployment를 운영 승격 |
| 인증 없이 API 공개 | Rate Limit + Cost Guard로 비용 보호 (진입 장벽 최소화) |

---

## Gotchas
[coverage: high -- 4 sources]

**운영 환경**:
- Vercel 함수 타임아웃: 60초. AI 분석 API는 타임아웃 발생 가능성 있음
- Neon Serverless 연결 제한: 동시 연결 수 초과 시 에러 가능. `DIRECT_URL`은 마이그레이션 전용
- Rate Limit DB 오류 시 요청 허용 (가용성 우선 정책)
- `AUTH_SECRET` 미설정 시 서버 시작 차단

**알고리즘 파라미터 미검증 경고**:
- V-Score 가중치, 15-피처 가중치, 증폭계수(1.3~1.7)는 도메인 전문가 휴리스틱 기반 초기값
- 실증 데이터(HUG 보증사고, 법원 경매 등)를 통한 캘리브레이션 미완료

**파일 리팩터링 현황**: 2026-06 기준 500줄 초과 파일 전체 분리 완료

| 파일 | 분리 전 | 분리 후 | 상태 |
|------|--------|--------|------|
| app/(app)/admin/page.tsx | 1,099줄 | 173줄 | ✅ 완료 |
| app/(app)/prediction/page.tsx | 950줄 | 432줄 | ✅ 완료 |
| app/(app)/contract/page.tsx | 882줄 | 232줄 | ✅ 완료 |
| app/(app)/dashboard/page.tsx | 664줄 | 222줄 | ✅ 완료 |
| app/(app)/expert-connect/page.tsx | 621줄 | 52줄 | ✅ 완료 |
| app/(map)/price-map/page.tsx | 616줄 | 85줄 | ✅ 완료 |
| app/(app)/rights/page.tsx | 597줄 | 236줄 | ✅ 완료 |
| app/(app)/jeonse/analysis/page.tsx | 518줄 | 57줄 | ✅ 완료 |
| app/(app)/feasibility/page.tsx | 508줄 | 87줄 | ✅ 완료 |

**알려진 미완성 항목**:
- 카카오 로그인: 개발자 콘솔 설정 미완료로 비활성화 상태
- 결제 게이트웨이(PG): 구독 API 구조는 준비됐으나 실제 PG 미연동

**경쟁 환경** (내집스캔 대비):
- VESTRA 우위: 기능 범위, AI 정교함, 데이터 다양성
- 내집스캔 우위: 전문가 상담, 대출/보험 연계, 임대인 이력 DB, 모바일 접근성, 가격 경쟁력
- 8주 로드맵으로 5개 열세 영역 역전 계획 중 (competitive-advantage.plan.md)

---

## Sources

- `/Users/watchers/Desktop/vestra/CLAUDE.md`
- `/Users/watchers/Desktop/vestra/README.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/VESTRA-플랫폼-완료보고서.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-REPORT-v2.3.1.md`
- `/Users/watchers/Desktop/vestra/docs/VESTRA_사용가이드_슬라이드.md`
- `/Users/watchers/Desktop/vestra/documents/완료보고서-2026-03-23/VESTRA_완료보고서_v4.5.1.md`
- `/Users/watchers/Desktop/vestra/documents/완료보고서-2026-03-23/VESTRA_종합평점_v4.5.1.md`
- `/Users/watchers/Desktop/vestra/documents/사업계획서/VESTRA_사업계획서_현행화_v2.md`
- `/Users/watchers/Desktop/vestra/documents/사업계획서/VESTRA_초기창업패키지_신청서_v3.md`
- `/Users/watchers/Desktop/vestra/docs/03-analysis/vestra-v2-commercialization.analysis.md`
- `/Users/watchers/Desktop/vestra/docs/01-plan/features/competitive-advantage.plan.md`
- `/Users/watchers/Desktop/vestra/package.json`

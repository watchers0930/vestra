# 플랫폼 전체 개요 (Platform Overview)

[coverage: high -- 5 sources: CLAUDE.md, docs/01-SRS.md, docs/TECHNICAL-STATUS-REPORT.md, docs/VESTRA-플랫폼-완료보고서.md, package.json]

---

## Purpose

VESTRA는 LLM 기반 통합 AI 부동산 자산관리 플랫폼이다. 전세사기 예방, 등기부등본 권리분석, 계약서 AI 검토, 세금 시뮬레이션, 시세전망 등 부동산 거래 전 과정에서 AI 분석을 제공한다.

**핵심 가치**: 비전문가도 부동산 권리관계를 이해할 수 있는 직관적 AI 리포트 생성  
**운영사**: BMI C&S (대표이사 김동의)  
**배포 URL**: https://vestra-plum.vercel.app  
**현재 버전**: v5.10.5 (package.json 기준)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                    │
│  Next.js 16 App Router (SSR + CSR)                       │
│  React 19 + Tailwind CSS v4 + Recharts + Kakao/Leaflet   │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼───────────────────────────────────┐
│               Vercel Serverless Functions                 │
│  49개 API Routes + Rate Limit + CSRF Guard + Auth (JWT)  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Core Analysis Engine (lib/)                         │ │
│  │ registry-parser / validation-engine / risk-scoring  │ │
│  │ v-score / fraud-risk-model / confidence-engine      │ │
│  │ cross-analysis / cascade-engine / prediction-engine │ │
│  └─────────────────────────────────────────────────────┘ │
└──────┬──────────────────┬──────────────────┬─────────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼──────┐  ┌───────▼──────────────┐
│ Neon PgSQL  │  │  OpenAI API   │  │ 공공 API              │
│ (Prisma ORM)│  │  gpt-4.1-mini │  │ MOLIT, 건축물대장,    │
│ 25개 모델   │  │               │  │ 대법원, 학술검색, BOK │
└─────────────┘  └───────────────┘  └──────────────────────┘
```

---

## Tech Stack

| 계층 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| 언어 | TypeScript | 5.x (strict) |
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
| 배포 | Vercel | Hobby |

---

## 코드 규모 (TECHNICAL-STATUS-REPORT.md v2.3.1 기준)

| 항목 | 수치 |
|------|------|
| 총 소스 코드 | 31,315 LOC |
| 테스트 코드 | 1,497 LOC |
| 페이지 수 | 26개 |
| API 라우트 수 | 49개+ |
| 컴포넌트 수 | 37개+ |
| 라이브러리 모듈 수 | 47개+ |
| DB 모델 수 | 25개 |
| 독자 알고리즘 | 8종 (특허 출원 대상) |
| 외부 API 연동 | 6개 |
| 테스트 파일 수 | 9개 |

---

## Key Decisions

1. **AI 미사용 핵심 분석**: 파싱/검증/스코어링 엔진 3종은 순수 TypeScript로 구현 (AI 의존성 제거)
2. **App Router Only**: pages/ 디렉토리 미사용, Next.js 16 App Router 기반
3. **인증 없이 API 공개**: Rate Limit + Cost Guard로 비용 보호 (진입 장벽 최소화)
4. **서버사이드 AI 호출**: OpenAI는 API Route에서만 호출 (키 노출 방지)
5. **Neon Serverless DB**: 연결 풀링 제한이 있으므로 쿼리 최적화 필요

---

## Gotchas

- Vercel 함수 타임아웃: 10~60초. AI 분석 API는 타임아웃 발생 가능성 있음
- Neon Serverless 연결 제한: 동시 연결 수 초과 시 에러 가능
- Rate Limit DB 오류 시 요청 허용 (가용성 우선 정책)
- `DIRECT_URL` 환경변수는 마이그레이션 전용 (Neon Pooling vs Direct 분리)
- `AUTH_SECRET` 미설정 시 서버 시작 차단 (env.ts에서 필수화)

---

## Sources

- `/Users/watchers/Desktop/vestra/CLAUDE.md`
- `/Users/watchers/Desktop/vestra/docs/01-SRS.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/VESTRA-플랫폼-완료보고서.md`
- `/Users/watchers/Desktop/vestra/package.json`

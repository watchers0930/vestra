# VESTRA - AI 자산관리 플랫폼

## Project Level: Dynamic

## Overview
LLM 기반 통합 AI 부동산 자산관리 플랫폼. 전세 안전성 분석, 권리분석, 계약서 분석, 세금 계산, 시세전망 등 부동산 관련 AI 서비스를 제공합니다.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: NextAuth v5 (beta)
- **AI**: OpenAI API
- **Maps**: Kakao Maps SDK, Leaflet
- **Charts**: Recharts
- **Deployment**: Vercel

## Project Structure
```
app/                    # Next.js App Router pages
  api/                  # API routes (analyze-contract, analyze-rights, chat, etc.)
  jeonse/              # 전세 관련 페이지 (분석, 양도, 확정일자 등)
  contract/            # 계약서 분석
  tax/                 # 세금 계산
  prediction/          # 시세전망
  rights/              # 권리분석
  assistant/           # AI 어시스턴트
  registry/            # 등기부등본 분석
  api-hub/             # API 허브
components/            # UI 컴포넌트
  common/              # Button, Card, Badge 등 공통 UI
  forms/               # FormInput, SliderInput 등 폼 컴포넌트
  results/             # ScoreGauge, KpiCard 등 결과 표시
  loading/             # LoadingSpinner, StepIndicator
  jeonse/              # 전세 전용 컴포넌트
  prediction/          # 시세전망 지도 컴포넌트
  layout/              # Sidebar, Footer
lib/                   # 유틸리티 및 비즈니스 로직
  openai.ts            # OpenAI 클라이언트
  prisma.ts            # Prisma 클라이언트
  tax-calculator.ts    # 세금 계산 엔진
  registry-parser.ts   # 등기부등본 파서
  risk-scoring.ts      # 위험도 점수 산정
  validation-engine.ts # 유효성 검증
  molit-api.ts         # 국토교통부 API
  building-api.ts      # 건축물대장 API
  court-api.ts         # 대법원 판례 API
prisma/                # Prisma 스키마
docs/                  # PDCA 문서
```

## 리팩터링 작업 규칙 (파일 분리 진행 중)

> 브랜치: `refactor/file-split` — main은 절대 직접 수정하지 않는다

### 500줄 초과 파일 목록 (우선순위 순)
| 파일 | 현재 줄 수 | 상태 |
|------|-----------|------|
| `app/(app)/admin/page.tsx` | 1,099줄 | 작업 대기 |
| `app/(app)/prediction/page.tsx` | 950줄 | 작업 대기 |
| `app/(app)/contract/page.tsx` | 882줄 | 작업 대기 |
| `app/(app)/dashboard/page.tsx` | 664줄 | 작업 대기 |
| `app/(app)/expert-connect/page.tsx` | 621줄 | 작업 대기 |
| `app/(map)/price-map/page.tsx` | 616줄 | 작업 대기 |
| `app/(app)/rights/page.tsx` | 597줄 | 작업 대기 |
| `app/(app)/jeonse/analysis/page.tsx` | 518줄 | 작업 대기 |
| `app/(app)/feasibility/page.tsx` | 508줄 | 작업 대기 |

### 분리 원칙
- 분리된 컴포넌트는 해당 라우트 아래 `components/` 폴더에 배치
- 상태·로직은 `hooks/` 또는 `lib/`으로 분리
- 파일 하나씩 순서대로 작업 — 동시에 여러 파일 수정 금지
- 각 파일 완료 후 빌드 확인 (`npm run build`) 후 다음 파일로 이동

## Key Conventions
- 한국어 UI, 코드는 영어
- App Router 사용 (pages/ 미사용)
- API Route에서 OpenAI 호출 (서버사이드)
- Prisma로 DB 접근 (Neon PostgreSQL)
- 인증 없이 API 공개, Rate Limit + Cost Guard로 비용 보호
- Tailwind CSS v4 (postcss 플러그인 방식)

## Knowledge Base (Wiki)

컴파일된 지식 위키가 `wiki/` 폴더에 있습니다.

**세션 시작 시:** `wiki/CONTEXT.md` 먼저 읽고, 현재 작업 관련 토픽 아티클 확인.

**토픽 목록:** platform-overview, algorithm, api, frontend, security, features, deployment

**coverage 태그 활용:**
- `[coverage: high]` — 위키 신뢰, 원본 파일 불필요
- `[coverage: medium]` — 개요 파악 후 필요 시 원본 확인
- `[coverage: low]` — Sources 링크의 원본 파일 직접 읽기

**wiki 파일 직접 수정 금지** — `/wiki-compile` 로만 갱신.

## Commands
```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run test         # vitest 테스트
npm run lint         # ESLint
```

## Environment Variables
- `OPENAI_API_KEY` - OpenAI API 키
- `DATABASE_URL` - Neon PostgreSQL 연결 문자열
- `DIRECT_URL` - Neon 직접 연결 (마이그레이션용)
- `AUTH_SECRET` - NextAuth 시크릿
- `NEXT_PUBLIC_KAKAO_MAP_KEY` - 카카오 지도 API 키
- `MOLIT_API_KEY` - 국토교통부 공공데이터 API 키

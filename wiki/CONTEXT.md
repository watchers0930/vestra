# VESTRA 프로젝트 컨텍스트

> LLM 컨텍스트 빠른 로딩용 요약 문서. 새 대화 시작 시 이 파일을 먼저 참조할 것.

---

## 한 문장 요약

VESTRA는 한국 부동산 전세사기 예방에 특화된 AI 플랫폼으로, AI에 의존하지 않는 독자 알고리즘 8종(특허 출원)과 OpenAI GPT-4.1-mini를 결합한 Next.js 16 풀스택 서비스다.

---

## 핵심 수치

| 항목 | 값 |
|------|-----|
| 현재 버전 | v5.10.5 |
| 배포 URL | https://vestra-plum.vercel.app |
| 소스 코드 규모 | 31,315 LOC |
| 독자 알고리즘 | 8종 (특허 출원 대상) |
| API 엔드포인트 | 49개+ |
| DB 모델 | 25개 |
| 페이지 수 | 26개 |
| 테스트 | 9개 파일, 1,497 LOC |

---

## 기술 스택 (한눈에)

```
Next.js 16 (App Router) + TypeScript 5 + React 19
Tailwind CSS v4 + Recharts + Kakao Maps SDK + Leaflet
Neon PostgreSQL + Prisma 6 + NextAuth v5
OpenAI gpt-4.1-mini + Vercel Serverless
```

---

## 핵심 파일 위치

| 용도 | 파일 |
|------|------|
| 등기부등본 파싱 | `lib/registry-parser.ts` |
| 4단계 검증 | `lib/validation-engine.ts` |
| 리스크 스코어링 | `lib/risk-scoring.ts` |
| V-Score 통합 점수 | `lib/v-score.ts` |
| 전세사기 모델 | `lib/fraud-risk-model.ts` |
| 시세 예측 엔진 | `lib/prediction-engine.ts` |
| 신뢰도 전파 | `lib/confidence-engine.ts` |
| 경매 배당 시뮬레이터 | `lib/redemption-simulator.ts` |
| OpenAI 클라이언트 | `lib/openai.ts` |
| 암호화 | `lib/crypto.ts` |
| MOLIT API | `lib/molit-api.ts` |
| 세금 계산 | `lib/tax-calculator.ts` |
| 통합 분석 API | `app/api/analyze-unified/route.ts` |
| 권리분석 API | `app/api/analyze-rights/route.ts` |
| 계약서 분석 API | `app/api/analyze-contract/route.ts` |

---

## 알고리즘 한눈에

1. **등기부등본 파싱**: 비정형 텍스트 → 구조화 (3섹션, 31개 키워드, 6가지 금액 패턴)
2. **4단계 검증**: 포맷 → 산술 → 문맥 → 크로스체크 (23개 검증기)
3. **리스크 스코어링**: 100점 감점 모델 (12항목, A~F 등급)
4. **V-Score**: 5개 데이터 소스 가중합 (등기 0.30/시세 0.25/계약 0.20/임대인 0.15/지역 0.10)
5. **전세사기 모델**: 15피처 그래디언트 부스팅 앙상블
6. **시세 예측**: 5모델 앙상블 (Linear + MeanReversion + Momentum + ARIMA + ETS)
7. **신뢰도 전파**: 데이터 신뢰도 전파 프레임워크
8. **경매 배당**: 경매 시 배당 순서 시뮬레이션

---

## 역할 및 한도

| 역할 | 일일 분석 한도 |
|------|---------------|
| GUEST | 2회 |
| PERSONAL | 5회 |
| BUSINESS | 50회 |
| REALESTATE | 100회 |
| ADMIN | 9,999회 |

---

## 현재 기획/설계 중인 것

1. **시세전망 강화** (`docs/02-design/features/prediction-enhancement.design.md`)
   - ARIMA/ETS 모델 추가, MOLIT 36개월 확대, 백테스팅 시스템
   - 상태: 설계 완료, 구현 대기 (Phase A~D)

2. **dgon 등기연계** (`docs/01-plan/features/vestra-dgon-integration.plan.md`)
   - VESTRA 분석 → dgon 등기 실행 PG사 패턴 토큰 연계
   - 상태: 기획 완료, Phase 1 착수 대기

---

## 주의사항 (Gotchas)

- `AUTH_SECRET` 미설정 시 서버 기동 불가
- MOLIT/건축물대장 API 장애 시 폴백 처리 필요
- 대법원 `LAW_API_KEY` 미설정 시 빈 배열 반환 (정상 동작)
- Vercel 함수 타임아웃: AI 분석 최대 30초
- Rate Limit DB 오류 시 요청 허용 (가용성 우선)
- 배포는 반드시 `deploy vestra` 명령 사용 (npx vercel 직접 실행 금지)

---

## Wiki 토픽 링크

- [플랫폼 개요](topics/platform-overview.md)
- [핵심 알고리즘](topics/algorithm.md)
- [API 명세](topics/api.md)
- [프론트엔드 구조](topics/frontend.md)
- [보안](topics/security.md)
- [주요 기능](topics/features.md)
- [배포/인프라](topics/deployment.md)

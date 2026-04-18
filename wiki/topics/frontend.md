---
topic: frontend
last_compiled: 2026-04-18
sources: 5
---

# 프론트엔드 구조 (Frontend)

[coverage: high -- 5 sources: CLAUDE.md, docs/TECHNICAL-STATUS-REPORT.md, docs/03-analysis/vestra-v2-commercialization.analysis.md, docs/02-design/features/prediction-enhancement.design.md, docs/02-design/features/feasibility-scr-upgrade.design.md]

---

## Purpose [coverage: high -- 2 sources]

Next.js 16 App Router 기반 풀스택 UI. 한국어 UI, 모바일 반응형, 카카오/리플릿 지도, Recharts 시각화를 제공한다.

총 소스 코드 규모: 31,315 LOC (app + lib + components), 페이지 26개, 컴포넌트 37개.

---

## Architecture [coverage: high -- 3 sources]

### 라우트 그룹

```
app/
├── (app)/              # 인증 필요 페이지 그룹 (sidebar + footer 레이아웃)
│   ├── jeonse/         # 전세 관련 (analysis, transfer, fixed-date, jeonse-right, lease-registration, lease-report)
│   ├── contract/       # 계약서 분석
│   ├── tax/            # 세금 계산 (취득세/양도세/종부세)
│   ├── prediction/     # 시세전망 (5모델 앙상블)
│   ├── rights/         # 권리분석
│   ├── assistant/      # AI 어시스턴트 챗봇
│   ├── registry/       # 등기부등본 분석
│   ├── dashboard/      # 포트폴리오 대시보드
│   ├── verification/   # 임대인/임차인 상호검증
│   ├── report/         # 분석보고서
│   ├── profile/        # 프로필 설정
│   ├── feasibility/    # 대출 가심사 (SCR 보고서 포함)
│   ├── expert-connect/ # 전문가 연결
│   └── admin/          # 관리자 대시보드
├── (landing)/          # 랜딩 페이지 (header + footer 레이아웃)
│   ├── page.tsx        # 마케팅 랜딩 페이지 (305줄)
│   └── pricing/        # 요금제 페이지 (174줄)
├── (map)/              # 지도 관련 (/price-map)
├── api/                # API Route Handlers (49개)
├── legal/              # 법적고지
├── privacy/            # 개인정보처리방침
└── terms/              # 이용약관
```

라우트 그룹 분리는 GAP 분석에서 100% 구현 완료로 확인됨. `(landing)` 그룹은 header+footer 레이아웃, `(app)` 그룹은 Sidebar+Footer 레이아웃으로 완전히 독립. 미들웨어는 인증 상태에 따라 `/` 접근 시 `/dashboard` 또는 `/admin`으로 리다이렉트.

**주의**: 로그인 페이지(`app/(app)/login/page.tsx`)가 App 레이아웃(사이드바+푸터) 안에 위치해 있어 미인증 사용자에게 혼란을 줄 수 있음. `(landing)` 또는 독립 라우트 그룹으로 이전이 권장됨.

### 컴포넌트 구조

```
components/
├── common/             # Button, Card, Badge, AiDisclaimer, PdfDownloadButton 등 공통 UI
├── forms/              # FormInput, SliderInput 등 폼 컴포넌트
├── results/            # ScoreGauge, KpiCard, VScoreRadar, IntegratedReport 등
├── loading/            # LoadingSpinner, StepIndicator
├── jeonse/             # 전세 전용 컴포넌트
├── prediction/         # 시세전망 지도 컴포넌트
│   ├── KakaoMap.tsx    # 카카오 지도
│   ├── LeafletMap.tsx  # 리플릿 지도
│   ├── AnomalyDetectionView.tsx
│   ├── RiskHeatMap.tsx
│   ├── PredictionTabs.tsx      # 탭 네비게이션 (설계됨, 구현 예정)
│   ├── Dashboard.tsx           # 핵심 지표 대시보드 (설계됨, 구현 예정)
│   ├── MacroIndicators.tsx     # 거시지표 카드 (설계됨, 구현 예정)
│   ├── MonthlyForecast.tsx     # 월별 추이 차트 (설계됨, 구현 예정)
│   ├── MarketCycle.tsx         # 시장 사이클 뷰 (설계됨, 구현 예정)
│   ├── RegionCompare.tsx       # 지역 비교 차트 (설계됨, 구현 예정)
│   └── BacktestView.tsx        # 백테스팅 결과 시각화 (설계됨, 구현 예정)
├── feasibility/        # 대출 가심사 + SCR 보고서 컴포넌트
│   ├── ScrChapter1.tsx ~ ScrChapter5.tsx  # 장별 React 컴포넌트 (미리보기용)
│   ├── ScrAppendix.tsx
│   ├── ScrReportWizard.tsx     # 입력 위저드
│   ├── ScrFileUploadStep.tsx
│   ├── ScrDataReviewStep.tsx
│   ├── ScrProgressIndicator.tsx
│   ├── ScrReportPreview.tsx
│   └── ScrPdfDownload.tsx
├── admin/              # 관리자 전용 (MlTrainingTab 등)
├── layout/             # Sidebar, Footer
├── auth/               # 인증 관련
├── expert/             # 전문가 상담
├── landlord/           # 임대인 프로파일
├── rights/             # 권리 관련
├── tax/                # 세금 관련
├── verification/       # 검증 관련
└── pwa/                # PWA 관련
```

**컴포넌트 → 페이지 통합 주의**: `AiDisclaimer`와 `PdfDownloadButton` 컴포넌트는 `components/common/index.ts`에 export되어 있으나, GAP 분석(v2.0.0) 기준으로 어떤 페이지에서도 실제 임포트하지 않는 상태. 분석 결과 페이지(rights, contract, prediction, jeonse/analysis)에 연동 필요.

---

## Features [coverage: high -- 3 sources]

### 페이지 목록 (26개)

| 경로 | 기능 | 상태 |
|------|------|------|
| / (unauthenticated) | 마케팅 랜딩 페이지 | 완료 |
| /pricing | 요금제 페이지 (FAQ 포함) | 완료 |
| /rights | 권리분석 | 완료 |
| /contract | 계약서 분석 | 완료 |
| /tax | 세무 시뮬레이션 | 완료 |
| /prediction | 시세전망 (5모델) | 완료 |
| /registry | 등기부등본 분석 | 완료 |
| /assistant | AI 어시스턴트 | 완료 |
| /jeonse | 전세 절차 안내 | 완료 |
| /jeonse/analysis | 전세 안전 분석 | 완료 |
| /jeonse/transfer | 전입신고 안내 | 완료 |
| /jeonse/fixed-date | 확정일자 안내 | 완료 |
| /jeonse/jeonse-right | 전세권설정 안내 | 완료 |
| /jeonse/lease-registration | 임차권등기명령 | 완료 |
| /jeonse/lease-report | 주택임대차 신고 | 완료 |
| /dashboard | 포트폴리오 | 완료 |
| /verification | 상호검증 | 완료 |
| /report | 분석보고서 | 완료 |
| /api-hub | API 데이터 허브 | 완료 |
| /admin | 관리자 대시보드 | 완료 |
| /profile | 프로필 설정 | 완료 |
| /price-map | 시세지도 | 완료 |
| /feasibility | 대출 가심사 + SCR 보고서 자동생성 | 구현 중 (~77%) |
| /expert-connect | 전문가 연결 | 완료 |

### 시세전망 페이지 컴포넌트 구조 (설계 완료, 구현 예정)

현재 `prediction/page.tsx`는 950줄 단일 파일. 아래 탭 기반 구조로 리팩토링 예정:

```
prediction/page.tsx (300줄 이하 목표)
  └─ PredictionTabs
      ├─ tab="dashboard" → PredictionDashboard (핵심 지표 카드)
      ├─ tab="chart" → 기존 시나리오 차트 + MonthlyForecast (월별 추이)
      ├─ tab="compare" → RegionCompare (최대 3개 지역 비교)
      ├─ tab="backtest" → BacktestView (예측 정확도 MAPE/RMSE)
      └─ tab="anomaly" → AnomalyDetectionView
```

### 가심사(Feasibility) SCR 보고서 UI 흐름

SCR 서울신용평가 사업성평가보고서와 동일한 5장+부록 구조(표 64개, 그림 23개, 60~80페이지) 보고서를 자동 생성. UI는 3단계 위저드로 구성:

1. **파일 업로드 단계** (`ScrFileUploadStep.tsx`): 최대 10개 문서 업로드 (필수/선택 표시)
2. **데이터 검토/수정 단계** (`ScrDataReviewStep.tsx`): 파싱 결과 편집
3. **보고서 생성** (`ScrProgressIndicator.tsx`): SSE 실시간 진행률 표시 → PDF 다운로드

보고서 렌더링은 이중화: React 컴포넌트(`ScrChapter*.tsx`, 브라우저 미리보기) + 서버사이드 HTML(`scr-report-html.ts`, PDF 생성). 차트는 Recharts SSR로 SVG 생성 후 HTML 인라인 삽입.

### 관리자 대시보드 주요 탭

- 사용자 관리 (목록/수정/삭제/역할변경/사업자인증)
- 분석 이력 조회
- 시스템 통계 (Recharts 차트)
- OAuth 키 관리 (AES-256-GCM 암호화 저장)
- ML 학습관리 탭 (`MlTrainingTab.tsx`)
  - 등기부등본 업로드 → 자동 파싱 → 검수 → JSONL 내보내기
  - 도메인 용어 사전 (4개 카테고리, KR-BERT 토크나이저 호환 vocab.txt 내보내기)
- 공지사항 CRUD
- 감사 로그 조회/필터링

---

## Key Decisions [coverage: high -- 4 sources]

- **App Router 단독 사용**: `pages/` 미사용. RSC/SSR 자동 최적화, 미들웨어 기반 라우트 보호.
- **VScoreRadar 컴포넌트**: 순수 SVG 직접 구현 (Recharts 등 외부 차트 라이브러리 미사용). `components/results/VScoreRadar.tsx` 173줄.
- **시세전망 5모델 앙상블**: 기존 3모델(선형회귀/평균회귀/모멘텀)에 ARIMA + ETS 추가. 가중치 = R² × 0.4 + (1/MAPE) × 0.6 혼합 방식으로 개선 예정. 기존 `PredictionResult` 인터페이스 하위 호환 유지.
- **카카오 지도 키**: 클라이언트 전용 (`NEXT_PUBLIC_KAKAO_MAP_KEY`). SSR에서 SDK 로드 불가.
- **Landing/App 레이아웃 완전 분리**: route group으로 레이아웃 독립. SEO(robots.txt, sitemap, OG 태그)는 `(landing)` 그룹에 집중.
- **SCR 보고서 렌더링 이중화**: React 컴포넌트(ScrChapter*.tsx)와 서버사이드 HTML(scr-report-html.ts)이 동일한 `ScrReportData` 모델을 공유. `scr-shared.tsx`로 공통 UI 컴포넌트 재사용.
- **구독/요금제**: 3단계(FREE/PRO/BUSINESS), PLAN_CONFIG 객체 기반 설계. 결제 연동은 대기 중("결제 시스템 준비 중"). 구독 POST API는 완성됐으나 프로필 페이지의 플랜 전환 버튼에 onClick 핸들러 미연결.
- **파일 분리 리팩토링**: `refactor/file-split` 브랜치. 500줄 초과 파일 9개 대기 중.

---

## Gotchas [coverage: high -- 5 sources]

### 500줄 초과 파일 (리팩토링 대기)

`CLAUDE.md`에 명시된 파일 분리 원칙(500줄 제한)에 따라 아래 파일들이 리팩토링 대기 중. `refactor/file-split` 브랜치에서 파일 하나씩 순서대로 진행, 완료 후 빌드 확인(`npm run build`) 후 다음 파일로 이동.

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

분리된 컴포넌트는 해당 라우트 아래 `components/` 폴더에 배치, 상태·로직은 `hooks/` 또는 `lib/`으로 분리.

### Tailwind CSS v4 arbitrary value 미적용 이슈

`CLAUDE.md`에 명시된 스타일링 방식: Tailwind CSS v4 (postcss 플러그인 방식). v4에서는 `w-[123px]` 같은 arbitrary value 클래스가 동적으로 생성될 때 JIT 컴파일에 포함되지 않는 경우가 있음. **우회 방법: `style={{ width: '123px' }}` 형태의 인라인 스타일로 대체.** 동적으로 계산된 크기값이나 런타임에 결정되는 값에는 항상 인라인 스타일 사용.

### 카카오 지도 SDK SSR 주의

카카오 지도 SDK는 클라이언트에서만 로드 가능. SSR 시 hydration 오류 발생. `KakaoMap.tsx`, `LeafletMap.tsx` 모두 `dynamic(() => import(...), { ssr: false })` 패턴 필요.

### VScoreRadar SVG 직접 구현

`components/results/VScoreRadar.tsx` 173줄. 순수 SVG 직접 구현이므로 크기 조정 시 내부 수식(반지름, 좌표 계산)을 직접 수정해야 함.

### AiDisclaimer / PdfDownloadButton 미연결

두 컴포넌트 모두 완전히 구현·export되어 있으나 어떤 분석 페이지에서도 렌더링되지 않음 (GAP 분석 v2.0.0 기준). 법적 고지(AI 면책) 및 핵심 유료 기능(PDF 다운로드)이 실제로 사용자에게 노출되지 않는 상태. 우선순위 높음.

### 구독 취소 UI 미연결

`POST /api/subscription/cancel` API는 완성되어 있으나, 프로필 페이지에 취소 버튼 UI가 없음. 구독 플랜 전환 버튼도 onClick 핸들러 없음 (display only). "결제 시스템 준비 중" 상태.

### PWA 서비스 워커 부재

`public/manifest.json`과 아이콘은 완비되어 있어 앱 설치(Add to Home Screen)는 가능. 그러나 서비스 워커가 없으므로 오프라인 지원 없음. 진정한 PWA 기능(오프라인, 백그라운드 동기화)은 `public/sw.js` 추가 필요.

---

## Sources [coverage: high -- 5 sources]

- `/Users/watchers/Desktop/vestra/CLAUDE.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/03-analysis/vestra-v2-commercialization.analysis.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/prediction-enhancement.design.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/feasibility-scr-upgrade.design.md`

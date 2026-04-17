# 프론트엔드 구조 (Frontend)

[coverage: medium -- 3 sources: CLAUDE.md, docs/TECHNICAL-STATUS-REPORT.md, docs/02-design/features/prediction-enhancement.design.md]

---

## Purpose

Next.js 16 App Router 기반 풀스택 UI. 한국어 UI, 모바일 반응형, 카카오/리플릿 지도, Recharts 시각화를 제공한다.

---

## Architecture

### 디렉토리 구조

```
app/
├── (app)/              # 인증 필요 페이지 그룹
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
│   └── admin/          # 관리자 대시보드
├── (landing)/          # 랜딩 페이지
├── (map)/              # 지도 관련 (/price-map)
├── api/                # API Route Handlers
├── legal/              # 법적고지
├── privacy/            # 개인정보처리방침
└── terms/              # 이용약관

components/
├── common/             # Button, Card, Badge 등 공통 UI
├── forms/              # FormInput, SliderInput 등 폼 컴포넌트
├── results/            # ScoreGauge, KpiCard, VScoreRadar, IntegratedReport 등
├── loading/            # LoadingSpinner, StepIndicator
├── jeonse/             # 전세 전용 컴포넌트
├── prediction/         # 시세전망 지도 컴포넌트
│   ├── KakaoMap.tsx    # 카카오 지도
│   ├── LeafletMap.tsx  # 리플릿 지도
│   ├── AnomalyDetectionView.tsx
│   └── RiskHeatMap.tsx
├── admin/              # 관리자 전용 (MlTrainingTab 등)
├── layout/             # Sidebar, Footer
├── auth/               # 인증 관련
├── feasibility/        # 대출 가심사
├── expert/             # 전문가 상담
├── landlord/           # 임대인 프로파일
├── rights/             # 권리 관련
├── tax/                # 세금 관련
├── verification/       # 검증 관련
└── pwa/                # PWA 관련
```

---

## Features

### 페이지 목록 (26개)

| 경로 | 기능 | 상태 |
|------|------|------|
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

---

### 시세전망 페이지 컴포넌트 구조 (prediction-enhancement.design.md)

```
prediction/page.tsx (탭 기반)
  ├─ tab="dashboard" → PredictionDashboard (핵심 지표 카드)
  ├─ tab="chart" → 시나리오 차트 + MonthlyForecast
  ├─ tab="compare" → RegionCompare (최대 3개 지역 비교)
  ├─ tab="backtest" → BacktestView (예측 정확도 MAPE/RMSE)
  └─ tab="anomaly" → AnomalyDetectionView
```

---

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

## Key Decisions

- App Router만 사용 (pages/ 미사용) → RSC/SSR 자동 최적화
- VScoreRadar 컴포넌트: 순수 SVG (외부 차트 라이브러리 미사용)
- 시세전망 페이지: 1600줄 단일 파일 → 탭 기반 컴포넌트 분리 (설계 완료, 구현 예정)
- 카카오 지도 키는 클라이언트 전용 (`NEXT_PUBLIC_KAKAO_MAP_KEY`)

---

## Gotchas

- `prediction/page.tsx`가 현재 1,600줄 이상 — 탭 분리 리팩토링이 설계는 되었으나 미완
- 카카오 지도 SDK는 클라이언트에서만 로드 (SSR 시 hydration 오류 주의)
- `components/results/VScoreRadar.tsx` 173줄, SVG 직접 구현이므로 크기 조정 시 수식 직접 수정 필요

---

## Sources

- `/Users/watchers/Desktop/vestra/CLAUDE.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/prediction-enhancement.design.md`
- `/Users/watchers/Desktop/vestra/docs/03-analysis/predict-value.analysis.md`

# 핵심 알고리즘 (Algorithm)

[coverage: high -- 3 sources: docs/ALGORITHM.md, docs/TECHNICAL-STATUS-REPORT.md, docs/03-analysis/vestra-algorithm-advancement.analysis.md]

---

## Purpose

VESTRA의 핵심 경쟁력은 AI/LLM에 의존하지 않는 독자 알고리즘 8종이다. 특허 출원 대상이며, 동일 엔진 구축에 6개월 이상의 도메인 전문성이 필요하다.

---

## Algorithm

### 8종 독자 알고리즘 (특허 출원 대상)

| # | 알고리즘 | 파일 | 코드량 | AI 의존 |
|---|----------|------|--------|---------|
| 1 | **등기부등본 파싱 엔진** | `lib/registry-parser.ts` | 592줄+ | 없음 |
| 2 | **4단계 검증 엔진** | `lib/validation-engine.ts` | 700줄+ | 없음 |
| 3 | **리스크 스코어링 엔진** | `lib/risk-scoring.ts` | 511줄+ | 없음 |
| 4 | **V-Score 통합 위험도** | `lib/v-score.ts` | 541줄 | 없음 |
| 5 | **전세사기 위험 모델** | `lib/fraud-risk-model.ts` | - | 없음 |
| 6 | **크로스 기능 연계** | `lib/cross-analysis.ts` | - | 없음 |
| 7 | **신뢰도 전파 엔진** | `lib/confidence-engine.ts` | 263줄 | 없음 |
| 8 | **경매 배당 시뮬레이터** | `lib/redemption-simulator.ts` | - | 없음 |

---

### 1. 등기부등본 자동 파싱 엔진 (`registry-parser.ts`)

한국 등기부등본은 비정형 텍스트 문서로, 다양한 형식(인터넷등기소, 법원등기, OCR)으로 존재한다. 아래 파이프라인으로 구조화된 데이터를 생성한다.

```
입력: 등기부등본 원문 텍스트
  → [정규화] CRLF→LF, TAB→공백
  → [섹션 분리] 표제부 / 갑구 / 을구 (3가지 패턴 감지)
  → [표제부 파싱] 주소, 면적, 구조, 용도, 대지권비율
  → [갑구 파싱] 18개 키워드 → 위험도 매핑, 말소 감지
  → [을구 파싱] 13개 키워드 → 위험도 매핑, 6가지 금액 패턴 인식
  → [요약 생성] 12개 위험 플래그, 소유권이전 횟수 집계
출력: ParsedRegistry { title, gapgu[], eulgu[], summary }
```

**한국식 금액 자동 변환 엔진** (6가지 패턴):
- `금 480,000,000원` → 480,000,000
- `금3억5,000만원` → 350,000,000
- `금3억원` → 300,000,000
- `금5,000만원` → 50,000,000
- `XXX,XXX,XXX원` → 직접 파싱
- 7자리 이상 순수 숫자 → 직접 파싱

---

### 2. 4단계 데이터 검증 엔진 (`validation-engine.ts`)

파싱 결과의 신뢰도를 정량적으로 평가하는 독자 검증 시스템. **23개 검증기**가 4개 계층으로 작동한다.

| 계층 | 이름 | 검증기 수 |
|------|------|-----------|
| Layer 1 | 포맷 및 타입 검증 | 6개 |
| Layer 2 | 합계 및 산술 검증 | 6개 |
| Layer 3 | 문맥 및 규칙 검증 | 7개 |
| Layer 4 | 크로스체크 검증 | 4개 |

**점수 산출**: `score = (통과 검사 수 / 총 검사 수) × 100`  
**isValid**: error 심각도 이슈 수 === 0

---

### 3. 리스크 스코어링 알고리즘 (`risk-scoring.ts`)

**가중치 감점 모델**: 100점 만점에서 위험 요인별 감점

```
최종 점수 = max(0, 100 - Σ감점)
```

**12개 평가 항목**:

| # | 항목 | 최대 감점 | 심각도 |
|---|------|----------|--------|
| 1 | 근저당 비율 (시세 대비) | -30 | critical |
| 2 | 압류 등기 | -25/건 | critical |
| 3 | 가압류 등기 | -20/건 | critical |
| 4 | 가처분 등기 | -15/건 | high |
| 5 | 경매개시결정 | -30 | critical |
| 6 | 가등기 | -10 | medium |
| 7 | 신탁등기 | -15 | high |
| 8 | 소유권 이전 빈도 | -15 | high |
| 9 | 선순위채권 합산 비율 | -25 | critical |
| 10 | 임차권등기명령 | -20 | critical |
| 11 | 예고등기 | -12 | high |
| 12 | 환매등기 | -10 | medium |

**등급 체계**:

| 등급 | 점수 | 의미 |
|------|------|------|
| A | 85~100 | 안전 |
| B | 70~84 | 양호 |
| C | 50~69 | 주의 |
| D | 30~49 | 위험 |
| F | 0~29 | 매우위험 |

---

### 4. V-Score 통합 위험도 점수 (`v-score.ts`)

5개 데이터 소스를 가중합하여 종합 위험도 점수를 산출한다.

```
V-Score = Σ(w_i × S_i) + InteractionBonus + TemporalPenalty
```

**5대 소스 가중치**:
| 소스 | 변수 | 가중치 |
|------|------|--------|
| 등기 권리관계 | registryScore | 0.30 |
| 전세가율/시세 | priceScore | 0.25 |
| 계약서 위험도 | contractScore | 0.20 |
| 임대인 위험지표 | landlordScore | 0.15 |
| 지역 위험도 | regionScore | 0.10 |

비선형 상호작용 보정: 6개 `INTERACTION_RULES` (compound/amplify/mitigate)  
UI: `components/results/VScoreRadar.tsx` (SVG 순수 구현, 외부 라이브러리 없음)

---

### 5. 전세사기 위험 모델 (`fraud-risk-model.ts`)

15개 피처 기반 그래디언트 부스팅 앙상블. 사기 위험도를 0~100으로 산출.

---

### 6. 시세전망 예측 엔진 (`prediction-engine.ts`)

5모델 앙상블 (Linear Regression + Mean Reversion + Momentum + ARIMA + ETS)

**앙상블 가중치**: `weight_i = (r2_i × 0.4 + (1/mape_i) × 0.6) / Σweights`

**모델 폴백 규칙**:
- 거래 데이터 ≥ 24건 → 5모델 앙상블
- 12~23건 → 3모델 (ARIMA/ETS 제외)
- 3~11건 → 2모델 (선형회귀 + 평균회귀)
- < 3건 → 단순 인플레이션 추정

---

## Key Decisions

- 핵심 분석 엔진은 AI 없이 순수 TypeScript로 구현 → 예측 가능성, 비용, 속도 모두 우위
- 4단계 검증 계층 구조 (포맷→산술→문맥→크로스체크)는 업계 최초
- 31개 등기 키워드 분류, 6가지 한국식 금액 패턴 인식

---

## Gotchas

- `registry-parser.ts`는 OCR 결과 텍스트도 처리해야 하므로 띄어쓰기 가변성에 매우 민감
- ARIMA/ETS 모델은 최소 24개월 데이터가 필요 (미달 시 자동 폴백)
- V-Score 산출 시 임대인 위험지표(landlordScore)는 현재 mock 포함 (credit-api)

---

## Sources

- `/Users/watchers/Desktop/vestra/docs/ALGORITHM.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/03-analysis/vestra-algorithm-advancement.analysis.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/prediction-enhancement.design.md`

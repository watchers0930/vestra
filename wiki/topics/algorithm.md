---
topic: algorithm
last_compiled: 2026-06-22
sources: 11
---

# 핵심 알고리즘 (Algorithm)

---

## Purpose [coverage: high -- 6 sources]

VESTRA의 핵심 경쟁력은 AI/LLM에 의존하지 않는 독자 알고리즘이다. 총 9개의 특허 출원 대상 알고리즘이 있으며, 동일 엔진을 재구축하려면 6개월 이상의 부동산 도메인 전문성이 필요하다.

**설계 원칙**:
- 핵심 파싱·검증·스코어링 엔진은 순수 TypeScript로 구현 (AI 없음)
- 예측 가능성, 비용 효율, 처리 속도 모두 AI 의존 방식 대비 우위
- 규칙 기반 구현으로 재현성 100% 보장 (결정론적 출력)
- 각 알고리즘의 의사결정 근거를 사용자에게 투명하게 제공 (Explainable AI)

**전체 코드 규모**: 독자 알고리즘 포함 총 31,315 LOC (소스 코드 기준)

---

## Algorithm [coverage: high -- 6 sources]

### 알고리즘 전체 목록

| # | 알고리즘 | 파일 | 특허 분류 | AI 의존 |
|---|----------|------|----------|---------|
| 1 | **등기부등본 파싱 엔진** | `lib/registry-parser.ts` | 기반 엔진 | 없음 |
| 2 | **4단계 검증 엔진** | `lib/validation-engine.ts` | 특허 G | 없음 |
| 3 | **리스크 스코어링 엔진** | `lib/risk-scoring.ts` | 특허 A | 없음 |
| 4 | **V-Score 통합 위험도** | `lib/v-score.ts` | 특허 C | 없음 |
| 5 | **전세사기 위험 모델 (Fraud Risk)** | `lib/fraud-risk-model.ts` | 특허 D | 없음 |
| 6 | **권리관계 그래프 엔진** | `lib/rights-graph-engine.ts` | 특허 2 | 없음 |
| 7 | **적응형 가중치 자동 튜닝** | `lib/adaptive-weight-tuner.ts` | 특허 F | 없음 |
| 8 | **시계열 이상탐지** | `lib/anomaly-detector.ts` | 특허 E | 없음 |
| 9 | **무결성 체인 (Merkle Tree)** | `lib/integrity-chain.ts` | 특허 6 | 없음 |
| 10 | **다단계 신뢰도 전파** | `lib/confidence-engine.ts` | 특허 7 | 없음 |
| 11 | **NLP/NER 파이프라인** | `lib/nlp-ner-pipeline.ts` | 특허 9 | 없음 |
| 12 | **보증보험 3사 통합 판단** | `lib/guarantee-insurance.ts` | 특허 8 | 없음 |
| 13 | **5모델 앙상블 시세 예측** | `lib/prediction-engine.ts` | 특허 B | 없음 |
| 14 | **크로스 기능 연계** | `lib/cross-analysis.ts` | 보조 | 없음 |
| 15 | **부동산 세금 통합 시뮬레이터** | `lib/tax-calculator.ts` | 특허 H | 없음 |

---

### 1. 등기부등본 자동 파싱 엔진 (`registry-parser.ts`, 592줄)

한국 등기부등본은 비정형 텍스트 문서로, 다양한 형식(인터넷등기소, 법원등기, OCR)으로 존재한다. 아래 파이프라인으로 구조화된 데이터를 생성한다.

**처리 파이프라인**:
```
입력: 등기부등본 원문 텍스트
  → [정규화] CRLF→LF, TAB→공백
  → [섹션 분리] 표제부 / 갑구 / 을구 (각 3가지 패턴 감지)
  → [표제부 파싱] 주소, 면적, 구조, 용도, 대지권비율
  → [갑구 파싱] 18개 키워드 → 위험도 매핑, 말소 감지
  → [을구 파싱] 13개 키워드 → 위험도 매핑, 6가지 금액 패턴 인식
  → [요약 생성] 12개 위험 플래그, 소유권이전 횟수 집계
출력: ParsedRegistry { title, gapgu[], eulgu[], summary }
```

**다단계 항목 파싱 알고리즘** (특허 대상):
1. 각 줄을 순위번호 패턴 또는 키워드+날짜 조합으로 항목 시작점 감지
2. 항목 시작이 아닌 줄은 현재 항목에 누적 (다줄 처리)
3. 누적 중 빠진 필드(날짜, 권리자, 금액)를 후속 줄에서 자동 보완
4. 권리유형은 길이 내림차순 매칭 (더 구체적인 키워드 우선)

**한국식 금액 자동 변환 엔진** (6가지 패턴):
- `금 480,000,000원` → 480,000,000
- `금3억5,000만원` → 350,000,000
- `금3억원` → 300,000,000
- `금5,000만원` → 50,000,000
- `XXX,XXX,XXX원` → 직접 파싱
- 7자리 이상 순수 숫자 → 직접 파싱

---

### 2. 4단계 데이터 검증 엔진 (`validation-engine.ts`, 700줄) — 특허 G

파싱 결과의 신뢰도를 정량적으로 평가하는 독자 검증 시스템. **23개 검증기**가 4개 계층으로 작동한다.

| 계층 | 이름 | 검증기 수 | 주요 검증 내용 |
|------|------|-----------|---------------|
| Layer 1 | 포맷 및 타입 검증 | 6개 | 날짜·금액 범위, 순위번호 순차성, 권리자명, 섹션 완전성 |
| Layer 2 | 합계 및 산술 검증 | 6개 | 근저당·전세권 합계 일치, 총채권액, 비율 재계산 |
| Layer 3 | 문맥 및 규칙 검증 | 7개 | 시간 순서, 말소-원본 대응, 소유권 체인, 법리 충돌 감지 |
| Layer 4 | 크로스체크 검증 | 4개 | 위험 플래그 양방향 검증, 추정가격 범위, AI의견 관련성 |

**Layer 3 주요 규칙**:

| 검증기 | 부동산 법리 규칙 |
|--------|----------------|
| MortgageAfterSeizure | 압류 이후 근저당 설정 = 비정상 거래 경고 |
| TrustMortgageConflict | 신탁 이후 근저당 설정 = 수탁자 동의 확인 |
| CancellationLogic | 말소등기는 대응하는 원본 등기가 존재해야 함 |
| OwnershipChain | 활성 소유권이전/보존 항목 최소 1개 존재 |

**점수 산출 공식**:
```
score = (통과 검사 수 / 총 검사 수) × 100
isValid = (error 심각도 이슈 수 === 0)
```

---

### 3. 리스크 스코어링 알고리즘 (`risk-scoring.ts`, 511줄) — 특허 A

**가중치 감점 모델**: 100점 만점에서 위험 요인별 감점 방식

```
최종 점수 = max(0, 100 - D_total)
D_total = Σ(개별 감점) + D_interaction(비선형 상호작용) + D_temporal(시계열 이상)
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

**근저당 비율 세부 감점**:
```
ratio > 120% → -30점 (깡통주택 극도 위험)
ratio > 100% → -25점 (시세 초과)
ratio >  80% → -20점 (고위험)
ratio >  70% → -10점 (주의)
ratio >  50% →  -5점 (모니터링)
ratio ≤  50% →   0점 (안전)
```

**비선형 상호작용 증폭** (6가지 규칙):

```
D_interaction = Σ max(0, (D_a + D_b) × (α - 1))
```

| 규칙 | 팩터 a | 팩터 b | 증폭계수 α | 의미 |
|------|--------|--------|-----------|------|
| 1 | 압류 | 경매개시결정 | 1.5 | 강제처분 절차 진행 |
| 2 | 다중근저당 | 고근저당비율 | 1.3 | 과잉 레버리지 |
| 3 | 신탁 | 다중근저당 | 1.4 | 신탁 내 채무 과다 |
| 4 | 압류 | 임차권등기 | 1.6 | 임차인 최악 시나리오 |
| 5 | 경매 | 초과채권(>120%) | 1.7 | 회수 불가 상태 |
| 6 | 압류 | 가처분 | 1.3 | 복수 법적 분쟁 |

**등급 체계**:

| 등급 | 점수 | 의미 |
|------|------|------|
| A | 85~100 | 안전 |
| B | 70~84 | 양호 |
| C | 50~69 | 주의 |
| D | 30~49 | 위험 |
| F | 0~29 | 매우위험 |

---

### 4. V-Score 통합 위험도 (`v-score.ts`, 541줄) — 특허 C

5개 이질적 데이터 소스를 비선형 결합하여 단일 위험도 점수를 산출한다.

**수식**:
```
V_raw = Σ(wₖ × Sₖ)  for k = 1~5
V_adjusted = V_raw + Σ(δⱼ)  for j = 1~6 (비선형 상호작용 조정)
V_Score = clamp(V_adjusted, 0, 100)
```

**5대 소스 가중치**:

| 소스 | 변수 | 가중치 | 산출 함수 |
|------|------|--------|----------|
| 등기 권리관계 | registryScore | 0.30 | `calculateRegistryScore()` ← risk-scoring totalScore |
| 전세가율/시세 | priceScore | 0.25 | `calculatePriceScore()` ← prediction-engine + molit-api |
| 계약서 위험도 | contractScore | 0.20 | `calculateContractScore()` ← contract-analyzer safetyScore |
| 임대인 위험지표 | landlordScore | 0.15 | `calculateLandlordScore()` ← credit-api (mock 포함) |
| 지역 위험도 | regionScore | 0.10 | `calculateRegionScore()` ← fraud-data-importer + 경매발생률 |

**소스별 세부 산출**:

시세 점수:
```
S_price = 0.7 × (100 - 전세가율) + 0.2 × max(0, 100 - 변동성×2) + 0.1 × 신뢰도
```

임대인 점수:
```
S_landlord = max(20, 100 - D_multi - D_corp - D_tax - D_credit)
D_multi = 20(다주택), D_corp = 10(법인), D_tax = 30(세금체납), D_credit ≤ 20
```

지역 점수:
```
S_region = 0.6 × max(0, 100 - 사기율×10) + 0.4 × max(0, 100 - 경매율×10)
```

**6개 비선형 상호작용 규칙 (δ 조정값)**:

| 규칙명 | 조건 | δ 조정 | 효과 |
|--------|------|--------|------|
| registry_price_compound | S_reg < 50 ∧ S_price < 50 | -⌊(100-S_reg)(100-S_price)/200⌋ | 복합 위험 증폭 |
| registry_contract_amplify | S_reg < 40 ∧ S_contract < 40 | -8 | 감점 증폭 |
| price_region_amplify | S_price < 50 ∧ S_region < 40 | -6 | 감점 증폭 |
| landlord_registry_amplify | S_landlord < 40 ∧ S_reg < 50 | -5 | 감점 증폭 |
| contract_price_mitigate | S_contract ≥ 80 ∧ S_price ≥ 70 | +3 | 위험 경감 |
| all_high_risk_cascade | S_reg < 30 ∧ S_price < 30 | -10 | 캐스케이드 감점 |

**UI**: `components/results/VScoreRadar.tsx` — SVG 순수 구현, 외부 라이브러리 없음 (173줄)

**Gap 분석 결과**: 설계 대비 구현 일치율 97% (gradeLabel, algorithmId 2개 필드가 설계 초과 구현)

---

### 5. 전세사기 위험 모델 (`fraud-risk-model.ts`, 488줄) — 특허 D

15개 도메인 특화 피처의 가중 합산과 Leave-One-Out 기여도 산출, Haversine 거리 기반 유사 사례 매칭을 결합한 전세사기 위험 예측 모델.

**수식**:
```
F_raw = (Σ(vᵢ × wᵢ)) / (Σwᵢ)  for i = 1~15

비선형 증폭:
n_high = count(vᵢ × wᵢ > 3)
α = 1.2 (n_high ≥ 3), 1.1 (n_high = 2), 1.0 (기타)
F_score = min(100, ⌊F_raw × α⌋)
```

**15개 피처 및 가중치**:

| 그룹 (총가중치) | 피처 | wᵢ | 위험값 계산 |
|---------------|------|-----|-----------|
| 권리관계 (0.30) | 근저당비율 | 0.12 | min(100, ratio%) |
| | 압류/가처분 유무 | 0.10 | min(100, 50 × count) |
| | 선순위채권비율 | 0.08 | min(100, ratio%) |
| 시세가격 (0.24) | 전세가율 | 0.14 | min(100, ratio%) |
| | 시세변동률 | 0.06 | min(100, volatility × 5) |
| | 공실률 | 0.04 | min(100, rate × 8) |
| 임대인 (0.18) | 다주택보유 | 0.06 | bool → 70 |
| | 법인임대 | 0.04 | bool → 50 |
| | 세금체납 | 0.08 | bool → 90 |
| 건물지역 (0.16) | 건축년수 | 0.03 | min(100, years × 2.5) |
| | 지역사기율 | 0.08 | min(100, rate × 20) |
| | 경매발생률 | 0.05 | min(100, rate × 25) |
| 계약조건 (0.12) | 계약서안전점수 | 0.06 | 100 - safetyScore |
| | 중개사등록 | 0.03 | 미등록 → 80 |
| | 보증보험 | 0.03 | 미가입 → 60 |

**SHAP 유사 기여도 (Leave-One-Out)**:
```
Cᵢ = F(X) - F(X \ {xᵢ})
%Impactᵢ = |Cᵢ| / F(X) × 100
```

**유사 사례 매칭 (Haversine Distance)**:
```
d = 2R × arcsin(√(sin²(Δφ/2) + cos φ₁ × cos φ₂ × sin²(Δλ/2)))
similarity = max(0, 1 - d / 5km)
```

API: `app/api/fraud-risk/route.ts` — rate limit + audit log + DB 유사사례 조회

**기존 서비스 대비 차별성**:

| 항목 | 세이프홈즈 | 부디클 | VESTRA |
|------|-----------|--------|---------|
| 피처 수 | 비공개(추정 5~10) | 비공개 | 15개 |
| 기여도 산출 | 없음 | 없음 | LOO (SHAP 유사) |
| 유사사례 매칭 | 없음 | 없음 | Haversine 5km |
| 비선형 보정 | 없음 | 없음 | 복수 고위험 증폭 |

---

### 6. 권리관계 그래프 엔진 (`rights-graph-engine.ts`) — 특허 2

등기부등본의 갑구/을구 항목을 그래프 자료구조로 모델링하고 5가지 그래프 알고리즘을 적용하여 시스템적 위험을 분석한다. **전세계적으로 등기부등본을 그래프로 모델링한 최초 사례**로 판단된다.

**그래프 구성**:
- 노드 8종: 부동산, 소유자, 채권자, 근저당, 압류, 전세권, 임차권, 신탁
- 엣지 5종: 채권관계, 소유권, 종속관계, 충돌, 의존성

**5가지 그래프 알고리즘**:

| 알고리즘 | 기능 | 활용 |
|----------|------|------|
| 순환 탐지 | 법적으로 불가능한 순환 구조 감지 | 위조/오류 등기 탐지 |
| 위험 전파 | 연쇄 위험도 반복 계산 → 수렴 | 시스템 리스크 평가 |
| 체인 분석 | 순위별 청구권 분석 | 배당 시뮬레이션 |
| 최대 피해 경로 | 최악의 경우 임차인 손실 수치 산출 | 임차인 보호 |
| 클러스터 분석 | 독립 권리 그룹 식별 | 복합 물건 분석 |

---

### 7. 적응형 가중치 자동 튜닝 (`adaptive-weight-tuner.ts`) — 특허 F

Thompson Sampling(Beta 분포 기반 탐색-활용 균형)을 적용하여 사용자 피드백을 기반으로 사기 예측 모델의 15개 피처 가중치를 실시간 자동 조정한다. **부동산 사기 탐지에 Thompson Sampling을 적용한 사례는 확인되지 않음**.

**알고리즘**:
```
각 가중치 후보 i에 대해:
αᵢ = 성공횟수 + 1
βᵢ = 실패횟수 + 1
θᵢ ~ Beta(αᵢ, βᵢ)
선택: i* = argmax(θᵢ)
```

**Gamma Distribution Sampling (Marsaglia & Tsang 방식)**:
```
shape < 1: Gamma(shape+1) × U^(1/shape)
shape ≥ 1: Marsaglia rejection method
Beta(α,β) = Gamma(α) / (Gamma(α) + Gamma(β))
```

**성능 메트릭 3종**:
- **Brier Score**: `BS = (1/N) Σ(pᵢ - oᵢ)²` (0 = 완벽, 1 = 최악)
- **ECE (Expected Calibration Error)**: `ECE = Σ(nᵦ/N) × |avg(pᵦ) - avg(oᵦ)|`
- **Log Loss**: `LL = -(1/N) Σ(yᵢ log(pᵢ) + (1-yᵢ) log(1-pᵢ))`

**Isotonic Regression (PAVA 알고리즘)** — 확률 보정:
```
pᵢ 기준 정렬 → 단조성 위반 감지 → 위반 블록 가중평균 병합 → 단조 증가 보정 함수 출력
```

DB: `WeightConfig`, `WeightFeedback` 테이블

---

### 8. 시계열 이상탐지 (`anomaly-detector.ts`) — 특허 E

등기부등본 시간순 이벤트에서 전세사기 전조 패턴을 탐지하는 8가지 시계열 규칙과, 부동산 시세 시계열의 이상을 탐지하는 3중 통계 엔진(Holt's + CUSUM + Adaptive Bollinger)을 결합한다.

**등기부 8-패턴 이상탐지 규칙**:

| 패턴 | 탐지 조건 | 신뢰도 | 심각도 |
|------|----------|--------|--------|
| 급속소유권이전 | 60개월 내 ≥3회 이전 | min(1, n/5) | n≥4: critical |
| 압류 전 근저당 | 압류 6개월 이내 근저당 설정 | 0.9 | critical |
| 채권 가속 | 12개월 내 ≥2건 압류/가압류 | min(1, n/3) | n≥3: critical |
| 근저당 누적 | 3개월 내 ≥2건 근저당 설정 | 0.8 | high |
| 의심 말소 | 설정 후 6개월 내 말소 | 0.7~0.9 | high |
| 말소 후 즉시 매매 | 말소 1개월 내 소유권이전 | 0.8 | high |
| 동시 다건 말소 | 같은 날 ≥2건 근저당 말소 | 0.75 | high |
| 고액 말소 무이전 | 2억 이상 말소 후 6개월 내 매매 없음 | 0.6 | medium |

**시계열 종합 위험도**:
```
R_temporal = min(100, Σ severity_weight(k) × confidence_k)
severity_weight = { critical: 30, high: 15, medium: 5 }
D_temporal = min(20, ⌊R_temporal × 0.2⌋)
```

**3중 통계 엔진**:

Holt's Double Exponential Smoothing:
```
lₜ = α × yₜ + (1-α)(lₜ₋₁ + bₜ₋₁)
bₜ = β × (lₜ - lₜ₋₁) + (1-β)bₜ₋₁
최적화: Grid Search α ∈ [0.1, 0.9], β ∈ [0.01, 0.5]
```

적응형 Bollinger Band:
```
CV = σ(smoothed) / μ(smoothed)
m_adaptive = m_base × (1 + CV)
이상: yₜ > (smoothed + m_adaptive × σ) ∨ yₜ < (smoothed - m_adaptive × σ)
```

CUSUM 변화점 탐지:
```
C⁺ₜ = max(0, C⁺ₜ₋₁ + (yₜ - μ - k))
C⁻ₜ = max(0, C⁻ₜ₋₁ - (yₜ - μ + k))
변화점: C⁺ₜ > h ∨ C⁻ₜ > h  (h = 3~5σ, k = 0.5σ)
```

Robust Z-Score (MAD):
```
MAD = median(|yᵢ - median(y)|)
z_robust = (y - median) / (1.4826 × MAD)
이상: |z_robust| > 3 (고위험), |z_robust| > 2 (중위험)
```

---

### 9. 무결성 체인 (`integrity-chain.ts`) — 특허 6

부동산 분석 파이프라인의 각 단계 (파싱 → 리스크 스코어링 → 사기 예측 → 의사결정)의 입출력을 Merkle Tree로 연결하여 중간 데이터 변조를 감지하고 감사 추적(Audit Trail)을 제공한다.

- 블록체인 없이 자체 Merkle Tree로 경량화
- 부동산 분석에 암호학적 무결성 검증을 적용한 최초 사례
- DB: `IntegrityRecord` 테이블

---

### 10. 다단계 신뢰도 전파 프레임워크 (`confidence-engine.ts`, 263줄) — 특허 7

파서 신뢰도 → 리스크 스코어링 신뢰도 → 가격 추정 신뢰도 → 유효성 검증 신뢰도의 4단계를 가중 기하평균으로 결합한다.

**복합 신뢰도 공식**:
```
Composite = P^0.25 × R^0.30 × E^0.25 × V^0.20
```

- P: 파서 신뢰도
- R: 리스크 스코어링 신뢰도
- E: 가격 추정 신뢰도
- V: 유효성 검증 신뢰도

---

### 11. NLP/NER 파이프라인 (`nlp-ner-pipeline.ts`) — 특허 9

LLM 없이 규칙 기반 한국어 토크나이저와 11종 엔터티 인식, 관계 추출을 결정론적으로 수행하는 부동산 도메인 특화 NLP 파이프라인.

**인식 엔터티 11종**:
`PERSON`, `ADDRESS`, `MONEY`, `AREA`, `DATE`, `RATE`, `ORGANIZATION`, `PROPERTY_TYPE`, `RIGHT_TYPE`, `LEGAL_REF`, `DURATION`

**15개 개체유형** (`RealEstateEntityType`): 소유자, 근저당권자, 임차인, 압류권자, 채권최고액, 설정일, 말소일, 권리종류, 위험요소, 주소, 면적, 용도, 건축년도, 거래금액, 전세금

- LLM 의존 없이 재현성 100% 보장
- 부동산 법률 용어 전문 정규화 (금액·면적·날짜)

---

### 12. 보증보험 3사 통합 판단 (`guarantee-insurance.ts`) — 특허 8

HUG, HF, SGI 3개 보증기관의 가입 요건(보증금 한도, 주택가격 한도, LTV 비율, 전세대출 연계 여부)을 규칙 엔진으로 구현하여, 물건 정보 입력만으로 3사 동시 가입 가능 여부를 자동 판단하고 최적 기관을 추천한다.

---

### 13. 5모델 앙상블 시세 예측 엔진 (`prediction-engine.ts`) — 특허 B

5가지 이질적 예측 모델을 앙상블하고 거시경제 지표(기준금리)를 실시간 보정하며 신뢰도 점수를 함께 산출한다.

**5개 모델**:

| 모델 | 종류 | 특징 |
|------|------|------|
| 선형회귀 (Least Squares) | 추세 | 장기 추세 R² 기반 |
| 평균회귀 (Mean Reversion) | 회귀 | 연간 30% 회귀계수 |
| 모멘텀 | 지수감쇠 | g_recent × e^(-0.15t) |
| ARIMA(1,1,1) | 시계열 | CSS 최소화 파라미터 추정 |
| ETS(A,A,A) | Holt-Winters | α, β, γ Grid Search 최적화 |

**앙상블 결합 수식**:
```
P̂_ensemble = Σ wᵢ × P̂ᵢ

거시경제 보정:
adj = (r_current - r_default) × (-0.005)  (금리 1%p ↑ → 가격 -0.5%)
P̂_final = P̂_ensemble × (1 + adj)
```

**신뢰도 점수**:
```
C = C_data × 0.4 + C_fit × 0.3 + C_recency × 0.15 + C_volume × 0.15
C_data = min(100, 거래건수 × 3.3)
C_fit = R² × 100
C_recency = { 100: 최근3개월, 70: 최근6개월, 40: 최근12개월, 20: 기타 }
```

**모델 폴백 규칙**:
- 거래 데이터 ≥ 24건 → 5모델 앙상블
- 12~23건 → 3모델 (ARIMA/ETS 제외)
- 3~11건 → 2모델 (선형회귀 + 평균회귀)
- < 3건 → 단순 인플레이션 추정

---

### 14. 크로스 기능 연계 시스템 (`cross-analysis.ts` 외)

분석 모듈 간 이벤트 기반 의존성 그래프를 구성하여 한 모듈의 분석 결과가 연관 모듈의 재계산을 자동으로 트리거한다.

**구성 모듈**:
- `lib/event-bus.ts` — 인메모리 Pub/Sub, 이벤트 히스토리
- `lib/dependency-graph.ts` — DAG 의존성 그래프, Kahn 알고리즘(토폴로지 정렬), 순환참조 방지
- `lib/cascade-engine.ts` — 캐스케이드 업데이트, 임계값 검사
- `lib/cross-analysis.ts` — 6가지 교차 분석 규칙

**6가지 교차 분석 규칙**:

| # | 연계 방향 | 함수 | 내용 |
|---|----------|------|------|
| 1 | 권리분석 → 세무 | `evaluateRegistryToTax()` | 양도세 자동 계산 |
| 2 | 시세전망 → 전세보호 | `evaluatePriceToJeonse()` | 깡통전세 위험 알림 |
| 3 | 계약서 → 권리분석 | `evaluateContractToRegistry()` | 교차 검증 |
| 4 | 전세보호 → 시세전망 | `evaluateJeonseToPrice()` | 전세가율 피드백 |
| 5 | 세무 → AI어시스턴트 | 링크 정의 (패스스루) | 상담 컨텍스트 전달 |
| 6 | V-Score → 전체 | `evaluateVScoreToAll()` | 전체 재계산 트리거 |

**Gap**: `analyze-unified/route.ts`에 이벤트 버스·크로스 분석 연동이 미완성 상태 (개별 모듈은 독립 동작 가능, 통합 파이프라인 플러그인 미완)

---

### 15. 부동산 세금 통합 시뮬레이터 (`tax-calculator.ts`) — 특허 H

취득세·재산세·종합부동산세·양도소득세를 통합 계산하며 연도별 세법 변경을 자동 적용한다.

**수식 요약**:

취득세:
```
rate₁ = 1%(P≤6억) / 1%+(P-6억)/3억×2%(6억<P≤9억) / 3%(P>9억)
다주택중과: 8%(2주택 조정지역) / 12%(3주택+)
생애최초감면: P≤6억 → 0, 6억<P≤12억 → max(0, P×1%-200만)
```

양도소득세 장기보유특별공제:
```
총공제 = min(보유공제(max 40%) + 거주공제(max 40%), 80%)
1세대1주택 비과세: holdingYears ≥ 2 ∧ P_sell ≤ 12억
```

---

## Architecture [coverage: high -- 3 sources]

```
┌─────────────────────────────────────────────────────────────┐
│                    데이터 입력층                              │
│  등기부등본 텍스트 / MOLIT 실거래가 / 건축물대장 / 계약서     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    파싱 & 검증 계층                           │
│  registry-parser.ts    →   validation-engine.ts             │
│  (등기부 구조화)           (23개 검증기 × 4계층)              │
│  nlp-ner-pipeline.ts   →   confidence-engine.ts             │
│  (NER 11종)                (신뢰도 전파)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    위험도 분석 계층                           │
│  risk-scoring.ts    →  anomaly-detector.ts                  │
│  (12개 감점 팩터)       (8패턴 + 3중 통계)                   │
│  fraud-risk-model.ts →  rights-graph-engine.ts              │
│  (15피처 LOO)           (5대 그래프 알고리즘)                │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    통합 스코어링 계층                         │
│  v-score.ts (5소스 × 6상호작용 규칙)                        │
│  adaptive-weight-tuner.ts (Thompson Sampling 자동 튜닝)     │
│  cross-analysis.ts + cascade-engine.ts (모듈 간 연계)       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    무결성 & 출력층                            │
│  integrity-chain.ts (Merkle Tree 변조 감지)                 │
│  prediction-engine.ts (5모델 앙상블 시세전망)               │
│  guarantee-insurance.ts (보증보험 3사 판단)                 │
│  tax-calculator.ts (세금 통합 시뮬레이션)                   │
└─────────────────────────────────────────────────────────────┘
```

**분석 파이프라인 실행**: `app/api/analyze-unified/route.ts` — 11단계 순차 실행, V-Score 포함

**테스트 커버리지**: 핵심 분석 엔진 9개 모듈 (`registry-parser`, `validation-engine`, `risk-scoring`, `confidence-engine`, `prediction-engine`, `price-estimation`, `tax-calculator`, `contract-analyzer`, `csrf`) 테스트 완료 (1,497 LOC, Vitest)

---

## Key Decisions [coverage: high -- 4 sources]

1. **AI 미사용 핵심 엔진**: 파싱·검증·스코어링 모든 핵심 엔진을 순수 TypeScript로 구현. 예측 가능성, 비용, 속도 모두 LLM 대비 우위. OpenAI는 자연어 설명 생성 보조에만 사용.

2. **4단계 검증 계층 구조**: 포맷 → 산술 → 문맥 → 크로스체크 계층적 검증은 업계 최초. AI 파싱 결과를 그대로 사용하지 않고 자기검증(Self-Validation)을 수행.

3. **비선형 상호작용 규칙**: 단순 가중합이 아닌 팩터/소스 간 증폭·경감 규칙을 도입. 복수 위험 요인이 동시에 발생할 때 실제 위험이 합산 이상으로 증가하는 현실을 반영.

4. **31개 등기 키워드 분류**: 갑구 18개 + 을구 13개 키워드를 위험도 수준별로 분류. 6가지 한국식 금액 표현 패턴 인식.

5. **Thompson Sampling 적용**: 사용자 피드백(실제 사기 발생 여부)을 기반으로 가중치를 자동 조정. 부동산 도메인에 Thompson Sampling을 적용한 최초 사례.

6. **세계 최초 등기부 그래프 모델링**: 등기부등본을 노드-엣지 그래프 자료구조로 변환하여 순환 탐지, 위험 전파, 최대 피해 경로 등 그래프 알고리즘을 적용.

7. **파라미터는 초기값 상태**: 감점 수치, 가중치, 증폭계수 등 모든 수치 파라미터는 도메인 전문가 휴리스틱에 기반한 초기값이며, HUG 사고 데이터·법원 경매 데이터 기반 실증 검증(Backtesting)이 계획되어 있으나 미완료 상태.

---

## Gotchas [coverage: medium -- 4 sources]

- **OCR 텍스트 민감성**: `registry-parser.ts`는 OCR 결과 텍스트도 처리해야 하므로 띄어쓰기 가변성에 매우 민감. 패턴 매칭이 실패하면 섹션 분리 자체가 틀어짐.

- **ARIMA/ETS 최소 데이터 요건**: ARIMA, ETS 모델은 최소 24개월 거래 데이터가 필요. 미달 시 자동 폴백(3모델 → 2모델 → 단순 추정).

- **landlordScore 일부 mock**: V-Score 산출 시 임대인 위험지표(landlordScore)의 `credit-api` 연동이 현재 mock 포함 상태. 실제 신용정보 API 연동 시 점수 변동 예상.

- **analyze-unified 크로스 연동 미완**: `cross-analysis.ts`, `event-bus.ts`, `fraud-risk-model.ts` 등 개별 모듈은 완성되어 있으나, `analyze-unified/route.ts` 통합 파이프라인에 아직 플러그인되지 않음. 독립 API(`/api/fraud-risk`)로는 정상 동작.

- **파라미터 실증 미완**: 모든 수치 파라미터(감점값, 증폭계수, 피처 가중치, 기간 조건 등)는 전문가 휴리스틱 초기값임. 특허 출원 심사 대응을 위해 Phase 2 후향적 검증(민감도 80% 이상, 오경보율 20% 이하) 완료 후 출원 권장.

- **도메인 용어 시드 데이터**: 설계 목표 56건 대비 현재 54건 (2건 미달). 운영 중 수동 추가로 보완 가능.

- **V-Score gradeLabel/algorithmId**: 설계 명세에는 없으나 구현에서 추가된 두 필드. 설계 문서와 실제 타입 불일치 주의.

---

## External Data Sources (공공 API 10종)
[coverage: high -- 3 sources]

예측 엔진 및 분석 알고리즘이 활용하는 외부 데이터 소스 전체 목록:

| API | 모듈 | 활용 알고리즘 | 데이터 |
|-----|------|-------------|--------|
| MOLIT 실거래가 | molit-api.ts | 시세전망, V-Score | 아파트/주택 실거래, 전세 실거래 (36개월) |
| BOK 기준금리 | bok-api.ts | 시세전망 거시보정 | 한국은행 기준금리, 거시경제 지표 |
| REB 가격지수 | reb-api.ts | 시세전망 | 매매/전세 가격지수 변동률 |
| 건축물대장 | building-api.ts | 시세전망, 사기위험 | 건물 상세(연식, 층수, 세대수) |
| 대법원 판례 | court-api.ts | 계약서 분석 | 부동산 관련 법률 판례 |
| 서울열린데이터 | seoul-data-api.ts | 시세전망 크로스체크 | 서울시 공공 데이터 |
| KOSIS 통계 | kosis-api.ts | 시세전망 | 인구 동향, 주택 공급 |
| DART 기업정보 | dart-api.ts | SCR 사업성 | 시행사 재무제표, 법인 정보 |
| REPS 부동산 | reps-api.ts | 시세전망 | 매매/전세 가격지수 상세 |
| MOIS 인구 | mois-api.ts | 시세전망 | 지역별 인구/연령 통계 |

---

## 등기변동 하이브리드 감시 아키텍처
[coverage: medium -- 1 source]

등기부등본 전체 재조회 비용을 줄이면서도 조기 경보를 제공하는 2단계 하이브리드 감시 설계. 설계 문서: `docs/02-design/registry-monitoring-hybrid.md`

**역할 분리**:

| 단계 | 공급자 | 역할 | 결과 |
|------|--------|------|------|
| 1차 프리체크 | Tilko | 등기신청사건 접수/처리/완료 상태 감지 | 조기 경고 |
| 2차 확정 조회 | CODEF | 최신 등기부등본 전체 조회 | 실제 변경 확정 |
| 3차 분석 | Vestra | 이전 스냅샷과 최신 등기부 비교 | 위험 유형/알림 |

**상태 흐름**:
```
idle
  → case_detected       Tilko 신청/접수/처리 중 사건 감지
  → pending_confirm     Tilko 처리 완료 신호, CODEF 확인 대기
  → confirmed_changed   CODEF 조회 후 등기부 변경 확정
  → confirmed_no_change CODEF 조회 후 변경 없음 확인
  → dismissed           취하/각하/반려 종결
```

**운영 주기**:

| 모드 | Tilko 프리체크 | CODEF 강제 검증 |
|------|--------------|----------------|
| 일반 감시 | 하루 1회 | 월 1회 |
| 계약~전입 감시 | 하루 3~6회 | 전입 전날/잔금 당일 |
| 고위험 물건 | 하루 1회 이상 | 주 1회 |

**구현 위치**:
- Cron: `app/api/cron/registry-monitor/route.ts`
- Tilko 클라이언트: `lib/tilko-api.ts`
- CODEF 조회: `lib/codef-api.ts`
- 스냅샷: `lib/registry-snapshot-recorder.ts`, `lib/registry-blockchain.ts`
- 상태 저장: `MonitoredProperty.registrySignalStatus`

---

## 시세전망 강화 로드맵 (Phase A~D)
[coverage: medium -- 2 sources]

기획서: `docs/01-plan/features/prediction-enhancement.plan.md`

| Phase | 내용 | 주요 파일 |
|-------|------|-----------|
| A — 예측 엔진 고도화 | MOLIT 36개월 확대, ARIMA/ETS 추가 (3→5모델), 월별 세분화 예측 | `lib/prediction-engine.ts`, `lib/molit-api.ts` |
| B — 외부 데이터 연동 | 한국은행 기준금리 실시간, 입주물량, 인구이동 | `lib/bok-api.ts`, `lib/supply-api.ts`, `lib/population-api.ts` |
| C — UI 개선 | 예측 대시보드, 지역 비교 (3개 지역), 시장 사이클 탐지 | `components/prediction/Dashboard.tsx`, `RegionCompare.tsx`, `MarketCycle.tsx` |
| D — 백테스팅 | 과거 12개월 예측 정확도 검증, MAPE < 15% 목표 | `lib/backtesting.ts`, `components/prediction/BacktestView.tsx` |

**목표 성능**: API 응답 < 8초, 백테스팅 MAPE < 15%

---

## Sources [coverage: high -- 11 sources]

- `/Users/watchers/Desktop/vestra/docs/ALGORITHM.md` — 3개 핵심 엔진 기술 명세 (KIBO 심사용)
- `/Users/watchers/Desktop/vestra/docs/VESTRA_Patent_Report_2026.md` — 9개 특허 기술 상세
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md` — 8종 독자 알고리즘 목록
- `/Users/watchers/Desktop/vestra/docs/03-analysis/vestra-algorithm-advancement.analysis.md` — 알고리즘 Gap 분석
- `/Users/watchers/Desktop/vestra/docs/03-analysis/predict-value.analysis.md` — ML 학습관리 Gap 분석
- `/Users/watchers/Desktop/vestra/docs/VESTRA-기술보고서-및-특허기술-설명서.md` — 8개 특허 기술 수식 상세
- `/Users/watchers/Desktop/vestra/documents/완료보고서-2026-03-23/VESTRA_기술분석서_v4.5.1.md` — 알고리즘 7종 상세 + API 51개 분류
- `/Users/watchers/Desktop/vestra/documents/완료보고서-2026-03-23/VESTRA_특허기능설명서_v4.5.1.md` — 특허기능 수식 상세
- `/Users/watchers/Desktop/vestra/docs/02-design/registry-monitoring-hybrid.md` — 등기변동 하이브리드 감시 설계
- `/Users/watchers/Desktop/vestra/docs/01-plan/features/prediction-enhancement.plan.md` — 시세전망 강화 기획
- `/Users/watchers/Desktop/vestra/docs/01-plan/features/data-integration.plan.md` — 공공 데이터 3종 연동 기획

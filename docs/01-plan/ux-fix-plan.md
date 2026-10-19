# 베스트라 전세 탐색 UX 평가 — 원인 진단 & 근본 수정 계획서

> 출처: `~/Desktop/베스트라 전세 탐색 UX 평가.pdf` (대장 UX 테스트 평가)
> 진단: 2026-10-16, 크로미 (코드 대조 병렬 진단 5영역)
> 원인분석 PDF: `~/Desktop/베스트라 전세 탐색 UX 평가 (원인분석).pdf`
> **상태: 진단 완료 / 수정 착수 전 — 대장 승인 대기**

---

## 0. 공통 근본 원인 (3가지)

1. **"데이터 없음 = 안전"으로 처리하는 치명적 로직** — 전세사기 방지 서비스의 존재 이유를 무너뜨림. (권리분석 핵심)
2. **매물 데이터 파이프라인 공백** — 탐색 깔때기 맨 위(매물검색·시세지도)가 비어 유입 0.
3. **매매용 엔진의 전세 미분기** — 용어·특약·지표가 전세 세입자 맥락에 맞게 분기되지 않음.
+ 부수: 수치 정합성 검증 부재(신뢰도 3000%·전세가율 모순), 상태 저장(persistence) 아키텍처 부재.

---

## 1. 우선순위별 TODO 리스트

### 🔴 P0 — 치명 (안전 거짓보장·수치 버그, 최우선)

- [ ] **P0-1. 허위 안심 로직 근본 수정** — 데이터 미확보 시 만점(100/99점·A등급) 산출 금지
  - 위치: `lib/risk/evaluators.ts:20-21`(등 감점 0 반환), `lib/risk-scoring.ts:189`(`totalScore=100-0`), `lib/v-score/source-scorers.ts:116`(available:false인데 기본 50점 가중)
  - 방향: 데이터 없는 소스는 점수 산출 제외하고 **"분석 불가/데이터 미확보" 상태 명시**. 등기부·시세 미확보 시 등급 대신 경고 노출. (특허 V-Score 수식은 보존하되 "available 소스만 가중" 재정규화)
  - ⚠️ 특허(V-Score·조항 상호작용) 수식 불변 원칙 — 데이터 게이팅만 추가.
- [ ] **P0-2. 신뢰도 3000% 계산 버그 수정** — 스케일 통일
  - 위치: `lib/confidence-engine.ts:122-136`, `lib/price-estimation.ts:167-198`, `components/results/IntegratedReport.tsx:305`
  - 방향: 내부 신뢰도 0~1 통일, 표시 단계에서만 ×100, 중복 곱셈 제거. 변수명 분리(`_normalized`/`_percentage`).
- [ ] **P0-3. 전세가율 vs 최근거래가 모순 수정** — 추정가·최근거래 소스 통일
  - 위치: `app/api/analyze-unified/analyze-service.ts:139-156`(marketData 재구성), `:192-194`(recentTransaction)
  - 방향: 전세가율 기준 추정가와 "최근거래" 표기를 동일 소스로 통일, 또는 라벨 명확 분리(필터링 추정가 vs 구 전체 최근거래).

### 🟠 P1 — 높음 (핵심 기능 공백·유형 오류)

- [ ] **P1-1. 매물 데이터 공급** — 매물검색/지도 0건 해소
  - 위치: `app/api/listings/route.ts`(쿼리는 정상), `useListingsMap.ts:87-94`(운영서 빈 배열 하드코딩)
  - 방향: ① 운영 DB 실매물 입력/마이그레이션 경로 결정(관리자 등록 UI? seed? 제휴 데이터?) ② 지도검색 테스트모드 제거 후 DB 조회 연결. **→ 데이터 출처는 대장 결정 필요.**
- [ ] **P1-2. 부동산 유형 기본값 "아파트" 제거** — 오피스텔/주상복합 오표기
  - 위치: `app/api/analyze-unified/analyze-service.ts:187`
  - 방향: `parsed.title.purpose || "용도 미확인"`, 가능 시 건축물대장 mainPurpose 활용.
- [ ] **P1-3. 전세/매매 분기 — 매매용 문구·특약 정리**
  - 위치: `lib/safety-diagnosis.ts:346`("매도인 세금 체납"), `lib/title-insurance.ts`(권원보험), `lib/contract-clause-generator.ts:59-94`
  - 방향: `analysisContext: 전세|매매` 도입, 전세는 권원보험·매매특약 제외+세입자 표현. "등기부 미제출인데 등기부 기반 자동생성" 허위 안내 제거.
- [ ] **P1-4. 주소 잘림 수정** (예: "…다산동 철근콘크리")
  - 위치: `analyze-service.ts` propertyInfo.address 구성 (건물구조 혼입 추정)

### 🟡 P2 — 중간 (상태 저장·정렬·설명 UI)

- [ ] **P2-1. 계약체크리스트 저장/복원** — 새로고침 초기화 해소
  - 위치: `renewal/jeonse/JeonseRenewalContent.tsx:13-20,51`
  - 방향: 주소별 localStorage 저장+복원, 로그인 시 DB(sync-data) 동기화, 마지막 수정일 표시.
- [ ] **P2-2. 마이페이지 분석 이력 상세 재열람** — 저장구조는 완성, UI만 누락
  - 위치: `renewal/profile/components/ProfileDashboardPanel.tsx:76-101` (앱 `dashboard/.../AnalysisHistory.tsx`엔 모달 존재)
  - 방향: 항목 클릭→상세 모달/페이지, 이전 결과 비교·다운로드.
- [ ] **P2-3. 시세지도 정렬 옵션 추가** — 보증금순/면적순/건축년도순
  - 위치: `price-map/hooks/usePriceMap.ts:473-475`(변동률 내림차순 하드코딩)
- [ ] **P2-4. 시세지도 읍·면·동 선택 추가** — 3단계 드롭다운
  - 위치: `price-map/components/LeftPanel.tsx:91-117`, `constants.ts`(DONG 확장)
- [ ] **P2-5. 지도 무한로딩 개선** — SDK 로드 이중 폴링 단일화
  - 위치: `usePriceMap.ts:58-70,252-278`, `components/common/KakaoScript.tsx:21-62`
  - 방향: 로드 로직 단일화, loading 상태 단축, 실패 시 새로고침 버튼/원인 로깅.
- [ ] **P2-6. 지표 설명 UI** — 안전점수↔위험도 관계, 주변환경 산정식, V-Score·'시계열 이상 패턴' 용어 순화
  - 위치: `SafetyDiagnosisCard.tsx`, `JeonseEnvAnalysis.tsx:266-275`, `app/methodology`
- [ ] **P2-7. 비아파트 지오코딩 폴백** — 빌라/오피스텔 0~1건·로딩 개선
  - 위치: `app/api/price-map/route.ts:225-244,435`
  - 방향: 타임아웃 조정, 실패 시 동/구 중심 폴백 좌표.

### ✅ 확인 필요 (버그 아닐 가능성)

- [ ] **C-1. 권리분석 PDF 다운로드** — `PdfDownloadButton` 코드상 구현됨(IntegratedReport.tsx:53-59, RightsResult.tsx:65). 특정 경로/조건 실패 여부 운영 실화면 재확인.

---

## 2. 권장 작업 순서

1. **P0 일괄** (허위안심 → 신뢰도 → 전세가율): 서비스 신뢰성 직결, 서로 같은 analyze 파이프라인이라 함께 수정 효율적.
2. **P1-2, P1-3, P1-4** (유형/문구/주소): 권리분석 화면 품질 묶음.
3. **P1-1 매물 데이터**: 데이터 출처 대장 결정 선행.
4. **P2 묶음**: persistence(P2-1,2) → 시세지도(P2-3~5,7) → 설명 UI(P2-6).

## 3. 검증 원칙 (규칙 0 준수)

- 각 수정은 로컬 빌드·테스트 통과 ≠ 완료. **t-vestra 테스트 배포 → 운영 실화면 검증**까지.
- P0는 **등기부 없는 케이스/확인불가 케이스로 실제 조회**하여 "분석 불가" 노출 실증.
- 코드 수정 후 **코덱스 교차검증(프론트+백엔드 독립 적대검증)** 적용.
- 완료 전 견고성 4문(규모·수명주기·비정상경로·적대적 자문) 자문.

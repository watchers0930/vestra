# 전세 위험도 재설계 — 인수인계 (fix/jeonse-ux-audit)

> 2026-10-21 보류 결정. 이 브랜치는 **미배포**. price-input UX + 전세권 UI는 전용 세션에서 재설계.

## 배포 상태
- **운영 반영됨(main, 별도 squash 커밋)**: 마이페이지 분석이력 재열람·비교·PDF + 전세 체크리스트.
- **이 브랜치(보류, 미배포)**: 위험도 산정 재설계 + rights 결과 UI(V-Score 설명·그래프·안전점수 배치).

## ✅ 완료·codex 8라운드 검증 clean (백엔드 안전로직)
- **단조성**: 채권↑ → 안전점수↓ 보장. 400,025 조합 검사 점수역전 0. (`lib/risk/interaction-analyzer.ts` 심각도 범위 매칭)
- **시세/분모 미확인** → 최소 20점 감점 + `claims_unverified` factor (허위 100점·A 방지). (`lib/risk/claims-policy.ts`)
- **max(근저당, 합산채권) 감점 + 근저당·합산 고위험 factor 모두 보존**. (`lib/risk-scoring.ts`)
- **전세권 선순위 반영 + 투명표시 + ownJeonseRight(order+holder) 정확 제외**(API). (`claims-policy.ts`)
- **고위험 중복경고 1건화** (factors·risks 양쪽, 선순위·근저당). (`components/rights/HighRiskSummary.tsx`)
- **주소 동호 정규화**(토큰 병합 방지), **면적 파싱**(천단위·경계). (`lib/registry/title-address-parser.ts`, `title-area-parser.ts`)
- 원래 감사 핵심 "선순위 85.7%인데 위험도 22점 모순" 해결.

## ❌ 남은 작업 (전용 재설계 필요)
### 1. price-input 상태관리 (narrow 엣지, codex 라운드8 잔여 2건)
- 증상: 한 세션에서 물건 A→B 교체 시 이전 사용자 시세 재전송 / 파일+주소 혼합 입력 순서에서 시세 누락.
- 원인: `useRightsAnalysis.ts`의 `userPriceRef` 리셋 트리거(`[tilkoAddress, fileName]` effect)가 **사용자 입력**과 **분석 내부 변이**(`setFileName(null)`·`setRawText(registryText)`)를 구분 못함.
- **권장 설계**: 시세 입력을 '빈 상태 명시(placeholder, null 기본)'로 두고, 사용자 입력 핸들러에서만 userPrice 설정·리셋(분석 내부 변이는 raw setter 사용해 비분리). state-effect 리셋 폐기.
- ⚠️ 흔한 단일분석 흐름에선 정상 동작. 다중물건·입력순서 엣지만.

### 2. 본인 전세권 제외 UI (#2, P2)
- 백엔드(`ownJeonseRight`) 완비·투명표시 완료. 화면에 '이 전세권이 본인(갱신) 것' 지정 UI 미연결.
- **권장**: 결과화면에서 전세권(order/holder/amount) 노출 → 사용자가 본인 것 선택 → ownJeonseRight로 재분석.

### 3. 파일 크기
- `useRightsAnalysis.ts` 419줄 (400 초과) — 재설계 시 price/입력 로직을 별 훅으로 분리 권장.

## 재개 방법
`git checkout fix/jeonse-ux-audit` 후 이 노트 + `docs/02-design/features/ux.design.md`·codex 라운드1~8 검증 로그 참조. 재검증은 codex 적대검증(`codex exec`)로 clean까지.

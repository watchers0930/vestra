# VESTRA 1등화 로드맵 — AI·보안·권리 축 강화

> 작성 2026-09-10. 배경: 경쟁력 분석(유사업종 분야별 1등 대비 육각) 결과, VESTRA는 6축 중
> AI·보안·권리가 강점(1등 근접/우위)이고 시세·전자계약은 격차 큼. 전략 = "다 메우기"가 아니라
> **강점 3축(AI·보안·권리)을 확실한 1등으로 세우고 통합으로 묶는다.** 약점(시세·전자계약)은 자체개발 대신 제휴로.
> 진행 방식: 항목별 계획→설계→구현→테스트→배포→실화면 검증으로 **하나씩 완결**(규칙 0-5 견고성 4문 적용).

## 진행 현황
- ✅ **P0-1 AI 근거표시(citation)** — v5.151.0 운영반영 (2026-09-10)
  - `lib/analysis-sources.ts`(실제 fetch·계산값만 sources[]로, 환각 0) + `components/common/SourceCitations.tsx` + `RightsResult`(공통) 연결 → rights·중개·renewal 전 화면. 단위테스트 7개.
- ✅ **P0-2 AI 품질게이트(LLM-as-judge)** — v5.152.0 운영반영 (2026-09-10)
  - `lib/ai-quality-gate.ts`(정확·근거·완결 3축 채점, 종합 가중 재계산, accuracy 하드플로어 60·임계 70, 판사 실패 시 fail-open) + `analyze-unified` 런타임 게이트(생성→채점→미달 시 판사 피드백 1회 재생성→더 나은 쪽 채택, `qualityGate` 반환) + `RightsResult` 통과배지/미달경고. 회귀 하버스 `npm run audit:ai-quality`(골든픽스처 3, prebuild 미연결). 단위테스트 8. 운영 실측: qualityGate overall 93·재생성 루프 실동작 확인. 기존 `selfVerify`(규칙기반)·P0-1 sources 보완.
- ✅ **P0-3 SEARCH_INDEX_KEY 실분리** — **완료·운영검증 완료 (2026-09-21 재검증)**. 전환 완료 후 legacy 폴백 제거(`ee75f7b`) → `lib/crypto.ts` `getSearchKey()`=`SEARCH_INDEX_KEY||AUTH_SECRET`, `hashForSearch`는 신규키 단일 exact-match(hashForSearchLegacy·Candidates 제거됨). 조회 4곳(agent/clients·[id], admin/training-data·[id]) 모두 폴백 없는 exact-match. **운영 실증(규칙 0-2)**: ①Vercel 운영 env `SEARCH_INDEX_KEY` 설정됨(10일 전)·로컬과 sha 동일(AUTH_SECRET·PII_ENCRYPTION_KEY·PII_SALT도 운영=로컬 동일)·`SEARCH_INDEX_KEY≠AUTH_SECRET`(진짜 분리) ②운영 DB dry-run rekey = AgentClient 6건 **rekey 0/동일 6**(전량 신규키 백필 완료). ⚠️TrainingData 102건은 과거 해시가 현재 hashForSearch와 불일치(현재 파이프라인 이전 생성)→rekey 기본 제외(관리자 전용·저위험 dedup, 의도적 수용).
- ✅ **P0-4 PII 접근 감사 로그 + 이상탐지** — 기존 `AuditLog` 재사용(마이그레이션 0). `lib/audit-log.ts` recordPiiAccess(무PII·fire-and-forget)+detectPiiAnomaly(5분 50건 임계). agent/clients·admin/users 계측.
- ✅ **P0-5 SAST + 의존성 스캔(SCA) CI** — `scripts/audit-security.mjs` prebuild 연결. 회귀차단(기존 부채 유예, 신규만 차단). SAST(eval·dangerouslySetInnerHTML 래칫)+SCA(npm audit baseline, 툴 실패 fail-open).
- ✅ **P0-6 V-Score 방법론·검증 공개** — `/methodology` 공개페이지. 검증가능 사실만(가중치·r=0.687·물건별 백테스트·한계). 근거 없는 적중률 헤드라인 배제.
- ⛔ **P0-7 공공데이터 연계 확대 — 보류 유지 (2026-09-21 API 가용성 실증)**. 3개 하위항목 전부 현재 무료 공개 REST API 부재로 확인:
  - **악성임대인(상습 채무불이행)**: HUG가 명단을 안심전세앱/홈페이지에 공개하나 조회용 공개 REST API 데이터셋 부재.
  - **HUG 전세보증 사고이력**: data.go.kr 제공분은 지역·주택유형별 **집계 통계**(임대보증금보증세대수현황·전세보증금반환보증 발급현황)뿐, 특정 임대인·물건별 사고 조회 API는 개인정보라 부재.
  - **건축물대장 위반건축물**: 사용 중인 `getBrTitleInfo`(표제부) 응답 78필드 **실호출 실증** → 위반 여부 필드 없음(regstrGbCd=대장구분·regstrKindCd=대장종류뿐). 건축HUB 신 API 오퍼레이션(총괄표제부·표제부·층별개요·부속지번·전유공용면적·오수정화·주택가격·전유부·지역지구구역)에도 위반건축물 없음. **case 2025-026**: 국토부가 위반건축물 API 제공을 **거부**(분쟁조정 반려).
  - → **결론: 무료 공개 API로는 착수 불가.** 국토부 위반건축물 API 개방 시 재개(그때는 `building-api.ts`에 필드 추가만 하면 됨 — 커넥터 구조 기존재). 유료 스크래핑(틸코 등)은 등기부에서 틸코 제외한 전례·비용 고려 시 별도 결정 필요.

## P1 (다음 단계, 요약)
- AI 능동 에이전트화(내 매물·계약·감시 추적 선제 알림) / 프롬프트 캐싱
- 외부 KMS 승격(env→관리형 키) / 인증 강화(패스키·2FA)
- 발견→대응 원스톱 강화 / 커버리지 확대(다세대·오피스텔·상가·전국)

## P2
- 멀티모달 확대(계약서·평면도) / ISMS-P 인증 준비 / 보증보험 실가입 연동

## 각 축 "1등"의 정의(목표)
- **AI**: 단일기능이 아니라 "부동산 전 과정을 근거 있게 자동 판단하는 에이전트"
- **보안**: 코드보안(S1~S8 완료)에 더해 키관리·감사·대외인증까지 = 핀테크급
- **권리**: 안심전세앱보다 정확·빠르고, 발견→대응까지 원스톱

## 참고
경쟁력 분석 PDF: `/Users/watchers/Desktop/VESTRA_경쟁력분석_2026-09-10.pdf`
보안 개편(S1~S8) 완결: `docs/SECURITY-ENCRYPTION-ARCHITECTURE.md`

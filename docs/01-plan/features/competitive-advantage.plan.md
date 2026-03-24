# 내집스캔 대비 경쟁우위 확보 기획서

> **Summary**: 내집스캔 우위 영역(전문가 상담, 대출/보험 연계, 임대인 DB, 모바일, 가격)을 VESTRA가 역전하기 위한 8주 로드맵
>
> **Project**: VESTRA
> **Version**: 4.8.0
> **Author**: AI
> **Date**: 2026-03-24
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

내집스캔과의 비교 분석 결과, VESTRA는 기능 범위·AI 정교함·데이터 다양성에서 우위이나 **전문가 상담, 대출/보험 연계, 임대인 이력 DB, 모바일 접근성, 가격 경쟁력** 5개 영역에서 열세. 이 5개 영역을 8주 내 역전하여 전 영역 우위를 확보한다.

### 1.2 Background

- **내집스캔**: 전세사기 예방 특화 앱, 누적 분석 보증금 50조원+, 앱평점 4.7
- **VESTRA**: 부동산 종합 AI 플랫폼, 7개 핵심 기능 + 62개 API, 개발 중(v4.8.0)
- 내집스캔의 강점은 "사람 전문가", "금융 연계", "임대인 DB", "모바일 앱", "저가격"
- VESTRA는 이를 AI 기술력 + 데이터 통합으로 **더 나은 방식으로** 해결 가능

### 1.3 Related Documents

- 경쟁 분석: 내집스캔 vs VESTRA 비교우위 분석표 (2026-03-24 대화 기록)
- 기존 기획서: `docs/01-plan/features/` 내 7개 기획서

---

## 2. Scope

### 2.1 In Scope (8주 로드맵)

- [1주차] PWA 적용 + FREE 티어 전세 안전도 무료 개방
- [2주차] 보증보험 가입 판단 로직 + 임대인 소유물건 자동 추적
- [3~4주차] 전세대출 가심사 시뮬레이션 + 건당 과금 옵션
- [5~6주차] 임대인 종합 프로파일 + 사용자 제보 시스템
- [7~8주차] AI 분석 정확도 공개 + 전문가 연결 제휴

### 2.2 Out of Scope

- 네이티브 모바일 앱 (React Native/Flutter) — 추후 별도 기획
- 시장 검증/실적 — 시간이 해결할 문제, 별도 마케팅 전략으로 분리
- 내집스캔 B2B/B2G 파트너십 대응 — 영업/사업개발 영역

---

## 3. Requirements

### 3.1 Functional Requirements

#### Phase 1: PWA + 무료 전세분석 (1주차)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | PWA manifest.json + service worker 적용 | High | Pending |
| FR-02 | 홈화면 추가(A2HS) 프롬프트 구현 | High | Pending |
| FR-03 | 오프라인 캐시 (최근 분석 결과 열람 가능) | Medium | Pending |
| FR-04 | 푸시 알림 기반 등기변동 알림 (Web Push API) | Medium | Pending |
| FR-05 | FREE 티어 전세 안전도 분석 무제한 개방 (기존 일 5회 → 무제한) | High | Pending |
| FR-06 | FREE 티어 등기부 기본 분석 무제한 개방 | High | Pending |

#### Phase 2: 보증보험 + 임대인 추적 (2주차)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-07 | HUG/SGI/HF 보증보험 가입 조건 규칙 엔진 구현 | High | Pending |
| FR-08 | 물건 정보 입력 시 보증보험 가입 가능 여부 + 예상 보험료 산출 | High | Pending |
| FR-09 | 등기부 파싱 시 동일 소유자의 다른 물건 자동 검색 | High | Pending |
| FR-10 | 임대인 소유 물건 목록 + 각 물건 근저당/압류 현황 종합 표시 | High | Pending |

#### Phase 3: 대출 가심사 + 건당 과금 (3~4주차)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-11 | 주요 시중은행(5대 은행) 전세대출 조건 DB 구축 | High | Pending |
| FR-12 | 물건+소득+신용 기반 전세대출 가능성 시뮬레이션 | High | Pending |
| FR-13 | "매수/임대 의사결정 리포트" — 대출 가심사+시세예측+세금 통합 | High | Pending |
| FR-14 | 건당 과금 결제 시스템 (통합 리포트 1건 4,900원) | Medium | Pending |
| FR-15 | 무료 → 건당 → 구독 업셀 플로우 UX | Medium | Pending |

#### Phase 4: 임대인 종합 프로파일 + 제보 시스템 (5~6주차)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-16 | 임대인 종합 프로파일 페이지: 소유물건 수, 근저당 총액, 판례 이력, 뉴스 언급 | High | Pending |
| FR-17 | 임대인 안전 등급 산정 (A~F) | High | Pending |
| FR-18 | 대법원 판례 API + 뉴스 크롤링으로 임대인 관련 사건 자동 수집 | High | Pending |
| FR-19 | 사용자 제보 시스템: "보증금 미반환" / "사기 의심" 신고 | Medium | Pending |
| FR-20 | 제보 검증 워크플로우: 신고 → 관리자 검증 → DB 반영 | Medium | Pending |
| FR-21 | 임대인 블랙리스트 DB (FraudCase 확장) | Medium | Pending |

#### Phase 5: AI 신뢰도 + 전문가 연결 (7~8주차)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-22 | AI 분석 정확도 대시보드: 전문가 검토 대비 일치율 공개 | Medium | Pending |
| FR-23 | 분석 결과에 "전문가 검토 요청" 버튼 추가 | Medium | Pending |
| FR-24 | 제휴 권리분석사 매칭 시스템 (건당 과금) | Medium | Pending |
| FR-25 | AI 1차 분석 → 전문가 검증 → 최종 리포트 하이브리드 플로우 | Medium | Pending |
| FR-26 | 전문가 검토 결과 → AI 모델 피드백 루프 (가중치 튜닝 연동) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | PWA Lighthouse 점수 90+ | Lighthouse CI |
| Performance | 보증보험 판단 응답 < 500ms | API 응답 시간 측정 |
| Security | 임대인 개인정보 처리 개인정보보호법 준수 | 법무 검토 |
| Security | 사용자 제보 악용 방지 (허위 신고 필터) | 관리자 검증 비율 |
| Accessibility | 모바일 PWA 터치 타겟 44x44px 이상 | Lighthouse 접근성 |
| Reliability | 보증보험 규칙 엔진 정확도 95%+ | 실제 가입 결과 대비 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 5개 Phase 전체 기능 구현 완료
- [ ] 내집스캔 대비 비교표 전 항목에서 동등 이상
- [ ] PWA Lighthouse 90+ 달성
- [ ] 기존 187개 테스트 유지 + 신규 기능 테스트 추가
- [ ] 프로덕션 빌드 성공

### 4.2 Quality Criteria

- [ ] 테스트 커버리지 80% 이상
- [ ] Zero lint errors
- [ ] Build 성공
- [ ] 모바일 반응형 전 페이지 검증

### 4.3 경쟁우위 달성 기준

| 평가 기준 | 현재 | 목표 |
|-----------|:----:|:----:|
| 전문가 상담 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ (AI+사람 하이브리드) |
| 대출/보험 연계 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ (가심사+의사결정 통합) |
| 임대인 이력 DB | ⭐⭐ | ⭐⭐⭐⭐⭐ (종합 프로파일) |
| 모바일 접근성 | ⭐⭐ | ⭐⭐⭐⭐ (PWA+카카오톡) |
| 가격 경쟁력 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ (핵심 무료+건당 저가) |

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 보증보험 규칙 변경 시 엔진 무효화 | High | Medium | HUG/SGI/HF 공시 모니터링 cron + 규칙 버전관리 |
| 임대인 개인정보 이슈 (초상권, 명예훼손) | High | High | 공개 데이터(등기부, 판례)만 활용, 제보는 익명+관리자 검증 |
| 허위 제보 악용 (경쟁사, 악의적 신고) | Medium | Medium | 3건 이상 교차 검증 시에만 블랙리스트 반영 + 신고자 신원 확인 |
| 전세대출 조건 은행별 상이/변경 잦음 | Medium | High | 주요 5대 은행 우선, 분기별 업데이트 + "참고용" 면책 고지 |
| PWA 푸시 알림 iOS 제한 | Medium | Low | iOS 16.4+ 지원, 미지원 기기는 카카오 알림톡 대체 |
| 전문가 제휴 확보 어려움 | Medium | Medium | 초기 무료 노출 제공 → 건당 수수료 모델로 인센티브 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Dynamic** | Feature-based modules, BaaS 가능 | ✅ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| PWA 구현 | next-pwa / serwist / 수동 | serwist | Next.js 16 호환, 가벼움 |
| 결제 시스템 | 토스페이먼츠 / 포트원(아임포트) / 카카오페이 | 포트원 | 다중 PG 지원, 건당+구독 모두 가능 |
| 임대인 DB | 별도 테이블 / FraudCase 확장 | FraudCase 확장 + LandlordProfile 신규 | 기존 사기 사례 DB 활용 + 프로파일 분리 |
| 보증보험 엔진 | 하드코딩 / 규칙 엔진 / ML | 규칙 엔진 (JSON 설정 기반) | 규칙 변경 시 코드 수정 없이 JSON만 업데이트 |
| 전문가 매칭 | 자체 구현 / 외부 제휴 | 외부 제휴 (API 연동) | 초기 비용 최소화, 수요 검증 후 내재화 |

### 6.3 신규 DB 모델

```
LandlordProfile        # 임대인 종합 프로파일
├── id
├── name (해시 저장)
├── propertyCount       # 소유 물건 수
├── totalMortgage       # 근저당 총액
├── safetyGrade         # A~F 안전 등급
├── courtCases[]        # 관련 판례
├── newsArticles[]      # 관련 뉴스
├── userReports[]       # 사용자 제보
└── updatedAt

UserReport              # 사용자 제보
├── id
├── reporterId (User)
├── landlordProfileId
├── type                # DEPOSIT_UNPAID / FRAUD_SUSPECT / OTHER
├── description
├── status              # PENDING / VERIFIED / REJECTED
├── verifiedBy (Admin)
└── createdAt

GuaranteeRule           # 보증보험 규칙
├── id
├── provider            # HUG / SGI / HF
├── conditions (JSON)   # 가입 조건 규칙
├── premiumFormula      # 보험료 계산 공식
├── version
└── updatedAt

LoanCondition           # 전세대출 조건
├── id
├── bankName            # 은행명
├── productName         # 상품명
├── conditions (JSON)   # 대출 조건
├── interestRate        # 금리 범위
├── maxAmount           # 최대 한도
├── version
└── updatedAt
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Tailwind CSS v4

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| PWA 아이콘/스플래시 | missing | 192x192, 512x512 아이콘 | High |
| 결제 에러 핸들링 | missing | 결제 실패/취소/환불 패턴 | High |
| 임대인 정보 마스킹 | missing | 이름 2자리 마스킹 규칙 | High |
| 제보 검증 프로세스 | missing | 검증 단계 및 기준 정의 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_VAPID_KEY` | Web Push 공개키 | Client | ☐ |
| `VAPID_PRIVATE_KEY` | Web Push 비밀키 | Server | ☐ |
| `PORTONE_API_KEY` | 포트원 결제 API | Server | ☐ |
| `PORTONE_API_SECRET` | 포트원 결제 시크릿 | Server | ☐ |

---

## 8. 주차별 실행 계획

```
Week 1  ─ PWA + 무료 개방
         ├── FR-01~06
         └── 목표: 모바일 접근성 ⭐⭐ → ⭐⭐⭐⭐

Week 2  ─ 보증보험 + 임대인 추적
         ├── FR-07~10
         └── 목표: 대출/보험 연계 ⭐⭐⭐ → ⭐⭐⭐⭐

Week 3-4 ─ 대출 가심사 + 건당 과금
         ├── FR-11~15
         └── 목표: 가격 경쟁력 ⭐⭐⭐ → ⭐⭐⭐⭐⭐

Week 5-6 ─ 임대인 프로파일 + 제보
         ├── FR-16~21
         └── 목표: 임대인 DB ⭐⭐ → ⭐⭐⭐⭐⭐

Week 7-8 ─ AI 신뢰도 + 전문가 연결
         ├── FR-22~26
         └── 목표: 전문가 상담 ⭐⭐⭐ → ⭐⭐⭐⭐⭐
```

---

## 9. Next Steps

1. [ ] 설계 문서 작성 (`competitive-advantage.design.md`)
2. [ ] Phase 1 (PWA + 무료 개방) 구현 착수
3. [ ] 보증보험 규칙 데이터 수집 (HUG/SGI/HF 공시)
4. [ ] 전세대출 조건 데이터 수집 (5대 은행)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-24 | 초안 작성 — 내집스캔 비교 분석 기반 | AI |

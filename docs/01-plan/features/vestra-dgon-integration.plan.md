# VESTRA × dgon 등기연계 기획서

## 1. 개요

### 배경
- **VESTRA**: AI 부동산 분석 플랫폼 (권리분석, 계약검토, 시세전망, 전세안전, 세무)
- **dgon**: 부동산 등기 실행 플랫폼 (전자등기, 셀프등기, 프리미엄등기)
- **목표**: VESTRA의 "진단" → dgon의 "실행"을 끊김 없이 연결

### 사용자 가치
> "분석한 물건의 등기까지 한 흐름에서 끝낸다"

- 분석 데이터를 다시 입력할 필요 없음 (자동 전달)
- 위험도 기반 등기 유형 추천 (돈과 시간 절약)
- 등기 완료 후 자동 포트폴리오 등록

---

## 2. 연계 구조: PG사 패턴

### 왜 PG사 패턴인가
토스페이먼츠가 결제를 처리하는 방식과 동일한 구조.
각 플랫폼이 독립적으로 운영되면서, 토큰으로 데이터를 교환한다.

```
[VESTRA]                              [dgon]
   │                                     │
   │  1. 등기 토큰 생성                    │
   │     POST /api/dgon/create-token      │
   │     → token: "vtk_abc123"            │
   │                                     │
   │  2. dgon으로 리다이렉트               │
   │     dgon.vercel.app/from-vestra      │
   │     ?token=vtk_abc123                │
   │     &callback=vestra-plum.vercel.app │
   │                                     │
   │                    ┌────────────────┤
   │                    │  3. 토큰 검증    │
   │                    │  GET vestra-plum.vercel.app
   │                    │  /api/dgon/verify-token
   │                    │  ?token=vtk_abc123
   │                    │                │
   │                    │  → 물건정보     │
   │                    │  → 소유자      │
   │                    │  → 위험도      │
   │                    │  → 추천 등기유형 │
   │                    │                │
   │                    │  4. 폼 프리필   │
   │                    │  5. 등기 진행   │
   │                    │  6. 결제 완료   │
   │                    └────────────────┤
   │                                     │
   │  7. 콜백 (등기 완료)                  │
   │     vestra-plum.vercel.app/callback  │
   │     ?status=complete                 │
   │     &registrationId=dgon_xyz789      │
   │     &type=premium                    │
   │                                     │
   │  8. 포트폴리오에 등기 완료 기록         │
   │                                     │
```

---

## 3. 사용자 플로우

### 플로우 A: 권리분석 → 등기 상담 → 등기 실행

```
1. [VESTRA] 사용자가 등기부등본 업로드 → 권리분석 실행
2. [VESTRA] 분석 결과 확인 (위험도 85점, 근저당 1건)
3. [VESTRA] "등기 상담하기" 클릭 → 카카오톡 채널 상담 시작
4. [카카오톡] dgon 상담사와 분석 데이터 기반 상담
5. [카카오톡] 상담 완료, 등기 유형 결정 (프리미엄등기)
6. [VESTRA] "등기 진행하기" 클릭
7. [dgon] VESTRA 토큰으로 물건정보 자동 입력
8. [dgon] 필요 서류 안내 + 업로드
9. [dgon] 견적 확인 + 결제
10. [dgon] 등기 접수
11. [VESTRA] 콜백 수신 → 포트폴리오에 "등기 접수 완료" 표시
12. [dgon] 등기 완료 시 → VESTRA에 완료 알림
```

### 플로우 B: 분석 → 바로 등기 (상담 생략)

```
1. [VESTRA] 권리분석 완료 → 위험도 95점 (매우 안전)
2. [VESTRA] "셀프등기로 바로 진행" 추천 표시
3. [VESTRA] 클릭 → dgon 셀프등기 페이지로 이동 (토큰 포함)
4. [dgon] 폼 프리필 → 사용자 확인 → 결제 → 접수
5. [VESTRA] 콜백 → 포트폴리오 등록
```

---

## 4. 등기 유형 추천 로직

VESTRA 분석 결과를 기반으로 적합한 등기 유형을 자동 추천.

| 조건 | 추천 등기 유형 | 이유 |
|------|-------------|------|
| 위험도 ≥ 85, 권리관계 단순 | **셀프등기** | 안전하고 비용 절감 가능 |
| 위험도 60~84, 일반적 거래 | **전자등기** | 빠르고 간편, 기본 검증 포함 |
| 위험도 < 60, 복잡한 권리관계 | **프리미엄등기** | 전문가 검토 필수 |
| 근저당 2건 이상 | **프리미엄등기** | 말소 절차 복잡 |
| 가압류/가처분 존재 | **프리미엄등기** | 법률 검토 필수 |
| 신탁 등기 | **프리미엄등기** | 특수 절차 필요 |

---

## 5. 토큰 데이터 구조

### VESTRA → dgon 전달 데이터

```typescript
interface VestraRegistrationToken {
  // 토큰 메타
  tokenId: string;           // "vtk_abc123"
  createdAt: string;         // ISO 8601
  expiresAt: string;         // 생성 후 24시간
  callbackUrl: string;       // VESTRA 콜백 URL

  // 물건 정보
  property: {
    address: string;         // "서울시 강남구 역삼동 123-45"
    propertyType: string;    // "아파트" | "빌라" | "오피스텔" | "상가" | "토지"
    area?: number;           // 전용면적 (㎡)
    buildYear?: number;      // 건축년도
  };

  // 소유자/거래 정보
  transaction: {
    type: string;            // "매매" | "전세" | "증여" | "상속"
    seller?: string;         // 매도인 (마스킹)
    buyer?: string;          // 매수인 (마스킹)
    price?: number;          // 거래가격
  };

  // VESTRA 분석 결과 요약
  analysis: {
    riskScore: number;       // 0-100 (높을수록 안전)
    riskGrade: string;       // "A" | "B" | "C" | "D" | "F"
    mortgageCount: number;   // 근저당 수
    seizureCount: number;    // 가압류/가처분 수
    trustExists: boolean;    // 신탁 여부
    keyRisks: string[];      // ["근저당비율 65%", "최근 소유권 변동"]
  };

  // 추천 등기 유형
  recommendedType: "self" | "electronic" | "premium";
  recommendReason: string;   // "권리관계가 단순하여 셀프등기 추천"
}
```

### dgon → VESTRA 콜백 데이터

```typescript
interface DgonCallbackData {
  status: "complete" | "pending" | "cancelled";
  registrationId: string;    // dgon 접수번호
  registrationType: string;  // "self" | "electronic" | "premium"
  estimatedCompletion?: string; // 예상 완료일
  fee?: number;              // 등기 비용
}
```

---

## 6. 필요 API (양쪽)

### VESTRA 측 (2개)

| API | 메서드 | 설명 |
|-----|--------|------|
| `/api/dgon/create-token` | POST | 분석 데이터로 등기 토큰 생성 (24시간 유효) |
| `/api/dgon/verify-token` | GET | dgon이 토큰 검증 + 데이터 조회 |

### dgon 측 (2개)

| API | 메서드 | 설명 |
|-----|--------|------|
| `/from-vestra` | GET | VESTRA 토큰으로 등기 신청 페이지 진입 |
| `/api/vestra/callback` | POST | 등기 완료/취소 시 VESTRA에 알림 |

### 카카오톡 (1개)

| 채널 | 용도 |
|------|------|
| dgon 카카오톡 채널 | VESTRA 분석 데이터 포함 상담 링크 |

---

## 7. VESTRA UI 변경사항

### 권리분석 결과에 추가

```
┌─────────────────────────────────────────┐
│  📋 등기업무 진행                         │
│                                         │
│  이 물건의 권리관계를 분석한 결과,          │
│  [셀프등기]를 추천합니다.                  │
│                                         │
│  💬 등기 상담하기 (카카오톡)               │
│  ⚡ 셀프등기 바로 진행     → dgon         │
│  📝 전자등기              → dgon         │
│  👔 프리미엄등기 (전문가)  → dgon         │
│                                         │
│  dgon 제공 | 예상 비용: 15~30만원         │
└─────────────────────────────────────────┘
```

### 대시보드 포트폴리오에 추가

```
┌─ 자산카드 ──────────────────┐
│  서울시 강남구 역삼동 123-45  │
│  위험도: 85점 (A)            │
│  등기 상태: 접수 완료 ✅      │  ← dgon 콜백으로 업데이트
│  예상 완료: 2026.04.02       │
└────────────────────────────┘
```

---

## 8. 수익 모델 옵션

| 모델 | 설명 | VESTRA 수익 |
|------|------|------------|
| **건당 수수료** | 등기 1건 연계 시 dgon이 수수료 지급 | 건당 3~5만원 |
| **월정액** | VESTRA 구독료에 등기 할인 포함 | 구독료 인상 근거 |
| **무료 연계** | 양쪽 사용자 확대 목적 | 간접 수익 (사용자 증가) |
| **혼합** | 기본 무료 + 프리미엄등기 시 수수료 | 고가 건만 수수료 |

---

## 9. 구현 로드맵

### Phase 1 (2주) — 카카오톡 상담 연결
- dgon 카카오톡 채널 개설/확인
- VESTRA 분석 결과에 "등기 상담하기" CTA 추가
- 카카오톡 채팅 URL에 분석 요약 텍스트 전달

### Phase 2 (3주) — 토큰 기반 연동
- VESTRA: create-token / verify-token API 개발
- dgon: from-vestra 진입 페이지 개발
- 토큰 데이터 교환 테스트

### Phase 3 (2주) — 콜백 + 포트폴리오 연동
- dgon: 등기 완료 시 VESTRA 콜백 호출
- VESTRA: 콜백 수신 → 포트폴리오 상태 업데이트
- 알림 (벨 + 카카오톡)

### Phase 4 (1주) — 등기 유형 추천 고도화
- 분석 결과 기반 추천 알고리즘 정교화
- 비용 시뮬레이션 (세무 + 등기비용 합산)

---

## 10. 기술 요구사항

| 항목 | VESTRA | dgon |
|------|--------|------|
| 프레임워크 | Next.js 16 (확인) | 확인 필요 |
| 인증 | NextAuth v5 | 확인 필요 |
| DB | Neon PostgreSQL | 확인 필요 |
| 토큰 저장 | Prisma (새 테이블) | 자체 DB |
| CORS | dgon 도메인 허용 | VESTRA 도메인 허용 |
| HTTPS | ✅ (Vercel) | ✅ (Vercel) |

### 새로 필요한 Prisma 모델 (VESTRA)

```prisma
model RegistrationToken {
  id            String   @id @default(cuid())
  tokenId       String   @unique  // "vtk_abc123"
  userId        String?
  analysisId    String
  propertyData  Json     // VestraRegistrationToken
  status        String   @default("created") // created, verified, used, expired
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  usedAt        DateTime?
  callbackData  Json?    // DgonCallbackData
}
```

---

## 11. 보안 고려사항

- 토큰 1회 사용 후 만료 (재사용 방지)
- 24시간 유효기간 (오래된 토큰 자동 폐기)
- 개인정보 마스킹 (이름 첫 글자만 전달: "홍*동")
- CORS 화이트리스트 (dgon.vercel.app만 허용)
- HTTPS 필수
- 콜백 URL 검증 (등록된 도메인만 허용)

---

*작성: 2026-03-21*
*버전: v1.0.0*
*상태: 기획 (Phase 1 착수 대기)*

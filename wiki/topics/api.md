# API 명세 (API Surface)

[coverage: high -- 2 sources: docs/04-API-Spec.md, docs/01-SRS.md]

---

## Purpose

VESTRA의 모든 API 엔드포인트 인터페이스 명세. Next.js 16 App Router 기반 서버리스 함수로 구현되어 있다.

---

## Architecture

### Base URL
| 환경 | URL |
|------|-----|
| 프로덕션 | `https://vestra-plum.vercel.app` |
| 개발 | `http://localhost:3000` |

### 인증 방식
- NextAuth v5, JWT (JWE 암호화)
- 소셜 로그인: Google, Kakao, Naver
- 세션: httpOnly 쿠키 (Secure, SameSite=lax)

### RBAC (역할 기반 접근 제어)
| 역할 | 일일 분석 한도 |
|------|---------------|
| GUEST | 2회 (IP 기반) |
| PERSONAL | 5회 |
| BUSINESS | 50회 |
| REALESTATE | 100회 |
| ADMIN | 9,999회 |

### Rate Limit 정책
- 분당 제한: 슬라이딩 윈도우 (DB 기반 `RateLimit` 테이블)
- 일일 제한: 역할별 카운터 (`DailyUsage` 테이블)
- Cost Guard: OpenAI API 호출 일일 제한 (별도 카운터)
- 응답 헤더: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## API Surface (전체 엔드포인트)

| # | Method | URL | 인증 | Rate Limit |
|---|--------|-----|------|-----------|
| 1 | POST | `/api/analyze-unified` | 선택 | 10/min + 일일 |
| 2 | POST | `/api/analyze-contract` | 선택 | 30/min + 일일 |
| 3 | POST | `/api/analyze-rights` | 선택 | 30/min + 일일 |
| 4 | POST | `/api/predict-value` | 선택 | 30/min + 일일 |
| 5 | POST | `/api/generate-document` | 불필요 | 30/min |
| 6 | POST | `/api/extract-pdf` | 불필요 | 10/min |
| 7 | GET | `/api/user/profile` | 필수 | - |
| 8 | GET | `/api/user/usage` | 필수 | - |
| 9 | POST | `/api/user/setup-role` | 필수 | - |
| 10 | POST | `/api/user/migrate-data` | 필수 | - |
| 11 | GET | `/api/admin/users` | ADMIN | - |
| 12 | GET/PATCH/DELETE | `/api/admin/users/[id]` | ADMIN | - |
| 13 | GET/PATCH | `/api/admin/settings` | ADMIN | - |
| 14 | GET | `/api/admin/stats` | ADMIN | - |
| 15 | GET/POST | `/api/admin/announcements` | ADMIN | - |
| 16 | PATCH/DELETE | `/api/admin/announcements/[id]` | ADMIN | - |
| 17 | GET | `/api/admin/audit-logs` | ADMIN | - |
| 18 | GET/POST | `/api/auth/[...nextauth]` | - | - |
| 19 | POST | `/api/chat` | 불필요 | 30/min |
| 20 | GET/POST | `/api/subscription` | 필수 | - |
| 21 | POST | `/api/subscription/cancel` | 필수 | - |
| 22 | POST | `/api/parse-registry` | 불필요 | - |
| 23 | POST | `/api/real-price` | 불필요 | - |
| 24 | GET | `/api/scholar/search` | 불필요 | - |

---

## 핵심 API 상세

### POST `/api/analyze-unified` — 통합 전세 분석

**Request**:
```json
{
  "rawText": "(필수) 등기부등본 텍스트 (최소 20자, 최대 50,000자)",
  "estimatedPrice": "(선택) 추정 매매가 (원 단위)",
  "address": "(선택) 부동산 주소"
}
```

**Response (200)** 주요 필드:
- `propertyInfo`: 주소, 유형, 면적, 추정가, 전세가, 실거래 최근
- `riskAnalysis`: 전세가율, 근저당비율, 안전점수, 위험목록
- `parsed`: ParsedRegistry (title/gapgu/eulgu/summary)
- `validation`: 검증 결과 (totalChecks/passed/errors/warnings)
- `riskScore`: V-Score 결과 (totalScore/grade/gradeLabel/factors)
- `marketData`: 시세 데이터 (매매/전세/전세가율)
- `aiOpinion`: AI 종합 의견 텍스트
- `dataSource`: registryParsed, molitAvailable, estimatedPriceSource

---

### POST `/api/extract-pdf` — PDF 텍스트 추출

- Content-Type: `multipart/form-data`
- 최대 크기: 10MB
- 지원: PDF, JPEG, PNG, GIF, WebP (이미지 최대 5장)
- 스캔 PDF: OCR 자동 폴백 (OpenAI Vision)

**Response**: `{ text, pages, method: "text|ocr" }`

---

### POST `/api/chat` — AI 어시스턴트

- 메시지 최대 50개, 개별 10,000자
- 대법원 판례 검색 자동 연동 (`courtCases` 반환)

---

## 구독 플랜

| 플랜 | 월 가격 | 일일 한도 | 역할 |
|------|---------|----------|------|
| FREE | 무료 | 5회 | PERSONAL |
| PRO | 50,000원 | 50회 | BUSINESS |
| BUSINESS | 100,000원 | 100회 | REALESTATE |

---

## 입력값 살균 정책 (모든 API 공통)

- HTML 태그 및 `<script>` 블록 제거 (`stripHtml`)
- 입력 길이 제한: 기본 50,000자 (`truncateInput`)
- 필드별 최대 길이: 500자 (`sanitizeField`)
- 채팅: role 허용값 검증, 메시지 수 50개 제한

---

## 공통 에러 코드

| HTTP | 코드 | 설명 |
|------|------|------|
| 400 | Bad Request | 필수 파라미터 누락 또는 유효성 실패 |
| 401 | Unauthorized | 인증 필요 |
| 403 | Forbidden | 권한 부족 |
| 429 | Too Many Requests | Rate Limit/일일 한도 초과 |
| 500 | Internal Server Error | 서버 내부 오류 |

---

## Gotchas

- `/api/analyze-unified`는 10/min (다른 분석 API의 1/3) — 가장 무거운 연산
- MOLIT API 내부 호출은 `analyze-unified`, `analyze-rights`, `predict-value`에서 자동 실행
- 관리자 settings API는 AES-256-GCM으로 암호화 저장 (시스템 설정, OAuth 키 등)
- `audit-logs` 조회: page/limit/action/userId/from/to 필터 지원

---

## Sources

- `/Users/watchers/Desktop/vestra/docs/04-API-Spec.md`
- `/Users/watchers/Desktop/vestra/docs/01-SRS.md`

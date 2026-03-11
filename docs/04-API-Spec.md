# VESTRA 인터페이스 정의서 (API Specification)

**문서 버전**: v1.0.0
**작성일**: 2026-03-11
**시스템명**: VESTRA - AI 부동산 자산관리 플랫폼
**프레임워크**: Next.js 16 (App Router)

---

## 1. 문서 개요

### 1.1 목적
본 문서는 VESTRA 플랫폼의 모든 API 엔드포인트에 대한 인터페이스 명세를 정의한다. 각 API의 요청/응답 형식, 인증 방식, 에러 처리, Rate Limit 정책을 포함하며 정부 감리 기준에 따라 작성되었다.

### 1.2 대상 독자
- 개발자 (프론트엔드/백엔드)
- 시스템 감리원
- 품질 관리자

### 1.3 참조 문서
| 문서 | 위치 |
|------|------|
| 기능 설계서 | `docs/02-design/` |
| 보안 점검표 | `docs/06-Security-Checklist.md` |
| 테스트 계획서 | `docs/05-Test-Plan.md` |

---

## 2. 공통 사항

### 2.1 Base URL
| 환경 | URL |
|------|-----|
| 프로덕션 | `https://vestra-plum.vercel.app` |
| 개발 | `http://localhost:3000` |

### 2.2 인증 방식
| 항목 | 내용 |
|------|------|
| 프레임워크 | NextAuth v5 (beta) |
| 세션 전략 | JWT (JWE 암호화) |
| 소셜 로그인 | Google, Kakao, Naver |
| 자격증명 로그인 | 이메일 + bcrypt 비밀번호 |
| 세션 전달 | httpOnly 쿠키 (Secure, SameSite=lax) |

인증이 필요한 API는 요청 시 NextAuth 세션 쿠키가 자동으로 포함되어야 한다. 인증 실패 시 `401 Unauthorized` 응답을 반환한다.

### 2.3 역할 기반 접근 제어 (RBAC)
| 역할 | 일일 분석 한도 | 설명 |
|------|---------------|------|
| GUEST | 2회 | 비로그인 사용자 (IP 기반) |
| PERSONAL | 5회 | 일반 회원 |
| BUSINESS | 50회 | 사업자 회원 |
| REALESTATE | 100회 | 공인중개사 |
| ADMIN | 9,999회 | 관리자 |

### 2.4 공통 에러 코드
| HTTP 상태 | 코드 | 설명 |
|-----------|------|------|
| 400 | Bad Request | 필수 파라미터 누락 또는 유효성 검증 실패 |
| 401 | Unauthorized | 인증 필요 (세션 없음) |
| 403 | Forbidden | 권한 부족 (역할 미충족) |
| 429 | Too Many Requests | Rate Limit 또는 일일 한도 초과 |
| 500 | Internal Server Error | 서버 내부 오류 |

### 2.5 공통 에러 응답 형식
```json
{
  "error": "에러 메시지 (한글)"
}
```

### 2.6 Rate Limit 정책
| 구분 | 방식 | 저장소 |
|------|------|--------|
| 분당 제한 | 슬라이딩 윈도우 (DB 기반) | Neon PostgreSQL `RateLimit` 테이블 |
| 일일 제한 | 역할별 일일 카운터 | `DailyUsage` 테이블 |
| Cost Guard | OpenAI API 호출 일일 제한 | 별도 카운터 |

**Rate Limit 응답 헤더**:
```
X-RateLimit-Remaining: 남은 요청 수
X-RateLimit-Reset: 리셋 시각 (Unix timestamp, 초)
```

### 2.7 입력값 살균 (Input Sanitization)
모든 API 입력값에 대해 다음 처리를 수행한다:
- HTML 태그 및 `<script>` 블록 제거 (`stripHtml`)
- 입력 길이 제한 (`truncateInput`, 기본 50,000자)
- 필드별 최대 길이 적용 (`sanitizeField`, 기본 500자)
- 채팅 메시지: role 허용값 검증, 메시지 수 50개 제한, 개별 10,000자 제한

---

## 3. 분석 API

### 3.1 통합 전세 분석 (analyze-unified)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/analyze-unified` |
| **인증** | 선택 (비로그인 시 GUEST 한도 적용) |
| **Rate Limit** | 10 req/min (분당), 역할별 일일 한도 |

**Request Body**:
```json
{
  "rawText": "(필수) 등기부등본 텍스트 (최소 20자, 최대 50,000자)",
  "estimatedPrice": "(선택) 사용자 입력 추정 매매가 (원 단위, number)",
  "address": "(선택) 부동산 주소 (문자열)"
}
```

**Response Body (200)**:
```json
{
  "propertyInfo": {
    "address": "주소",
    "type": "아파트",
    "area": "84.99㎡",
    "buildYear": "건물 상세",
    "estimatedPrice": 500000000,
    "jeonsePrice": 350000000,
    "recentTransaction": "2026.01 / 5.0억"
  },
  "riskAnalysis": {
    "jeonseRatio": 70.0,
    "mortgageRatio": 30.5,
    "safetyScore": 72,
    "riskScore": 28,
    "risks": [
      { "level": "danger|warning|safe", "title": "위험 요인", "description": "상세 설명" }
    ]
  },
  "parsed": { "title": {}, "gapgu": [], "eulgu": [], "summary": {} },
  "validation": { "totalChecks": 0, "passed": 0, "errors": 0, "warnings": 0, "issues": [] },
  "riskScore": {
    "totalScore": 72,
    "grade": "C",
    "gradeLabel": "주의",
    "factors": []
  },
  "marketData": { "sale": {}, "rent": {}, "jeonseRatio": 70.0 },
  "aiOpinion": "AI 종합 의견 텍스트",
  "redemptionSimulation": {},
  "confidencePropagation": {},
  "selfVerification": {},
  "dataSource": {
    "registryParsed": true,
    "molitAvailable": true,
    "molitFiltered": false,
    "estimatedPriceSource": "molit|user|none"
  }
}
```

**Status Codes**:
| 코드 | 설명 |
|------|------|
| 200 | 분석 성공 |
| 400 | 입력 텍스트 누락 또는 20자 미만 |
| 429 | Rate Limit/일일 한도 초과 |
| 500 | 내부 분석 오류 |

---

### 3.2 계약서 분석 (analyze-contract)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/analyze-contract` |
| **인증** | 선택 (비로그인 시 GUEST 한도 적용) |
| **Rate Limit** | 30 req/min, 역할별 일일 한도 + Cost Guard |

**Request Body**:
```json
{
  "contractText": "(필수) 계약서 텍스트 (최대 50,000자)"
}
```

**Response Body (200)**:
```json
{
  "engineResult": {
    "clauses": [],
    "risks": [],
    "missingClauses": [],
    "score": 80
  },
  "aiOpinion": "AI 계약서 종합 분석 의견",
  "courtCases": [
    { "caseNumber": "사건번호", "caseName": "사건명", "summary": "요약" }
  ]
}
```

**Status Codes**: 200, 400, 429, 500

---

### 3.3 권리분석 (analyze-rights)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/analyze-rights` |
| **인증** | 선택 (비로그인 시 GUEST 한도 적용) |
| **Rate Limit** | 30 req/min, 역할별 일일 한도 + Cost Guard |

**Request Body**:
```json
{
  "address": "(필수) 부동산 주소 (최대 200자)"
}
```

**Response Body (200)**:
```json
{
  "address": "정제된 주소",
  "marketData": {
    "sale": { "avgPrice": 0, "transactionCount": 0, "transactions": [] },
    "rent": { "avgDeposit": 0, "jeonseCount": 0 },
    "jeonseRatio": 0
  },
  "priceEstimation": {
    "estimatedPrice": 500000000,
    "confidence": 0.85,
    "method": "building_match|area_match|district_avg"
  },
  "aiOpinion": "AI 권리분석 의견"
}
```

**Status Codes**: 200, 400, 429, 500

---

### 3.4 시세전망 (predict-value)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/predict-value` |
| **인증** | 선택 (비로그인 시 GUEST 한도 적용) |
| **Rate Limit** | 30 req/min, 역할별 일일 한도 + Cost Guard |

**Request Body**:
```json
{
  "address": "(필수) 부동산 주소 (최대 200자)"
}
```

**Response Body (200)**:
```json
{
  "address": "주소",
  "currentPrice": 500000000,
  "prediction": {
    "shortTerm": { "price": 0, "change": 0, "period": "3개월" },
    "midTerm": { "price": 0, "change": 0, "period": "6개월" },
    "longTerm": { "price": 0, "change": 0, "period": "12개월" }
  },
  "marketData": {},
  "aiOpinion": "AI 시세전망 의견"
}
```

**Status Codes**: 200, 400, 429, 500

---

## 4. 문서 생성 API

### 4.1 문서 생성 (generate-document)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/generate-document` |
| **인증** | 불필요 (IP 기반 Rate Limit) |
| **Rate Limit** | 30 req/min + Cost Guard |

**Request Body**:
```json
{
  "type": "(필수) 'analyze' | 'generate'",
  "landlordName": "(선택) 임대인 이름 (최대 100자)",
  "tenantName": "(선택) 임차인 이름 (최대 100자)",
  "propertyAddress": "(선택) 부동산 주소 (최대 300자)",
  "deposit": "(선택) 보증금 (number)",
  "monthlyRent": "(선택) 월세 (number)",
  "startDate": "(선택) 계약 시작일 (최대 20자)",
  "endDate": "(선택) 계약 종료일 (최대 20자)",
  "propertyType": "(선택) 부동산 유형 (최대 50자)"
}
```

**Response Body (200)**:
```json
{
  "result": "생성된 문서 내용 또는 분석 결과 (텍스트)"
}
```

**Status Codes**: 200, 429, 500

---

### 4.2 PDF 텍스트 추출 (extract-pdf)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/extract-pdf` |
| **Content-Type** | `multipart/form-data` |
| **인증** | 불필요 (IP 기반 Rate Limit) |
| **Rate Limit** | 10 req/min |

**Request Body** (FormData):
| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | PDF 파일 또는 이미지 (최대 10MB, 이미지 최대 5장) |

**Response Body (200)**:
```json
{
  "text": "추출된 텍스트",
  "pages": 5,
  "method": "text|ocr"
}
```

**파일 제한**:
- 최대 크기: 10MB
- 지원 형식: PDF, JPEG, PNG, GIF, WebP
- 이미지 최대 업로드: 5장
- 스캔 PDF: OCR 자동 폴백 (OpenAI Vision)

**Status Codes**: 200, 400 (파일 누락/초과), 429, 500

---

## 5. 사용자 API

### 5.1 프로필 조회 (user/profile)

| 항목 | 내용 |
|------|------|
| **Method** | `GET` |
| **URL** | `/api/user/profile` |
| **인증** | 필수 |

**Response Body (200)**:
```json
{
  "id": "사용자 ID",
  "name": "이름",
  "email": "이메일",
  "image": "프로필 이미지 URL",
  "role": "PERSONAL|BUSINESS|REALESTATE|ADMIN",
  "businessNumber": "사업자번호 (nullable)",
  "verifyStatus": "pending|approved|rejected",
  "dailyLimit": 5,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

**Status Codes**: 200, 401, 404

---

### 5.2 사용량 조회 (user/usage)

| 항목 | 내용 |
|------|------|
| **Method** | `GET` |
| **URL** | `/api/user/usage` |
| **인증** | 필수 |

**Response Body (200)**:
```json
{
  "todayUsage": 3,
  "dailyLimit": 5,
  "remaining": 2
}
```

**Status Codes**: 200, 401

---

### 5.3 역할 설정 (user/setup-role)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/user/setup-role` |
| **인증** | 필수 |

**Request Body**:
```json
{
  "role": "PERSONAL|BUSINESS|REALESTATE",
  "businessNumber": "(BUSINESS/REALESTATE 시 필수) 사업자등록번호"
}
```

**Status Codes**: 200, 400, 401

---

### 5.4 데이터 마이그레이션 (user/migrate-data)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/user/migrate-data` |
| **인증** | 필수 |

**설명**: 게스트 분석 데이터를 로그인 계정으로 이관

**Status Codes**: 200, 401

---

## 6. 관리자 API

> 모든 관리자 API는 `role: "ADMIN"` 권한이 필요하다. 미충족 시 `403 Forbidden` 반환.

### 6.1 사용자 관리 (admin/users)

| 항목 | 내용 |
|------|------|
| **GET** | `/api/admin/users` - 전체 사용자 목록 |
| **GET** | `/api/admin/users/[id]` - 특정 사용자 상세 |
| **PATCH** | `/api/admin/users/[id]` - 사용자 정보 수정 (역할, 한도, 상태) |
| **DELETE** | `/api/admin/users/[id]` - 사용자 삭제 |

**GET /api/admin/users 응답**:
```json
[
  {
    "id": "ID",
    "name": "이름",
    "email": "이메일",
    "role": "PERSONAL",
    "verifyStatus": "approved",
    "dailyLimit": 5,
    "businessNumber": null,
    "createdAt": "ISO8601"
  }
]
```

**Status Codes**: 200, 403, 404

---

### 6.2 시스템 설정 (admin/settings)

| 항목 | 내용 |
|------|------|
| **GET** | `/api/admin/settings` - 현재 설정 조회 |
| **PATCH** | `/api/admin/settings` - 설정 변경 |

**설명**: OAuth 키, Rate Limit 설정, 시스템 파라미터를 관리한다. 값은 AES-256-GCM으로 암호화되어 DB에 저장된다.

**Status Codes**: 200, 403

---

### 6.3 통계 (admin/stats)

| 항목 | 내용 |
|------|------|
| **Method** | `GET` |
| **URL** | `/api/admin/stats` |

**Response Body (200)**:
```json
{
  "totalUsers": 100,
  "roles": { "PERSONAL": 80, "BUSINESS": 15, "ADMIN": 5 },
  "pendingVerifications": 3,
  "todayAnalyses": 42,
  "totalAnalyses": 1500,
  "totalAssets": 200,
  "trend": [
    { "date": "2026-03-05", "count": 35 },
    { "date": "2026-03-06", "count": 42 }
  ]
}
```

**Status Codes**: 200, 403

---

### 6.4 공지사항 (admin/announcements)

| 항목 | 내용 |
|------|------|
| **GET** | `/api/admin/announcements` - 공지사항 목록 |
| **POST** | `/api/admin/announcements` - 새 공지사항 작성 |
| **PATCH** | `/api/admin/announcements/[id]` - 공지사항 수정 |
| **DELETE** | `/api/admin/announcements/[id]` - 공지사항 삭제 |

**POST Request Body**:
```json
{
  "title": "(필수) 공지 제목",
  "content": "(필수) 공지 내용"
}
```

**Status Codes**: 200, 400, 403, 404

---

### 6.5 감사 로그 (admin/audit-logs)

| 항목 | 내용 |
|------|------|
| **Method** | `GET` |
| **URL** | `/api/admin/audit-logs` |

**Query Parameters**:
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `page` | number | 1 | 페이지 번호 |
| `limit` | number | 50 | 페이지당 개수 (최대 200) |
| `action` | string | - | 액션 필터 (LOGIN, SIGNUP 등) |
| `userId` | string | - | 사용자 ID 필터 |
| `from` | ISO8601 | - | 시작일 |
| `to` | ISO8601 | - | 종료일 |

**Response Body (200)**:
```json
{
  "logs": [
    {
      "id": "로그 ID",
      "userId": "사용자 ID",
      "action": "LOGIN",
      "target": "대상",
      "detail": "JSON 문자열",
      "ipAddress": "IP 주소",
      "userAgent": "브라우저 정보",
      "createdAt": "ISO8601"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

**기록 대상 액션**:
| 액션 | 설명 |
|------|------|
| `LOGIN` | 로그인 성공 |
| `LOGOUT` | 로그아웃 |
| `LOGIN_FAILED` | 로그인 실패 |
| `SIGNUP` | 회원가입 |
| `ROLE_CHANGE` | 역할 변경 |
| `ADMIN_USER_UPDATE` | 관리자의 사용자 정보 수정 |
| `ADMIN_USER_DELETE` | 관리자의 사용자 삭제 |
| `ADMIN_SETTINGS_CHANGE` | 시스템 설정 변경 |
| `ANALYSIS_REQUEST` | 분석 요청 |
| `ANALYSIS_COMPLETE` | 분석 완료 |
| `RATE_LIMIT_EXCEEDED` | Rate Limit 초과 |
| `SETTINGS_VIEW` | 설정 조회 |
| `PASSWORD_CHANGE` | 비밀번호 변경 |

**Status Codes**: 200, 403, 500

---

## 7. 인증 API

### 7.1 NextAuth 인증 (auth)

| 항목 | 내용 |
|------|------|
| **URL** | `/api/auth/[...nextauth]` |
| **설명** | NextAuth v5 핸들러 (GET/POST) |

NextAuth가 자동 처리하는 엔드포인트:
| 경로 | 설명 |
|------|------|
| `/api/auth/signin` | 로그인 페이지 |
| `/api/auth/signout` | 로그아웃 |
| `/api/auth/callback/google` | Google OAuth 콜백 |
| `/api/auth/callback/kakao` | Kakao OAuth 콜백 |
| `/api/auth/callback/naver` | Naver OAuth 콜백 |
| `/api/auth/session` | 세션 조회 |
| `/api/auth/csrf` | CSRF 토큰 |

---

### 7.2 AI 상담 채팅 (chat)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/chat` |
| **인증** | 불필요 (IP 기반 Rate Limit) |
| **Rate Limit** | 30 req/min + Cost Guard |

**Request Body**:
```json
{
  "messages": [
    { "role": "user|assistant|system", "content": "메시지 내용" }
  ]
}
```

**메시지 제한**: 최대 50개, 개별 메시지 최대 10,000자, HTML 자동 제거

**Response Body (200)**:
```json
{
  "reply": "AI 응답 메시지",
  "courtCases": [
    { "caseNumber": "사건번호", "caseName": "사건명", "summary": "요약" }
  ]
}
```

**Status Codes**: 200, 400, 429, 500

---

## 8. 구독 API

### 8.1 구독 관리 (subscription)

| 항목 | 내용 |
|------|------|
| **GET** | `/api/subscription` - 현재 구독 상태 조회 |
| **POST** | `/api/subscription` - 구독 생성/변경 |
| **POST** | `/api/subscription/cancel` - 구독 취소 |
| **인증** | 필수 |

**플랜 구성**:
| 플랜 | 가격 (월) | 일일 한도 | 역할 |
|------|----------|----------|------|
| FREE | 무료 | 5회 | PERSONAL |
| PRO | 50,000원 | 50회 | BUSINESS |
| BUSINESS | 100,000원 | 100회 | REALESTATE |

**POST Request Body**:
```json
{
  "plan": "FREE|PRO|BUSINESS"
}
```

**GET Response Body (200)**:
```json
{
  "plan": "PRO",
  "price": 50000,
  "status": "active",
  "startDate": "ISO8601",
  "endDate": null,
  "payments": []
}
```

**Status Codes**: 200, 400, 401

---

## 9. 외부 연동 API

### 9.1 국토교통부 실거래가 (MOLIT)

| 항목 | 내용 |
|------|------|
| **내부 모듈** | `lib/molit-api.ts` |
| **외부 API** | 공공데이터포털 `apis.data.go.kr` |
| **인증** | `MOLIT_API_KEY` 환경변수 |
| **데이터** | 아파트 매매/전월세 실거래가 |

**주요 함수**:
- `fetchComprehensivePrices(address, months)` - 매매/전세 통합 조회
- 반환: `{ sale: PriceResult, rent: RentPriceResult, jeonseRatio: number }`

**호출 시점**: `analyze-unified`, `analyze-rights`, `predict-value` API 내부에서 자동 호출

---

### 9.2 건축물대장 API

| 항목 | 내용 |
|------|------|
| **내부 모듈** | `lib/building-api.ts` |
| **외부 API** | 공공데이터포털 건축물대장 |
| **데이터** | 건축물 기본 정보, 용도, 면적 |

---

### 9.3 대법원 판례 API

| 항목 | 내용 |
|------|------|
| **내부 모듈** | `lib/court-api.ts` |
| **외부 API** | 법제처 Open API `law.go.kr` |
| **인증** | `LAW_API_KEY` 환경변수 (미설정 시 빈 배열 반환) |
| **데이터** | 부동산 관련 판례 (사건번호, 사건명, 판시사항) |

**주요 함수**:
- `searchCourtCases(query, maxResults)` - 판례 키워드 검색
- 반환: `CourtCase[]`

**호출 시점**: `analyze-contract`, `chat` API 내부에서 자동 호출

---

### 9.4 학술논문 검색 (scholar)

| 항목 | 내용 |
|------|------|
| **Method** | `GET` |
| **URL** | `/api/scholar/search` |
| **데이터** | 부동산 관련 학술 논문 검색 |

---

### 9.5 실거래가 직접 조회 (real-price)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/real-price` |
| **설명** | MOLIT API를 직접 호출하여 실거래가 데이터를 반환 |

---

### 9.6 등기부등본 파싱 (parse-registry)

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **URL** | `/api/parse-registry` |
| **설명** | 등기부등본 텍스트를 자체 파싱 엔진으로 구조화 |

---

## 부록: API 엔드포인트 전체 목록

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

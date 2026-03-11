# 접근 통제 매트릭스

## 역할 정의

| 역할 | 설명 | 일일 분석 한도 |
|------|------|----------------|
| GUEST | 비로그인 체험 | 2회 |
| PERSONAL | 개인 회원 | 5회 |
| BUSINESS | 기업 회원 (사업자 인증) | 50회 |
| REALESTATE | 부동산 전문가 (인증) | 100회 |
| ADMIN | 관리자 | 무제한 |

## 페이지 접근 권한

| 페이지 | GUEST | PERSONAL | BUSINESS | REALESTATE | ADMIN |
|--------|:-----:|:--------:|:--------:|:----------:|:-----:|
| / (랜딩) | O | O | O | O | O |
| /login | O | O | O | O | O |
| /rights (권리분석) | O | O | O | O | O |
| /contract (계약검토) | X | O | O | O | O |
| /tax (세금계산) | X | O | O | O | O |
| /prediction (시세전망) | X | O | O | O | O |
| /jeonse/* (전세) | O | O | O | O | O |
| /assistant (AI상담) | X | O | O | O | O |
| /dashboard | X | O | O | O | O |
| /profile | X | O | O | O | O |
| /admin | X | X | X | X | O |
| /admin/* | X | X | X | X | O |

## API 접근 권한

| API | 인증 필요 | 역할 제한 | Rate Limit | CSRF |
|-----|:---------:|:---------:|:----------:|:----:|
| POST /api/analyze-rights | X | - | 30/min + 일일 | - |
| POST /api/analyze-contract | O | PERSONAL+ | 30/min + 일일 | - |
| POST /api/analyze-unified | X | - | 30/min + 일일 | - |
| POST /api/predict-value | X | - | 30/min + 일일 | - |
| POST /api/chat | O | PERSONAL+ | 30/min + 일일 | - |
| GET /api/user/profile | O | - | - | - |
| POST /api/user/setup-role | O | PERSONAL | - | O |
| PUT /api/admin/account | O | ADMIN | - | O |
| PUT /api/admin/settings | O | ADMIN | - | O |
| GET /api/admin/users | O | ADMIN | - | - |
| PUT /api/admin/users/[id] | O | ADMIN | - | - |
| GET /api/admin/audit-logs | O | ADMIN | - | - |

## 미들웨어 보호 경로

```
middleware.ts (Edge Function)
├── /admin/*     → JWT 검증 + ADMIN 역할 확인
├── /dashboard   → JWT 검증
└── /profile     → JWT 검증
```

## Rate Limit 정책

| 제한 유형 | 값 | 식별자 |
|-----------|-----|--------|
| 분당 요청 | 30회/60초 | IP + userId |
| 일일 분석 | 역할별 한도 | userId |
| 개발 모드 | 무제한 | - |

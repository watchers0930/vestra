# 보안 취약점 점검표

> OWASP Top 10 (2021) + 행정안전부 SW 보안약점 진단 기준

## 점검 결과 요약

| 구분 | 총 항목 | 대응 완료 | 미흡 | 해당없음 |
|------|---------|-----------|------|----------|
| OWASP Top 10 | 10 | 8 | 1 | 1 |
| 입력 검증 | 5 | 4 | 1 | 0 |
| 인증/인가 | 6 | 6 | 0 | 0 |
| 암호화 | 4 | 4 | 0 | 0 |

## OWASP Top 10 점검

| # | 취약점 | 상태 | 대응 내용 |
|---|--------|------|-----------|
| A01 | Broken Access Control | O | RBAC 5단계, middleware JWT 검증, admin 라우트 권한 체크 |
| A02 | Cryptographic Failures | O | AES-256-GCM PII 암호화, bcrypt(12) 비밀번호, HTTPS 강제 |
| A03 | Injection | O | Prisma ORM (파라미터 바인딩), sanitize.ts XSS 방어 |
| A04 | Insecure Design | O | Rate Limit, Cost Guard, 일일 사용량 제한 |
| A05 | Security Misconfiguration | O | CSP/HSTS/X-Frame-Options 헤더, AUTH_SECRET fail-fast |
| A06 | Vulnerable Components | △ | npm audit 정기 실행 필요, dependabot 미설정 |
| A07 | Auth Failures | O | OAuth 2.0 + JWT, 로그인 실패 감사 로그, 비밀번호 정책 강화 |
| A08 | Data Integrity Failures | O | 서버사이드 검증, API Route에서만 외부 API 호출 |
| A09 | Logging Failures | O | AuditLog 모델, 감사 로그 기록 (로그인/설정변경/분석요청) |
| A10 | SSRF | N/A | 사용자 입력 URL 미사용 (공공API만 서버에서 호출) |

## 입력 검증 점검

| 항목 | 상태 | 대응 |
|------|------|------|
| XSS | O | sanitize.ts: 태그/이벤트핸들러/스크립트 제거, MIME 검증 |
| SQL Injection | O | Prisma ORM 파라미터 바인딩 |
| CSRF | O | Origin/Referer 검증 (lib/csrf.ts), SameSite 쿠키 |
| 경로 조작 | O | 파일 업로드 미지원 (텍스트 분석만) |
| 법원 API 검색어 | △ | 길이 제한 미적용 → Phase 4에서 보완 예정 |

## 인증/인가 점검

| 항목 | 상태 | 대응 |
|------|------|------|
| 비밀번호 정책 | O | 8자+ 3종 조합 필수 |
| 세션 관리 | O | JWT + HttpOnly + SameSite |
| 권한 검증 | O | middleware.ts Edge 함수 + API Route auth() |
| 관리자 보호 | O | /admin/* 경로 middleware 보호 + Credentials 인증 |
| 기본 시크릿 제거 | O | AUTH_SECRET fail-fast, 기본값 폴백 없음 |
| 감사 추적 | O | LOGIN/LOGOUT/LOGIN_FAILED/SETTINGS_CHANGE 기록 |

## 암호화 점검

| 항목 | 상태 | 대응 |
|------|------|------|
| 전송 암호화 | O | HTTPS (Vercel 기본), HSTS 1년 |
| 저장 암호화 (PII) | O | AES-256-GCM, Prisma 미들웨어 자동 암/복호화 |
| 비밀번호 해시 | O | bcrypt cost=12 |
| 키 관리 | O | 환경변수 기반, scrypt 키 파생, PII/OAuth 별도 salt |

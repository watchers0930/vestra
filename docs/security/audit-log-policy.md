# 감사 로그 보존 정책

## 1. 로그 대상 이벤트

| 이벤트 | action 값 | 기록 항목 |
|--------|-----------|-----------|
| 로그인 성공 | LOGIN | userId, provider, email |
| 로그인 실패 | LOGIN_FAILED | email, reason |
| 로그아웃 | LOGOUT | userId |
| 회원가입 | SIGNUP | userId, email |
| 역할 변경 | ROLE_CHANGE | userId, requestedRole |
| 관리자 사용자 수정 | ADMIN_USER_UPDATE | target userId, changes |
| 관리자 사용자 삭제 | ADMIN_USER_DELETE | target userId |
| 관리자 설정 변경 | ADMIN_SETTINGS_CHANGE | provider, category |
| 분석 요청 | ANALYSIS_REQUEST | type, address (마스킹) |
| Rate Limit 초과 | RATE_LIMIT_EXCEEDED | identifier |

## 2. 보존 기간

| 로그 유형 | 보존 기간 | 근거 |
|-----------|-----------|------|
| 인증 관련 (LOGIN/LOGOUT/SIGNUP) | 1년 | 개인정보보호법 시행령 |
| 관리자 활동 (ADMIN_*) | 2년 | 내부 감사 기준 |
| 분석 요청 | 6개월 | 서비스 품질 관리 |
| Rate Limit | 3개월 | 운영 모니터링 |

## 3. 민감 정보 처리

### 마스킹 대상 필드
- email: `he****@example.com`
- password: 기록 안 함
- businessNumber: `123456****`
- API 키: `****`

### 구현 위치
- `lib/audit-log.ts`: detail JSON 내 민감 필드 자동 마스킹

## 4. 자동 파기 (구현 예정)

```sql
-- 보존기간 초과 로그 자동 삭제 (월 1회 cron)
DELETE FROM "AuditLog"
WHERE action IN ('LOGIN', 'LOGOUT', 'SIGNUP', 'LOGIN_FAILED')
  AND "createdAt" < NOW() - INTERVAL '1 year';

DELETE FROM "AuditLog"
WHERE action LIKE 'ADMIN_%'
  AND "createdAt" < NOW() - INTERVAL '2 years';

DELETE FROM "AuditLog"
WHERE action = 'ANALYSIS_REQUEST'
  AND "createdAt" < NOW() - INTERVAL '6 months';
```

## 5. 접근 권한

| 역할 | 로그 열람 | 로그 삭제 |
|------|-----------|-----------|
| ADMIN | O (대시보드) | X (자동 파기만) |
| 기타 | X | X |

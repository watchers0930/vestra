# 시큐어코딩 가이드

> 행정안전부 SW 개발보안 가이드 기반 VESTRA 적용 현황

## 1. 입력 데이터 검증

### 적용 패턴
```typescript
// API Route 입력 검증 패턴
const { address } = await req.json();
if (!address || typeof address !== "string" || address.trim().length < 2) {
  return NextResponse.json({ error: "주소를 입력해주세요" }, { status: 400 });
}
const sanitized = sanitizeInput(address); // lib/sanitize.ts
```

### 적용 현황
- sanitize.ts: script/style/iframe 태그 제거, 이벤트 핸들러 제거, 재귀적 태그 제거
- Prisma ORM: 파라미터 바인딩으로 SQL Injection 원천 차단
- MIME 매직바이트 검증: 파일 업로드 시 확장자 위조 방지

## 2. 인증/세션 관리

### 적용 패턴
```typescript
// API Route 인증 패턴
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "인증 필요" }, { status: 401 });
}
// 역할 검증
if (session.user.role !== "ADMIN") {
  return NextResponse.json({ error: "권한 없음" }, { status: 403 });
}
```

### 적용 현황
- NextAuth v5 JWT 전략 (HttpOnly + SameSite=Lax)
- middleware.ts: Edge 함수에서 JWT 사전 검증
- RBAC 5단계: GUEST → PERSONAL → BUSINESS → REALESTATE → ADMIN
- 비밀번호: bcrypt(12), 8자 이상 3종 조합 필수

## 3. 암호화

### 적용 패턴
```typescript
// PII 암호화 (Prisma 미들웨어 자동 처리)
// 쓰기 시: encryptPII(plaintext) → AES-256-GCM → Base64
// 읽기 시: decryptPII(ciphertext) → 평문 복원
// 검색 시: hashForSearch(value) → HMAC-SHA256 해시 비교
```

### 적용 현황
- AES-256-GCM: PII 필드 (address, businessNumber) 자동 암호화
- scrypt 키 파생: AUTH_SECRET + 용도별 salt (PII/OAuth 분리)
- 환경변수 필수화: AUTH_SECRET 미설정 시 서버 시작 차단

## 4. 에러 처리

### 적용 패턴
```typescript
// 사용자에게 내부 정보 노출 금지
try {
  const result = await externalApi();
} catch (error) {
  console.error("External API error:", error); // 서버 로그
  return NextResponse.json(
    { error: "서비스 일시 장애" }, // 사용자에게는 일반 메시지
    { status: 503 }
  );
}
```

### 적용 현황
- API Route: try-catch에서 구체적 에러 메시지 서버 로그 기록
- 사용자 응답: 일반화된 에러 메시지 반환
- Rate Limit 초과: 429 상태 코드 + 재시도 시간 헤더

## 5. CSRF 방어

### 적용 패턴
```typescript
import { validateOrigin } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;
  // ... 비즈니스 로직
}
```

### 적용 대상
- /api/admin/account (비밀번호 변경)
- /api/admin/settings (OAuth/PG 설정)
- /api/user/setup-role (역할 변경 신청)

/**
 * S7 — API 인가 CI 게이트 (설계서 §3-2)
 * ────────────────────────────────────────────────────────────
 * app/api/**\/route.ts 의 변이 핸들러(POST/PUT/PATCH/DELETE) 중
 * "인증 신호"가 전혀 없는 것을 검출해 빌드를 실패시킨다.
 * 신규 API를 인증 없이 추가하는 회귀(CLAUDE.md "인증 없는 변이 핸들러" 체크리스트)를 자동 차단.
 *
 * 인증 신호(하나라도 있으면 통과):
 *   - auth()                        : NextAuth 세션 확인
 *   - withAdminAuth / withAgentAuth : 인가 래퍼
 *   - CRON_SECRET                   : cron Bearer 시크릿
 *   (토큰 기반 공개 서명 링크는 signToken이 Prisma 컬럼명이라 substring 오탐 위험 →
 *    자동 신호로 두지 않고 ALLOWLIST에 라우트를 명시한다)
 *
 * 의도적 공개(인증 없이 공개하되 rate-limit/CSRF로 보호)는 ALLOWLIST로 관리한다.
 * 베스트라 정책(CLAUDE.md): "인증 없이 API 공개, Rate Limit + Cost Guard로 비용 보호".
 *
 * 의존성 없는 순수 JS(node 실행) — prebuild 게이트에서 tsx 없이 안정 동작.
 * 실행:  node scripts/audit-api-auth.mjs   (prebuild에서 자동 → 빌드 게이트)
 * 위반이 있으면 목록 출력 후 exit 1.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const API_DIR = join(process.cwd(), "app", "api");

// 인증 없이 공개가 "의도된" 변이 핸들러 (경로는 app/api 기준 상대경로).
// 추가 시 반드시 사유를 남길 것. 여기 없는 미인증 변이 핸들러는 빌드 실패.
const ALLOWLIST = {
  "auth/[...nextauth]/route.ts": "NextAuth 로그인 핸들러 자체(로그인 전 접근)",
  "chat/route.ts": "공개 AI 챗 — rate limit + cost guard",
  "neighborhood/route.ts": "공개 동네 분석 — rate limit",
  "fraud-risk/route.ts": "공개 사기위험 분석 — rate limit",
  "jeonse/parse-registry/route.ts": "공개 등기 파싱 — CSRF + rate limit(10/min) + 파일검증",
  "monitoring/parse-pdf/route.ts": "공개 PDF 파싱 — CSRF + rate limit + 파일검증",
  "extract-pdf/route.ts": "공개 PDF 추출 — rate limit",
  "landlord/report/route.ts": "비회원 임대인 제보 — IP rate limit(일 3건) + CSRF",
  "e-contracts/sign/[token]/route.ts": "공개 서명 링크 — URL 토큰(signToken) 자체가 인증 + 만료·상태 검증",
  "embed/rights/route.ts": "공개 임베드 권리분석 — IP rate limit(10/min) + 매직바이트·10MB 검증 + 텍스트PDF만(OpenAI 미사용), 응답은 위험도 집계만(PII 미포함)",
  // ── 비회원 등기감시(로그인 없는 단건 서비스) — endpoint() 래퍼가 CSRF(validateOrigin)+IP rate limit+플래그/키 게이트 공통 적용 ──
  "guest-monitoring/identity/start/route.ts": "비회원 본인인증 시작 — endpoint(): CSRF + IP rate limit + 플래그/키 게이트",
  "guest-monitoring/identity/verify-otp/route.ts": "비회원 OTP 확인 — endpoint(): CSRF + IP·verificationId·nonce rate limit + 브라우저 바인딩 + 조건부 1회 소비",
  "guest-monitoring/identity/callback/route.ts": "비회원 본인인증 콜백(외부 PG) — HMAC 서명 + nonce 1회소비 + IP rate limit(120/min)",
  "guest-monitoring/orders/route.ts": "비회원 주문 생성 — CSRF + IP rate limit + 금액 SSOT(서버 산정)",
  "guest-monitoring/parse-pdf/route.ts": "비회원 등기부 PDF 파싱 — CSRF + IP rate limit + 11MB·매직바이트 검증",
  "guest-monitoring/payment/callback/route.ts": "비회원 결제 콜백(외부 PG) — HMAC + provider 재조회 금액검증 + nonce 1회소비 + IP rate limit",
  "guest-monitoring/session/route.ts": "비회원 조회 세션 — DELETE는 본인 세션 토큰(쿠키) 소유자만 로그아웃, CSRF + rate limit",
  "csp-report/route.ts": "CSP 위반 리포트 수신 — 브라우저가 위반 시 자동 전송(무인증 규격), DB 변이 없이 로그만 + 인메모리 dedup + 10KB 페이로드 상한",
};

const MUTATION_RE = /export\s+(?:async\s+function|const)\s+(POST|PUT|PATCH|DELETE)\b/g;
const AUTH_SIGNALS = [/\bauth\s*\(\s*\)/, /withAdminAuth/, /withAgentAuth/, /CRON_SECRET/, /verifyCronSecret/];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/^route\.(ts|tsx|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

function mutationMethods(src) {
  const methods = new Set();
  let m;
  MUTATION_RE.lastIndex = 0;
  while ((m = MUTATION_RE.exec(src))) methods.add(m[1]);
  return [...methods];
}

const files = walk(API_DIR);
const violations = [];
const usedAllow = new Set();

for (const file of files) {
  const rel = relative(API_DIR, file);
  const src = readFileSync(file, "utf8");

  const methods = mutationMethods(src);
  if (methods.length === 0) continue; // 변이 핸들러 없음(GET 전용 등)

  if (AUTH_SIGNALS.some((re) => re.test(src))) continue;

  if (rel in ALLOWLIST) {
    usedAllow.add(rel);
    continue;
  }
  violations.push({ path: rel, methods });
}

const staleAllow = Object.keys(ALLOWLIST).filter((k) => !usedAllow.has(k));

console.log(`API 인가 게이트: route ${files.length}개 검사`);

if (staleAllow.length) {
  console.log("\n⚠️ 불필요해진 ALLOWLIST 항목(파일 없음 또는 이제 인증됨 — 정리 권장):");
  for (const k of staleAllow) console.log(`   - ${k}`);
}

if (violations.length) {
  console.error(
    `\n❌ 인증 없는 변이 핸들러 ${violations.length}건 발견 (인증 추가 또는 의도적 공개면 ALLOWLIST 등록):`,
  );
  for (const v of violations) console.error(`   - ${v.path}  {${v.methods.join(",")}}`);
  console.error("\n인증 신호: auth() / withAdminAuth / withAgentAuth / CRON_SECRET (토큰 링크는 ALLOWLIST)");
  process.exit(1);
}

console.log(`✅ 통과 — 미인증 변이 핸들러 없음 (의도적 공개 ${usedAllow.size}건은 allowlist).`);

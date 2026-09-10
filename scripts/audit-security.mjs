#!/usr/bin/env node
/**
 * 보안 회귀 게이트 (P0-5) — SAST(경량) + SCA(의존성 취약점)
 *
 * 철학: 기존 부채는 유예(baseline), **신규 도입만 차단**(회귀차단). audit-api-auth와 같은 계열.
 * prebuild 체인에 AND로 연결된다.
 *
 * 안정성:
 *  - SCA(npm audit)는 네트워크·레지스트리 의존 → 명령 자체가 실패하면 배포를 막지 않는다(툴 실패 fail-open).
 *    단 audit이 성공했는데 baseline에 없는 신규 advisory가 나오면 차단.
 *  - SAST(grep)는 로컬·결정적 → 항상 실행, 하드 차단 가능.
 *    · eval( : baseline 0 → 신규 발견 시 차단.
 *    · dangerouslySetInnerHTML : baseline 개수 초과 시 차단(래칫).
 *
 * baseline 갱신: 의존성을 정리(취약점 감소)했으면 scripts/security-baseline.json을 재생성해 부채를 줄인다.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASELINE = JSON.parse(readFileSync(join(__dirname, "security-baseline.json"), "utf-8"));

let failed = false;
const log = (...a) => console.log("[audit-security]", ...a);

// ── SAST: 로컬 결정적 패턴 스캔 ──────────────────────────────────
function grepCount(pattern) {
  try {
    // app/lib/components만 대상(스크립트·테스트 제외). git grep으로 tracked 파일만.
    const out = execSync(
      `git grep -I -c -E "${pattern}" -- 'app/**' 'lib/**' 'components/**' || true`,
      { cwd: ROOT, encoding: "utf-8" },
    );
    return out
      .split("\n")
      .filter(Boolean)
      .reduce((sum, line) => sum + Number(line.split(":").pop() || 0), 0);
  } catch {
    return 0;
  }
}

// eval( — baseline 0. 신규 발견 시 차단.
const evalCount = grepCount("[^A-Za-z0-9_.]eval\\\\(");
if (evalCount > 0) {
  failed = true;
  log(`❌ SAST: eval( ${evalCount}건 발견 — 동적 코드 실행은 금지(XSS·RCE 위험).`);
} else {
  log("✅ SAST: eval( 없음");
}

// dangerouslySetInnerHTML — baseline 초과 시 차단(래칫).
const htmlCount = grepCount("dangerouslySetInnerHTML");
const htmlMax = BASELINE.dangerousHtmlMax ?? 0;
if (htmlCount > htmlMax) {
  failed = true;
  log(`❌ SAST: dangerouslySetInnerHTML ${htmlCount}건 (baseline ${htmlMax} 초과) — 신규 도입은 sanitize 검토 후 baseline 갱신 필요.`);
} else {
  log(`✅ SAST: dangerouslySetInnerHTML ${htmlCount}건 (baseline ${htmlMax} 이내)`);
}

// ── SCA: 의존성 취약점 회귀 ──────────────────────────────────────
const baselineIds = new Set(BASELINE.advisoryIds || []);
try {
  let raw;
  try {
    raw = execSync("npm audit --json", { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    // npm audit는 취약점이 있으면 종료코드 1 → stdout에 JSON은 여전히 담긴다.
    raw = e.stdout?.toString() || "";
  }
  if (!raw.trim()) throw new Error("empty audit output");

  const j = JSON.parse(raw);
  const current = new Set();
  for (const v of Object.values(j.vulnerabilities || {})) {
    for (const via of v.via || []) {
      if (typeof via === "object" && via.source) current.add(via.source);
    }
  }
  const fresh = [...current].filter((id) => !baselineIds.has(id));
  const meta = j.metadata?.vulnerabilities || {};

  if (fresh.length > 0) {
    failed = true;
    log(`❌ SCA: baseline에 없는 신규 취약점 advisory ${fresh.length}건: ${fresh.join(", ")}`);
    log("   → 의존성을 되돌리거나 패치하세요. 정당한 경우 scripts/security-baseline.json 재생성 후 커밋.");
  } else {
    log(`✅ SCA: 신규 취약점 없음 (기존 유예 ${baselineIds.size}건 · 현재 총 high ${meta.high ?? "?"}/critical ${meta.critical ?? "?"})`);
  }
} catch (e) {
  // 툴 실패는 배포를 막지 않는다(네트워크·레지스트리 이슈). 경고만.
  log(`⚠️ SCA 건너뜀 — npm audit 실행 실패(${e.message}). 배포는 계속(SAST는 통과 필요).`);
}

if (failed) {
  console.error("\n[audit-security] ❌ 보안 회귀 게이트 실패 — 위 항목을 해소하세요.\n");
  process.exit(1);
}
log("✅ 보안 회귀 게이트 통과");

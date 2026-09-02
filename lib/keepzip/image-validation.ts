/**
 * 이미지 data URL 검증 — 서명/직인 등 사용자 제출 이미지 공통 방어.
 * 접두사만 보던 기존 검증을 강화: MIME 화이트리스트(SVG 차단) + 크기 상한.
 */
const ALLOWED_PREFIXES = ["data:image/png", "data:image/jpeg", "data:image/jpg", "data:image/gif"];
const DEFAULT_MAX_BYTES = 2_000_000; // 2MB — 손글씨 서명/직인 PNG에 충분

const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export function isValidImageDataUrl(v: unknown, maxBytes: number = DEFAULT_MAX_BYTES): v is string {
  if (typeof v !== "string") return false;
  // data:image/svg+xml(스크립트 실행 위험) 등은 화이트리스트에서 제외 + base64 인코딩 강제
  // 형식: data:image/<mime>;base64,<payload> — MIME 위장 텍스트 페이로드(예: data:image/png,<svg>) 차단
  const okMime = ALLOWED_PREFIXES.some((p) => v.startsWith(`${p};base64,`));
  if (!okMime) return false;
  const comma = v.indexOf(",");
  if (comma < 0) return false;
  const payload = v.slice(comma + 1);
  if (payload.length === 0) return false;
  // 실제 base64인지 검증(비-base64 텍스트 스머글링 차단)
  if (!B64_RE.test(payload)) return false;
  // base64 페이로드 바이트 수 ≈ 길이 * 3/4
  const approxBytes = Math.floor((payload.length * 3) / 4);
  return approxBytes > 0 && approxBytes <= maxBytes;
}

// 자격증 첨부 — 이미지(스캔/사진) + PDF 허용. SVG 차단·base64 강제·크기 상한은 동일.
const ALLOWED_LICENSE_PREFIXES = ["data:image/png", "data:image/jpeg", "data:image/jpg", "data:application/pdf"];
const LICENSE_MAX_BYTES = 3_000_000; // 3MB

export function isValidLicenseFileDataUrl(v: unknown, maxBytes: number = LICENSE_MAX_BYTES): v is string {
  if (typeof v !== "string") return false;
  const okMime = ALLOWED_LICENSE_PREFIXES.some((p) => v.startsWith(`${p};base64,`));
  if (!okMime) return false;
  const comma = v.indexOf(",");
  if (comma < 0) return false;
  const payload = v.slice(comma + 1);
  if (payload.length === 0) return false;
  if (!B64_RE.test(payload)) return false;
  const approxBytes = Math.floor((payload.length * 3) / 4);
  return approxBytes > 0 && approxBytes <= maxBytes;
}

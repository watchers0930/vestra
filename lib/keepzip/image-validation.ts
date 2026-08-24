/**
 * 이미지 data URL 검증 — 서명/직인 등 사용자 제출 이미지 공통 방어.
 * 접두사만 보던 기존 검증을 강화: MIME 화이트리스트(SVG 차단) + 크기 상한.
 */
const ALLOWED_PREFIXES = ["data:image/png", "data:image/jpeg", "data:image/jpg", "data:image/gif"];
const DEFAULT_MAX_BYTES = 2_000_000; // 2MB — 손글씨 서명/직인 PNG에 충분

export function isValidImageDataUrl(v: unknown, maxBytes: number = DEFAULT_MAX_BYTES): v is string {
  if (typeof v !== "string") return false;
  // data:image/svg+xml(스크립트 실행 위험) 등은 화이트리스트에서 제외
  const okMime = ALLOWED_PREFIXES.some((p) => v.startsWith(`${p};`) || v.startsWith(`${p},`));
  if (!okMime) return false;
  const comma = v.indexOf(",");
  if (comma < 0) return false;
  // base64 페이로드 대략 바이트 수 = 길이 * 3/4
  const payloadLen = v.length - comma - 1;
  const approxBytes = Math.floor((payloadLen * 3) / 4);
  return approxBytes > 0 && approxBytes <= maxBytes;
}

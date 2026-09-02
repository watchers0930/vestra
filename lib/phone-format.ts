/**
 * 전화번호 하이픈 자동 포맷 + 개인정보 마스킹 유틸.
 * 입력값에는 숫자만 남기고, 표시용으로만 하이픈/마스킹을 적용한다.
 */

/** 휴대전화번호 하이픈 자동 (3-4-4, 10자리는 3-3-4) */
export function formatMobile(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length < 11) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 사무실 전화번호 하이픈 자동 (지역번호 대응: 02=2자리, 대표번호 15/16/18XX=4-4, 그 외=3자리) */
export function formatOfficePhone(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 11);
  if (d.length < 3) return d;

  // 전국 대표번호 (1588-1234 등)
  if (/^1[568]\d\d/.test(d)) {
    if (d.length < 5) return d;
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }

  // 서울 02 (2자리 지역번호)
  if (d.startsWith("02")) {
    if (d.length < 3) return d;
    if (d.length < 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length < 10) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }

  // 그 외 지역 (3자리 지역번호: 031, 051 …)
  if (d.length < 4) return d;
  if (d.length < 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length < 11) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 사업자등록번호 하이픈 자동 (3-2-5) */
export function formatBizNo(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 전화번호 가운데 블록 마스킹 (010-****-5678) — 표시 전용 */
export function maskPhone(formatted: string): string {
  if (!formatted) return "";
  const parts = formatted.split("-");
  if (parts.length === 3) return `${parts[0]}-****-${parts[2]}`;
  if (parts.length === 2) return `${parts[0]}-****`;
  // 하이픈이 없으면 뒤 3자리만 남기고 마스킹
  return formatted.length > 3 ? `****${formatted.slice(-3)}` : "****";
}

/** 이메일 계정 마스킹 (dongui0930@gmail.com → don****@gmail.com) — 표시 전용 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  const head = local.length > 3 ? local.slice(0, 3) : local.slice(0, 1);
  return `${head}****@${domain}`;
}

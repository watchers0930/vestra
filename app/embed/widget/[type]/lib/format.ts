/** 임베드 위젯 공통 포맷 유틸 */

/** 원 단위 → "3억 2,000만원" 한글 표기 */
export function formatKRW(won: number): string {
  if (!Number.isFinite(won) || won <= 0) return "-";
  const eok = Math.floor(won / 1e8);
  const man = Math.floor((won % 1e8) / 1e4);
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만원`;
  if (eok > 0) return `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

/** 원 단위 → "320만" 식 짧은 표기(㎡당 단가 등) */
export function formatManShort(won: number): string {
  if (!Number.isFinite(won) || won <= 0) return "-";
  return `${Math.round(won / 1e4).toLocaleString()}만`;
}

/** accent 쿼리값을 안전한 #hex로 변환(검증 실패 시 기본 브랜드색) */
export function safeAccent(raw: string | undefined): string {
  const DEFAULT = "#0071e3";
  if (!raw) return DEFAULT;
  const v = raw.replace(/^#/, "");
  return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(v) ? `#${v}` : DEFAULT;
}

/** ISO 시각 → "2026.10.08" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// 세금계산 renewal 공통 포맷 유틸

/** 원 단위 금액 → "1,284만 원" 형태 문자열 */
export function formatManwon(won: number): string {
  const man = Math.round(won / 10000);
  return `${man.toLocaleString("ko-KR")}만 원`;
}

/** 원 단위 금액 → 억/만 혼합 표기 ("3억 6,000만 원" / "12억 원") */
export function formatEokMan(won: number): string {
  const eok = Math.floor(won / 100000000);
  const man = Math.round((won % 100000000) / 10000);
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString("ko-KR")}만 원`;
  if (eok > 0) return `${eok}억 원`;
  return `${man.toLocaleString("ko-KR")}만 원`;
}

/** "85,000" 같은 콤마 문자열 → 원 단위 숫자 (입력은 만원 단위) */
export function parseManInput(text: string): number {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) * 10000 : 0;
}

/** 원 단위 → 만원 콤마 문자열 ("85,000") */
export function toManInput(won: number): string {
  return Math.round(won / 10000).toLocaleString("ko-KR");
}

/** 결과 hero 표기용: 원 → { value, unit } (만원 정수) */
export function heroManwon(won: number): { value: string; unit: string } {
  return { value: Math.round(won / 10000).toLocaleString("ko-KR"), unit: "만 원" };
}

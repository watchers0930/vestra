/**
 * 집키퍼 금액 한글 표기 유틸 (클라이언트·서버 공용, 순수).
 * - toKoreanAmount: 숫자 → 한글 수사(정식 표기)
 * - annotateAmounts: 본문 텍스트의 금액을 "…원(일금 한글원정)"으로 병기(표시용 후처리)
 */

/** 금액(원) → 한글 수사(정식 표기, 위변조 방지용 각 자리 명시). 예) 50000000 → "오천만" */
export function toKoreanAmount(n: number): string {
  if (n === 0) return "영";
  const D = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const U4 = ["", "십", "백", "천"]; // 1·10·100·1000의 자리
  const BIG = ["", "만", "억", "조", "경"];
  const groups: number[] = [];
  let x = Math.floor(n);
  while (x > 0) { groups.push(x % 10000); x = Math.floor(x / 10000); }
  let out = "";
  for (let g = groups.length - 1; g >= 0; g--) {
    const val = groups[g];
    if (val === 0) continue;
    let s = "";
    for (let i = 3; i >= 0; i--) {
      const d = Math.floor(val / 10 ** i) % 10;
      if (d !== 0) s += D[d] + U4[i];
    }
    out += s + BIG[g];
  }
  return out;
}

/**
 * 본문 텍스트의 "N,NNN,NNN원"을 "…원(일금 한글원정)"으로 병기.
 * 이미 병기된 금액·만원 미만은 건드리지 않는다(중복/오탐 방지). 표시 전용(저장값 불변).
 */
export function annotateAmounts(text: string): string {
  if (!text) return text;
  return text.replace(/([1-9][0-9]{0,3}(?:,[0-9]{3})+)\s*원(?!\s*\(일금)/g, (m, num: string) => {
    const n = Number(num.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 10000) return m;
    return `${num}원(일금 ${toKoreanAmount(n)}원정)`;
  });
}

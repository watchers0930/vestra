// 금액 포맷 유틸 (매물검색 지도)

// 마커 라벨용 축약 표기 (예: 135000000 → "1.4억")
export function formatEok(won: number): string {
  if (!won) return "-";
  if (won >= 100_000_000) {
    const v = (won / 100_000_000).toFixed(1);
    return `${v.endsWith(".0") ? v.slice(0, -2) : v}억`;
  }
  if (won >= 10_000) return `${Math.floor(won / 10_000)}만`;
  return `${won.toLocaleString()}원`;
}

// 상세 표기 (예: 135000000 → "1억 3,500만원")
export function formatKoreanWon(won: number): string {
  if (!won) return "-";
  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);
  if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

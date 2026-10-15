/**
 * 공통 KST(Asia/Seoul) 시간 처리 유틸 (설계 §4.5 — 달력 회귀 주의).
 *
 * 서버는 로그·기간을 UTC(ISO)로 내려주고 month 파라미터를 KST로 해석한다.
 * 브라우저 로컬시간으로 날짜·회차를 계산하면 해외 기기에서 날짜가 하루 밀리거나
 * 정오/오후 슬롯이 어긋난다. 모든 날짜 키·오늘·시각 슬롯은 이 유틸로 KST에 고정한다.
 */

export interface KstParts {
  year: number;
  /** 1-based (1 = 1월) */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const KST_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** ISO 문자열/Date/epoch 를 KST 연·월·일·시·분으로 분해. 파싱 불가 시 null. */
export function kstParts(input: string | number | Date): KstParts | null {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const map: Record<string, number> = {};
  for (const p of KST_FORMAT.formatToParts(d)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  // en-GB hour12:false 는 자정을 "24"로 줄 수 있어 0으로 정규화
  const hour = map.hour === 24 ? 0 : map.hour;
  return { year: map.year, month: map.month, day: map.day, hour, minute: map.minute };
}

/** KST 기준 날짜 그룹 키("YYYY-M-D", 월/일 패딩 없음 — 캘린더 셀 비교용) */
export function kstDateKey(input: string | number | Date): string | null {
  const p = kstParts(input);
  return p ? `${p.year}-${p.month}-${p.day}` : null;
}

/** KST 기준 현재 시각 파츠 */
export function kstNow(): KstParts {
  // new Date() 는 항상 유효하므로 non-null 단언 가능
  return kstParts(new Date())!;
}

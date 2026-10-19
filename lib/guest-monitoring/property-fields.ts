import type { TitleSection } from "@/lib/registry-parser";

/** Input must be the parsed title's unitNumber, never whole-document text. */
export function parseUnitNumber(unitNumber: string) {
  const value = unitNumber.normalize("NFKC");
  const dong = value.match(/(?:^|\s)제?\s*(\d+)\s*동(?=\s|$)/)?.[1] || "";
  const ho = value.match(/(?:^|\s)제?\s*(\d+)\s*호(?=\s|$)/)?.[1] || "";
  return { dong, ho };
}
export function isAggregateFromRegistry(parsed: { title: Pick<TitleSection, "isApartment"> }) {
  return parsed.title.isApartment === true;
}
/** 집합건물 표제부 헤더에서 "주체 물건"의 동·호를 추출한다.
 * 예: "...철산한신아파트 제108동 제14층 제1403호 고유번호 1349-...". 고유번호 직전의
 * '제N동 (제M층)? 제K호' 형식만 집어, 갑/을구 거래내역에 등장하는 다른 물건(예 "103동 1501호")과
 * 혼동하지 않는다. title.unitNumber가 "1동의 건물의 표시" 헤더를 오인하는 결함(제108동→제1동) 보정용. */
export function subjectUnitFromText(text: string) {
  const v = text.normalize("NFKC");
  const m = v.match(/제\s*(\d+)\s*동\s*(?:제\s*\d+\s*층\s*)?제\s*(\d+)\s*호\s*고유번호/)
    || v.match(/제\s*(\d+)\s*동\s*(?:제\s*\d+\s*층\s*)?제\s*(\d+)\s*호/);
  return { dong: m?.[1] || "", ho: m?.[2] || "" };
}
export function registryPropertyFields(title: TitleSection, rawText?: string) {
  const isAggregate = isAggregateFromRegistry({ title });
  let { dong, ho } = isAggregate ? parseUnitNumber(title.unitNumber) : { dong: "", ho: "" };
  // 원문 집합건물 헤더(고유번호 직전)에서 동·호 재확정 — title.unitNumber 오인(제108동→제1동) 보정.
  if (isAggregate && rawText) {
    const fromText = subjectUnitFromText(rawText);
    if (fromText.dong) { dong = fromText.dong; ho = fromText.ho || ho; }
  }
  const address = title.address.trim();
  const suffix = [dong && `${dong}동`, ho && `${ho}호`].filter(Boolean)
    .filter(part => !new RegExp(`(?:^|\\s)제?${part}(?=\\s|$)`).test(address));
  return { address: [address, ...suffix].join(" "),
    unitNumber: { buildingDong: dong, unitHo: ho, isAggregate } };
}

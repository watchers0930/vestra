/** 단위를 명시한 양수 면적만 허용한다. */
export function areaValues(text: string): number[] {
  const normalized = text.normalize("NFKC").replace(/(\d)\s*\.\s*(?=\d)/g, "$1.");
  return [...normalized.matchAll(/(?<![\d.,+−-])((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(?:m\s*2|제곱\s*미터)(?!\d)/gi)]
    .map(m => Number(m[1].replace(/,/g, ""))).filter(n => Number.isFinite(n) && n > 0);
}
export function parseAreaValue(text: string): number {
  const values = [...new Set(areaValues(text))];
  return values.length === 1 ? values[0] : 0;
}
export function parseTitleArea(raw: string, unitNumber = "") {
  const text = raw.normalize("NFKC");
  const start = text.search(/전유\s*부분/);
  const warnings: string[] = [];
  let block = start >= 0 ? text.slice(start) : text;
  if (start < 0) {
    // 일반건물은 대지·연면적을 제외하고 건물 면적만 반환한다.
    block = block.split("\n").map(l => l.split(/대지권|연면적|토지의\s*표시/)[0]).filter(l => !/^\s*(?:대지|토지)\s/.test(l)).join("\n");
  } else {
    block = block.split(/대지권|대지의\s*표시|토지의\s*표시|갑\s*구|을\s*구/)[0];
    const headings = [...block.matchAll(/(?:^|\n)\s*(?:제\s*)?(?:\d+\s*동\s*(?:제\s*)?)?(?:\d+\s*층\s*(?:제\s*)?)?(\d+)\s*호/g)];
    const target = unitNumber.match(/(\d+)\s*호/)?.[1];
    if (headings.length > 1) {
      const matches = target ? headings.filter(m => m[1] === target) : [];
      if (matches.length !== 1) return { area: "", exclusiveArea: "", warnings: ["전유부분 대상 호수 확인이 필요합니다."] };
      const index = headings.indexOf(matches[0]);
      block = block.slice(matches[0].index, headings[index + 1]?.index);
    }
  }
  const values = [...new Set(areaValues(block))];
  if (values.length > 1) warnings.push("면적 근거가 충돌하여 확인이 필요합니다.");
  const area = values.length === 1 ? `${values[0]}㎡` : "";
  return { area, exclusiveArea: start >= 0 ? area : "", warnings };
}

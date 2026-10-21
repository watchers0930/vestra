/** 물건 동일성을 임의로 확장하지 않는다. 지번/도로명·동호수는 보존한다. */
export function normalizePropertyAddress(value: string): string {
  return value.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}
const REGION = /(?:서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|제주특별자치도|강원특별자치도|전북특별자치도|[가-힣]+도|[가-힣]+시)/;
const BOUNDARY = /철근|철골|벽돌|목조|경량|조적|구조|소재지번|건물내역|등기원인|표시번호|도로명주소|\d{4}년/;
export function parseTitleAddress(raw: string) {
  const title = raw.normalize("NFKC").split(/전유\s*부분|갑\s*구|을\s*구|소유자|채권자/)[0];
  const lines = title.replace(/\[도로명주소\]/g, "\n").split("\n");
  const addresses: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].search(REGION);
    if (start < 0) continue;
    // OCR 표의 옆 열(구조·면적·토지)은 주소 후보에 섞지 않는다.
    let candidate = lines[i].slice(start).split(/\s{2,}|\|/)[0].split(BOUNDARY)[0].trim();
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const continuation = lines[j].trim().split(/\s{2,}|\|/)[0].split(BOUNDARY)[0];
      if (!continuation || REGION.test(continuation)) break;
      if (/^(?:산\s*)?\d+(?:-\d+)?(?:\s|$)/.test(continuation) || /^[가-힣\d·.]+(?:구|군|시|읍|면|동|리|로|길)(?:\s|$)/.test(continuation)) {
        candidate += ` ${continuation}`;
      } else break;
    }
    const road = candidate.match(/^(.+?(?:로|길)\s*\d+(?:-\d+)?)(?=\s|$|[,()])/);
    const lot = candidate.match(/^(.+?(?:동|읍|면|리|가)\s*(?:산\s*)?\d+(?:-\d+)?)(?=\s|$|[,()])/);
    const selected = road?.[1] ?? lot?.[1];
    if (selected) addresses.push(normalizePropertyAddress(selected));
  }
  const road = addresses.find(a => /(?:로|길)\s*\d/.test(a));
  const lotAddress = addresses.find(a => /(?:동|리|가)\s*(?:산\s*)?\d/.test(a)) ?? "";
  const unitBlock = raw.normalize("NFKC").split(/소유자|채권자|갑\s*구|을\s*구/)[0];
  const dong = unitBlock.match(/(?:제\s*)?(\d+)\s*동(?=\s|제|$)/)?.[1];
  const units = [...new Set([...unitBlock.matchAll(/(?:제\s*)?(\d+)\s*호/g)].map(m => m[1]))];
  const ho = units.length === 1 ? units[0] : undefined;
  return { address: road ?? addresses[0] ?? "", lotAddress, ambiguousUnit: units.length > 1,
    unitNumber: !ho ? "" : [dong ? `${dong}동` : "", ho ? `${ho}호` : ""].filter(Boolean).join(" ") };
}

/** 동·호 숫자를 기준으로 표기를 통일한다. 층은 호수가 있을 때만 중복 정보로 제거한다.
 *  ⚠️ 공백을 전부 제거하면 '테헤란로 123 101동'의 건물번호(123)와 동번호(101)가 붙어(123101동) 서로 다른
 *  물건이 같은 키가 된다. 단일 공백으로만 정규화해 토큰 경계를 보존한다(#4). */
export function addressKey(value: string): string {
  let key = normalizePropertyAddress(value)
    .replace(/(?:제\s*)?(\d+)\s*(동|층|호)/g, (_, n: string, unit: string) => ` ${Number(n)}${unit} `);
  if (/\d+호/.test(key)) key = key.replace(/\d+층/g, " ");
  return key.replace(/\s+/g, " ").trim();
}
export function propertyUnitKey(value: string): string {
  const key = addressKey(value);
  const dongs = [...new Set([...key.matchAll(/(\d+)동/g)].map(m => m[1]))];
  const hos = [...new Set([...key.matchAll(/(\d+)호/g)].map(m => m[1]))];
  return dongs.length === 1 && hos.length === 1 ? `${dongs[0]}동${hos[0]}호` : "";
}

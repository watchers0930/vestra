import type { TitleSection } from "../registry-parser";
import { extractArea } from "./parsing-utils";
import { parseTitleAddress } from "./title-address-parser";
import { parseTitleArea } from "./title-area-parser";

function parseLegacyTitle(raw: string): TitleSection {
  const result: TitleSection = {
    address: "",
    buildingDetail: "",
    area: "",
    structure: "",
    purpose: "",
    landRightRatio: "",
    buildingName: "",
    unitNumber: "",
    exclusiveArea: "",
    totalFloors: "",
    isApartment: false,
    propUid: "",
  };

  if (!raw) return result;

  if (/전유부분/.test(raw)) {
    result.isApartment = true;
    return parseApartmentTitle(raw, result);
  }

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (/소재지|소재지번/.test(line) || /[가-힣]+[시도]\s*[가-힣]+[시군구]/.test(line)) {
      const addrMatch = line.match(/([가-힣]+(?:시|도)\s+[가-힣]+(?:시|군|구)[\s가-힣\d\-호동층]*)/);
      if (addrMatch) {
        // 건물구조(철근콘크리트 등)·면적 문자열이 같은 줄에서 주소에 혼입되면 잘라낸다.
        // (예: "경기도 남양주시 다산동 철근콘크리…" → "경기도 남양주시 다산동")
        result.address = addrMatch[1]
          .replace(/\s*(?:철근콘크리트|철골철근콘크리트|철골|벽돌|목조|경량철골|조적)[가-힣\s]{0,8}(?:구조|조).*$/, "")
          .trim();
      }
    }

    const area = extractArea(line);
    if (area && !result.area) result.area = area;

    if (/철근콘크리트|철골|벽돌|목조|경량철골|조적/.test(line)) {
      const structMatch = line.match(/((?:철근콘크리트|철골철근콘크리트|철골|벽돌|목조|경량철골|조적)[가-힣\s]*조)/);
      if (structMatch) result.structure = structMatch[1];
    }

    if (/아파트|다세대|다가구|단독주택|오피스텔|근린생활|업무시설|주거용/.test(line)) {
      const purposeMatch = line.match(/(아파트|다세대주택|다가구주택|단독주택|오피스텔|제[12]종근린생활시설|업무시설|공동주택)/);
      if (purposeMatch) result.purpose = purposeMatch[1];
    }

    if (/대지권\s*비율|대지권비율/.test(line)) {
      const ratioMatch = line.match(/([\d,.]+분의\s*[\d,.]+|[\d.]+\/[\d.]+)/);
      if (ratioMatch) result.landRightRatio = ratioMatch[1];
    }

    if (/㎡/.test(line) && !result.buildingDetail) {
      result.buildingDetail = line.replace(/^[\d\s|]+/, "").trim();
    }
  }

  return result;
}

/** 집합건물(아파트) 전용 표제부 파싱 */
function parseApartmentTitle(raw: string, result: TitleSection): TitleSection {
  const jyuIdx = raw.search(/전유부분/);
  const buildingBlock = jyuIdx > 0 ? raw.slice(0, jyuIdx) : "";
  const unitBlock = jyuIdx >= 0 ? raw.slice(jyuIdx) : raw;

  const addrMatch = buildingBlock.match(
    /([가-힣]+(?:특별시|광역시|특별자치시|도)\s+[가-힣]+(?:시|군|구)[\s가-힣]*(?:동|읍|면|리|가|로)\s*[\d\-]*)/,
  );
  if (addrMatch) result.address = addrMatch[1].replace(/\s+/g, " ").trim();

  const nameMatch = raw.match(
    /([가-힣A-Za-z0-9]+(?:아파트|오피스텔|빌라|타운|타워|하이츠|빌|팰리스|캐슬|파크|힐스|센트럴|레미안|자이|래미안|푸르지오|e편한세상|더샵|롯데캐슬|SK뷰|힐스테이트|아이파크|트레비앙|한신|현대|삼성|우성|쌍용|주공|LG|대림|벽산|두산위브|리슈빌|센텀|시티|스카이뷰|포레|파인|가든|맨션|주상복합))/,
  );
  if (nameMatch) result.buildingName = nameMatch[1].trim();

  const structMatch = buildingBlock.match(
    /((?:철근콘크리트|철골철근콘크리트|철골|벽돌|목조|경량철골|조적)[가-힣\s]*(?:구조|조))/,
  );
  if (structMatch) result.structure = structMatch[1];

  const floorMatch = buildingBlock.match(/(\d+)\s*층\s*(?:아파트|건물|$)/);
  if (floorMatch) result.totalFloors = `지상 ${floorMatch[1]}층`;
  if (!result.totalFloors) {
    const allFloors = [...buildingBlock.matchAll(/(\d+)층/g)].map((m) => parseInt(m[1], 10));
    if (allFloors.length > 0) {
      const maxFloor = Math.max(...allFloors);
      if (maxFloor >= 3) result.totalFloors = `지상 ${maxFloor}층`;
    }
  }

  const unitFullMatch = unitBlock.match(/제?\s*(\d+)\s*동\s*제?\s*(\d+)\s*층\s*제?\s*(\d+)\s*호/);
  if (unitFullMatch) {
    result.unitNumber = `제${unitFullMatch[1]}동 제${unitFullMatch[2]}층 제${unitFullMatch[3]}호`;
  } else {
    const floorUnitMatch = unitBlock.match(/제?\s*(\d+)\s*층\s*제?\s*(\d+)\s*호/);
    const dongMatch = buildingBlock.match(/제?\s*(\d+)\s*동/);
    if (floorUnitMatch) {
      const dong = dongMatch ? `제${dongMatch[1]}동 ` : "";
      result.unitNumber = `${dong}제${floorUnitMatch[1]}층 제${floorUnitMatch[2]}호`;
    }
  }

  const unitAreaMatch = unitBlock.match(/([\d.]+)\s*㎡/);
  if (unitAreaMatch) {
    result.exclusiveArea = `${unitAreaMatch[1]}㎡`;
    result.area = result.exclusiveArea;
  }

  const unitStructMatch = unitBlock.match(
    /((?:철근콘크리트|철골철근콘크리트|철골)[가-힣\s]*)/,
  );
  if (unitStructMatch) {
    const s = unitStructMatch[1].trim();
    if (s.length >= 4) result.structure = s;
  }

  if (/아파트/.test(raw)) result.purpose = "아파트";
  else if (/오피스텔/.test(raw)) result.purpose = "오피스텔";
  else if (/다세대/.test(raw)) result.purpose = "다세대주택";
  else if (/공동주택/.test(raw)) result.purpose = "공동주택";

  const ratioMatch = raw.match(/([\d,.]+)\s*분의\s*([\d,.]+)/);
  if (ratioMatch) result.landRightRatio = `${ratioMatch[1]}분의 ${ratioMatch[2]}`;

  result.buildingDetail = [
    result.unitNumber,
    result.structure,
    result.exclusiveArea,
  ].filter(Boolean).join(" / ");

  return result;
}

export function parseTitle(raw: string): TitleSection {
  const result = parseLegacyTitle(raw);
  const address = parseTitleAddress(raw);
  result.address = address.address || result.address;
  // 서로 다른 호수가 있으면 임의로 legacy의 첫 호수를 선택하지 않는다.
  result.unitNumber = address.unitNumber || (address.ambiguousUnit ? "" : result.unitNumber);
  const area = parseTitleArea(raw, result.unitNumber);
  result.area = area.area;
  result.exclusiveArea = area.exclusiveArea;
  result.parsingWarnings = area.warnings;
  result.lotAddress = address.lotAddress || result.lotAddress;
  return result;
}

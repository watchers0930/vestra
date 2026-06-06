/**
 * 등기부등본 섹션별 파서
 *
 * 표제부·갑구·을구 각 섹션의 파싱 로직과
 * 말소 역추적·요약 생성을 포함합니다.
 *
 * @module lib/registry/section-parsers
 */

import type {
  TitleSection, GapguEntry, EulguEntry, RiskType, ParseSummary,
} from "../registry-parser";
import {
  GAPGU_RISK_MAP, EULGU_RISK_MAP,
  extractDate, extractAmount, classifyRightType,
  isCancelled, isRefCancellation, extractArea, extractHolder,
} from "./parsing-utils";

// ─── 표제부 파싱 ───

export function parseTitle(raw: string): TitleSection {
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
      if (addrMatch) result.address = addrMatch[1].trim();
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

// ─── 갑구 파싱 ───

export function parseGapgu(raw: string): GapguEntry[] {
  if (!raw) return [];

  const entries: GapguEntry[] = [];
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/순위번호|등기목적|접수/.test(lines[i])) {
      startIdx = i + 1;
      break;
    }
  }

  let currentEntry: Partial<GapguEntry> | null = null;
  let orderCounter = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    const orderMatch = line.match(/^(\d+)\s/);
    const hasRightKeyword = Object.keys(GAPGU_RISK_MAP).some((k) => line.includes(k));
    const hasDate = extractDate(line) !== "";

    if (orderMatch || (hasRightKeyword && hasDate)) {
      if (currentEntry && currentEntry.purpose) {
        entries.push(currentEntry as GapguEntry);
      }

      orderCounter++;
      const date = extractDate(line);
      const { type, risk } = classifyRightType(line, GAPGU_RISK_MAP);
      const cancelled = isCancelled(line);
      const holder = extractHolder(line);

      currentEntry = {
        order: orderMatch ? parseInt(orderMatch[1], 10) : orderCounter,
        date,
        purpose: type,
        detail: line,
        holder,
        isCancelled: cancelled,
        riskType: cancelled ? "info" : risk,
      };
    } else if (currentEntry) {
      currentEntry.detail += " " + line;

      if (!currentEntry.date) {
        const d = extractDate(line);
        if (d) currentEntry.date = d;
      }
      if (!currentEntry.holder) {
        const h = extractHolder(line);
        if (h) currentEntry.holder = h;
      }
      if (currentEntry.purpose === "기타") {
        const { type, risk } = classifyRightType(line, GAPGU_RISK_MAP);
        if (type !== "기타") {
          currentEntry.purpose = type;
          currentEntry.riskType = currentEntry.isCancelled ? "info" : risk;
        }
      }
      if (isCancelled(line)) {
        if (!isRefCancellation(line)) {
          currentEntry.isCancelled = true;
          currentEntry.riskType = "info";
        } else {
          const allRefs = [...line.matchAll(/(\d+)\s*번/g)];
          for (const ref of allRefs) {
            const refOrder = parseInt(ref[1], 10);
            if (refOrder >= 1 && refOrder <= 50 && refOrder === currentEntry.order) {
              currentEntry.isCancelled = true;
              currentEntry.riskType = "info";
            }
          }
        }
      }
    }
  }

  if (currentEntry && currentEntry.purpose) {
    entries.push(currentEntry as GapguEntry);
  }

  return entries;
}

// ─── 을구 파싱 ───

export function parseEulgu(raw: string): EulguEntry[] {
  if (!raw) return [];

  const entries: EulguEntry[] = [];
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/순위번호|등기목적|접수/.test(lines[i])) {
      startIdx = i + 1;
      break;
    }
  }

  let currentEntry: Partial<EulguEntry> | null = null;
  let orderCounter = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    const orderMatch = line.match(/^(\d+)\s/);
    const hasRightKeyword = Object.keys(EULGU_RISK_MAP).some((k) => line.includes(k));
    const hasDate = extractDate(line) !== "";

    if (orderMatch || (hasRightKeyword && hasDate)) {
      if (currentEntry && currentEntry.purpose) {
        entries.push(currentEntry as EulguEntry);
      }

      orderCounter++;
      const date = extractDate(line);
      const { type, risk } = classifyRightType(line, EULGU_RISK_MAP);
      const cancelled = isCancelled(line);
      const amount = extractAmount(line);
      const holder = extractHolder(line);

      currentEntry = {
        order: orderMatch ? parseInt(orderMatch[1], 10) : orderCounter,
        date,
        purpose: type,
        detail: line,
        amount,
        holder,
        isCancelled: cancelled,
        riskType: cancelled ? "info" : risk,
      };
    } else if (currentEntry) {
      currentEntry.detail += " " + line;

      if (!currentEntry.amount || currentEntry.amount === 0) {
        const amt = extractAmount(line);
        if (amt > 0) currentEntry.amount = amt;
      }
      if (!currentEntry.date) {
        const d = extractDate(line);
        if (d) currentEntry.date = d;
      }
      if (!currentEntry.holder) {
        const h = extractHolder(line);
        if (h) currentEntry.holder = h;
      }
      if (currentEntry.purpose === "기타") {
        const { type, risk } = classifyRightType(line, EULGU_RISK_MAP);
        if (type !== "기타") {
          currentEntry.purpose = type;
          currentEntry.riskType = currentEntry.isCancelled ? "info" : risk;
        }
      }
      if (isCancelled(line)) {
        if (!isRefCancellation(line)) {
          currentEntry.isCancelled = true;
          currentEntry.riskType = "info";
        } else {
          const allRefs = [...line.matchAll(/(\d+)\s*번/g)];
          for (const ref of allRefs) {
            const refOrder = parseInt(ref[1], 10);
            if (refOrder >= 1 && refOrder <= 50 && refOrder === currentEntry.order) {
              currentEntry.isCancelled = true;
              currentEntry.riskType = "info";
            }
          }
        }
      }
    }
  }

  if (currentEntry && currentEntry.purpose) {
    entries.push(currentEntry as EulguEntry);
  }

  return entries;
}

// ─── 말소 역추적 ───

/** "N번근저당권말소" 등의 항목에서 참조된 원래 항목을 말소 처리 */
export function resolveCancellations<T extends { order: number; detail: string; purpose?: string; isCancelled: boolean; riskType: RiskType }>(
  entries: T[],
): T[] {
  for (const entry of entries) {
    const text = entry.detail;

    if (entry.purpose && /말소/.test(entry.purpose)) {
      entry.isCancelled = true;
      entry.riskType = "info";
    }

    const patternA = /(\d+)\s*번[가-힣\s\d,·()（）]{0,80}말소/g;
    let m: RegExpExecArray | null;
    while ((m = patternA.exec(text)) !== null) {
      const refOrder = parseInt(m[1], 10);
      if (refOrder >= 1 && refOrder <= 50) {
        for (const target of entries) {
          if (target.order === refOrder) {
            target.isCancelled = true;
            target.riskType = "info";
          }
        }
      }
    }

    const patternB = /제\s*(\d+)\s*호[가-힣\s\d,·()（）]{0,80}말소/g;
    while ((m = patternB.exec(text)) !== null) {
      const refOrder = parseInt(m[1], 10);
      if (refOrder >= 1 && refOrder <= 50) {
        for (const target of entries) {
          if (target.order === refOrder) {
            target.isCancelled = true;
            target.riskType = "info";
          }
        }
      }
    }

    if (entry.purpose && /말소/.test(entry.purpose)) {
      const allRefs = [...text.matchAll(/(\d+)\s*번/g)];
      for (const ref of allRefs) {
        const refOrder = parseInt(ref[1], 10);
        if (refOrder >= 1 && refOrder <= 50) {
          for (const target of entries) {
            if (target.order === refOrder) {
              target.isCancelled = true;
              target.riskType = "info";
            }
          }
        }
      }
    }

    const patternD = /(\d+)\s*번[가-힣\s\d,·()（）]{0,80}(?:해제|해지)/g;

    if (/기말소/.test(text)) {
      entry.isCancelled = true;
      entry.riskType = "info";

      const allRefs = [...text.matchAll(/(\d+)\s*번/g)];
      for (const ref of allRefs) {
        const refOrder = parseInt(ref[1], 10);
        if (refOrder >= 1 && refOrder <= 50) {
          for (const target of entries) {
            if (target.order === refOrder) {
              target.isCancelled = true;
              target.riskType = "info";
            }
          }
        }
      }
    }
    while ((m = patternD.exec(text)) !== null) {
      const refOrder = parseInt(m[1], 10);
      if (refOrder >= 1 && refOrder <= 50) {
        for (const target of entries) {
          if (target.order === refOrder) {
            target.isCancelled = true;
            target.riskType = "info";
          }
        }
      }
    }
  }
  return entries;
}

// ─── 요약 생성 ───

export function buildSummary(gapgu: GapguEntry[], eulgu: EulguEntry[]): ParseSummary {
  const activeGapgu = gapgu.filter((e) => !e.isCancelled);
  const activeEulgu = eulgu.filter((e) => !e.isCancelled);

  const totalMortgageAmount = activeEulgu
    .filter((e) => /근저당|저당/.test(e.purpose))
    .reduce((sum, e) => sum + e.amount, 0);

  const totalJeonseAmount = activeEulgu
    .filter((e) => /전세권/.test(e.purpose))
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    totalGapguEntries: gapgu.length,
    totalEulguEntries: eulgu.length,
    activeGapguEntries: activeGapgu.length,
    activeEulguEntries: activeEulgu.length,
    cancelledEntries: gapgu.filter((e) => e.isCancelled).length + eulgu.filter((e) => e.isCancelled).length,
    totalMortgageAmount,
    totalJeonseAmount,
    hasSeizure: activeGapgu.some((e) => e.purpose === "압류"),
    hasProvisionalSeizure: activeGapgu.some((e) => e.purpose === "가압류"),
    hasProvisionalDisposition: activeGapgu.some((e) => e.purpose === "가처분"),
    hasAuctionOrder: activeGapgu.some((e) => /경매개시결정/.test(e.purpose)),
    hasTrust: activeGapgu.some((e) => /신탁/.test(e.purpose)),
    hasProvisionalRegistration: [...activeGapgu, ...activeEulgu].some((e) => e.purpose === "가등기"),
    hasLeaseRegistration: activeEulgu.some((e) => /임차권등기|임차권설정/.test(e.purpose)),
    hasWarningRegistration: activeGapgu.some((e) => e.purpose === "예고등기"),
    hasRedemptionRegistration: activeGapgu.some((e) => /환매/.test(e.purpose)),
    ownershipTransferCount: gapgu.filter((e) => e.purpose === "소유권이전" && !e.isCancelled).length,
    totalClaimsAmount: totalMortgageAmount + totalJeonseAmount,
  };
}

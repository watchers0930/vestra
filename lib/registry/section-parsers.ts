/**
 * 등기부등본 섹션별 파서
 *
 * 표제부·갑구·을구 각 섹션의 파싱 로직과
 * 말소 역추적·요약 생성을 포함합니다.
 *
 * @module lib/registry/section-parsers
 */

import type {
  GapguEntry, EulguEntry, RiskType, ParseSummary,
} from "../registry-parser";
import {
  GAPGU_RISK_MAP, EULGU_RISK_MAP,
  extractDate, extractAmount, classifyRightType,
  isCancelled, isRefCancellation, extractHolder,
  RENTAL_BUSINESS_PATTERN, NAME_CHANGE_PATTERN,
} from "./parsing-utils";

// ─── 표제부 파싱 ───

export { parseTitle } from "./title-parser";

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

    const orderMatch = line.match(/^(\d+)(?:-(\d+))?\s/);
    const subOrder = orderMatch && orderMatch[2] ? parseInt(orderMatch[2], 10) : undefined;
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
        subOrder,
        isSupplementary: subOrder !== undefined,
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

    const orderMatch = line.match(/^(\d+)(?:-(\d+))?\s/);
    const subOrder = orderMatch && orderMatch[2] ? parseInt(orderMatch[2], 10) : undefined;
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
        subOrder,
        isSupplementary: subOrder !== undefined,
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

  // 부기등기(이전/변경)는 주등기 채권을 승계할 뿐 신규 채권이 아니므로 합산 제외
  const totalMortgageAmount = activeEulgu
    .filter((e) => /근저당|저당/.test(e.purpose) && !e.isSupplementary)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalJeonseAmount = activeEulgu
    .filter((e) => /전세권/.test(e.purpose) && !e.isSupplementary)
    .reduce((sum, e) => sum + e.amount, 0);

  // 등록임대주택/명의인표시변경 부기등기 감지 (갑구·을구 전 항목 detail 스캔)
  const allDetails = [...gapgu, ...eulgu].map((e) => `${e.purpose} ${e.detail}`).join("\n");
  const hasRentalBusinessRegistration = RENTAL_BUSINESS_PATTERN.test(allDetails);
  const hasNameChangeRegistration = gapgu.some(
    (e) => NAME_CHANGE_PATTERN.test(e.purpose) || NAME_CHANGE_PATTERN.test(e.detail)
  );

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
    // 신탁등기는 등기목적이 "소유권이전"으로 기재되고 수탁자(신탁회사)가 소유자로 등기되므로 holder로도 감지한다.
    hasTrust: activeGapgu.some((e) => /신탁/.test(e.purpose) || /신탁(?:주식)?회사/.test(e.holder ?? "")),
    // 가등기 목적은 "소유권이전청구권가등기" 등으로 기재되므로 완전일치가 아닌 포함검사로 감지한다.
    hasProvisionalRegistration: [...activeGapgu, ...activeEulgu].some((e) => /가등기/.test(e.purpose)),
    hasLeaseRegistration: activeEulgu.some((e) => /임차권등기|임차권설정/.test(e.purpose)),
    hasWarningRegistration: activeGapgu.some((e) => e.purpose === "예고등기"),
    hasRedemptionRegistration: activeGapgu.some((e) => /환매/.test(e.purpose)),
    hasRentalBusinessRegistration,
    hasNameChangeRegistration,
    ownershipTransferCount: gapgu.filter((e) => e.purpose === "소유권이전" && !e.isCancelled).length,
    totalClaimsAmount: totalMortgageAmount + totalJeonseAmount,
  };
}

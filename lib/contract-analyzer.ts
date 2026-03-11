/**
 * VESTRA 계약서 조항 분석 엔진 (Contract Clause Analysis Engine)
 * ──────────────────────────────────────────────────────────────
 * 한국 부동산 계약서를 규칙 기반으로 파싱하여 조항별 리스크 판정.
 * LLM 없이 법령 DB + 패턴 매칭으로 위험 요소 감지.
 */

import type { ClauseInteractionRule, ClauseInteractionResult } from "./patent-types";

// ─── 타입 정의 ───

export interface AnalyzedClause {
  title: string;
  content: string;
  riskLevel: "high" | "warning" | "safe";
  analysis: string;
  relatedLaw: string;
}

export interface MissingClause {
  title: string;
  importance: "high" | "medium";
  description: string;
}

export interface ContractAnalysisResult {
  clauses: AnalyzedClause[];
  missingClauses: MissingClause[];
  safetyScore: number;
  clauseInteractions?: ClauseInteractionResult;
}

interface ParsedSection {
  title: string;
  content: string;
  rawText: string;
}

// ─── 조항 파싱 ───

/** 계약서 텍스트를 조항 단위로 분리 */
function parseContractSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // 제N조 패턴으로 분리
  const clausePattern = /제\s*(\d+)\s*조\s*[\(（]([^)）]+)[\)）]/g;
  const matches: { index: number; title: string; num: number }[] = [];

  let match;
  while ((match = clausePattern.exec(text)) !== null) {
    matches.push({
      index: match.index,
      title: match[2].trim(),
      num: parseInt(match[1]),
    });
  }

  // 각 조항의 내용 추출
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const rawText = text.slice(start, end).trim();
    // 제목 줄을 제외한 본문
    const content = rawText.replace(/^제\s*\d+\s*조\s*[\(（][^)）]+[\)）]\s*/, "").trim();
    sections.push({
      title: `제${matches[i].num}조 (${matches[i].title})`,
      content,
      rawText,
    });
  }

  // 제N조 패턴이 없는 경우 섹션 헤더로 분리 시도
  if (sections.length === 0) {
    const headerPattern = /\[([^\]]+)\]|【([^】]+)】/g;
    const headers: { index: number; title: string }[] = [];

    while ((match = headerPattern.exec(text)) !== null) {
      headers.push({ index: match.index, title: (match[1] || match[2]).trim() });
    }

    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].index;
      const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
      const rawText = text.slice(start, end).trim();
      const content = rawText.replace(/^\[[^\]]+\]\s*|^【[^】]+】\s*/, "").trim();
      if (content.length > 10) {
        sections.push({ title: headers[i].title, content, rawText });
      }
    }
  }

  return sections;
}

// ─── 리스크 규칙 DB ───

interface ClauseRule {
  id: string;
  detectPatterns: RegExp[];
  title: string;
  analyzeRisk: (content: string) => { riskLevel: AnalyzedClause["riskLevel"]; analysis: string };
  relatedLaw: string;
}

const CLAUSE_RULES: ClauseRule[] = [
  // 보증금 관련
  {
    id: "deposit",
    detectPatterns: [/보증금/, /보증금\s*지급/, /계약금/, /중도금/, /잔금/],
    title: "보증금 지급",
    analyzeRisk: (content) => {
      if (/보증금\s*반환/.test(content) && /기일|기한|이내/.test(content)) {
        return { riskLevel: "safe", analysis: "보증금 반환 기한이 명시되어 있어 분쟁 예방에 적절합니다" };
      }
      if (/계약금.*중도금.*잔금/.test(content) || /지급.*방법/.test(content)) {
        return { riskLevel: "safe", analysis: "보증금 분할 지급 조건이 구체적으로 명시되어 있습니다" };
      }
      if (/보증금/.test(content) && !/반환/.test(content)) {
        return { riskLevel: "warning", analysis: "보증금 반환 조건이 명시되어 있지 않아 분쟁 가능성이 있습니다" };
      }
      return { riskLevel: "safe", analysis: "보증금 관련 조항이 기본적으로 적절합니다" };
    },
    relatedLaw: "주택임대차보호법 제3조, 제3조의2",
  },

  // 계약기간
  {
    id: "period",
    detectPatterns: [/계약\s*기간/, /임대차\s*기간/, /임대\s*기간/],
    title: "계약기간",
    analyzeRisk: (content) => {
      const yearMatch = content.match(/(\d+)\s*년/);
      if (yearMatch) {
        const years = parseInt(yearMatch[1]);
        if (years < 2) {
          return { riskLevel: "warning", analysis: `계약기간이 ${years}년으로 주택임대차보호법상 최소 보장기간(2년)보다 짧습니다. 법적으로 2년으로 간주됩니다.` };
        }
        return { riskLevel: "safe", analysis: `계약기간 ${years}년으로 주택임대차보호법 최소 보장기간을 충족합니다` };
      }
      return { riskLevel: "warning", analysis: "계약기간이 불명확합니다. 구체적 기간을 명시해야 합니다" };
    },
    relatedLaw: "주택임대차보호법 제4조 (2년 최소 보장)",
  },

  // 계약 해지
  {
    id: "termination",
    detectPatterns: [/계약.*해지/, /계약.*해제/, /중도.*해지/, /해지.*사유/],
    title: "계약 해지",
    analyzeRisk: (content) => {
      if (/임대인.*일방.*해지|사유\s*없이.*해지/.test(content)) {
        return { riskLevel: "high", analysis: "임대인의 일방적 해지 조항은 임차인에게 매우 불리하며, 주택임대차보호법에 위반될 수 있습니다" };
      }
      if (/위약금|손해\s*배상/.test(content) && !/쌍방|상호|각/.test(content)) {
        return { riskLevel: "warning", analysis: "위약금 조항이 일방적으로 설정되어 있을 수 있으니 확인이 필요합니다" };
      }
      if (/2\s*회\s*이상.*연체|차임.*연체/.test(content)) {
        return { riskLevel: "safe", analysis: "차임 연체에 의한 해지 조건으로, 민법상 표준적인 조항입니다" };
      }
      return { riskLevel: "safe", analysis: "계약 해지 조건이 합리적으로 설정되어 있습니다" };
    },
    relatedLaw: "민법 제543조, 주택임대차보호법 제6조",
  },

  // 특약사항
  {
    id: "special_terms",
    detectPatterns: [/특약\s*사항/, /특약/],
    title: "특약사항",
    analyzeRisk: (content) => {
      const highRiskPatterns = [
        { pattern: /모든\s*수리비.*임차인\s*부담|수리.*일체.*임차인/, msg: "모든 수리비를 임차인에게 전가하는 조항은 민법 제623조(수선의무)에 위반될 수 있습니다" },
        { pattern: /보증금.*포기|보증금.*반환.*청구.*불가/, msg: "보증금 반환 청구권 포기 조항은 무효입니다" },
        { pattern: /손해\s*배상.*무한|책임.*일체.*임차인/, msg: "임차인에게 과도한 책임을 지우는 조항입니다" },
      ];

      for (const { pattern, msg } of highRiskPatterns) {
        if (pattern.test(content)) {
          return { riskLevel: "high", analysis: msg };
        }
      }

      const warningPatterns = [
        { pattern: /반려\s*동물.*금지/, msg: "반려동물 사육 금지 특약이 포함되어 있습니다. 위반 시 계약 해지 사유가 될 수 있으니 확인하세요" },
        { pattern: /현\s*시설\s*상태\s*그대로|현상.*인도/, msg: "현 시설 상태 그대로 인도 조건입니다. 입주 전 하자 점검이 필요합니다" },
        { pattern: /인테리어.*변경.*금지|시설.*변경.*불가/, msg: "시설 변경 금지 조항이 있습니다. 필요한 변경사항이 있다면 사전 협의가 필요합니다" },
      ];

      for (const { pattern, msg } of warningPatterns) {
        if (pattern.test(content)) {
          return { riskLevel: "warning", analysis: msg };
        }
      }

      return { riskLevel: "safe", analysis: "특약사항이 일반적인 범위 내에 있습니다" };
    },
    relatedLaw: "민법 제652조, 주택임대차보호법",
  },

  // 원상회복
  {
    id: "restoration",
    detectPatterns: [/원상\s*회복/, /원상\s*복구/, /반환\s*의무/],
    title: "원상회복",
    analyzeRisk: (content) => {
      if (/모든\s*시설.*교체|전면\s*수리|원상.*완벽/.test(content)) {
        return { riskLevel: "high", analysis: "과도한 원상회복 의무가 부과되어 있습니다. 통상적 사용에 의한 손모는 원상회복 대상이 아닙니다" };
      }
      return { riskLevel: "safe", analysis: "원상회복 조항이 표준적 수준입니다. 통상 사용에 의한 감가는 제외됩니다" };
    },
    relatedLaw: "민법 제654조, 제615조",
  },

  // 임대인 의무
  {
    id: "landlord_duty",
    detectPatterns: [/임대인.*의무/, /사용.*수익.*유지/, /인도.*의무/],
    title: "임대인의 의무",
    analyzeRisk: (content) => {
      if (/사용.*수익.*유지|상태.*유지/.test(content)) {
        return { riskLevel: "safe", analysis: "임대인의 목적물 유지 의무가 적절히 명시되어 있습니다" };
      }
      return { riskLevel: "safe", analysis: "임대인의 의무 조항이 포함되어 있습니다" };
    },
    relatedLaw: "민법 제623조 (임대인의 의무)",
  },

  // 임차인 의무
  {
    id: "tenant_duty",
    detectPatterns: [/임차인.*의무/, /선량한\s*관리자/, /전대.*금지/],
    title: "임차인의 의무",
    analyzeRisk: (content) => {
      if (/선량한\s*관리자/.test(content)) {
        return { riskLevel: "safe", analysis: "선관주의의무가 명시된 표준적 조항입니다" };
      }
      return { riskLevel: "safe", analysis: "임차인의 의무 조항이 표준적 범위 내에 있습니다" };
    },
    relatedLaw: "민법 제629조, 제374조",
  },

  // 차임 증감
  {
    id: "rent_increase",
    detectPatterns: [/차임.*증감/, /차임.*인상/, /임대료.*인상/, /보증금.*증액/],
    title: "차임 증감",
    analyzeRisk: (content) => {
      const percentMatch = content.match(/(\d+)\s*%/);
      if (percentMatch && parseInt(percentMatch[1]) > 5) {
        return { riskLevel: "high", analysis: `차임 증액 상한이 ${percentMatch[1]}%로 주택임대차보호법 제7조의 5% 상한을 초과합니다` };
      }
      return { riskLevel: "safe", analysis: "차임 증감 조항이 법적 상한 범위 내에 있습니다" };
    },
    relatedLaw: "주택임대차보호법 제7조 (5% 상한)",
  },
];

// ─── 누락 조항 체크리스트 ───

interface RequiredClauseCheck {
  id: string;
  title: string;
  importance: "high" | "medium";
  description: string;
  detectPatterns: RegExp[];
}

const REQUIRED_CLAUSES: RequiredClauseCheck[] = [
  {
    id: "jeonse_registration",
    title: "전세권설정 관련 조항",
    importance: "high",
    description: "전세보증금 보호를 위해 전세권 설정 또는 확정일자 관련 조항이 필요합니다. 전세권 설정등기를 통해 보증금을 안전하게 보호할 수 있습니다.",
    detectPatterns: [/전세권\s*설정/, /전세권\s*등기/, /확정\s*일자/],
  },
  {
    id: "deposit_protection",
    title: "보증금보호 관련 조항",
    importance: "high",
    description: "전세보증금반환보증(HUG, SGI 등) 가입 관련 조항 명시가 필요합니다. 임대인 부도 시 보증금 회수를 보장합니다.",
    detectPatterns: [/보증금\s*보호/, /보증\s*보험/, /HUG/, /주택도시보증공사/, /SGI/, /보증금\s*반환\s*보증/],
  },
  {
    id: "renewal_right",
    title: "계약갱신청구권",
    importance: "medium",
    description: "주택임대차보호법 제6조의3에 따른 계약갱신청구권(1회, 2+2년) 관련 조항을 명시하면 분쟁을 예방할 수 있습니다.",
    detectPatterns: [/계약\s*갱신/, /갱신\s*청구/, /갱신\s*요구/, /갱신\s*거절/],
  },
  {
    id: "implicit_renewal",
    title: "묵시적 갱신 조건",
    importance: "medium",
    description: "계약 만료 시 묵시적 갱신(자동 연장) 조건을 명시하면 임차인 보호와 분쟁 예방에 도움됩니다.",
    detectPatterns: [/묵시적\s*갱신/, /자동\s*갱신/, /자동\s*연장/],
  },
  {
    id: "repair_responsibility",
    title: "수리비 부담 기준",
    importance: "medium",
    description: "대수선(구조적 보수)은 임대인, 소수선(일상 유지보수)은 임차인 부담 원칙을 명시하면 분쟁을 예방합니다.",
    detectPatterns: [/수리비\s*부담/, /수선\s*의무/, /하자\s*보수\s*책임/, /대수선/, /소수선/],
  },
  {
    id: "brokerage_fee",
    title: "중개보수 부담",
    importance: "medium",
    description: "부동산 중개보수의 부담 주체(통상 쌍방 각 부담)를 명시하면 분쟁을 예방합니다.",
    detectPatterns: [/중개\s*보수/, /중개\s*수수료/, /복비/, /중개.*부담/],
  },
  {
    id: "registry_maintenance",
    title: "등기 상태 유지 특약",
    importance: "high",
    description: "잔금일까지 등기부 상태를 현 상태 그대로 유지하고, 위반 시 계약 해제 및 배액 배상을 명시하는 특약이 필요합니다. 계약 후 잔금 지급 전에 근저당 추가 설정, 가압류 등이 발생하면 보증금을 잃을 수 있습니다.",
    detectPatterns: [/등기.*유지/, /등기.*상태.*유지/, /잔금.*등기/, /등기부.*변동.*금지/, /등기.*현\s*상태/, /권리.*변동.*금지/],
  },
  {
    id: "tax_clearance",
    title: "세금 체납 확인 조항",
    importance: "high",
    description: "임대인(매도인)의 국세·지방세 완납증명원 제출을 요구하는 조항이 필요합니다. 체납 세금(당해세)은 근저당보다 우선 변제되어 보증금 회수에 직접 영향을 줍니다.",
    detectPatterns: [/완납\s*증명/, /세금\s*체납/, /국세.*완납/, /지방세.*완납/, /납세\s*증명/, /체납.*확인/],
  },
];

// ─── F. 조항 상호작용 규칙 (특허 청구항: 교차 위험 분석) ───

const CLAUSE_INTERACTION_RULES: ClauseInteractionRule[] = [
  {
    id: "missing_jeonse_high_deposit",
    clauseIds: ["jeonse_registration", "deposit"],
    interactionType: "compound_warning",
    impactMultiplier: 1.5,
    description: "전세권설정 조항 누락 + 고액보증금(3억원 이상): 보증금 미보호 상태에서 고액 계약은 극히 위험",
  },
  {
    id: "unilateral_termination_penalty",
    clauseIds: ["termination", "special_terms"],
    interactionType: "imbalanced",
    impactMultiplier: 2.0,
    description: "일방적 해지 조항 + 과도한 위약금: 임차인 계약 자유 심각하게 제한",
  },
  {
    id: "no_renewal_short_period",
    clauseIds: ["renewal_right", "period"],
    interactionType: "compound_warning",
    impactMultiplier: 1.3,
    description: "갱신권 미명시 + 단기 계약(2년 이하): 주거 안정성 위협",
  },
  {
    id: "full_restoration_no_repair",
    clauseIds: ["restoration", "repair_responsibility"],
    interactionType: "imbalanced",
    impactMultiplier: 1.4,
    description: "과도한 원상회복 의무 + 수리비 기준 미명시: 퇴거 시 과도한 비용 부담 위험",
  },
  {
    id: "no_registry_no_deposit_protection",
    clauseIds: ["registry_maintenance", "deposit_protection"],
    interactionType: "compound_warning",
    impactMultiplier: 1.6,
    description: "등기 상태 유지 특약 누락 + 보증금보호 미명시: 계약 후 잔금일 전 등기 변동 시 보증금 전액 미보호 상태",
  },
  {
    id: "no_tax_clearance_high_deposit",
    clauseIds: ["tax_clearance", "deposit"],
    interactionType: "compound_warning",
    impactMultiplier: 1.4,
    description: "세금 체납 확인 누락 + 고액보증금: 체납 세금이 보증금보다 우선 변제되어 전액 미회수 위험",
  },
];

/**
 * 조항 간 상호작용 분석 (특허 핵심: 개별 조항이 아닌 조항 조합의 교차 위험 탐지)
 *
 * 개별 조항 분석에서는 발견되지 않는 복합 위험을 식별:
 * - 누락 조항과 위험 조항의 결합 효과
 * - 조항 간 불균형(임대인 유리 편향)
 */
function analyzeClauseInteractions(
  clauses: AnalyzedClause[],
  missingClauses: MissingClause[],
  fullText: string,
): ClauseInteractionResult {
  const interactions: ClauseInteractionResult["interactions"] = [];

  const missingIds = new Set(
    REQUIRED_CLAUSES
      .filter((rc) => missingClauses.some((mc) => mc.title === rc.title))
      .map((rc) => rc.id),
  );

  const clauseRiskMap = new Map<string, AnalyzedClause["riskLevel"]>();
  for (const clause of clauses) {
    for (const rule of CLAUSE_RULES) {
      if (rule.detectPatterns.some((p) => p.test(clause.title) || p.test(clause.content))) {
        clauseRiskMap.set(rule.id, clause.riskLevel);
      }
    }
  }

  for (const rule of CLAUSE_INTERACTION_RULES) {
    let matched = false;
    const matchedClauses: string[] = [];

    if (rule.id === "missing_jeonse_high_deposit") {
      const jeonseNotSet = missingIds.has("jeonse_registration");
      // 보증금 3억원 이상 판정
      const highDeposit = /[3-9]\s*억|[1-9]\d\s*억|\d{3,}\s*백만/.test(fullText)
        || /보증금.*[3-9]억|보증금.*[1-9]\d억/.test(fullText);
      if (jeonseNotSet && highDeposit) {
        matched = true;
        matchedClauses.push("전세권설정 누락", "고액보증금");
      }
    }

    if (rule.id === "unilateral_termination_penalty") {
      const hasUnilateral = clauseRiskMap.get("termination") === "high";
      const hasExcessivePenalty = /위약금.*[2-9]배|위약금.*200%|과도.*위약/.test(fullText);
      if (hasUnilateral && hasExcessivePenalty) {
        matched = true;
        matchedClauses.push("일방적 해지", "과도한 위약금");
      }
    }

    if (rule.id === "no_renewal_short_period") {
      const noRenewal = missingIds.has("renewal_right");
      const shortPeriod = clauseRiskMap.get("period") === "warning";
      if (noRenewal && shortPeriod) {
        matched = true;
        matchedClauses.push("갱신권 미명시", "단기계약");
      }
    }

    if (rule.id === "full_restoration_no_repair") {
      const excessiveRestoration = clauseRiskMap.get("restoration") === "high";
      const noRepairStandard = missingIds.has("repair_responsibility");
      if (excessiveRestoration && noRepairStandard) {
        matched = true;
        matchedClauses.push("과도한 원상회복", "수리비 기준 없음");
      }
    }

    if (rule.id === "no_registry_no_deposit_protection") {
      const noRegistry = missingIds.has("registry_maintenance");
      const noDeposit = missingIds.has("deposit_protection");
      if (noRegistry && noDeposit) {
        matched = true;
        matchedClauses.push("등기 유지 특약 누락", "보증금보호 누락");
      }
    }

    if (rule.id === "no_tax_clearance_high_deposit") {
      const noTax = missingIds.has("tax_clearance");
      const highDeposit = /[3-9]\s*억|[1-9]\d\s*억|\d{3,}\s*백만/.test(fullText)
        || /보증금.*[3-9]억|보증금.*[1-9]\d억/.test(fullText);
      if (noTax && highDeposit) {
        matched = true;
        matchedClauses.push("세금 체납 확인 누락", "고액보증금");
      }
    }

    if (matched) {
      interactions.push({
        ruleId: rule.id,
        matchedClauses,
        impactScore: rule.impactMultiplier,
        description: rule.description,
      });
    }
  }

  const totalInteractionImpact = interactions.reduce(
    (sum, i) => sum + (i.impactScore - 1) * 10,
    0,
  );

  return { interactions, totalInteractionImpact };
}

// ─── 분석 로직 ───

/** 파싱된 조항에 리스크 규칙 적용 */
function analyzeClauseRisk(section: ParsedSection): AnalyzedClause | null {
  const fullText = section.rawText;

  for (const rule of CLAUSE_RULES) {
    const matches = rule.detectPatterns.some((p) => p.test(fullText));
    if (matches) {
      const { riskLevel, analysis } = rule.analyzeRisk(fullText);
      return {
        title: section.title,
        content: section.content.slice(0, 200) + (section.content.length > 200 ? "..." : ""),
        riskLevel,
        analysis,
        relatedLaw: rule.relatedLaw,
      };
    }
  }

  // 매칭되지 않는 조항은 기본 safe
  return {
    title: section.title,
    content: section.content.slice(0, 200) + (section.content.length > 200 ? "..." : ""),
    riskLevel: "safe",
    analysis: "표준적인 계약 조항입니다",
    relatedLaw: "민법 제618조~제654조 (임대차)",
  };
}

/** 누락 조항 검사 */
function checkMissingClauses(fullText: string): MissingClause[] {
  const missing: MissingClause[] = [];

  for (const check of REQUIRED_CLAUSES) {
    const found = check.detectPatterns.some((p) => p.test(fullText));
    if (!found) {
      missing.push({
        title: check.title,
        importance: check.importance,
        description: check.description,
      });
    }
  }

  return missing;
}

/** 안전점수 계산 (조항 상호작용 감점 포함) */
function calculateSafetyScore(
  clauses: AnalyzedClause[],
  missingClauses: MissingClause[],
  interactionImpact: number = 0,
): number {
  let score = 100;

  for (const clause of clauses) {
    if (clause.riskLevel === "high") score -= 15;
    else if (clause.riskLevel === "warning") score -= 5;
  }

  for (const mc of missingClauses) {
    if (mc.importance === "high") score -= 10;
    else score -= 3;
  }

  // 조항 상호작용에 의한 비선형 추가 감점
  score -= interactionImpact;

  return Math.max(0, Math.min(100, score));
}

// ─── 메인 분석 함수 ───

export function analyzeContract(contractText: string): ContractAnalysisResult {
  // 조항 파싱
  const sections = parseContractSections(contractText);

  // 조항별 리스크 분석
  const clauses: AnalyzedClause[] = [];
  for (const section of sections) {
    const analyzed = analyzeClauseRisk(section);
    if (analyzed) {
      clauses.push(analyzed);
    }
  }

  // 전체 텍스트에서 규칙 매칭 (파싱 실패한 내용도 포함)
  if (clauses.length === 0) {
    // 조항이 하나도 파싱되지 않은 경우, 전체 텍스트를 하나의 조항으로 분석
    for (const rule of CLAUSE_RULES) {
      const matches = rule.detectPatterns.some((p) => p.test(contractText));
      if (matches) {
        const { riskLevel, analysis } = rule.analyzeRisk(contractText);
        clauses.push({
          title: rule.title,
          content: contractText.slice(0, 200) + (contractText.length > 200 ? "..." : ""),
          riskLevel,
          analysis,
          relatedLaw: rule.relatedLaw,
        });
      }
    }
  }

  // 누락 조항 검사
  const missingClauses = checkMissingClauses(contractText);

  // 조항 상호작용 분석 (특허: 교차 위험 탐지)
  const clauseInteractions = analyzeClauseInteractions(clauses, missingClauses, contractText);

  // 안전점수 계산 (상호작용 감점 포함)
  const safetyScore = calculateSafetyScore(clauses, missingClauses, clauseInteractions.totalInteractionImpact);

  return { clauses, missingClauses, safetyScore, clauseInteractions };
}

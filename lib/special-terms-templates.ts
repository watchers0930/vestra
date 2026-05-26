/**
 * VESTRA 맞춤 특약 템플릿 DB
 * ──────────────────────────────
 * 계약서 분석 결과 기반 특약 추천을 위한 템플릿 라이브러리.
 * 각 템플릿은 발동 조건(triggers)과 실제 계약서에 넣을 문구(template)를 포함.
 */

// ─── 타입 ───

export interface SpecialTermTemplate {
  id: string;
  title: string;
  category: "보증금" | "임차인" | "임대인" | "등기" | "기타";
  priority: "critical" | "high" | "medium";
  template: string;
  triggers: {
    missingClauses?: string[];
    riskClauses?: string[];
    minSafetyScore?: number;
  };
  rationale: string;
}

// ─── 템플릿 DB ───

export const SPECIAL_TERM_TEMPLATES: SpecialTermTemplate[] = [
  // ── critical: 보증금 ──
  {
    id: "st-jeonse-registration",
    title: "전세권설정 등기 특약",
    category: "보증금",
    priority: "critical",
    template:
      "임대인은 본 계약 체결 후 임차인의 전세권설정등기 청구에 적극 협조하여야 하며, 이에 필요한 서류를 지체 없이 제공하여야 한다. 전세권설정등기에 소요되는 비용은 임차인이 부담한다.",
    triggers: { missingClauses: ["전세권설정 관련 조항"] },
    rationale:
      "전세권설정등기는 보증금을 물권으로 보호하는 가장 확실한 방법입니다. 확정일자만으로는 선순위 채권에 밀릴 수 있습니다.",
  },
  {
    id: "st-deposit-insurance",
    title: "전세보증금반환보증 가입 특약",
    category: "보증금",
    priority: "critical",
    template:
      "임대인은 임차인이 전세보증금반환보증(HUG 또는 SGI서울보증)에 가입할 수 있도록 필요한 서류(등기부등본, 건축물대장, 납세증명 등)를 제공하고 적극 협조하여야 한다. 보증보험 가입이 불가능한 사유가 발생한 경우 임차인은 계약을 해제할 수 있으며, 이 경우 임대인은 수령한 계약금 전액을 즉시 반환한다.",
    triggers: { missingClauses: ["보증금보호 관련 조항"] },
    rationale:
      "전세보증금반환보증은 임대인의 보증금 미반환 시 보증기관이 대위변제하는 제도입니다. 가입 협조 의무를 명시해야 합니다.",
  },
  {
    id: "st-deposit-return-deadline",
    title: "보증금 반환 기한 명시 특약",
    category: "보증금",
    priority: "critical",
    template:
      "임대인은 임대차 계약 종료일로부터 1개월 이내에 보증금 전액을 임차인에게 반환하여야 한다. 반환이 지체될 경우 연 12%의 지연이자를 가산하여 지급한다.",
    triggers: { riskClauses: ["보증금 지급"] },
    rationale:
      "보증금 반환 기한과 지연이자를 명시하지 않으면 반환 분쟁 시 임차인이 불리합니다.",
  },

  // ── critical: 등기 ──
  {
    id: "st-registry-maintenance",
    title: "등기부 현상유지 특약",
    category: "등기",
    priority: "critical",
    template:
      "임대인은 본 계약 체결일로부터 잔금 지급일까지 해당 부동산의 등기부상 권리관계를 현 상태 그대로 유지하여야 하며, 근저당권 설정, 가압류, 가처분 등 일체의 권리변동을 발생시키지 아니한다. 이를 위반한 경우 임차인은 계약을 해제할 수 있으며, 임대인은 계약금의 배액을 배상한다.",
    triggers: { missingClauses: ["등기 상태 유지 특약"] },
    rationale:
      "계약 후 잔금일 전까지 등기부에 근저당이 추가되면 보증금이 위험해집니다. 반드시 현상유지 특약을 넣어야 합니다.",
  },
  {
    id: "st-tax-clearance",
    title: "국세·지방세 완납증명 제출 특약",
    category: "등기",
    priority: "critical",
    template:
      "임대인은 잔금 지급일 전까지 국세완납증명서 및 지방세 납세증명서를 임차인에게 제출하여야 한다. 체납 사실이 확인된 경우 임차인은 체납액 상당의 보증금을 공제하거나 계약을 해제할 수 있다.",
    triggers: { missingClauses: ["세금 체납 확인 조항"] },
    rationale:
      "체납 국세·지방세(당해세)는 근저당보다 우선변제됩니다. 체납 확인 없이 입주하면 경매 시 보증금을 잃을 수 있습니다.",
  },

  // ── high: 임차인 보호 ──
  {
    id: "st-termination-restriction",
    title: "일방 해지 제한 특약",
    category: "임차인",
    priority: "high",
    template:
      "임대인은 주택임대차보호법 제6조에서 정한 사유 외에는 임대차 계약을 일방적으로 해지할 수 없다. 부득이한 사유로 계약 해지 시 임대인은 최소 3개월 전에 서면으로 통보하여야 하며, 위약금은 보증금의 10%를 상한으로 한다.",
    triggers: { riskClauses: ["계약 해지"] },
    rationale:
      "일방 해지 조항은 임차인의 주거 안정을 위협합니다. 해지 사유를 법정 사유로 제한하고 위약금 상한을 설정해야 합니다.",
  },
  {
    id: "st-penalty-cap",
    title: "위약금 상한 특약",
    category: "임차인",
    priority: "high",
    template:
      "쌍방의 귀책사유로 인한 계약 해제·해지 시 위약금은 보증금의 10%를 상한으로 하며, 이를 초과하는 위약금 약정은 효력이 없다.",
    triggers: { riskClauses: ["계약 해지"] },
    rationale:
      "과도한 위약금 조항은 임차인에게 부당한 부담을 줄 수 있습니다. 상한을 명확히 정해야 합니다.",
  },
  {
    id: "st-restoration-scope",
    title: "원상회복 범위 한정 특약",
    category: "임차인",
    priority: "high",
    template:
      "임차인의 원상회복 의무는 임차인의 고의 또는 과실로 인한 훼손에 한하며, 통상적인 사용에 따른 마모·변색·노후화(자연감가)는 원상회복 대상에서 제외한다. 원상회복 비용에 대해 이견이 있는 경우 전문가의 감정을 받되, 비용은 쌍방이 균분하여 부담한다.",
    triggers: { riskClauses: ["원상회복"] },
    rationale:
      "과도한 원상회복 의무는 민법 제654조의 취지에 반합니다. 자연감가 제외를 명시해야 합니다.",
  },
  {
    id: "st-renewal-right",
    title: "계약갱신청구권 명시 특약",
    category: "임차인",
    priority: "high",
    template:
      "임차인은 주택임대차보호법 제6조의3에 따라 1회에 한하여 계약갱신을 청구할 수 있으며, 임대인은 같은 법 제6조의3 제1항 각호의 사유가 없는 한 이를 거절할 수 없다. 갱신 시 차임은 기존 차임의 5%를 초과하여 증액할 수 없다.",
    triggers: { missingClauses: ["계약갱신청구권"] },
    rationale:
      "계약갱신청구권은 법정 권리이지만, 계약서에 명시하면 분쟁 예방 효과가 큽니다.",
  },

  // ── high: 임대인 의무 ──
  {
    id: "st-major-repair",
    title: "대수선·소수선 부담 기준 특약",
    category: "임대인",
    priority: "high",
    template:
      "대수선(지붕, 기둥, 보, 외벽 등 구조적 보수 및 보일러, 급배수관 등 주요 설비 교체)은 임대인이, 소수선(전구 교체, 수전 패킹, 도배·장판 등 일상 유지보수)은 임차인이 부담한다. 수리비 50만원 이상의 경우 임대인과 사전 협의 후 진행한다.",
    triggers: { missingClauses: ["수리비 부담 기준"] },
    rationale:
      "수리비 부담 기준이 없으면 민법 제623조 해석을 두고 분쟁이 발생합니다. 구체적 기준을 명시해야 합니다.",
  },
  {
    id: "st-rent-increase-cap",
    title: "차임 증액 상한 제한 특약",
    category: "임대인",
    priority: "high",
    template:
      "계약 갱신 또는 기간 중 차임 증액 시, 증액 비율은 직전 차임의 5%를 초과할 수 없다(주택임대차보호법 제7조). 5%를 초과하는 증액 약정은 초과 부분에 한하여 효력이 없다.",
    triggers: { riskClauses: ["차임 증감"] },
    rationale:
      "차임 5% 상한은 강행규정입니다. 이를 초과하는 증액 조항은 임차인에게 불리합니다.",
  },

  // ── medium: 기타 ──
  {
    id: "st-brokerage-fee",
    title: "중개보수 부담 명시 특약",
    category: "기타",
    priority: "medium",
    template:
      "본 계약에 관한 부동산 중개보수는 법정 요율에 따라 산정하며, 임대인과 임차인이 각 50%씩 부담한다.",
    triggers: { missingClauses: ["중개보수 부담"] },
    rationale:
      "중개보수 부담 주체를 명시하지 않으면 일방에게 전가되는 분쟁이 발생할 수 있습니다.",
  },
  {
    id: "st-implicit-renewal",
    title: "묵시적 갱신 조건 특약",
    category: "기타",
    priority: "medium",
    template:
      "계약 만료 6개월 전부터 2개월 전까지 임대인 또는 임차인이 갱신 거절 또는 조건 변경의 의사를 서면으로 통지하지 않은 경우, 전 임대차와 동일한 조건으로 다시 임대차한 것으로 본다(묵시적 갱신). 이 경우 임차인은 언제든지 계약 해지를 통고할 수 있으며, 통고 후 3개월이 경과하면 효력이 발생한다.",
    triggers: { missingClauses: ["묵시적 갱신 조건"] },
    rationale:
      "묵시적 갱신 시 임차인의 해지 통고권을 명시하면 주거 이동의 유연성이 확보됩니다.",
  },
  {
    id: "st-move-in-inspection",
    title: "입주 전 하자 점검 특약",
    category: "기타",
    priority: "medium",
    template:
      "임차인은 잔금 지급일 또는 입주일에 임대인 입회하에 목적물의 상태를 점검하며, 발견된 하자는 입주 전 점검 확인서에 기재한다. 점검 확인서에 기재되지 않은 기존 하자에 대해서는 임차인에게 원상회복 의무가 없다.",
    triggers: { riskClauses: ["원상회복"] },
    rationale:
      "입주 전 하자를 기록하지 않으면 퇴거 시 기존 하자에 대한 원상회복 분쟁이 발생합니다.",
  },
  {
    id: "st-pet-agreement",
    title: "반려동물 사육 협의 특약",
    category: "기타",
    priority: "medium",
    template:
      "임차인은 반려동물(종류: ___, 마리수: ___)을 사육할 수 있다. 다만, 반려동물로 인한 소음·악취·시설 훼손이 발생한 경우 임차인이 즉시 시정하고 수리비를 부담한다.",
    triggers: { riskClauses: ["특약사항"] },
    rationale:
      "반려동물 사육 금지 조항이 있을 경우, 사전에 협의하여 허용 범위를 명시하는 것이 분쟁 예방에 도움됩니다.",
  },
  {
    id: "st-sublease-prohibition",
    title: "전대 및 양도 제한 확인 특약",
    category: "임차인",
    priority: "medium",
    template:
      "임차인은 임대인의 서면 동의 없이 목적물을 전대하거나 임차권을 양도할 수 없다. 다만, 임대인이 정당한 사유 없이 전대 동의를 거절하는 경우 임차인은 이를 사유로 계약을 해지할 수 있다.",
    triggers: { riskClauses: ["특약사항"] },
    rationale:
      "전대·양도 제한은 표준 조항이나, 임대인의 부당한 거절에 대한 임차인 보호도 명시해야 합니다.",
  },

  // ── critical: 보증금 (안전점수 기반) ──
  {
    id: "st-low-score-comprehensive",
    title: "종합 보증금 보호 패키지 특약",
    category: "보증금",
    priority: "critical",
    template:
      "1. 임대인은 전세권설정등기에 협조한다.\n2. 임차인의 전세보증금반환보증 가입에 필요한 서류를 제공한다.\n3. 잔금일까지 등기부상 권리변동을 발생시키지 않는다.\n4. 잔금일 전 국세·지방세 완납증명서를 제출한다.\n위 사항을 위반한 경우 임차인은 계약을 해제할 수 있으며, 임대인은 계약금의 배액을 배상한다.",
    triggers: { minSafetyScore: 50 },
    rationale:
      "안전점수가 50점 미만인 계약서는 다수의 보호 장치가 누락되어 있어 종합 보호 특약이 필요합니다.",
  },
  {
    id: "st-priority-lien-check",
    title: "선순위 권리 확인 특약",
    category: "등기",
    priority: "high",
    template:
      "임대인은 잔금 지급일 전까지 해당 부동산에 대한 최신 등기부등본을 임차인에게 제공하여야 하며, 선순위 근저당권 등 권리 설정 현황을 고지하여야 한다. 선순위 권리의 총액이 시세의 60%를 초과하는 경우 임차인은 계약을 해제할 수 있다.",
    triggers: { minSafetyScore: 60 },
    rationale:
      "선순위 근저당이 과다하면 경매 시 보증금 회수가 불가능할 수 있습니다.",
  },
  {
    id: "st-fire-insurance",
    title: "화재보험 가입 확인 특약",
    category: "기타",
    priority: "medium",
    template:
      "임대인은 해당 부동산에 대해 화재보험에 가입하고 있음을 확인하며, 보험 만료 시 갱신하여야 한다. 임차인의 동산(가재도구) 보호를 위한 세입자 화재보험 가입은 임차인의 선택에 따른다.",
    triggers: { minSafetyScore: 70 },
    rationale:
      "화재 시 건물 손해에 대한 보험 가입 여부를 확인하면 임차인의 안전을 추가로 확보할 수 있습니다.",
  },
  {
    id: "st-maintenance-entry",
    title: "시설 점검 사전통보 특약",
    category: "임차인",
    priority: "medium",
    template:
      "임대인 또는 관리사무소가 시설 점검·수리를 위해 목적물에 출입할 필요가 있는 경우, 긴급한 경우를 제외하고 최소 24시간 전에 임차인에게 서면 또는 문자로 통보하여야 한다.",
    triggers: { riskClauses: ["특약사항"] },
    rationale:
      "임차인의 주거 평온권을 보호하기 위해 사전 통보 의무를 명시해야 합니다.",
  },
];

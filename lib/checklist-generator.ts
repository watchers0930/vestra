/**
 * VESTRA 동적 체크리스트 생성기
 * ──────────────────────────────
 * RiskScore의 factors 배열을 분석하여
 * 해당 위험 요소에 맞는 필요 서류/행동 항목을 자동 생성한다.
 */

import type { RiskScore, RiskFactor } from "./risk-scoring";

// ─── 타입 정의 ───

export interface ChecklistItem {
  name: string;
  description: string;
  where: string; // 발급처
  cost?: string;
  online?: boolean;
  onlineUrl?: string;
  priority: "required" | "recommended" | "optional";
  triggeredBy: string; // 트리거한 RiskFactor.id 또는 "default"
  category: string; // 그룹 분류
}

// ─── 카테고리별 서류 매핑 ───

interface DocumentTemplate {
  name: string;
  description: string;
  where: string;
  cost?: string;
  online?: boolean;
  onlineUrl?: string;
  category: string;
}

const CATEGORY_DOCUMENTS: Record<string, DocumentTemplate[]> = {
  근저당: [
    {
      name: "근저당권 설정 확인서",
      description: "채권최고액, 채무자, 근저당권자 정보 확인",
      where: "등기소 / 인터넷등기소",
      cost: "1,000원",
      online: true,
      onlineUrl: "https://www.iros.go.kr",
      category: "권리 확인",
    },
    {
      name: "금융기관 대출 잔액 확인서",
      description: "실제 잔여 대출 금액 확인 (채권최고액과 차이 확인)",
      where: "해당 금융기관",
      category: "권리 확인",
    },
    {
      name: "채권최고액 대비 시세 비교표",
      description: "근저당 비율이 시세 대비 적정한지 확인",
      where: "직접 작성",
      category: "권리 확인",
    },
  ],
  담보: [
    {
      name: "근저당권 설정 확인서",
      description: "채권최고액, 채무자, 근저당권자 정보 확인",
      where: "등기소 / 인터넷등기소",
      cost: "1,000원",
      online: true,
      onlineUrl: "https://www.iros.go.kr",
      category: "권리 확인",
    },
  ],
  압류: [
    {
      name: "법원 사건 조회",
      description: "압류 관련 소송 진행 현황 확인",
      where: "대법원 나의 사건검색",
      online: true,
      onlineUrl: "https://www.scourt.go.kr",
      category: "법적 확인",
    },
    {
      name: "압류 해제 확인서",
      description: "압류가 해제되었는지 최신 등기부 확인",
      where: "인터넷등기소",
      cost: "1,000원",
      online: true,
      onlineUrl: "https://www.iros.go.kr",
      category: "법적 확인",
    },
    {
      name: "채권자 정보 확인",
      description: "압류 채권자(국세청, 지자체, 개인 등) 파악",
      where: "등기부등본 상세 확인",
      category: "법적 확인",
    },
  ],
  가압류: [
    {
      name: "가압류 관련 법원 사건 조회",
      description: "가압류 신청 사건번호 및 진행 상태 확인",
      where: "대법원 나의 사건검색",
      online: true,
      onlineUrl: "https://www.scourt.go.kr",
      category: "법적 확인",
    },
    {
      name: "가압류 해제/취소 여부 확인",
      description: "최신 등기부에서 가압류 말소 여부 확인",
      where: "인터넷등기소",
      cost: "1,000원",
      online: true,
      onlineUrl: "https://www.iros.go.kr",
      category: "법적 확인",
    },
  ],
  경매: [
    {
      name: "경매 사건 열람",
      description: "경매 개시결정 및 진행 단계 확인",
      where: "대한법률구조공단 / 법원경매정보",
      online: true,
      onlineUrl: "https://www.courtauction.go.kr",
      category: "법적 확인",
    },
    {
      name: "배당순위 확인",
      description: "선순위 채권 현황 및 보증금 배당 가능성 분석",
      where: "법원 / 법무사",
      category: "법적 확인",
    },
    {
      name: "감정평가서 확인",
      description: "경매 감정가와 시세 비교",
      where: "법원경매정보",
      online: true,
      onlineUrl: "https://www.courtauction.go.kr",
      category: "시세 확인",
    },
  ],
  신탁: [
    {
      name: "신탁원부 열람",
      description: "수탁자, 신탁 목적, 신탁 기간 등 확인",
      where: "인터넷등기소",
      cost: "1,000원",
      online: true,
      onlineUrl: "https://www.iros.go.kr",
      category: "권리 확인",
    },
    {
      name: "수탁자 동의서 확인",
      description: "매매/임대 시 수탁자 동의 필요 여부 확인",
      where: "신탁회사",
      category: "권리 확인",
    },
  ],
  임차권: [
    {
      name: "전입세대 열람내역",
      description: "현재 거주 중인 임차인 현황 파악",
      where: "주민센터",
      cost: "무료",
      online: false,
      category: "임차 확인",
    },
    {
      name: "임차권등기명령 확인",
      description: "이전 임차인의 임차권등기 존재 여부 확인",
      where: "인터넷등기소",
      cost: "1,000원",
      online: true,
      onlineUrl: "https://www.iros.go.kr",
      category: "임차 확인",
    },
    {
      name: "보증금 반환 이력 조회",
      description: "임대인의 보증금 체납/분쟁 이력 확인",
      where: "전세보증금반환보증 보험사",
      category: "임차 확인",
    },
  ],
  가처분: [
    {
      name: "등기사항 전부증명서 (최신본)",
      description: "가처분 등기 현재 상태 확인",
      where: "인터넷등기소",
      cost: "1,000원",
      online: true,
      onlineUrl: "https://www.iros.go.kr",
      category: "법적 확인",
    },
    {
      name: "소송 진행 여부 확인",
      description: "가처분 관련 본안 소송 진행 상태 확인",
      where: "대법원 나의 사건검색",
      online: true,
      onlineUrl: "https://www.scourt.go.kr",
      category: "법적 확인",
    },
  ],
  가등기: [
    {
      name: "가등기 원인 확인",
      description: "매매예약, 대물변제예약 등 가등기 원인 파악",
      where: "등기부등본 상세 확인",
      category: "권리 확인",
    },
    {
      name: "가등기 말소 요청서",
      description: "거래 전 가등기 말소 처리 확인",
      where: "법무사 / 등기소",
      category: "권리 확인",
    },
  ],
  예고등기: [
    {
      name: "예고등기 사건 확인",
      description: "소유권 분쟁 등 예고등기 사유 파악",
      where: "등기부등본 상세 확인",
      category: "법적 확인",
    },
  ],
  소유권: [
    {
      name: "소유자 신분 확인",
      description: "등기부 소유자와 계약 상대방 일치 여부 확인",
      where: "신분증 대조",
      category: "권리 확인",
    },
    {
      name: "소유권 이전 이력 확인",
      description: "단기간 빈번한 소유권 이전 여부 확인",
      where: "등기부등본",
      category: "권리 확인",
    },
  ],
  용도: [
    {
      name: "건축물대장 확인",
      description: "건물 용도, 위반건축물 여부 확인",
      where: "정부24",
      online: true,
      onlineUrl: "https://www.gov.kr",
      category: "물건 확인",
    },
    {
      name: "실제 용도 현장 확인",
      description: "등기/대장상 용도와 실제 사용 용도 일치 확인",
      where: "현장 방문",
      category: "물건 확인",
    },
  ],
  위반건축물: [
    {
      name: "건축물대장 위반건축물 표시 확인",
      description: "위반건축물 이행강제금 부과 대상 여부",
      where: "정부24",
      online: true,
      onlineUrl: "https://www.gov.kr",
      category: "물건 확인",
    },
  ],
};

// 기본 서류 (모든 분석에 포함)
const DEFAULT_DOCUMENTS: DocumentTemplate[] = [
  {
    name: "등기부등본 (등기사항전부증명서)",
    description: "갑구·을구 전체 확인. 거래 직전 최신본 발급 필수",
    where: "인터넷등기소",
    cost: "1,000원",
    online: true,
    onlineUrl: "https://www.iros.go.kr",
    category: "기본 서류",
  },
  {
    name: "건축물대장",
    description: "건물 면적, 용도, 위반건축물 여부 확인",
    where: "정부24",
    cost: "무료",
    online: true,
    onlineUrl: "https://www.gov.kr",
    category: "기본 서류",
  },
  {
    name: "전입세대 열람내역",
    description: "현재 전입 세대 및 확정일자 현황",
    where: "주민센터",
    cost: "무료",
    category: "기본 서류",
  },
  {
    name: "토지이용계획확인서",
    description: "용도지역/지구, 도시계획 사항 확인",
    where: "토지이음",
    cost: "무료",
    online: true,
    onlineUrl: "https://www.eum.go.kr",
    category: "기본 서류",
  },
];

// ─── 헬퍼 함수 ───

/** severity → priority 매핑 */
function severityToPriority(
  severity: RiskFactor["severity"]
): ChecklistItem["priority"] {
  switch (severity) {
    case "critical":
    case "high":
      return "required";
    case "medium":
      return "recommended";
    case "low":
      return "optional";
  }
}

/** 카테고리 키워드 매칭 */
function matchCategory(factor: RiskFactor): string[] {
  const text = `${factor.category} ${factor.description} ${factor.detail}`.toLowerCase();
  const matched: string[] = [];

  const keywords: Record<string, string[]> = {
    근저당: ["근저당", "저당", "mortgage"],
    담보: ["담보", "채권최고액"],
    압류: ["압류"],
    가압류: ["가압류"],
    경매: ["경매", "임의경매", "강제경매"],
    신탁: ["신탁"],
    임차권: ["임차권", "전세권", "임차", "전세"],
    가처분: ["가처분"],
    가등기: ["가등기"],
    예고등기: ["예고등기"],
    소유권: ["소유권", "소유자"],
    용도: ["용도", "위반건축"],
    위반건축물: ["위반건축"],
  };

  for (const [cat, kws] of Object.entries(keywords)) {
    if (kws.some((kw) => text.includes(kw))) {
      matched.push(cat);
    }
  }

  return matched;
}

// ─── 메인 함수 ───

/**
 * RiskScore 기반 동적 체크리스트 생성
 *
 * @param riskScore - risk-scoring.ts에서 반환된 위험도 결과
 * @returns 우선순위순 체크리스트 항목 배열
 */
export function generateChecklist(riskScore: RiskScore): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const addedNames = new Set<string>();

  // 1. 기본 서류 항목 추가
  for (const doc of DEFAULT_DOCUMENTS) {
    if (!addedNames.has(doc.name)) {
      addedNames.add(doc.name);
      items.push({
        ...doc,
        priority: "required",
        triggeredBy: "default",
      });
    }
  }

  // 2. 위험 요소별 맞춤 서류 추가
  for (const factor of riskScore.factors) {
    const categories = matchCategory(factor);
    const priority = severityToPriority(factor.severity);

    for (const cat of categories) {
      const docs = CATEGORY_DOCUMENTS[cat];
      if (!docs) continue;

      for (const doc of docs) {
        if (!addedNames.has(doc.name)) {
          addedNames.add(doc.name);
          items.push({
            ...doc,
            priority,
            triggeredBy: factor.id,
          });
        }
      }
    }
  }

  // 3. 근저당 비율 높으면 추가 항목
  if (riskScore.mortgageRatio > 70) {
    const extraDocs = [
      {
        name: "전세보증금반환보증 가입 확인",
        description: "HUG/SGI 보증보험 가입 가능 여부 확인",
        where: "주택도시보증공사(HUG)",
        online: true,
        onlineUrl: "https://www.khug.or.kr",
        category: "보증금 보호",
      },
      {
        name: "임대인 국세/지방세 체납 확인",
        description: "체납 세금이 보증금보다 선순위일 수 있으므로 확인 필수",
        where: "세무서/구청 (임대인 동의 필요)",
        category: "보증금 보호",
      },
    ];

    for (const doc of extraDocs) {
      if (!addedNames.has(doc.name)) {
        addedNames.add(doc.name);
        items.push({
          ...doc,
          priority: "required",
          triggeredBy: "mortgage_ratio_high",
        });
      }
    }
  }

  // 4. 등급별 추가 권고
  if (riskScore.grade === "D" || riskScore.grade === "F") {
    const warningDoc = {
      name: "법무사/변호사 자문 의뢰",
      description: `위험등급 ${riskScore.grade} — 전문가 법률 자문을 강력히 권고합니다`,
      where: "대한법무사협회 / 대한변호사협회",
      online: true,
      onlineUrl: "https://www.klaa.or.kr",
      category: "전문가 자문",
    };
    if (!addedNames.has(warningDoc.name)) {
      addedNames.add(warningDoc.name);
      items.push({
        ...warningDoc,
        priority: "required",
        triggeredBy: "grade_warning",
      });
    }
  }

  // 5. 우선순위 정렬: required → recommended → optional
  const priorityOrder = { required: 0, recommended: 1, optional: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
}

/**
 * 체크리스트를 카테고리별로 그룹화
 */
export function groupChecklistByCategory(
  items: ChecklistItem[]
): Record<string, ChecklistItem[]> {
  const groups: Record<string, ChecklistItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
  }
  return groups;
}

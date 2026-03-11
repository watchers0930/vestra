/**
 * 도메인 용어 사전 유틸리티
 * KR-BERT 토크나이저 학습용 부동산 법률 특화 어휘 관리
 */

import type { ParsedRegistry } from "@/lib/registry-parser";

// ─── 카테고리 정의 ───

export type VocabCategory =
  | "registry_right"
  | "legal_action"
  | "structure"
  | "finance_tax";

export const VOCAB_CATEGORIES: Record<
  VocabCategory,
  { label: string; target: number }
> = {
  registry_right: { label: "등기 권리 용어", target: 200 },
  legal_action: { label: "법률 행위 용어", target: 150 },
  structure: { label: "부동산 구조 용어", target: 100 },
  finance_tax: { label: "금융/세무 용어", target: 100 },
};

// ─── 시드 데이터 (기존 파서 상수 기반) ───

export interface SeedTerm {
  term: string;
  category: VocabCategory;
  definition?: string;
}

export const SEED_VOCABULARY: SeedTerm[] = [
  // 갑구 등기 권리 용어
  { term: "소유권이전", category: "legal_action", definition: "부동산 소유권을 양도인에서 양수인으로 이전하는 등기" },
  { term: "소유권보존", category: "legal_action", definition: "미등기 부동산에 최초로 소유권을 등기" },
  { term: "가압류", category: "registry_right", definition: "채권자가 채무자의 재산처분을 금지하는 보전처분" },
  { term: "압류", category: "registry_right", definition: "국가 또는 채권자가 채무자의 재산을 강제적으로 확보" },
  { term: "가처분", category: "registry_right", definition: "권리관계 변동을 방지하기 위한 보전처분" },
  { term: "경매개시결정", category: "legal_action", definition: "법원이 부동산 경매 절차를 개시하는 결정" },
  { term: "임의경매개시결정", category: "legal_action", definition: "담보권 실행을 위한 임의경매 개시" },
  { term: "강제경매개시결정", category: "legal_action", definition: "판결 등 집행권원에 기한 강제경매 개시" },
  { term: "신탁", category: "registry_right", definition: "부동산을 수탁자에게 이전하는 신탁등기" },
  { term: "신탁등기", category: "registry_right", definition: "신탁법에 따른 부동산 신탁의 등기" },
  { term: "가등기", category: "registry_right", definition: "본등기 순위를 보전하기 위한 예비적 등기" },
  { term: "소유권이전청구권가등기", category: "registry_right", definition: "소유권이전을 청구할 수 있는 권리의 가등기" },
  { term: "환매등기", category: "registry_right", definition: "매도인이 일정 기간 내 재매수할 수 있는 권리 등기" },
  { term: "예고등기", category: "registry_right", definition: "등기의 말소·회복 소송이 제기되었음을 공시하는 등기" },

  // 을구 등기 권리 용어
  { term: "근저당권설정", category: "registry_right", definition: "채권 최고액 범위 내 담보권 설정" },
  { term: "저당권설정", category: "registry_right", definition: "특정 채권에 대한 담보권 설정" },
  { term: "전세권설정", category: "registry_right", definition: "전세금을 지급하고 부동산을 사용·수익하는 권리 설정" },
  { term: "지상권설정", category: "registry_right", definition: "타인 토지에 건물 등을 소유하기 위한 권리 설정" },
  { term: "지역권설정", category: "registry_right", definition: "타인 토지를 자기 토지의 편익에 이용하는 권리 설정" },
  { term: "임차권등기", category: "registry_right", definition: "임차인의 대항력 보전을 위한 임차권 등기" },
  { term: "임차권설정", category: "registry_right", definition: "부동산 임대차 계약에 따른 임차권 설정" },
  { term: "전세권이전", category: "legal_action", definition: "전세권을 제3자에게 양도하는 등기" },
  { term: "근저당권이전", category: "legal_action", definition: "근저당권을 제3자에게 양도하는 등기" },
  { term: "근저당권변경", category: "legal_action", definition: "근저당권의 채권최고액·채무자 등 변경" },

  // 법률 행위 용어
  { term: "말소", category: "legal_action", definition: "등기를 소멸시키는 행위" },
  { term: "말소기준등기", category: "legal_action", definition: "경매시 소멸되는 권리의 기준이 되는 등기" },
  { term: "촉탁", category: "legal_action", definition: "관공서가 등기소에 등기를 신청하는 행위" },
  { term: "등기원인", category: "legal_action", definition: "등기를 하게 된 법률적 원인 (매매, 상속 등)" },
  { term: "매매", category: "legal_action", definition: "부동산 매매계약에 의한 소유권 이전" },
  { term: "상속", category: "legal_action", definition: "피상속인 사망으로 인한 부동산 권리 승계" },
  { term: "증여", category: "legal_action", definition: "무상으로 부동산 소유권을 이전" },
  { term: "법원경매", category: "legal_action", definition: "법원 주도의 부동산 강제 매각 절차" },

  // 부동산 구조 용어
  { term: "대지권비율", category: "structure", definition: "구분건물이 차지하는 토지 지분 비율" },
  { term: "전용면적", category: "structure", definition: "세대 내부에서 독점적으로 사용하는 면적" },
  { term: "공용면적", category: "structure", definition: "복도, 계단실 등 공동으로 사용하는 면적" },
  { term: "건폐율", category: "structure", definition: "대지면적 대비 건축면적의 비율" },
  { term: "용적률", category: "structure", definition: "대지면적 대비 건축물 연면적의 비율" },
  { term: "아파트", category: "structure", definition: "5층 이상 공동주택" },
  { term: "다세대주택", category: "structure", definition: "4층 이하 공동주택 (각 세대가 구분소유)" },
  { term: "다가구주택", category: "structure", definition: "3층 이하 단독주택 (1인 소유)" },
  { term: "오피스텔", category: "structure", definition: "업무 및 주거 겸용 건축물" },
  { term: "근린생활시설", category: "structure", definition: "주민 일상생활에 필요한 시설" },
  { term: "철근콘크리트", category: "structure", definition: "RC조 건축물 구조" },
  { term: "철골", category: "structure", definition: "S조 건축물 구조" },

  // 금융/세무 용어
  { term: "채권최고액", category: "finance_tax", definition: "근저당권이 담보하는 채권의 최고한도액" },
  { term: "취득세", category: "finance_tax", definition: "부동산 취득 시 부과되는 지방세" },
  { term: "양도소득세", category: "finance_tax", definition: "부동산 양도 시 발생하는 소득에 대한 세금" },
  { term: "재산세", category: "finance_tax", definition: "부동산 보유에 대해 부과되는 지방세" },
  { term: "종합부동산세", category: "finance_tax", definition: "고액 부동산 보유자에게 부과되는 국세" },
  { term: "증여세", category: "finance_tax", definition: "무상 이전 시 수증자에게 부과되는 세금" },
  { term: "상속세", category: "finance_tax", definition: "사망으로 인한 재산 이전 시 부과되는 세금" },
  { term: "전세보증금", category: "finance_tax", definition: "전세 계약 시 임차인이 지급하는 보증금" },
  { term: "보증금반환채권", category: "finance_tax", definition: "임대차 종료 시 보증금 반환을 청구할 수 있는 채권" },
  { term: "배당요구", category: "finance_tax", definition: "경매 배당절차에서 채권자가 배당을 요구하는 행위" },
];

// ─── 자동 추출 함수 ───

/** 파싱 결과에서 도메인 용어 후보를 추출한다 */
export function extractVocabularyFromParsed(
  parsed: ParsedRegistry,
  rawText: string,
): SeedTerm[] {
  const terms: SeedTerm[] = [];
  const seen = new Set<string>();

  const add = (term: string, category: VocabCategory) => {
    const t = term.trim();
    if (t.length >= 2 && !seen.has(t)) {
      seen.add(t);
      terms.push({ term: t, category });
    }
  };

  // 갑구/을구 항목의 purpose(권리종류)에서 추출
  for (const entry of parsed.gapgu) {
    if (entry.purpose) add(entry.purpose, "registry_right");
  }
  for (const entry of parsed.eulgu) {
    if (entry.purpose) add(entry.purpose, "registry_right");
  }

  // 금융/세무 용어 패턴 매칭
  const financeTaxPatterns = [
    "채권최고액", "취득세", "양도소득세", "재산세", "종합부동산세",
    "증여세", "상속세", "전세보증금", "보증금반환채권", "배당요구",
    "근저당권부채권양도", "전세금", "임대보증금", "월세", "관리비",
    "부가가치세", "인지세", "교육세", "농어촌특별세",
  ];

  for (const pattern of financeTaxPatterns) {
    if (rawText.includes(pattern)) {
      add(pattern, "finance_tax");
    }
  }

  // 부동산 구조 용어 패턴 매칭
  const structurePatterns = [
    "대지권비율", "전용면적", "공용면적", "건폐율", "용적률",
    "연면적", "대지면적", "건축면적", "층수", "지하층",
    "주차장", "엘리베이터", "필로티",
  ];

  for (const pattern of structurePatterns) {
    if (rawText.includes(pattern)) {
      add(pattern, "structure");
    }
  }

  // 법률 행위 용어 패턴 매칭
  const legalActionPatterns = [
    "말소", "촉탁", "매매", "상속", "증여", "교환", "수용",
    "법원경매", "공매", "분할", "합병", "멸실", "신축",
    "대위변제", "채권양도", "해지", "해제", "취소",
  ];

  for (const pattern of legalActionPatterns) {
    if (rawText.includes(pattern)) {
      add(pattern, "legal_action");
    }
  }

  return terms;
}

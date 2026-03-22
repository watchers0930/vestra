/**
 * SCR 보고서 사업 유형 자동 감지 모듈
 *
 * PDF 텍스트에서 키워드 기반으로 사업 유형을 분류합니다.
 * 복합 사업(아파트+오피스텔 등)의 경우 가중치 기반으로 주된 유형을 판별합니다.
 *
 * @module lib/feasibility/scr-project-type-detector
 */

import type { ProjectType } from "./scr-types";

// ─── 키워드-유형 매핑 ───

interface TypeKeywordRule {
  type: ProjectType;
  /** 매칭 키워드 (하나라도 포함되면 점수 부여) */
  keywords: string[];
  /** 키워드당 기본 가중치 */
  weight: number;
  /** 강한 키워드 (이 키워드가 있으면 추가 가중치) */
  strongKeywords?: string[];
  /** 강한 키워드 추가 가중치 */
  strongWeight?: number;
}

const TYPE_RULES: TypeKeywordRule[] = [
  {
    type: "재건축",
    keywords: ["재건축", "재건축사업", "재건축정비", "재건축조합"],
    weight: 10,
    strongKeywords: ["재건축"],
    strongWeight: 5,
  },
  {
    type: "재개발",
    keywords: ["재개발", "정비사업", "도시정비", "재개발조합", "주거환경개선"],
    weight: 10,
    strongKeywords: ["재개발", "정비사업"],
    strongWeight: 5,
  },
  {
    type: "주상복합",
    keywords: ["주상복합", "주거+상업", "주거복합", "주상"],
    weight: 8,
    strongKeywords: ["주상복합"],
    strongWeight: 5,
  },
  {
    type: "생활형숙박시설",
    keywords: ["생활형숙박", "레지던스", "생숙", "생활숙박", "숙박시설"],
    weight: 8,
    strongKeywords: ["생활형숙박", "생숙"],
    strongWeight: 5,
  },
  {
    type: "지식산업센터",
    keywords: ["지식산업센터", "지산센터", "아파트형공장", "지식산업", "산업단지"],
    weight: 8,
    strongKeywords: ["지식산업센터", "지산센터"],
    strongWeight: 5,
  },
  {
    type: "오피스텔",
    keywords: ["오피스텔", "officetel"],
    weight: 6,
    strongKeywords: ["오피스텔"],
    strongWeight: 3,
  },
  {
    type: "아파트",
    keywords: ["아파트", "APT", "공동주택", "apt", "아파트먼트"],
    weight: 5,
    strongKeywords: ["아파트", "APT"],
    strongWeight: 2,
  },
];

// ─── 감지 결과 타입 ───

/** 사업 유형 감지 결과 */
export interface ProjectTypeDetectionResult {
  /** 감지된 주된 사업 유형 */
  type: ProjectType;
  /** 감지 신뢰도 (0~100) */
  confidence: number;
  /** 각 유형별 점수 상세 */
  scores: {
    type: ProjectType;
    score: number;
    matchedKeywords: string[];
  }[];
  /** 복합 사업 여부 */
  isComplex: boolean;
  /** 복합 사업일 때 서브 유형 목록 */
  subTypes: ProjectType[];
}

// ─── 메인 감지 함수 ───

/**
 * PDF 텍스트에서 사업 유형을 자동 감지
 *
 * @param text - PDF에서 추출된 원문 텍스트
 * @returns ProjectType - 감지된 사업 유형
 */
export function detectProjectType(text: string): ProjectType {
  const result = detectProjectTypeDetailed(text);
  return result.type;
}

/**
 * PDF 텍스트에서 사업 유형을 자동 감지 (상세 결과 포함)
 *
 * @param text - PDF에서 추출된 원문 텍스트
 * @returns ProjectTypeDetectionResult - 상세 감지 결과
 */
export function detectProjectTypeDetailed(text: string): ProjectTypeDetectionResult {
  // 텍스트 정규화 (소문자, 공백 정리)
  const normalizedText = text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();

  // 각 유형별 점수 계산
  const typeScores: {
    type: ProjectType;
    score: number;
    matchedKeywords: string[];
  }[] = [];

  for (const rule of TYPE_RULES) {
    let score = 0;
    const matchedKeywords: string[] = [];

    // 일반 키워드 매칭
    for (const keyword of rule.keywords) {
      const regex = new RegExp(keyword, "gi");
      const matches = normalizedText.match(regex);
      if (matches) {
        score += rule.weight * matches.length;
        matchedKeywords.push(keyword);
      }
    }

    // 강한 키워드 추가 가중치
    if (rule.strongKeywords && rule.strongWeight) {
      for (const keyword of rule.strongKeywords) {
        if (normalizedText.includes(keyword)) {
          score += rule.strongWeight;
        }
      }
    }

    // 제목/앞부분(처음 500자)에 등장하면 추가 보너스
    const titleArea = normalizedText.slice(0, 500);
    for (const keyword of rule.keywords) {
      if (titleArea.includes(keyword)) {
        score += rule.weight * 2; // 제목 영역 2배 가중
        break; // 한 번만 보너스
      }
    }

    if (score > 0) {
      typeScores.push({ type: rule.type, score, matchedKeywords });
    }
  }

  // 점수 내림차순 정렬
  typeScores.sort((a, b) => b.score - a.score);

  // 주된 유형 결정
  const topType = typeScores[0]?.type ?? "아파트"; // 기본값: 아파트
  const topScore = typeScores[0]?.score ?? 0;

  // 복합 사업 판별: 2위 점수가 1위의 40% 이상이면 복합
  const secondScore = typeScores[1]?.score ?? 0;
  const isComplex = secondScore > 0 && secondScore >= topScore * 0.4;
  const subTypes: ProjectType[] = isComplex
    ? typeScores.filter((s) => s.score >= topScore * 0.4).map((s) => s.type)
    : [topType];

  // 신뢰도 계산
  const totalScore = typeScores.reduce((sum, s) => sum + s.score, 0);
  const confidence =
    totalScore > 0
      ? Math.min(100, Math.round((topScore / Math.max(totalScore, 1)) * 100))
      : 0;

  return {
    type: topType,
    confidence,
    scores: typeScores,
    isComplex,
    subTypes,
  };
}

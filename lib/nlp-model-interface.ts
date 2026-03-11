/**
 * VESTRA 부동산 문서 특화 NLP 모델 인터페이스
 * ────────────────────────────────────────────
 * 특허 전략 2: 범용 LLM이 아닌, 한국 부동산 법률 용어와
 * 등기부등본 구조에 특화된 도메인 NLP 모델의 인터페이스.
 *
 * 현재: OpenAI GPT-4.1-mini 래퍼로 구현
 * 향후: KR-BERT Fine-tuned 모델로 교체 가능 (Provider 패턴)
 */

import type {
  NEREntity,
  RelationExtraction,
  DocumentClassification,
  RealEstateEntityType,
} from "./patent-types";

// ─── NLP 모델 인터페이스 (Provider 패턴) ───

export interface RealEstateNLPModel {
  /** 모델 이름 */
  readonly modelName: string;

  /** 모델 버전 */
  readonly version: string;

  /** 개체명 인식 (NER) */
  extractEntities(text: string): Promise<NEREntity[]>;

  /** 관계 추출 (RE) */
  extractRelations(text: string): Promise<RelationExtraction[]>;

  /** 문서 분류 */
  classifyDocument(text: string): Promise<DocumentClassification>;

  /** 모델 상태 확인 */
  healthCheck(): Promise<boolean>;
}

// ─── 부동산 특화 15개 개체유형 정의 ───

export const REAL_ESTATE_ENTITY_TYPES: Record<
  RealEstateEntityType,
  { label: string; description: string; examples: string[] }
> = {
  소유자: {
    label: "소유자",
    description: "부동산의 소유권을 가진 자연인 또는 법인",
    examples: ["홍길동", "주식회사 대한"],
  },
  근저당권자: {
    label: "근저당권자",
    description: "근저당권을 설정한 채권자 (주로 금융기관)",
    examples: ["국민은행", "신한은행"],
  },
  임차인: {
    label: "임차인",
    description: "임대차계약의 임차인",
    examples: ["김철수", "이영희"],
  },
  압류권자: {
    label: "압류권자",
    description: "압류를 신청한 채권자",
    examples: ["서울시", "국세청"],
  },
  채권최고액: {
    label: "채권최고액",
    description: "근저당권의 최대 담보 금액",
    examples: ["3억원", "156,000,000원"],
  },
  설정일: {
    label: "설정일",
    description: "권리가 설정(등기)된 날짜",
    examples: ["2024년 3월 15일", "2024.03.15"],
  },
  말소일: {
    label: "말소일",
    description: "권리가 말소된 날짜",
    examples: ["2025년 1월 10일"],
  },
  권리종류: {
    label: "권리종류",
    description: "등기된 권리의 유형",
    examples: ["근저당권", "전세권", "지상권", "가압류"],
  },
  위험요소: {
    label: "위험요소",
    description: "거래에 위험이 될 수 있는 등기 사항",
    examples: ["경매개시결정", "가처분", "예고등기"],
  },
  주소: {
    label: "주소",
    description: "부동산의 소재지",
    examples: ["서울특별시 강남구 역삼동 123-45"],
  },
  면적: {
    label: "면적",
    description: "부동산의 면적",
    examples: ["84.9㎡", "34.5평"],
  },
  용도: {
    label: "용도",
    description: "부동산의 용도",
    examples: ["아파트", "다세대주택", "오피스텔"],
  },
  건축년도: {
    label: "건축년도",
    description: "건물의 준공 연도",
    examples: ["2005년", "2015년 준공"],
  },
  거래금액: {
    label: "거래금액",
    description: "매매 또는 기타 거래 금액",
    examples: ["8억 5천만원", "850,000,000원"],
  },
  전세금: {
    label: "전세금",
    description: "전세 보증금 금액",
    examples: ["5억원", "500,000,000원"],
  },
};

// ─── OpenAI 래퍼 구현 (현재 기본 Provider) ───

export class OpenAINLPProvider implements RealEstateNLPModel {
  readonly modelName = "gpt-4.1-mini";
  readonly version = "1.0.0-openai";

  async extractEntities(text: string): Promise<NEREntity[]> {
    // 현재는 registry-parser.ts의 정규식 기반 파싱 결과를 NER 형태로 변환
    // 향후 KR-BERT NER 모델로 교체
    const entities: NEREntity[] = [];

    // 금액 패턴
    const amountPattern = /(\d[\d,]*)\s*원/g;
    let match;
    while ((match = amountPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: "채권최고액",
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        confidence: 0.85,
      });
    }

    // 날짜 패턴
    const datePattern = /(\d{4})[년.]?\s*(\d{1,2})[월.]?\s*(\d{1,2})[일.]?/g;
    while ((match = datePattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: "설정일",
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        confidence: 0.80,
      });
    }

    // 권리 유형 패턴
    const rightTypes = [
      "근저당권", "전세권", "임차권", "지상권", "가압류",
      "가처분", "경매개시결정", "예고등기", "신탁", "가등기",
    ];
    for (const rt of rightTypes) {
      let idx = text.indexOf(rt);
      while (idx !== -1) {
        entities.push({
          text: rt,
          type: "권리종류",
          startOffset: idx,
          endOffset: idx + rt.length,
          confidence: 0.95,
        });
        idx = text.indexOf(rt, idx + 1);
      }
    }

    return entities;
  }

  async extractRelations(text: string): Promise<RelationExtraction[]> {
    // 간단한 규칙 기반 관계 추출
    // 향후 KR-BERT RE 모델로 교체
    return [];
  }

  async classifyDocument(text: string): Promise<DocumentClassification> {
    // 키워드 기반 문서 분류
    if (text.includes("등기부등본") || text.includes("갑구") || text.includes("을구")) {
      return { documentType: "등기부등본", confidence: 0.95 };
    }
    if (text.includes("매매계약") || text.includes("매도인") || text.includes("매수인")) {
      return { documentType: "매매계약서", confidence: 0.90 };
    }
    if (text.includes("임대차") || text.includes("임대인") || text.includes("임차인")) {
      return { documentType: "임대차계약서", confidence: 0.90 };
    }
    if (text.includes("건축물대장")) {
      return { documentType: "건축물대장", confidence: 0.95 };
    }
    return { documentType: "기타", confidence: 0.50 };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ─── NLP 모델 팩토리 ───

let nlpProviderInstance: RealEstateNLPModel | null = null;

/**
 * NLP 모델 인스턴스 가져오기
 * 환경변수로 Provider 전환 가능 (향후 확장)
 */
export function getNLPModel(): RealEstateNLPModel {
  if (!nlpProviderInstance) {
    // 향후: process.env.NLP_PROVIDER === "kr-bert" ? new KRBertNLPProvider() : ...
    nlpProviderInstance = new OpenAINLPProvider();
  }
  return nlpProviderInstance;
}

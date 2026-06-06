/**
 * 패턴 기반 NER (개체명 인식) + 관계 추출 + 문서 구조 분석
 *
 * @module lib/nlp/entity-extractor
 */

import type { EntityType, Entity, Relation, DocumentSection } from "../nlp-ner-pipeline";

// ─── 개체명 인식 (NER) - 패턴 기반 ───

interface EntityPattern {
  type: EntityType;
  regex: RegExp;
  normalizer: (match: RegExpExecArray) => string | number | null;
  confidence: number;
}

const ENTITY_PATTERNS: EntityPattern[] = [
  // 금액 패턴
  {
    type: 'MONEY',
    regex: /(?:금\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:원|만원|억원|만\s*원|억\s*원)/g,
    normalizer: (m) => {
      const numStr = m[1].replace(/,/g, '');
      const num = parseFloat(numStr);
      if (m[0].includes('억')) return num * 100_000_000;
      if (m[0].includes('만')) return num * 10_000;
      return num;
    },
    confidence: 0.95,
  },
  {
    type: 'MONEY',
    regex: /(?:보증금|전세금|월세|임대료|매매가|감정가|채권최고액)\s*[:：]?\s*(?:금\s*)?(\d{1,3}(?:,\d{3})*)\s*원?/g,
    normalizer: (m) => parseInt(m[1].replace(/,/g, ''), 10),
    confidence: 0.9,
  },

  // 면적 패턴
  {
    type: 'AREA',
    regex: /(\d+(?:\.\d+)?)\s*(?:㎡|m²|제곱미터|평방미터)/g,
    normalizer: (m) => parseFloat(m[1]),
    confidence: 0.95,
  },
  {
    type: 'AREA',
    regex: /(\d+(?:\.\d+)?)\s*평/g,
    normalizer: (m) => Math.round(parseFloat(m[1]) * 3.3058 * 100) / 100,
    confidence: 0.9,
  },

  // 날짜 패턴
  {
    type: 'DATE',
    regex: /(\d{4})\s*[년./-]\s*(\d{1,2})\s*[월./-]\s*(\d{1,2})\s*일?/g,
    normalizer: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`,
    confidence: 0.95,
  },
  {
    type: 'DATE',
    regex: /(\d{4})\s*[년.]\s*(\d{1,2})\s*월/g,
    normalizer: (m) => `${m[1]}-${m[2].padStart(2, '0')}`,
    confidence: 0.85,
  },

  // 비율/이율
  {
    type: 'RATE',
    regex: /(?:연\s*)?(\d+(?:\.\d+)?)\s*%/g,
    normalizer: (m) => parseFloat(m[1]) / 100,
    confidence: 0.9,
  },

  // 주소 패턴 (한국 주소 체계)
  {
    type: 'ADDRESS',
    regex: /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:특별시|광역시|특별자치시|도|특별자치도)?\s+[가-힣]+(?:시|군|구)\s+[가-힣]+(?:읍|면|동|가|로|길)\s*\d*(?:-\d+)?/g,
    normalizer: (m) => m[0].trim(),
    confidence: 0.85,
  },

  // 부동산 유형
  {
    type: 'PROPERTY_TYPE',
    regex: /(?:아파트|빌라|오피스텔|단독주택|다세대|다가구|연립|상가|토지|대지|전답|임야|공장|창고)/g,
    normalizer: (m) => m[0],
    confidence: 0.9,
  },

  // 권리 유형
  {
    type: 'RIGHT_TYPE',
    regex: /(?:소유권|근저당권?|전세권|지상권|지역권|저당권|임차권|가압류|가처분|압류|경매개시결정|환매특약|신탁|가등기)/g,
    normalizer: (m) => m[0],
    confidence: 0.95,
  },

  // 법률 참조
  {
    type: 'LEGAL_REF',
    regex: /(?:민법|상법|주택임대차보호법|부동산등기법|공인중개사법|건축법)\s*제?\s*(\d+)조(?:의(\d+))?(?:\s*제(\d+)항)?/g,
    normalizer: (m) => {
      let ref = m[0].split(/제/)[0].trim() + ' 제' + m[1] + '조';
      if (m[2]) ref += '의' + m[2];
      if (m[3]) ref += ' 제' + m[3] + '항';
      return ref;
    },
    confidence: 0.9,
  },

  // 기간
  {
    type: 'DURATION',
    regex: /(\d+)\s*(?:년|개월|일|주)(?:\s*간)?/g,
    normalizer: (m) => m[0].replace(/\s+/g, ''),
    confidence: 0.85,
  },

  // 인명
  {
    type: 'PERSON',
    regex: /(?:임대인|임차인|매도인|매수인|채권자|채무자|소유자|권리자|위임인|대리인)\s*[:：]?\s*([가-힣]{2,4})/g,
    normalizer: (m) => m[1],
    confidence: 0.8,
  },

  // 기관명
  {
    type: 'ORGANIZATION',
    regex: /(?:[가-힣]+(?:은행|저축은행|신용협동조합|새마을금고|보험|캐피탈|신탁|법무법인|법원|등기소|구청|시청|동사무소))/g,
    normalizer: (m) => m[0],
    confidence: 0.85,
  },
];

/** 패턴 기반 NER 실행 */
export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];
  const usedRanges: Array<[number, number]> = [];

  const sortedPatterns = [...ENTITY_PATTERNS].sort((a, b) => b.confidence - a.confidence);

  for (const pattern of sortedPatterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      const overlaps = usedRanges.some(
        ([s, e]) => (start >= s && start < e) || (end > s && end <= e)
      );
      if (overlaps) continue;

      entities.push({
        type: pattern.type,
        text: match[0],
        normalizedValue: pattern.normalizer(match),
        start,
        end,
        confidence: pattern.confidence,
      });
      usedRanges.push([start, end]);
    }
  }

  return entities.sort((a, b) => a.start - b.start);
}

// ─── 관계 추출 (Relation Extraction) ───

interface RelationPattern {
  subjectType: EntityType;
  objectType: EntityType;
  predicate: string;
  maxDistance: number;
  contextKeywords: string[];
}

const RELATION_PATTERNS: RelationPattern[] = [
  {
    subjectType: 'PERSON',
    objectType: 'MONEY',
    predicate: '보증금설정',
    maxDistance: 100,
    contextKeywords: ['보증금', '전세금', '임대보증금'],
  },
  {
    subjectType: 'ORGANIZATION',
    objectType: 'MONEY',
    predicate: '근저당설정',
    maxDistance: 150,
    contextKeywords: ['근저당', '채권최고액', '저당'],
  },
  {
    subjectType: 'PERSON',
    objectType: 'ADDRESS',
    predicate: '소유',
    maxDistance: 200,
    contextKeywords: ['소유자', '소유권', '매도인', '매수인'],
  },
  {
    subjectType: 'RIGHT_TYPE',
    objectType: 'MONEY',
    predicate: '권리금액',
    maxDistance: 100,
    contextKeywords: ['설정', '등기', '권리'],
  },
  {
    subjectType: 'RIGHT_TYPE',
    objectType: 'DATE',
    predicate: '설정일자',
    maxDistance: 100,
    contextKeywords: ['접수', '설정', '등기'],
  },
  {
    subjectType: 'PROPERTY_TYPE',
    objectType: 'AREA',
    predicate: '면적',
    maxDistance: 100,
    contextKeywords: ['면적', '전용', '대지', '건물'],
  },
];

/** 엔티티 간 관계 추출 — 근접성 + 문맥 키워드 기반 */
export function extractRelations(text: string, entities: Entity[]): Relation[] {
  const relations: Relation[] = [];

  for (const pattern of RELATION_PATTERNS) {
    const subjects = entities.filter(e => e.type === pattern.subjectType);
    const objects = entities.filter(e => e.type === pattern.objectType);

    for (const subject of subjects) {
      for (const object of objects) {
        const distance = Math.abs(subject.start - object.start);
        if (distance > pattern.maxDistance) continue;

        const regionStart = Math.min(subject.start, object.start);
        const regionEnd = Math.max(subject.end, object.end);
        const region = text.slice(
          Math.max(0, regionStart - 30),
          Math.min(text.length, regionEnd + 30)
        );

        const hasContext = pattern.contextKeywords.some(kw => region.includes(kw));
        if (!hasContext) continue;

        const confidence = hasContext ? 0.8 : 0.5;

        relations.push({
          subject,
          predicate: pattern.predicate,
          object,
          confidence: Math.min(confidence, subject.confidence, object.confidence),
        });
      }
    }
  }

  const seen = new Set<string>();
  return relations.filter(r => {
    const key = `${r.subject.text}:${r.predicate}:${r.object.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── 문서 구조 분석 (Section Segmentation) ───

const SECTION_PATTERNS: Array<{
  regex: RegExp;
  type: DocumentSection['sectionType'];
}> = [
  { regex: /^[제\d]+\s*[조항관]\s*.+/m, type: 'clause' },
  { regex: /^(?:갑|을|병|정)\s*[:：]/m, type: 'signature' },
  { regex: /^[\d]+\.\s+.+/m, type: 'clause' },
  { regex: /^(?:별첨|첨부|부칙|별지)/m, type: 'appendix' },
  { regex: /^(?:부동산|임대차|매매|전세)\s*계약서/m, type: 'header' },
  { regex: /\|.*\|/m, type: 'table' },
];

/** 문서를 의미 단위 섹션으로 분할 */
export function segmentDocument(text: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const lines = text.split('\n');
  let currentSection: DocumentSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let matchedType: DocumentSection['sectionType'] = 'unknown';
    for (const pattern of SECTION_PATTERNS) {
      if (pattern.regex.test(trimmed)) {
        matchedType = pattern.type;
        break;
      }
    }

    if (matchedType === 'clause' || matchedType === 'header' || matchedType === 'appendix') {
      if (currentSection) {
        currentSection.entities = extractEntities(currentSection.content);
        sections.push(currentSection);
      }
      currentSection = {
        title: trimmed.slice(0, 50),
        content: trimmed,
        sectionType: matchedType,
        entities: [],
      };
    } else if (currentSection) {
      currentSection.content += '\n' + trimmed;
    } else {
      currentSection = {
        title: trimmed.slice(0, 50),
        content: trimmed,
        sectionType: matchedType,
        entities: [],
      };
    }
  }

  if (currentSection) {
    currentSection.entities = extractEntities(currentSection.content);
    sections.push(currentSection);
  }

  return sections;
}

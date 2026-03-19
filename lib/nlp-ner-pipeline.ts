/**
 * 자체 NLP/NER 파이프라인 (Natural Language Processing / Named Entity Recognition)
 *
 * 부동산 도메인 특화 자연어 처리:
 * - 한국어 부동산 문서 토크나이저
 * - 규칙 + 패턴 기반 NER (개체명 인식)
 * - 관계 추출 (Relation Extraction)
 * - 금액/면적/날짜 정규화
 * - 문서 구조 분석 (Section Segmentation)
 *
 * LLM 의존도를 낮추고 결정론적 처리를 보장하는 자체 파이프라인
 */

// ============================================================
// 1. 타입 정의
// ============================================================

export type EntityType =
  | 'PERSON'        // 인명
  | 'ADDRESS'       // 주소
  | 'MONEY'         // 금액
  | 'AREA'          // 면적
  | 'DATE'          // 날짜
  | 'RATE'          // 비율/이율
  | 'ORGANIZATION'  // 기관명
  | 'PROPERTY_TYPE' // 부동산 유형
  | 'RIGHT_TYPE'    // 권리 유형
  | 'LEGAL_REF'     // 법률 참조
  | 'DURATION';     // 기간

export interface Entity {
  type: EntityType;
  text: string;
  normalizedValue: string | number | null;
  start: number; // 원문 내 시작 위치
  end: number;
  confidence: number; // 0-1
}

export interface Relation {
  subject: Entity;
  predicate: string;
  object: Entity;
  confidence: number;
}

export interface Token {
  text: string;
  pos: string; // Part-of-Speech tag 근사
  start: number;
  end: number;
}

export interface DocumentSection {
  title: string;
  content: string;
  sectionType: 'header' | 'clause' | 'table' | 'signature' | 'appendix' | 'unknown';
  entities: Entity[];
}

export interface NERResult {
  entities: Entity[];
  relations: Relation[];
  sections: DocumentSection[];
  tokens: Token[];
  statistics: {
    totalEntities: number;
    entityTypeCounts: Record<string, number>;
    totalRelations: number;
    processingTimeMs: number;
  };
}

// ============================================================
// 2. 한국어 토크나이저 (규칙 기반)
// ============================================================

// 조사/어미 패턴 (부동산 문서에서 자주 등장)
const PARTICLES = [
  '은', '는', '이', '가', '을', '를', '의', '에', '에서', '으로', '로',
  '와', '과', '도', '만', '까지', '부터', '에게', '한테', '께',
  '이며', '이고', '이나', '으로서', '로서', '에서의', '에의',
];

/**
 * 규칙 기반 한국어 토크나이저
 * 정규표현식 패턴으로 공백/구두점 분리 + 조사 분리
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  // 1차: 공백/구두점 기반 분리
  const rawTokenRegex = /[가-힣a-zA-Z0-9]+(?:[.\-/][가-힣a-zA-Z0-9]+)*|[^\s가-힣a-zA-Z0-9]/g;
  let match: RegExpExecArray | null;

  while ((match = rawTokenRegex.exec(text)) !== null) {
    const tokenText = match[0];
    const start = match.index;

    // 한글 토큰에서 조사 분리 시도
    if (/[가-힣]/.test(tokenText)) {
      const separated = separateParticle(tokenText);
      if (separated.length > 1) {
        let offset = start;
        for (const part of separated) {
          tokens.push({
            text: part.text,
            pos: part.isParticle ? 'JOSA' : 'NOUN',
            start: offset,
            end: offset + part.text.length,
          });
          offset += part.text.length;
        }
        continue;
      }
    }

    tokens.push({
      text: tokenText,
      pos: classifyPOS(tokenText),
      start,
      end: start + tokenText.length,
    });
  }

  return tokens;
}

function separateParticle(word: string): Array<{ text: string; isParticle: boolean }> {
  // 긴 조사부터 매칭 시도
  const sortedParticles = [...PARTICLES].sort((a, b) => b.length - a.length);

  for (const particle of sortedParticles) {
    if (word.endsWith(particle) && word.length > particle.length) {
      const stem = word.slice(0, -particle.length);
      if (stem.length >= 1) {
        return [
          { text: stem, isParticle: false },
          { text: particle, isParticle: true },
        ];
      }
    }
  }

  return [{ text: word, isParticle: false }];
}

function classifyPOS(text: string): string {
  if (/^\d+$/.test(text)) return 'NUM';
  if (/^[가-힣]+$/.test(text)) return 'NOUN'; // 기본값으로 명사
  if (/^[a-zA-Z]+$/.test(text)) return 'ALPHA';
  if (/^[^\w\s]$/.test(text)) return 'PUNCT';
  return 'OTHER';
}

// ============================================================
// 3. 개체명 인식 (NER) - 패턴 기반
// ============================================================

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
    normalizer: (m) => Math.round(parseFloat(m[1]) * 3.3058 * 100) / 100, // 평 → ㎡
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

  // 인명 (성+이름 2-4글자, 한글)
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

/**
 * 패턴 기반 NER 실행
 */
export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];
  const usedRanges: Array<[number, number]> = [];

  // 우선순위: confidence 높은 패턴부터
  const sortedPatterns = [...ENTITY_PATTERNS].sort((a, b) => b.confidence - a.confidence);

  for (const pattern of sortedPatterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // 이미 태깅된 범위와 겹치면 스킵
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

// ============================================================
// 4. 관계 추출 (Relation Extraction)
// ============================================================

interface RelationPattern {
  subjectType: EntityType;
  objectType: EntityType;
  predicate: string;
  maxDistance: number; // 두 엔티티 간 최대 문자 거리
  contextKeywords: string[]; // 주변에 있어야 할 키워드
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

/**
 * 엔티티 간 관계 추출
 * 근접성 + 문맥 키워드 기반 규칙적 관계 추출
 */
export function extractRelations(text: string, entities: Entity[]): Relation[] {
  const relations: Relation[] = [];

  for (const pattern of RELATION_PATTERNS) {
    const subjects = entities.filter(e => e.type === pattern.subjectType);
    const objects = entities.filter(e => e.type === pattern.objectType);

    for (const subject of subjects) {
      for (const object of objects) {
        // 거리 체크
        const distance = Math.abs(subject.start - object.start);
        if (distance > pattern.maxDistance) continue;

        // 두 엔티티 사이의 텍스트에서 문맥 키워드 확인
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

  // 중복 제거 (같은 subject-predicate-object 쌍)
  const seen = new Set<string>();
  return relations.filter(r => {
    const key = `${r.subject.text}:${r.predicate}:${r.object.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================
// 5. 문서 구조 분석 (Section Segmentation)
// ============================================================

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

/**
 * 문서를 의미 단위 섹션으로 분할
 */
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

    // 새 섹션 시작 조건: clause 또는 header 타입
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
      // table 등은 현재 섹션 타입을 변경하지 않음
    } else {
      currentSection = {
        title: trimmed.slice(0, 50),
        content: trimmed,
        sectionType: matchedType,
        entities: [],
      };
    }
  }

  // 마지막 섹션
  if (currentSection) {
    currentSection.entities = extractEntities(currentSection.content);
    sections.push(currentSection);
  }

  return sections;
}

// ============================================================
// 6. 통합 NER 파이프라인
// ============================================================

/**
 * 부동산 문서 NER 파이프라인 실행
 *
 * 처리 순서:
 * 1. 토큰화
 * 2. 개체명 인식 (NER)
 * 3. 관계 추출
 * 4. 문서 구조 분석
 * 5. 통계 생성
 */
export function runNERPipeline(text: string): NERResult {
  const startTime = Date.now();

  // 1. 토큰화
  const tokens = tokenize(text);

  // 2. NER
  const entities = extractEntities(text);

  // 3. 관계 추출
  const relations = extractRelations(text, entities);

  // 4. 문서 구조 분석
  const sections = segmentDocument(text);

  // 5. 통계
  const entityTypeCounts: Record<string, number> = {};
  for (const entity of entities) {
    entityTypeCounts[entity.type] = (entityTypeCounts[entity.type] || 0) + 1;
  }

  return {
    entities,
    relations,
    sections,
    tokens,
    statistics: {
      totalEntities: entities.length,
      entityTypeCounts,
      totalRelations: relations.length,
      processingTimeMs: Date.now() - startTime,
    },
  };
}

// ============================================================
// 7. 특화 유틸리티
// ============================================================

/**
 * 등기부등본 텍스트에서 권리 관계를 구조화
 */
export function extractRightsFromRegistry(text: string): Array<{
  rightType: string;
  holder: string | null;
  amount: number | null;
  date: string | null;
  rank: number;
}> {
  const result = runNERPipeline(text);
  const rights: Array<{
    rightType: string;
    holder: string | null;
    amount: number | null;
    date: string | null;
    rank: number;
  }> = [];

  const rightEntities = result.entities.filter(e => e.type === 'RIGHT_TYPE');

  for (let i = 0; i < rightEntities.length; i++) {
    const right = rightEntities[i];
    const nearbyRegion = { start: right.start - 50, end: right.end + 200 };

    // 근처 엔티티 탐색
    const nearbyEntities = result.entities.filter(
      e => e !== right && e.start >= nearbyRegion.start && e.end <= nearbyRegion.end
    );

    const holder = nearbyEntities.find(e => e.type === 'PERSON' || e.type === 'ORGANIZATION');
    const amount = nearbyEntities.find(e => e.type === 'MONEY');
    const date = nearbyEntities.find(e => e.type === 'DATE');

    rights.push({
      rightType: right.normalizedValue as string,
      holder: holder ? (holder.normalizedValue as string) : null,
      amount: amount ? (amount.normalizedValue as number) : null,
      date: date ? (date.normalizedValue as string) : null,
      rank: i + 1,
    });
  }

  return rights;
}

/**
 * 계약서 텍스트에서 핵심 계약 조건 추출
 */
export function extractContractTerms(text: string): {
  parties: Array<{ role: string; name: string }>;
  deposit: number | null;
  monthlyRent: number | null;
  contractPeriod: string | null;
  propertyAddress: string | null;
  propertyType: string | null;
  area: number | null;
  specialTerms: string[];
} {
  const result = runNERPipeline(text);

  // 당사자
  const parties: Array<{ role: string; name: string }> = [];
  const personEntities = result.entities.filter(e => e.type === 'PERSON');
  for (const person of personEntities) {
    const context = text.slice(Math.max(0, person.start - 20), person.start);
    let role = '기타';
    if (context.includes('임대인') || context.includes('갑')) role = '임대인';
    else if (context.includes('임차인') || context.includes('을')) role = '임차인';
    else if (context.includes('매도인')) role = '매도인';
    else if (context.includes('매수인')) role = '매수인';
    parties.push({ role, name: person.normalizedValue as string });
  }

  // 금액 분류
  const moneyEntities = result.entities.filter(e => e.type === 'MONEY');
  let deposit: number | null = null;
  let monthlyRent: number | null = null;

  for (const money of moneyEntities) {
    const context = text.slice(Math.max(0, money.start - 30), money.start);
    if (context.includes('보증금') || context.includes('전세금') || context.includes('매매대금')) {
      deposit = money.normalizedValue as number;
    } else if (context.includes('월세') || context.includes('차임') || context.includes('임대료')) {
      monthlyRent = money.normalizedValue as number;
    }
  }

  // 기타 정보
  const addressEntity = result.entities.find(e => e.type === 'ADDRESS');
  const propertyTypeEntity = result.entities.find(e => e.type === 'PROPERTY_TYPE');
  const areaEntity = result.entities.find(e => e.type === 'AREA');
  const durationEntity = result.entities.find(e => e.type === 'DURATION');

  // 특약사항
  const specialTerms: string[] = [];
  for (const section of result.sections) {
    if (section.content.includes('특약') || section.title.includes('특약')) {
      const lines = section.content.split('\n').filter(l => l.trim().length > 5);
      specialTerms.push(...lines.slice(0, 5)); // 최대 5개
    }
  }

  return {
    parties,
    deposit,
    monthlyRent,
    contractPeriod: durationEntity ? (durationEntity.normalizedValue as string) : null,
    propertyAddress: addressEntity ? (addressEntity.normalizedValue as string) : null,
    propertyType: propertyTypeEntity ? (propertyTypeEntity.normalizedValue as string) : null,
    area: areaEntity ? (areaEntity.normalizedValue as number) : null,
    specialTerms,
  };
}

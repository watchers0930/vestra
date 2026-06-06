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

import { tokenize } from "./nlp/tokenizer";
import { extractEntities, extractRelations, segmentDocument } from "./nlp/entity-extractor";

// ─── re-export (기존 import 경로 유지) ───

export { tokenize } from "./nlp/tokenizer";
export { extractEntities, extractRelations, segmentDocument } from "./nlp/entity-extractor";

// ─── 타입 정의 ───

export type EntityType =
  | 'PERSON'
  | 'ADDRESS'
  | 'MONEY'
  | 'AREA'
  | 'DATE'
  | 'RATE'
  | 'ORGANIZATION'
  | 'PROPERTY_TYPE'
  | 'RIGHT_TYPE'
  | 'LEGAL_REF'
  | 'DURATION';

export interface Entity {
  type: EntityType;
  text: string;
  normalizedValue: string | number | null;
  start: number;
  end: number;
  confidence: number;
}

export interface Relation {
  subject: Entity;
  predicate: string;
  object: Entity;
  confidence: number;
}

export interface Token {
  text: string;
  pos: string;
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

// ─── 통합 NER 파이프라인 ───

/**
 * 부동산 문서 NER 파이프라인 실행
 *
 * 처리 순서: 토큰화 → NER → 관계 추출 → 문서 구조 분석 → 통계
 */
export function runNERPipeline(text: string): NERResult {
  const startTime = Date.now();

  const tokens = tokenize(text);
  const entities = extractEntities(text);
  const relations = extractRelations(text, entities);
  const sections = segmentDocument(text);

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

// ─── 특화 유틸리티 ───

/** 등기부등본 텍스트에서 권리 관계를 구조화 */
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

/** 계약서 텍스트에서 핵심 계약 조건 추출 */
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

  const addressEntity = result.entities.find(e => e.type === 'ADDRESS');
  const propertyTypeEntity = result.entities.find(e => e.type === 'PROPERTY_TYPE');
  const areaEntity = result.entities.find(e => e.type === 'AREA');
  const durationEntity = result.entities.find(e => e.type === 'DURATION');

  const specialTerms: string[] = [];
  for (const section of result.sections) {
    if (section.content.includes('특약') || section.title.includes('특약')) {
      const lines = section.content.split('\n').filter(l => l.trim().length > 5);
      specialTerms.push(...lines.slice(0, 5));
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

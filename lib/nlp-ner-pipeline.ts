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


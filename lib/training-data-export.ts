/**
 * VESTRA ML 학습 데이터 내보내기 유틸리티
 * ─────────────────────────────────────────
 * 승인된 TrainingData에서 KR-BERT 파인튜닝용 JSONL 생성.
 * 3가지 형식: 분류(Classification), NER, 구조 추출(Structure).
 */

import type { ParsedRegistry, GapguEntry, EulguEntry } from "./registry-parser";
import type { RealEstateEntityType, NEREntity } from "./patent-types";

// ─── 출력 타입 정의 ───

export interface ClassificationLabel {
  text: string;
  riskType: string;       // danger | warning | safe | info
  rightType: string;      // 소유권이전, 근저당권설정 등
  section: "갑구" | "을구";
}

export interface NERLabel {
  text: string;
  entities: NEREntity[];
}

export interface StructureLabel {
  input: string;
  output: {
    title: ParsedRegistry["title"];
    gapgu: ParsedRegistry["gapgu"];
    eulgu: ParsedRegistry["eulgu"];
    summary: ParsedRegistry["summary"];
  };
}

export interface ExportResult {
  classification: ClassificationLabel[];
  ner: NERLabel[];
  structure: StructureLabel[];
}

// ─── 분류 라벨 생성 ───

export function generateClassificationLabels(
  parsed: ParsedRegistry,
): ClassificationLabel[] {
  const labels: ClassificationLabel[] = [];

  for (const entry of parsed.gapgu) {
    if (entry.detail.trim()) {
      labels.push({
        text: entry.detail,
        riskType: entry.riskType,
        rightType: entry.purpose,
        section: "갑구",
      });
    }
  }

  for (const entry of parsed.eulgu) {
    if (entry.detail.trim()) {
      labels.push({
        text: entry.detail,
        riskType: entry.riskType,
        rightType: entry.purpose,
        section: "을구",
      });
    }
  }

  return labels;
}

// ─── NER 라벨 생성 ───

function findEntityOffset(
  rawText: string,
  value: string,
  entityType: RealEstateEntityType,
  searchFrom: number = 0,
): NEREntity | null {
  if (!value || !value.trim()) return null;
  const idx = rawText.indexOf(value, searchFrom);
  if (idx === -1) return null;
  return {
    text: value,
    type: entityType,
    startOffset: idx,
    endOffset: idx + value.length,
    confidence: 1.0,
  };
}

function extractEntitiesFromEntry(
  rawText: string,
  entry: GapguEntry | EulguEntry,
  section: "갑구" | "을구",
): NEREntity[] {
  const entities: NEREntity[] = [];

  // 권리자
  const holderType: RealEstateEntityType =
    entry.purpose.includes("근저당") ? "근저당권자" :
    entry.purpose.includes("임차") ? "임차인" :
    entry.purpose.includes("압류") || entry.purpose.includes("가압류") ? "압류권자" :
    "소유자";

  const holder = findEntityOffset(rawText, entry.holder, holderType);
  if (holder) entities.push(holder);

  // 날짜
  const date = findEntityOffset(rawText, entry.date, "설정일");
  if (date) entities.push(date);

  // 권리종류
  const rightType = findEntityOffset(rawText, entry.purpose, "권리종류");
  if (rightType) entities.push(rightType);

  // 금액 (을구만)
  if ("amount" in entry && entry.amount > 0) {
    const amountStr = entry.amount.toLocaleString();
    const amount = findEntityOffset(rawText, amountStr, "채권최고액");
    if (amount) entities.push(amount);
  }

  return entities;
}

export function generateNERLabels(
  parsed: ParsedRegistry,
  rawText: string,
): NERLabel[] {
  const allEntities: NEREntity[] = [];

  // 표제부 엔티티
  const titleEntities: Array<{ value: string; type: RealEstateEntityType }> = [
    { value: parsed.title.address, type: "주소" },
    { value: parsed.title.area, type: "면적" },
    { value: parsed.title.purpose, type: "용도" },
  ];
  for (const { value, type } of titleEntities) {
    const entity = findEntityOffset(rawText, value, type);
    if (entity) allEntities.push(entity);
  }

  // 갑구 엔티티
  for (const entry of parsed.gapgu) {
    allEntities.push(...extractEntitiesFromEntry(rawText, entry, "갑구"));
  }

  // 을구 엔티티
  for (const entry of parsed.eulgu) {
    allEntities.push(...extractEntitiesFromEntry(rawText, entry, "을구"));
  }

  if (allEntities.length === 0) return [];

  // offset 정렬
  allEntities.sort((a, b) => a.startOffset - b.startOffset);

  return [{ text: rawText, entities: allEntities }];
}

// ─── 구조 추출 라벨 생성 ───

export function generateStructureLabels(
  parsed: ParsedRegistry,
  rawText: string,
): StructureLabel[] {
  return [{
    input: rawText,
    output: {
      title: parsed.title,
      gapgu: parsed.gapgu,
      eulgu: parsed.eulgu,
      summary: parsed.summary,
    },
  }];
}

// ─── 통합 내보내기 ───

export function generateAllLabels(
  parsed: ParsedRegistry,
  rawText: string,
): ExportResult {
  return {
    classification: generateClassificationLabels(parsed),
    ner: generateNERLabels(parsed, rawText),
    structure: generateStructureLabels(parsed, rawText),
  };
}

// ─── JSONL 변환 ───

export function toJSONL(items: unknown[]): string {
  return items.map((item) => JSON.stringify(item)).join("\n");
}

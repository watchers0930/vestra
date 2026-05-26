import { describe, it, expect } from "vitest";
import { tokenize, extractEntities, segmentDocument, runNERPipeline } from "@/lib/nlp-ner-pipeline";

// ─── tokenize ───

describe("tokenize (한국어 토크나이저)", () => {
  it("기본 토큰화: 문장을 토큰 배열로 분리한다", () => {
    const tokens = tokenize("서울시 강남구에서 아파트를 매입");

    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      expect(token).toHaveProperty("text");
      expect(token).toHaveProperty("pos");
      expect(token).toHaveProperty("start");
      expect(token).toHaveProperty("end");
      expect(typeof token.text).toBe("string");
      expect(typeof token.pos).toBe("string");
      expect(typeof token.start).toBe("number");
      expect(typeof token.end).toBe("number");
    }
  });

  it("조사 분리: '강남구에서'를 명사와 조사로 분리한다", () => {
    const tokens = tokenize("강남구에서");

    const noun = tokens.find((t) => t.text === "강남구");
    const josa = tokens.find((t) => t.text === "에서");

    expect(noun).toBeDefined();
    expect(noun!.pos).toBe("NOUN");
    expect(josa).toBeDefined();
    expect(josa!.pos).toBe("JOSA");
  });

  it("빈 문자열은 빈 배열을 반환한다", () => {
    const tokens = tokenize("");
    expect(tokens).toEqual([]);
  });
});

// ─── extractEntities ───

describe("extractEntities (개체명 인식)", () => {
  it("금액 추출: '보증금 300,000,000원'에서 MONEY 엔티티를 추출한다", () => {
    const entities = extractEntities("보증금 300,000,000원");

    const money = entities.find((e) => e.type === "MONEY");
    expect(money).toBeDefined();
    expect(money!.normalizedValue).toBe(300000000);
  });

  it("날짜 추출: '2024년 3월 15일'에서 DATE 엔티티를 추출한다", () => {
    const entities = extractEntities("2024년 3월 15일");

    const date = entities.find((e) => e.type === "DATE");
    expect(date).toBeDefined();
    expect(date!.normalizedValue).toBe("2024-03-15");
  });

  it("면적 추출: '전용면적 84.5㎡'에서 AREA 엔티티를 추출한다", () => {
    const entities = extractEntities("전용면적 84.5㎡");

    const area = entities.find((e) => e.type === "AREA");
    expect(area).toBeDefined();
    expect(area!.normalizedValue).toBe(84.5);
  });

  it("권리 유형: '근저당권설정'에서 RIGHT_TYPE 엔티티를 추출한다", () => {
    const entities = extractEntities("근저당권설정");

    const right = entities.find((e) => e.type === "RIGHT_TYPE");
    expect(right).toBeDefined();
  });

  it("부동산 유형: '아파트'에서 PROPERTY_TYPE 엔티티를 추출한다", () => {
    const entities = extractEntities("아파트");

    const property = entities.find((e) => e.type === "PROPERTY_TYPE");
    expect(property).toBeDefined();
  });

  it("복합 텍스트에서 PERSON, MONEY, ADDRESS를 모두 추출한다", () => {
    const text = "임대인: 홍길동, 보증금 5억원, 서울특별시 강남구 역삼동 123";
    const entities = extractEntities(text);

    const person = entities.find((e) => e.type === "PERSON");
    const money = entities.find((e) => e.type === "MONEY");
    const address = entities.find((e) => e.type === "ADDRESS");

    expect(person).toBeDefined();
    expect(person!.normalizedValue).toBe("홍길동");

    expect(money).toBeDefined();
    expect(money!.normalizedValue).toBe(5_0000_0000); // 5억 = 500,000,000

    expect(address).toBeDefined();
  });
});

// ─── segmentDocument ───

describe("segmentDocument (문서 구조 분석)", () => {
  it("조항 분리: 제N조 패턴으로 섹션을 분리한다", () => {
    const text = "제1조 목적\n임대차계약의 목적\n제2조 보증금\n보증금은 3억원";
    const sections = segmentDocument(text);

    expect(sections.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── runNERPipeline ───

describe("runNERPipeline (통합 NER 파이프라인)", () => {
  it("부동산 계약서 텍스트에서 엔티티, 토큰, 섹션, 통계를 모두 추출한다", () => {
    const text =
      "부동산 임대차 계약서\n" +
      "제1조 물건의 표시\n" +
      "서울특별시 강남구 역삼동 123 아파트\n" +
      "전용면적 84.5㎡\n" +
      "제2조 보증금\n" +
      "보증금: 금 300,000,000원\n" +
      "임대인: 홍길동\n" +
      "계약기간: 2024년 1월 1일부터 2년간";

    const result = runNERPipeline(text);

    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.statistics.totalEntities).toBeGreaterThan(0);
    expect(result.statistics.processingTimeMs).toBeGreaterThanOrEqual(0);

    // entityTypeCounts 에 최소 하나 이상의 키가 존재
    expect(Object.keys(result.statistics.entityTypeCounts).length).toBeGreaterThan(0);
  });
});

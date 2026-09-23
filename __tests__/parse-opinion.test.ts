import { describe, it, expect } from "vitest";
import { parseOpinion } from "@/app/(personal-home)/renewal/contract/components/resultHelpers";

describe("parseOpinion", () => {
  it("빈 문자열은 빈 배열", () => {
    expect(parseOpinion("")).toEqual([]);
  });

  it("문단(\\n\\n)을 블록으로 분리하고 라벨을 추출한다", () => {
    const text = "계약서 전반 안전성 평가: 기본 골격은 존재합니다.\n\n판례: 관련 판례 없음.";
    const blocks = parseOpinion(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].label).toBe("계약서 전반 안전성 평가");
    expect(blocks[0].lines).toEqual(["기본 골격은 존재합니다."]);
    expect(blocks[1].label).toBe("판례");
  });

  it("넘버링 없는 산문을 문장 단위로 줄바꿈한다", () => {
    const text = "보증금 반환 조건이 불명확합니다. 등기부 근저당이 존재합니다. 확정일자 취득이 필요합니다.";
    const [blk] = parseOpinion(text);
    expect(blk.items).toEqual([]);
    expect(blk.lines).toHaveLength(3);
    expect(blk.lines[0]).toBe("보증금 반환 조건이 불명확합니다.");
    expect(blk.lines[2]).toBe("확정일자 취득이 필요합니다.");
  });

  it("괄호형 (1) 넘버링 항목을 줄바꿈 항목으로 분리한다", () => {
    const text = "임차인 관점에서는(1) 전입신고, (2) 확정일자, (3) 보증보험을 권합니다.";
    const [blk] = parseOpinion(text);
    expect(blk.items.length).toBe(3);
    expect(blk.items[0].startsWith("(1)")).toBe(true);
    expect(blk.items[2].startsWith("(3)")).toBe(true);
    // '(' 가 앞 항목에 떨어져 나가지 않아야 한다
    expect(blk.lines).toEqual(["임차인 관점에서는"]);
  });

  it("N) 형식 넘버링도 분리한다", () => {
    const text = "권장 조치: 1) 잔금일 명시 2) 반환기한 명시 3) 확정일자.";
    const [blk] = parseOpinion(text);
    expect(blk.label).toBe("권장 조치");
    expect(blk.items.length).toBe(3);
    expect(blk.items[0].startsWith("1)")).toBe(true);
  });

  it("넘버링이 없으면 items는 비고 lines에 문장이 담긴다", () => {
    const text = "보증금 반환 조건이 명확하지 않습니다.";
    const [blk] = parseOpinion(text);
    expect(blk.items).toEqual([]);
    expect(blk.lines[0]).toContain("보증금 반환");
  });

  it("숫자로 시작하는 문단을 라벨로 오인하지 않는다", () => {
    const text = "1) 첫째 2) 둘째";
    const [blk] = parseOpinion(text);
    expect(blk.label).toBeUndefined();
    expect(blk.items.length).toBe(2);
  });
});

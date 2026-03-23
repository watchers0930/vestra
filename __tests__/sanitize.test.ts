import { describe, it, expect } from "vitest";
import {
  stripHtml,
  truncateInput,
  sanitizeMessages,
  sanitizeField,
  sanitizeString,
  validateRequiredFields,
  validateMagicBytes,
} from "@/lib/sanitize";

describe("stripHtml", () => {
  it("일반 텍스트는 그대로 반환", () => {
    expect(stripHtml("안녕하세요")).toBe("안녕하세요");
  });

  it("script 태그 및 내용 제거", () => {
    expect(stripHtml('<script>alert("xss")</script>텍스트')).toBe("텍스트");
  });

  it("style 태그 및 내용 제거", () => {
    expect(stripHtml("<style>body{color:red}</style>텍스트")).toBe("텍스트");
  });

  it("iframe, object, embed 제거", () => {
    expect(stripHtml('<iframe src="evil.com"></iframe>안전')).toBe("안전");
  });

  it("일반 HTML 태그 제거", () => {
    expect(stripHtml("<p>문단</p><b>볼드</b>")).toBe("문단볼드");
  });

  it("javascript: 프로토콜 제거", () => {
    expect(stripHtml("javascript:alert(1)")).toBe("alert(1)");
  });

  it("on* 이벤트 핸들러 제거", () => {
    expect(stripHtml('onerror="alert(1)"텍스트')).toBe("텍스트");
  });

  it("HTML 엔티티 디코딩 후 태그 재제거", () => {
    // &lt;script&gt; → <script> → 태그 제거 → ""
    expect(stripHtml("&lt;script&gt;")).toBe("");
  });

  it("null/undefined 입력 처리", () => {
    expect(stripHtml(null as unknown as string)).toBe("");
    expect(stripHtml(undefined as unknown as string)).toBe("");
    expect(stripHtml("")).toBe("");
  });

  it("중첩된 태그 제거", () => {
    expect(stripHtml("<div><span>텍스트</span></div>")).toBe("텍스트");
  });
});

describe("truncateInput", () => {
  it("짧은 입력은 그대로", () => {
    expect(truncateInput("짧은", 100)).toBe("짧은");
  });

  it("긴 입력은 잘림", () => {
    expect(truncateInput("abcdefghij", 5)).toBe("abcde");
  });

  it("null/undefined 입력 처리", () => {
    expect(truncateInput(null as unknown as string)).toBe("");
    expect(truncateInput(undefined as unknown as string)).toBe("");
  });

  it("기본 최대 길이 50000", () => {
    const long = "a".repeat(60000);
    expect(truncateInput(long).length).toBe(50000);
  });
});

describe("sanitizeMessages", () => {
  it("정상 메시지 통과", () => {
    const msgs = [
      { role: "user", content: "안녕하세요" },
      { role: "assistant", content: "반갑습니다" },
    ];
    const result = sanitizeMessages(msgs);
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe("안녕하세요");
  });

  it("허용되지 않은 role 필터링", () => {
    const msgs = [
      { role: "user", content: "정상" },
      { role: "hacker", content: "비정상" },
    ];
    expect(sanitizeMessages(msgs)).toHaveLength(1);
  });

  it("HTML 태그 제거", () => {
    const msgs = [{ role: "user", content: '<script>alert("xss")</script>안녕' }];
    expect(sanitizeMessages(msgs)[0].content).toBe("안녕");
  });

  it("메시지 수 제한", () => {
    const msgs = Array.from({ length: 100 }, (_, i) => ({
      role: "user",
      content: `msg${i}`,
    }));
    expect(sanitizeMessages(msgs).length).toBe(50);
  });

  it("content 길이 제한", () => {
    const msgs = [{ role: "user", content: "a".repeat(20000) }];
    expect(sanitizeMessages(msgs)[0].content.length).toBe(10000);
  });

  it("배열이 아닌 입력은 빈 배열", () => {
    expect(sanitizeMessages(null as unknown as [])).toEqual([]);
    expect(sanitizeMessages("string" as unknown as [])).toEqual([]);
  });
});

describe("sanitizeField", () => {
  it("HTML 제거 + 공백 정리", () => {
    expect(sanitizeField("  <b>이름</b>  ")).toBe("이름");
  });

  it("길이 제한 적용", () => {
    expect(sanitizeField("a".repeat(1000), 10).length).toBe(10);
  });
});

describe("sanitizeString", () => {
  it("null → 빈 문자열", () => {
    expect(sanitizeString(null)).toBe("");
  });

  it("undefined → 빈 문자열", () => {
    expect(sanitizeString(undefined)).toBe("");
  });

  it("숫자 → 문자열 변환", () => {
    expect(sanitizeString(12345)).toBe("12345");
  });

  it("HTML 제거 적용", () => {
    expect(sanitizeString("<b>bold</b>")).toBe("bold");
  });
});

describe("validateRequiredFields", () => {
  it("모든 필드 존재 시 빈 배열", () => {
    expect(validateRequiredFields({ a: 1, b: "text" }, ["a", "b"])).toEqual([]);
  });

  it("누락 필드 반환", () => {
    expect(validateRequiredFields({ a: 1 }, ["a", "b"])).toEqual(["b"]);
  });

  it("빈 문자열도 누락 처리", () => {
    expect(validateRequiredFields({ a: "" }, ["a"])).toEqual(["a"]);
  });

  it("null도 누락 처리", () => {
    expect(validateRequiredFields({ a: null }, ["a"])).toEqual(["a"]);
  });
});

describe("validateMagicBytes", () => {
  it("PDF 매직바이트 검증", () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(validateMagicBytes(pdfBytes, "application/pdf")).toBe(true);
  });

  it("JPEG 매직바이트 검증", () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(jpegBytes, "image/jpeg")).toBe(true);
  });

  it("PNG 매직바이트 검증", () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateMagicBytes(pngBytes, "image/png")).toBe(true);
  });

  it("잘못된 매직바이트 거부", () => {
    const fakeBytes = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(fakeBytes, "application/pdf")).toBe(false);
  });

  it("알 수 없는 MIME 타입은 true 반환 (시그니처 없음)", () => {
    const bytes = new Uint8Array([0x00, 0x00]);
    expect(validateMagicBytes(bytes, "text/plain")).toBe(true);
  });
});

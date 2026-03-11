/**
 * lib/csrf.ts 테스트
 * Origin/Referer 검증 CSRF 방어
 */
import { describe, it, expect } from "vitest";
import { validateOrigin } from "@/lib/csrf";

function makeRequest(method: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3001/api/test", {
    method,
    headers,
  });
}

describe("validateOrigin", () => {
  it("GET 요청은 항상 통과", () => {
    const req = makeRequest("GET", { origin: "https://evil.com" });
    expect(validateOrigin(req)).toBeNull();
  });

  it("HEAD 요청은 항상 통과", () => {
    const req = makeRequest("HEAD");
    expect(validateOrigin(req)).toBeNull();
  });

  it("허용된 origin의 POST는 통과", () => {
    const req = makeRequest("POST", { origin: "https://vestra-plum.vercel.app" });
    expect(validateOrigin(req)).toBeNull();
  });

  it("localhost origin은 통과", () => {
    const req = makeRequest("POST", { origin: "http://localhost:3000" });
    expect(validateOrigin(req)).toBeNull();
  });

  it("origin 없는 POST (서버 호출)는 통과", () => {
    const req = makeRequest("POST");
    expect(validateOrigin(req)).toBeNull();
  });

  it("악의적 origin의 POST는 403", () => {
    const req = makeRequest("POST", { origin: "https://evil.com" });
    const result = validateOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("악의적 origin의 PUT도 403", () => {
    const req = makeRequest("PUT", { origin: "https://attacker.io" });
    const result = validateOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("허용된 referer 폴백 동작", () => {
    const req = makeRequest("POST", { referer: "https://vestra-plum.vercel.app/admin" });
    expect(validateOrigin(req)).toBeNull();
  });

  it("악의적 referer만 있으면 403", () => {
    const req = makeRequest("DELETE", { referer: "https://evil.com/page" });
    const result = validateOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});

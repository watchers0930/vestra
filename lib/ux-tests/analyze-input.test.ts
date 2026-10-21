import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { JsonBodyError, readLimitedJson } from "@/lib/http/request-body";

const mocks = vi.hoisted(() => ({ pipeline: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null), ROLE_LIMITS: { GUEST: 3 } }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
  checkDailyUsage: vi.fn(async () => ({ success: true })),
  rateLimitHeaders: vi.fn(() => ({})),
}));
vi.mock("@/lib/molit-api", () => ({ fetchComprehensivePrices: vi.fn() }));
vi.mock("@/lib/bok-api", () => ({ fetchBaseRate: vi.fn() }));
vi.mock("@/lib/building-api", () => ({ fetchBuildingInfoByAddress: vi.fn() }));
vi.mock("@/lib/supply-api", () => ({ fetchSupplyVolume: vi.fn() }));
vi.mock("@/lib/kapt-api", () => ({ fetchKaptInfoByAddress: vi.fn() }));
vi.mock("@/app/api/analyze-unified/analyze-service", async () => ({
  sanitizeInput: (await import("@/app/api/analyze-unified/property-normalize")).sanitizeInput,
  runAnalysisPipeline: mocks.pipeline,
}));
import { POST } from "@/app/api/analyze-unified/route";

function request(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/analyze-unified", {
    method: "POST", body,
    headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers },
  });
}

beforeEach(() => { mocks.pipeline.mockReset().mockResolvedValue({}); });

describe("분석 POST 본문 경계", () => {
  it("본인 갱신 권리 선택을 검증하여 파이프라인에 전달", async () => {
    const ownJeonseRight = { order: 1, holder: "김임차" };
    const r = await POST(request(JSON.stringify({ rawText: "가".repeat(30), userDeposit: 600000000, ownJeonseRight })));
    expect(r.status).toBe(200);
    expect(mocks.pipeline.mock.calls[0][0].ownJeonseRight).toEqual(ownJeonseRight);
  });
  it("60,000자 원문은 수신 후 50,000자로 정제하여 분석", async () => {
    const r = await POST(request(JSON.stringify({ rawText: "가".repeat(60000) })));
    expect(r.status).toBe(200);
    expect(mocks.pipeline.mock.calls[0][0].rawText).toBe("가".repeat(50000));
  });
  it("유니코드 이스케이프된 60,000자도 허용", async () => {
    const r = await POST(request('{"rawText":"' + "\\uac00".repeat(60000) + '"}'));
    expect(r.status).toBe(200);
    expect(mocks.pipeline).toHaveBeenCalledOnce();
  });
  it("60,001자는 스키마에서 거부하고 분석하지 않음", async () => {
    const r = await POST(request(JSON.stringify({ rawText: "x".repeat(60001) })));
    expect(r.status).toBe(400);
    expect(mocks.pipeline).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{}, { "content-length": "1" }])("헤더와 무관하게 초과 본문 413 (%j)", async headers => {
    const r = await POST(request(JSON.stringify({ rawText: "가".repeat(140000) }), headers));
    expect(r.status).toBe(413);
    expect(mocks.pipeline).not.toHaveBeenCalled();
  });
  it.each(["{", "", "null", '{"rawText":12}'])("잘못된 JSON/입력 400 (%s)", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.pipeline).not.toHaveBeenCalled();
  });
});

describe("실제 바이트 기준 JSON 스트림 제한", () => {
  const encoded = new TextEncoder().encode('{"value":"가"}');
  it("정확한 바이트 상한 허용, 1바이트 초과 거부", async () => {
    expect(await readLimitedJson(new Request("http://localhost", { method: "POST", body: encoded }), encoded.length)).toEqual({ value: "가" });
    await expect(readLimitedJson(new Request("http://localhost", { method: "POST", body: encoded }), encoded.length - 1)).rejects.toMatchObject({ status: 413 });
  });
  it("UTF-8 문자가 청크 경계에 걸려도 정상 디코딩", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of encoded) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    });
    const req = { headers: new Headers(), body: stream } as Request;
    expect(await readLimitedJson(req, encoded.length)).toEqual({ value: "가" });
  });
  it("청크 누적 초과 시 읽기를 중단하고 스트림 취소", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(10)); }, cancel,
    });
    await expect(readLimitedJson({ headers: new Headers(), body: stream } as Request, 16)).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });
  it("취소 오류가 발생해도 과대본문은 413 유지", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(17)); },
      cancel() { throw new Error("cancel failed"); },
    });
    await expect(readLimitedJson({ headers: new Headers(), body: stream } as Request, 16)).rejects.toMatchObject({ status: 413 });
    expect(stream.locked).toBe(false);
  });
  it("잘못된 UTF-8·누락 본문·스트림 오류는 400", async () => {
    await expect(readLimitedJson(new Request("http://localhost", { method: "POST", body: Uint8Array.of(0xff) }), 16)).rejects.toMatchObject({ status: 400 });
    await expect(readLimitedJson(new Request("http://localhost", { method: "POST" }), 16)).rejects.toBeInstanceOf(JsonBodyError);
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("read failed")); } });
    await expect(readLimitedJson({ headers: new Headers(), body: stream } as Request, 16)).rejects.toMatchObject({ status: 400 });
    expect(stream.locked).toBe(false);
  });
});

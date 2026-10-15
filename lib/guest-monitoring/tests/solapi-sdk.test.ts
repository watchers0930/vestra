import { afterEach, beforeEach, expect, it, vi } from "vitest";
// Exercise the installed SDK, replacing only HTTP transport and secret lookup.
vi.mock("@/lib/system-settings", () => ({ getNotificationSettingOrEnv: async (key: string) => ({
  SOLAPI_API_KEY: "isolated-sdk-key", SOLAPI_API_SECRET: "isolated-sdk-secret", SOLAPI_SENDER_PHONE: "0200000000",
})[key as "SOLAPI_API_KEY"] }));
import { sendSms, findSmsReceipt, prepareSms } from "@/lib/solapi-client";
const fetcher = vi.fn();
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", fetcher); });
afterEach(() => { vi.unstubAllGlobals(); });
function response(failed = false) {
  return { failedMessageList: failed ? [{ to: "01012345678", from: "0200000000", type: "SMS", country: "82",
    messageId: "rejected", statusCode: "1062", statusMessage: "rejected", accountId: "test" }] : [],
    groupInfo: { count: { total: 1, registeredFailed: failed ? 1 : 0 } },
    messageList: [{ messageId: "accepted", statusCode: "2000", statusMessage: "accepted", customFields: { guestOutboxId: "outbox" } }] };
}
it("uses real SDK send config and array receipts with correlation fields", async () => {
  fetcher.mockResolvedValueOnce(Response.json(response()));
  const send = await prepareSms("010-1234-5678", "isolated test", { correlationId: "outbox" });
  expect(fetcher).not.toHaveBeenCalled();
  expect(await send()).toMatchObject({ success: true, providerMessageId: "accepted" });
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toContain("messages/v4/send-many/detail");
  expect(JSON.parse(init.body)).toMatchObject({ showMessageList: true, messages: [{ to: "01012345678", customFields: { guestOutboxId: "outbox" } }] });
});
it("uses real SDK object receipt pages and date/startKey query serialization", async () => {
  fetcher.mockResolvedValueOnce(Response.json({ limit: 100, messageList: {}, nextKey: "page2" }));
  fetcher.mockResolvedValueOnce(Response.json({ limit: 100, messageList: { found: { messageId: "receipt", customFields: { guestOutboxId: "outbox" } } }, nextKey: null }));
  expect(await findSmsReceipt("01012345678", "outbox", new Date("2026-10-15T00:00:00Z"))).toBe("receipt");
  const query = new URL(fetcher.mock.calls[1][0]).searchParams;
  expect(query.get("startKey")).toBe("page2");
  expect(query.get("dateType")).toBe("CREATED");
  expect(query.get("startDate")).toBeTruthy();
});
it("recognizes actual SDK MessageNotReceivedError as safe non-acceptance", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    fetcher.mockResolvedValueOnce(Response.json(response(true)));
    expect(await sendSms("01012345678", "isolated test")).toMatchObject({ success: false, retryable: true });
  } finally { log.mockRestore(); }
});

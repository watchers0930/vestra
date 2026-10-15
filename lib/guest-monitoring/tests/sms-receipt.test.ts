import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ send: vi.fn(), getMessages: vi.fn(), setting: vi.fn() }));
vi.mock("solapi", () => ({
  SolapiMessageService: class { send = fixtures.send; getMessages = fixtures.getMessages; },
  MessageNotReceivedError: class extends Error {},
}));
vi.mock("@/lib/system-settings", () => ({ getNotificationSettingOrEnv: fixtures.setting }));
import { sendSms, findSmsReceipt } from "@/lib/solapi-client";
import { MessageNotReceivedError } from "solapi";
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.setting.mockImplementation(async (key: string) => ({ SOLAPI_API_KEY: "test-key", SOLAPI_API_SECRET: "test-secret", SOLAPI_SENDER_PHONE: "0200000000" })[key as "SOLAPI_API_KEY"]);
});
afterEach(() => vi.restoreAllMocks());
it.each(["SOLAPI_API_KEY", "SOLAPI_API_SECRET", "SOLAPI_SENDER_PHONE"])("fails closed without recipient logs when OTP setting %s is absent", async missing => {
  fixtures.setting.mockImplementation(async (key: string) => key === missing ? undefined : ({
    SOLAPI_API_KEY: "test-key", SOLAPI_API_SECRET: "test-secret", SOLAPI_SENDER_PHONE: "0200000000",
  })[key as "SOLAPI_API_KEY"]);
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(await sendSms("01012345678", "OTP 000042", { requireReal: true })).toEqual({ channel: "sms_mock", success: false });
  expect(fixtures.send).not.toHaveBeenCalled();
  expect(info).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});
it("preserves normal SMS callers and captures an opt-in outbox receipt", async () => {
  fixtures.send.mockResolvedValue({ messageList: [{ messageId: "provider-message" }] });
  const normal = await sendSms("01012345678", "test");
  expect(normal.success).toBe(true);
  expect(fixtures.send.mock.calls[0][0][0].customFields).toBeUndefined();
  const tracked = await sendSms("01012345678", "test", { correlationId: "outbox-1" });
  expect(tracked.providerMessageId).toBe("provider-message");
  expect(fixtures.send.mock.calls[1][0][0].customFields).toEqual({ guestOutboxId: "outbox-1" });
});
it("looks up the exact outbox correlation across provider result pages", async () => {
  fixtures.getMessages.mockResolvedValueOnce({ messageList: { other: { customFields: { guestOutboxId: "different" } } }, nextKey: "page2" });
  fixtures.getMessages.mockResolvedValueOnce({ messageList: { found: { messageId: "receipt-1", customFields: { guestOutboxId: "outbox-1" } } } });
  expect(await findSmsReceipt("01012345678", "outbox-1", new Date(0))).toBe("receipt-1");
  expect(fixtures.getMessages.mock.calls[1][0].startKey).toBe("page2");
});
it("limits lookup pagination and treats receipt absence as unknown", async () => {
  fixtures.getMessages.mockResolvedValue({ messageList: {}, nextKey: "more" });
  expect(await findSmsReceipt("01012345678", "missing", new Date(0))).toBeNull();
  expect(fixtures.getMessages).toHaveBeenCalledTimes(5);
});
it("only retries provider-confirmed non-acceptance and hides raw provider errors", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  fixtures.send.mockRejectedValueOnce(new MessageNotReceivedError({ failedMessageList: [], totalCount: 1 }));
  expect(await sendSms("01012345678", "test")).toMatchObject({ success: false, retryable: true });
  fixtures.send.mockRejectedValueOnce(new Error("sensitive provider payload"));
  const unknown = await sendSms("01012345678", "test");
  expect(unknown).toMatchObject({ success: false, retryable: false, error: "sms_send_failed" });
  expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive provider payload");
  log.mockRestore();
});

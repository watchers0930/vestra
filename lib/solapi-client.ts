/**
 * Solapi 클라이언트 모듈
 * ──────────────────────
 * 카카오 알림톡(ATA) / SMS 발송을 Solapi SDK로 통합 처리.
 * DB 설정 우선, 미설정 시 환경변수 폴백. 둘 다 없으면 mock 모드.
 */

import { SolapiMessageService, MessageNotReceivedError } from "solapi";
import { getNotificationSettingOrEnv } from "./system-settings";

// ─── Lazy Init (DB 설정 변경 시 재생성) ───

let client: SolapiMessageService | null = null;
let cachedApiKey: string | null = null;
let cachedApiSecret: string | null = null;

async function getClient(): Promise<SolapiMessageService | null> {
  const apiKey = await getNotificationSettingOrEnv("SOLAPI_API_KEY");
  const apiSecret = await getNotificationSettingOrEnv("SOLAPI_API_SECRET");

  if (!apiKey || !apiSecret) {
    return null;
  }

  // DB/env 값이 바뀌면 클라이언트 재생성
  if (client && cachedApiKey === apiKey && cachedApiSecret === apiSecret) {
    return client;
  }

  client = new SolapiMessageService(apiKey, apiSecret);
  cachedApiKey = apiKey;
  cachedApiSecret = apiSecret;
  return client;
}

// ─── 카카오 알림톡 ───

interface AlimtalkResult {
  channel: string;
  success: boolean;
  error?: string;
  providerMessageId?: string;
  retryable?: boolean;
}

/**
 * Solapi를 통해 카카오 알림톡 발송
 */
export async function sendAlimtalk(
  phone: string,
  templateId: string,
  variables: Record<string, string>
): Promise<AlimtalkResult> {
  const solapi = await getClient();
  const pfId = await getNotificationSettingOrEnv("SOLAPI_KAKAO_PF_ID");
  const from = await getNotificationSettingOrEnv("SOLAPI_SENDER_PHONE");

  if (!solapi || !pfId || !from) {
    // PII 보호: 전화번호는 뒤 4자리만(하이픈 제거 후 마스킹), 개인화 변수는 로깅하지 않음
    console.info(
      `[SOLAPI:ALIMTALK:MOCK] phone=${phone.replace(/-/g, "").replace(/\d(?=\d{4})/g, "*")} template=${templateId}`
    );
    return { channel: "kakao_mock", success: true };
  }

  try {
    await solapi.send([
      {
        to: phone.replace(/-/g, ""),
        from,
        type: "ATA" as const,
        kakaoOptions: {
          pfId,
          templateId,
          variables,
        },
      },
    ]);
    return { channel: "kakao", success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[SOLAPI:ALIMTALK:ERROR] ${message}`);
    return { channel: "kakao", success: false, error: message };
  }
}

// ─── SMS ───

/**
 * Solapi를 통해 SMS 발송
 */
export async function sendSms(
  phone: string,
  text: string,
  options?: { correlationId: string }
): Promise<AlimtalkResult> {
  return (await prepareSms(phone, text, options))();
}

/** Resolve settings before the outbox records a potentially accepted external send. */
export async function prepareSms(
  phone: string,
  text: string,
  options?: { correlationId: string }
): Promise<() => Promise<AlimtalkResult>> {
  const solapi = await getClient();
  const from = await getNotificationSettingOrEnv("SOLAPI_SENDER_PHONE");

  return async () => {
    if (!solapi || !from) {
      // PII 보호: 전화번호는 뒤 4자리만(하이픈 제거 후 마스킹), 본문은 로깅하지 않음
      console.info(
        `[SOLAPI:SMS:MOCK] phone=${phone.replace(/-/g, "").replace(/\d(?=\d{4})/g, "*")} textLen=${text.length}`
      );
      return { channel: "sms_mock", success: true };
    }

    try {
      const receipt = await solapi.send([
        {
          to: phone.replace(/-/g, ""),
          from,
          text,
          ...(options ? { customFields: { guestOutboxId: options.correlationId } } : {}),
        },
      ], options ? { showMessageList: true } : undefined);
      return { channel: "sms", success: true, providerMessageId: receipt.messageList?.[0]?.messageId };
    } catch (error) {
      console.error("[SOLAPI:SMS:ERROR] send_failed");
      return { channel: "sms", success: false, error: "sms_send_failed", retryable: error instanceof MessageNotReceivedError };
    }
  };
}

/** Receipt reconciliation for outbox crash/response-loss recovery. No blind re-send on absence. */
export async function findSmsReceipt(phone: string, correlationId: string, createdAt: Date): Promise<string | null> {
  const solapi = await getClient();
  if (!solapi) return null;
  let startKey: string | undefined;
  for (let page = 0; page < 5; page++) {
    const response = await solapi.getMessages({ to: phone.replace(/-/g, ""),
      startDate: createdAt, dateType: "CREATED", limit: 100, ...(startKey ? { startKey } : {}) });
    for (const [id, message] of Object.entries(response.messageList)) {
      if (message.customFields?.guestOutboxId === correlationId) return message.messageId || id;
    }
    if (!response.nextKey) return null;
    startKey = response.nextKey;
  }
  return null;
}

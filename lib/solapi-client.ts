/**
 * Solapi 클라이언트 모듈
 * ──────────────────────
 * 카카오 알림톡(ATA) / SMS 발송을 Solapi SDK로 통합 처리.
 * DB 설정 우선, 미설정 시 환경변수 폴백. 둘 다 없으면 mock 모드.
 */

import { SolapiMessageService } from "solapi";
import { getNotificationSettingOrEnv, invalidateNotificationCache } from "./system-settings";

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

/**
 * 설정 변경 시 클라이언트 캐시 초기화
 */
export function resetSolapiClient() {
  client = null;
  cachedApiKey = null;
  cachedApiSecret = null;
  invalidateNotificationCache();
}

// ─── 카카오 알림톡 ───

interface AlimtalkResult {
  channel: string;
  success: boolean;
  error?: string;
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
    console.info(
      `[SOLAPI:ALIMTALK:MOCK] phone=${phone} template=${templateId} vars=${JSON.stringify(variables)}`
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
  text: string
): Promise<AlimtalkResult> {
  const solapi = await getClient();
  const from = await getNotificationSettingOrEnv("SOLAPI_SENDER_PHONE");

  if (!solapi || !from) {
    console.info(
      `[SOLAPI:SMS:MOCK] phone=${phone} text="${text.slice(0, 50)}"`
    );
    return { channel: "sms_mock", success: true };
  }

  try {
    await solapi.send([
      {
        to: phone.replace(/-/g, ""),
        from,
        text,
      },
    ]);
    return { channel: "sms", success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[SOLAPI:SMS:ERROR] ${message}`);
    return { channel: "sms", success: false, error: message };
  }
}

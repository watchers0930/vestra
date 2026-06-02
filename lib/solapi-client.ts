/**
 * Solapi 클라이언트 모듈
 * ──────────────────────
 * 카카오 알림톡(ATA) / SMS 발송을 Solapi SDK로 통합 처리.
 * API 키가 없으면 mock 모드(로그만 기록).
 */

import { SolapiMessageService } from "solapi";

// ─── Lazy Init ───

let client: SolapiMessageService | null = null;

function getClient(): SolapiMessageService | null {
  if (client) return client;

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;

  if (!apiKey || !apiSecret) {
    return null;
  }

  client = new SolapiMessageService(apiKey, apiSecret);
  return client;
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
  const solapi = getClient();
  const pfId = process.env.SOLAPI_KAKAO_PF_ID;
  const from = process.env.SOLAPI_SENDER_PHONE;

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
 * Solapi를 통해 SMS 발송 (인프라 준비 — 대장님 API 키 전달 후 활성화)
 */
export async function sendSms(
  phone: string,
  text: string
): Promise<AlimtalkResult> {
  const solapi = getClient();
  const from = process.env.SOLAPI_SENDER_PHONE;

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

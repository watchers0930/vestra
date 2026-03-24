/**
 * VESTRA 알림 발송 모듈
 * ──────────────────────
 * KakaoTalk 알림톡, 이메일 등 멀티채널 알림 발송.
 * KAKAO_ALIMTALK_API_KEY가 없으면 mock 모드(로그만 기록).
 */

import { prisma } from "./prisma";
import { sendPushToUser } from "./push-subscriptions";

// ─── 타입 정의 ───

export type NotificationType =
  | "registry_change"
  | "price_alert"
  | "analysis_complete"
  | "verification_request"
  | "verification_response"
  | "system";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface SendResult {
  channel: string;
  success: boolean;
  error?: string;
}

// ─── 카카오 알림톡 ───

async function sendKakaoAlimtalk(
  phoneNumber: string,
  title: string,
  body: string
): Promise<SendResult> {
  const apiKey = process.env.KAKAO_ALIMTALK_API_KEY;
  const senderKey = process.env.KAKAO_ALIMTALK_SENDER_KEY;

  if (!apiKey || !senderKey) {
    // Mock 모드
    console.info(
      `[NOTIFICATION:KAKAO:MOCK] To=${phoneNumber} Title="${title}" Body="${body.slice(0, 100)}"`
    );
    return { channel: "kakao_mock", success: true };
  }

  try {
    // 실제 Bizm/NHN Cloud 알림톡 API 호출
    const response = await fetch(
      "https://alimtalk-api.bizmsg.kr/v2/sender/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "userId": apiKey,
        },
        body: JSON.stringify({
          senderKey,
          templateCode: "VESTRA_ALERT",
          recipientList: [
            {
              recipientNo: phoneNumber,
              templateParameter: {
                title,
                body: body.slice(0, 1000), // 알림톡 본문 제한
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        channel: "kakao",
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return { channel: "kakao", success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[NOTIFICATION:KAKAO:ERROR] ${message}`);
    return { channel: "kakao", success: false, error: message };
  }
}

// ─── 이메일 (추후 확장) ───

async function sendEmail(
  email: string,
  title: string,
  body: string
): Promise<SendResult> {
  // TODO: 실제 이메일 발송 (Resend, SendGrid 등)
  console.info(
    `[NOTIFICATION:EMAIL:MOCK] To=${email} Title="${title}" Body="${body.slice(0, 100)}"`
  );
  return { channel: "email_mock", success: true };
}

// ─── 메인 발송 함수 ───

/**
 * 사용자에게 알림을 발송한다.
 * NotificationSetting에 따라 활성화된 채널로만 발송.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  try {
    // 사용자 알림 설정 조회
    const setting = await prisma.notificationSetting.findUnique({
      where: { userId: payload.userId },
      include: { user: { select: { email: true } } },
    });

    if (!setting) {
      console.info(
        `[NOTIFICATION:SKIP] userId=${payload.userId} — 알림 설정 없음`
      );
      return results;
    }

    // 알림 타입별 활성 여부 확인
    const typeEnabled = checkTypeEnabled(setting, payload.type);
    if (!typeEnabled) {
      console.info(
        `[NOTIFICATION:SKIP] userId=${payload.userId} type=${payload.type} — 비활성`
      );
      return results;
    }

    // 카카오 알림톡
    if (setting.kakaoEnabled && setting.kakaoPhoneNumber) {
      const kakaoResult = await sendKakaoAlimtalk(
        setting.kakaoPhoneNumber,
        payload.title,
        payload.body
      );
      results.push(kakaoResult);
    }

    // 이메일
    if (setting.emailEnabled && setting.user?.email) {
      const emailResult = await sendEmail(
        setting.user.email,
        payload.title,
        payload.body
      );
      results.push(emailResult);
    }

    // Web Push (항상 시도 — 구독이 없으면 자동 스킵)
    try {
      const pushResult = await sendPushToUser(payload.userId, {
        title: payload.title,
        body: payload.body,
        url: payload.data?.propertyId
          ? `/monitoring/alerts/${payload.data.propertyId}`
          : undefined,
      });
      if (pushResult.sent > 0) {
        results.push({ channel: "web_push", success: true });
      }
    } catch (pushErr) {
      console.error(
        `[NOTIFICATION:PUSH:ERROR] userId=${payload.userId}`,
        pushErr instanceof Error ? pushErr.message : pushErr
      );
    }
  } catch (error) {
    console.error(
      `[NOTIFICATION:ERROR] userId=${payload.userId}`,
      error instanceof Error ? error.message : error
    );
    results.push({
      channel: "system",
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    });
  }

  return results;
}

/**
 * 알림 타입별 활성 여부 확인
 */
function checkTypeEnabled(
  setting: {
    priceAlert: boolean;
    analysisReport: boolean;
    systemNotice: boolean;
  },
  type: NotificationType
): boolean {
  switch (type) {
    case "registry_change":
    case "price_alert":
      return setting.priceAlert;
    case "analysis_complete":
      return setting.analysisReport;
    case "verification_request":
    case "verification_response":
    case "system":
      return setting.systemNotice;
    default:
      return true;
  }
}

/**
 * 다수 사용자에게 일괄 알림 발송 (배치)
 */
export async function sendBulkNotification(
  payloads: NotificationPayload[]
): Promise<Map<string, SendResult[]>> {
  const resultMap = new Map<string, SendResult[]>();

  for (const payload of payloads) {
    const results = await sendNotification(payload);
    resultMap.set(payload.userId, results);
  }

  return resultMap;
}

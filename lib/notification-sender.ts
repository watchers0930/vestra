/**
 * VESTRA 알림 발송 모듈
 * ──────────────────────
 * 웹 푸시 → 카카오 알림톡(Solapi) → SMS(Solapi) 멀티채널 알림 발송.
 * NotificationSetting이 없으면 자동 생성 (fallback).
 */

import { Resend } from "resend";
import { prisma } from "./prisma";
import { sendPushToUser } from "./push-subscriptions";
import { sendAlimtalk, sendSms } from "./solapi-client";
import { getNotificationSettingOrEnv } from "./system-settings";

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

// ─── 알림톡 템플릿 매핑 ───

function getKakaoTemplateId(type: NotificationType): string {
  const registryTemplate = process.env.SOLAPI_TEMPLATE_REGISTRY;
  const defaultTemplate = process.env.SOLAPI_TEMPLATE_DEFAULT || "VESTRA_DEFAULT";

  switch (type) {
    case "registry_change":
      return registryTemplate || defaultTemplate;
    default:
      return defaultTemplate;
  }
}

// ─── 이메일 (Resend) ───

async function sendEmail(
  email: string,
  title: string,
  body: string
): Promise<SendResult> {
  const apiKey = await getNotificationSettingOrEnv("RESEND_API_KEY");
  const fromEmail = await getNotificationSettingOrEnv("RESEND_FROM_EMAIL");

  if (!apiKey || !fromEmail) {
    console.info(
      `[NOTIFICATION:EMAIL:MOCK] To=${email} Title="${title}" Body="${body.slice(0, 100)}"`
    );
    return { channel: "email_mock", success: true };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: title,
      text: body,
    });
    return { channel: "email", success: true };
  } catch (err) {
    console.error(
      "[NOTIFICATION:EMAIL:ERROR]",
      err instanceof Error ? err.message : err
    );
    return {
      channel: "email",
      success: false,
      error: err instanceof Error ? err.message : "이메일 발송 실패",
    };
  }
}

// ─── 메인 발송 함수 ───

/**
 * 사용자에게 알림을 발송한다.
 * NotificationSetting이 없으면 자동 생성하여 기본값으로 발송.
 * 활성화된 채널로만 발송.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  try {
    // 사용자 알림 설정 조회 (없으면 자동 생성)
    let setting = await prisma.notificationSetting.findUnique({
      where: { userId: payload.userId },
      include: { user: { select: { email: true } } },
    });

    if (!setting) {
      console.info(
        `[NOTIFICATION:AUTO_CREATE] userId=${payload.userId} — 알림 설정 자동 생성`
      );
      setting = await prisma.notificationSetting.create({
        data: { userId: payload.userId },
        include: { user: { select: { email: true } } },
      });
    }

    // 알림 타입별 활성 여부 확인
    const typeEnabled = checkTypeEnabled(setting, payload.type);
    if (!typeEnabled) {
      console.info(
        `[NOTIFICATION:SKIP] userId=${payload.userId} type=${payload.type} — 비활성`
      );
      return results;
    }

    // Web Push (webPushEnabled 토글 체크)
    if (setting.webPushEnabled) {
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
    }

    // 카카오 알림톡 (Solapi)
    if (setting.kakaoEnabled && setting.kakaoPhoneNumber) {
      const templateId = getKakaoTemplateId(payload.type);
      const kakaoResult = await sendAlimtalk(
        setting.kakaoPhoneNumber,
        templateId,
        { title: payload.title, body: payload.body.slice(0, 1000) }
      );
      results.push(kakaoResult);
    }

    // SMS (Solapi)
    if (setting.smsEnabled && setting.smsPhoneNumber) {
      const smsResult = await sendSms(
        setting.smsPhoneNumber,
        `[VESTRA] ${payload.title}\n${payload.body}`.slice(0, 90)
      );
      results.push(smsResult);
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
 * registry_change는 독립 토글(registryChangeAlert)로 제어
 */
function checkTypeEnabled(
  setting: {
    registryChangeAlert: boolean;
    priceAlert: boolean;
    analysisReport: boolean;
    systemNotice: boolean;
  },
  type: NotificationType
): boolean {
  switch (type) {
    case "registry_change":
      return setting.registryChangeAlert;
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

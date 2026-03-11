/**
 * 감사 로그 (Audit Trail) 시스템
 * ─────────────────────────────────
 * 공공사업 감리 기준 대응: 누가/언제/무엇을/어디서 모든 주요 액션을 기록.
 * - 비동기 fire-and-forget 패턴 (요청 흐름 차단 없음)
 * - 민감정보 자동 마스킹
 * - rate-limit.ts와 동일한 Prisma 패턴 사용
 *
 * @module lib/audit-log
 */

import { prisma } from "./prisma";
import { maskValue } from "./system-settings";
import { headers } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "SIGNUP"
  | "ROLE_CHANGE"
  | "ADMIN_USER_UPDATE"
  | "ADMIN_USER_DELETE"
  | "ADMIN_SETTINGS_CHANGE"
  | "ANALYSIS_REQUEST"
  | "ANALYSIS_COMPLETE"
  | "RATE_LIMIT_EXCEEDED"
  | "SETTINGS_VIEW"
  | "PASSWORD_CHANGE"
  | "MONITORING_REGISTERED"
  | "VERIFICATION_REQUESTED"
  | "VERIFICATION_ACCEPT"
  | "VERIFICATION_REJECT"
  | "STT_TRANSCRIBE"
  | "CREDIT_CHECK"
  | (string & {}); // 동적 액션 허용 (하위 호환)

export interface AuditParams {
  userId?: string | null;
  action: AuditAction;
  target?: string | null;
  detail?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ---------------------------------------------------------------------------
// 민감정보 마스킹 헬퍼
// ---------------------------------------------------------------------------

const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "clientSecret",
  "secretKey",
];

function maskSensitiveFields(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))
    ) {
      masked[key] =
        typeof value === "string" ? maskValue(value) : "****";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      masked[key] = maskSensitiveFields(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

// ---------------------------------------------------------------------------
// 요청에서 IP / UserAgent 추출
// ---------------------------------------------------------------------------

export async function getRequestMeta(): Promise<{
  ipAddress: string;
  userAgent: string;
}> {
  try {
    const h = await headers();
    // Vercel 제공 헤더 우선 (스푸핑 방지), 그 외 프록시 헤더 폴백
    const ipAddress =
      h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const userAgent = h.get("user-agent") || "unknown";
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: "unknown", userAgent: "unknown" };
  }
}

// ---------------------------------------------------------------------------
// Main: 감사 로그 기록 (fire-and-forget)
// ---------------------------------------------------------------------------

/**
 * 감사 로그를 DB에 기록합니다.
 * 요청 흐름을 차단하지 않는 fire-and-forget 패턴.
 * DB 오류 시에도 원래 요청은 영향받지 않습니다.
 */
export function logAudit(params: AuditParams): void {
  const { userId, action, target, detail, ipAddress, userAgent } = params;

  // 민감정보 마스킹
  const safeDetail = detail ? maskSensitiveFields(detail) : null;

  // fire-and-forget: await 하지 않음
  prisma.auditLog
    .create({
      data: {
        userId: userId || null,
        action,
        target: target || null,
        detail: safeDetail ? JSON.stringify(safeDetail) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      },
    })
    .catch((err) => {
      // 감사 로그 실패가 서비스에 영향을 주면 안 됨
      console.error("[AuditLog] 기록 실패:", err);
    });
}

/**
 * 감사 로그 기록 (요청 컨텍스트에서 IP/UA 자동 추출)
 */
export async function logAuditWithRequest(
  params: Omit<AuditParams, "ipAddress" | "userAgent">
): Promise<void> {
  const meta = await getRequestMeta();
  logAudit({
    ...params,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

// ---------------------------------------------------------------------------
// 편의 래퍼: createAuditLog (새 API 라우트 호환)
// ---------------------------------------------------------------------------

/**
 * Request 객체를 받아 IP/UA를 추출한 뒤 logAudit 호출.
 * 새 API 라우트에서 `createAuditLog({ req, userId, action, target, detail })` 형태로 사용.
 */
export function createAuditLog(params: {
  req?: Request;
  userId?: string | null;
  action: AuditAction;
  target?: string | null;
  detail?: Record<string, unknown> | null;
}): void {
  const { req, userId, action, target, detail } = params;

  let ipAddress = "unknown";
  let userAgent = "unknown";

  if (req) {
    const h = req.headers;
    ipAddress =
      h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    userAgent = h.get("user-agent") || "unknown";
  }

  logAudit({ userId, action, target, detail, ipAddress, userAgent });
}

// ---------------------------------------------------------------------------
// 조회: 관리자 감사 로그 목록
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export async function getAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const { page = 1, limit = 50, action, userId, from, to } = options;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

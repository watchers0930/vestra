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
  | "PII_ACCESS"
  | "PII_ANOMALY"
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
// PII 접근 감사 + 이상탐지 (P0-4)
// ---------------------------------------------------------------------------
//
// 원칙:
//  - 로그에 PII 평문을 절대 담지 않는다. resource(리소스명)·targetId(리소스 id)·건수만.
//  - 완전 fire-and-forget → PII 조회 hot path에 지연 0.
//  - 이상탐지(대량조회)도 비동기·베스트에포트로, 요청 흐름을 막지 않는다.

/** 이상탐지 윈도우(분) */
const PII_ANOMALY_WINDOW_MIN = 5;
/** 윈도우 내 PII 접근 건수 임계 — 초과 시 PII_ANOMALY 기록 */
const PII_ANOMALY_THRESHOLD = 50;

/**
 * PII 조회를 감사 로그에 기록하고, 비정상 대량조회면 이상탐지 이벤트를 남긴다.
 * 완전 fire-and-forget — 호출부는 await 하지 않아도 되며 실패해도 요청에 영향 없음.
 *
 * @param resource - 조회 리소스 논리명 (예: "agent_client_list", "admin_user_list")
 * @param targetId - 대상 식별자 (agentId·clientId 등, PII 아님)
 * @param recordCount - 이번 요청이 노출한 PII 레코드 수
 */
export function recordPiiAccess(params: {
  req?: Request;
  userId?: string | null;
  resource: string;
  targetId?: string | null;
  recordCount: number;
}): void {
  const { req, userId, resource, targetId, recordCount } = params;

  createAuditLog({
    req,
    userId,
    action: "PII_ACCESS",
    target: targetId ?? resource,
    detail: { resource, recordCount },
  });

  // 이상탐지: 로그인 사용자만 대상(게스트는 userId 없음). 비동기·베스트에포트.
  if (userId) {
    void detectPiiAnomaly(userId, req).catch(() => {});
  }
}

/**
 * 최근 윈도우 내 사용자의 PII 접근 건수가 임계를 넘으면 PII_ANOMALY를 남긴다.
 * 동일 윈도우 내 중복 알림 방지를 위해 최근 PII_ANOMALY가 있으면 건너뛴다.
 */
async function detectPiiAnomaly(userId: string, req?: Request): Promise<void> {
  const since = new Date(Date.now() - PII_ANOMALY_WINDOW_MIN * 60_000);

  const [accessCount, recentAnomaly] = await Promise.all([
    prisma.auditLog.count({
      where: { userId, action: "PII_ACCESS", createdAt: { gte: since } },
    }),
    prisma.auditLog.findFirst({
      where: { userId, action: "PII_ANOMALY", createdAt: { gte: since } },
      select: { id: true },
    }),
  ]);

  if (accessCount > PII_ANOMALY_THRESHOLD && !recentAnomaly) {
    createAuditLog({
      req,
      userId,
      action: "PII_ANOMALY",
      target: userId,
      detail: { windowMin: PII_ANOMALY_WINDOW_MIN, accessCount, threshold: PII_ANOMALY_THRESHOLD },
    });
    console.warn(`[PII_ANOMALY] user=${userId} ${accessCount}건/${PII_ANOMALY_WINDOW_MIN}분 (임계 ${PII_ANOMALY_THRESHOLD})`);
  }
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

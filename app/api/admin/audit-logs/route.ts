import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit-log";

/**
 * GET /api/admin/audit-logs
 * 감사 로그 목록 조회 (관리자 전용)
 *
 * Query params:
 * - page: 페이지 번호 (default: 1)
 * - limit: 페이지당 개수 (default: 50, max: 200)
 * - action: 특정 액션 필터 (e.g. LOGIN, ADMIN_USER_DELETE)
 * - userId: 특정 사용자 필터
 * - from: 시작일 (ISO8601)
 * - to: 종료일 (ISO8601)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const action = searchParams.get("action") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  try {
    const result = await getAuditLogs({ page, limit, action, userId, from, to });
    return NextResponse.json({
      logs: result.logs,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    console.error("감사 로그 조회 오류:", error);
    return NextResponse.json({ error: "감사 로그 조회 실패" }, { status: 500 });
  }
}

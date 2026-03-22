import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit-log";
import { withAdminAuth } from "@/lib/with-admin-auth";

/**
 * GET /api/admin/audit-logs
 * 감사 로그 목록 조회 (관리자 전용)
 */
export const GET = withAdminAuth(async (req) => {
  const { searchParams } = req.nextUrl;
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
});

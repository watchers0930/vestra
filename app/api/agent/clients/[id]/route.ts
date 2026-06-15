/**
 * 중개관리 고객 상세/수정/비활성화 API
 * GET:    고객 상세 + 물건 목록
 * PUT:    고객 정보 수정
 * DELETE: 고객 비활성화 (소프트 삭제)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { withAgentAuth } from "@/lib/with-agent-auth";

// ---------------------------------------------------------------------------
// GET — 고객 상세 + 물건 목록
// ---------------------------------------------------------------------------
export const GET = withAgentAuth<{ id: string }>(
  async (_req, { session, params }) => {
    try {
      const client = await prisma.agentClient.findUnique({
        where: { id: params.id },
        include: { properties: true },
      });

      if (!client) {
        return NextResponse.json(
          { error: "고객을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      // 소유권 검증
      if (client.agentId !== session.user.id) {
        return NextResponse.json(
          { error: "접근 권한이 없습니다." },
          { status: 403 }
        );
      }

      return NextResponse.json({ client });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      console.error(`[agent/clients/[id] GET] ${message}`);
      return NextResponse.json(
        { error: "처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  }
);

// ---------------------------------------------------------------------------
// PUT — 고객 정보 수정
// ---------------------------------------------------------------------------
export const PUT = withAgentAuth<{ id: string }>(
  async (req, { session, params }) => {
    try {
      const csrfError = validateOrigin(req);
      if (csrfError) return csrfError;

      const client = await prisma.agentClient.findUnique({
        where: { id: params.id },
      });

      if (!client) {
        return NextResponse.json(
          { error: "고객을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      if (client.agentId !== session.user.id) {
        return NextResponse.json(
          { error: "접근 권한이 없습니다." },
          { status: 403 }
        );
      }

      const body = await req.json();
      const {
        clientName,
        clientPhone,
        clientEmail,
        memo,
        status,
        contractDate,
        propertyAddress,
      } = body;

      // --- 서버 검증 ---
      if (clientName !== undefined) {
        if (
          typeof clientName !== "string" ||
          clientName.trim().length < 2 ||
          clientName.trim().length > 30
        ) {
          return NextResponse.json(
            { error: "고객명은 2~30자로 입력해주세요." },
            { status: 400 }
          );
        }
      }

      if (clientEmail !== undefined && clientEmail !== null) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (
          typeof clientEmail !== "string" ||
          !emailRegex.test(clientEmail)
        ) {
          return NextResponse.json(
            { error: "유효한 이메일 형식을 입력해주세요." },
            { status: 400 }
          );
        }
      }

      // status 화이트리스트 검증
      if (status !== undefined && !["active", "inactive", "invited"].includes(status)) {
        return NextResponse.json(
          { error: "유효하지 않은 상태값입니다." },
          { status: 400 }
        );
      }

      const updated = await prisma.agentClient.update({
        where: { id: params.id },
        data: {
          ...(clientName !== undefined
            ? { clientName: clientName.trim() }
            : {}),
          ...(clientPhone !== undefined ? { clientPhone } : {}),
          ...(clientEmail !== undefined ? { clientEmail } : {}),
          ...(memo !== undefined ? { memo } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(contractDate !== undefined
            ? { contractDate: contractDate ? new Date(contractDate) : null }
            : {}),
          ...(propertyAddress !== undefined ? { propertyAddress } : {}),
        },
      });

      return NextResponse.json({ client: updated });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      console.error(`[agent/clients/[id] PUT] ${message}`);
      return NextResponse.json(
        { error: "처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE — 고객 비활성화 (실제 삭제 X)
// ---------------------------------------------------------------------------
export const DELETE = withAgentAuth<{ id: string }>(
  async (req, { session, params }) => {
    try {
      const csrfError = validateOrigin(req);
      if (csrfError) return csrfError;

      const client = await prisma.agentClient.findUnique({
        where: { id: params.id },
      });

      if (!client) {
        return NextResponse.json(
          { error: "고객을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      if (client.agentId !== session.user.id) {
        return NextResponse.json(
          { error: "접근 권한이 없습니다." },
          { status: 403 }
        );
      }

      await prisma.agentClient.update({
        where: { id: params.id },
        // clientEmail, clientUserId를 null로 클리어해야 unique constraint 해제됨
        // (재등록 시 동일 이메일/userId로 새 레코드 생성 가능)
        data: { status: "inactive", clientEmail: null, clientUserId: null },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      console.error(`[agent/clients/[id] DELETE] ${message}`);
      return NextResponse.json(
        { error: "처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  }
);

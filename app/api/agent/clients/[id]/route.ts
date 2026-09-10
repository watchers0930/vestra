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
import { hashForSearch } from "@/lib/crypto";
import { recordPiiAccess } from "@/lib/audit-log";

// ---------------------------------------------------------------------------
// GET — 고객 상세 + 물건 목록
// ---------------------------------------------------------------------------
export const GET = withAgentAuth<{ id: string }>(
  async (req, { session, params }) => {
    try {
      const client = await prisma.agentClient.findUnique({
        where: { id: params.id },
        include: {
          properties: {
            include: {
              monitoredProperty: {
                select: {
                  id: true,
                  status: true,
                  _count: { select: { snapshots: true } },
                },
              },
            },
          },
        },
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

      // 고객이 VESTRA 가입회원(clientUserId)이면 그 고객의 매물·받은 의향서를 함께 제공
      let clientListings: unknown[] = [];
      let clientApplications: unknown[] = [];
      if (client.clientUserId) {
        [clientListings, clientApplications] = await Promise.all([
          prisma.listing.findMany({
            where: { ownerId: client.clientUserId },
            select: {
              id: true, address: true, listingType: true, status: true, isCertified: true, createdAt: true,
              _count: { select: { applications: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          prisma.contractApplication.findMany({
            where: { listing: { ownerId: client.clientUserId } },
            select: {
              id: true, status: true, moveInDate: true, createdAt: true,
              listing: { select: { address: true } },
              applicant: { select: { name: true, companyName: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
        ]);
      }

      recordPiiAccess({
        req,
        userId: session.user.id,
        resource: "agent_client_detail",
        targetId: params.id,
        recordCount: 1,
      });

      return NextResponse.json({ client, clientListings, clientApplications });
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

      // 이메일 정규화(소문자·trim — hash 기준과 저장값 일치) + blind index 동기화
      let emailUpdate: { clientEmail: string | null; clientEmailHash: string | null } | undefined;
      if (clientEmail !== undefined) {
        const normalized = clientEmail ? String(clientEmail).trim().toLowerCase() : null;
        const emailHash = normalized ? hashForSearch(normalized) : null;
        // 이메일 변경 시 동일 중개사의 다른 활성 고객과 중복 방지(POST와 동일한 409 응답)
        if (emailHash) {
          const dup = await prisma.agentClient.findFirst({
            where: {
              agentId: session.user.id,
              clientEmailHash: emailHash,
              status: { not: "inactive" },
              id: { not: params.id },
            },
            select: { id: true },
          });
          if (dup) {
            return NextResponse.json({ error: "이미 등록된 이메일의 고객입니다." }, { status: 409 });
          }
        }
        emailUpdate = { clientEmail: normalized, clientEmailHash: emailHash };
      }

      const updated = await prisma.agentClient.update({
        where: { id: params.id },
        data: {
          ...(clientName !== undefined
            ? { clientName: clientName.trim() }
            : {}),
          ...(clientPhone !== undefined ? { clientPhone } : {}),
          ...(emailUpdate ?? {}),
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
      // unique(agentId, clientEmailHash) 충돌 → 친절한 409 (500으로 뭉개지 않음)
      if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "이미 등록된 이메일의 고객입니다." }, { status: 409 });
      }
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
        // clientEmailHash, clientUserId를 null로 클리어해야 unique constraint 해제됨
        // (재등록 시 동일 이메일/userId로 새 레코드 생성 가능)
        data: { status: "inactive", clientEmail: null, clientEmailHash: null, clientUserId: null },
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

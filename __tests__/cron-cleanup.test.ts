/**
 * 정기 정리 로직 테스트 — lib/cron/cleanup.ts
 *
 * 핵심(규칙 0-5 오삭제 방지): temp URL은 매물 등록 시 이관 없이 DB에 그대로 저장되므로,
 * DB에 참조된 파일은 24h가 지나도 절대 삭제하면 안 된다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@vercel/blob", () => ({ list: vi.fn(), del: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findMany: vi.fn() },
    auditLog: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
  },
}));

import { list, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { cleanupOrphanTempBlobs, cleanupOldRecords } from "@/lib/cron/cleanup";

const NOW = 1_700_000_000_000; // 고정 기준 시각
const OLD = new Date(NOW - 48 * 60 * 60 * 1000); // 48h 전 (24h 초과)
const RECENT = new Date(NOW - 1 * 60 * 60 * 1000); // 1h 전 (24h 이내)

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PHOTOS_READ_WRITE_TOKEN = "test-photos-token";
  vi.mocked(del).mockResolvedValue(undefined as never);
});

describe("cleanupOrphanTempBlobs — 오삭제 방지", () => {
  it("DB에 참조된 파일은 24h 경과해도 삭제하지 않는다", async () => {
    // 매물이 temp URL을 그대로 참조 중
    vi.mocked(prisma.listing.findMany).mockResolvedValue([
      { photos: ["https://blob/listings/temp/u1/keep.jpg"], safetyDocuments: [{ url: "listings/docs/u1/keep.pdf" }] },
    ] as never);

    vi.mocked(list)
      // public store: listings/temp/*
      .mockResolvedValueOnce({
        blobs: [{ url: "https://blob/listings/temp/u1/keep.jpg", pathname: "listings/temp/u1/keep.jpg", uploadedAt: OLD }],
        hasMore: false,
        cursor: undefined,
      } as never)
      // private store: listings/docs/*
      .mockResolvedValueOnce({
        blobs: [{ url: "https://blob/listings/docs/u1/keep.pdf", pathname: "listings/docs/u1/keep.pdf", uploadedAt: OLD }],
        hasMore: false,
        cursor: undefined,
      } as never);

    const res = await cleanupOrphanTempBlobs(NOW);

    expect(del).not.toHaveBeenCalled();
    expect(res.deleted).toBe(0);
    expect(res.referencedCount).toBe(2);
  });

  it("미참조 + 24h 경과 파일만 삭제한다 (최근 파일·참조 파일은 보존)", async () => {
    vi.mocked(prisma.listing.findMany).mockResolvedValue([
      { photos: ["https://blob/listings/temp/u1/keep.jpg"], safetyDocuments: [] },
    ] as never);

    vi.mocked(list)
      .mockResolvedValueOnce({
        blobs: [
          { url: "https://blob/listings/temp/u1/keep.jpg", pathname: "listings/temp/u1/keep.jpg", uploadedAt: OLD }, // 참조됨 → 보존
          { url: "https://blob/listings/temp/u1/orphan.jpg", pathname: "listings/temp/u1/orphan.jpg", uploadedAt: OLD }, // 고아+오래됨 → 삭제
          { url: "https://blob/listings/temp/u1/fresh.jpg", pathname: "listings/temp/u1/fresh.jpg", uploadedAt: RECENT }, // 고아지만 최근 → 보존
        ],
        hasMore: false,
        cursor: undefined,
      } as never)
      .mockResolvedValueOnce({ blobs: [], hasMore: false, cursor: undefined } as never);

    const res = await cleanupOrphanTempBlobs(NOW);

    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith("https://blob/listings/temp/u1/orphan.jpg", { token: "test-photos-token" });
    expect(res.deleted).toBe(1);
  });

  it("DB 조회 실패 시 예외를 던져 삭제 루프에 도달하지 않는다 (오삭제 원천 차단)", async () => {
    vi.mocked(prisma.listing.findMany).mockRejectedValue(new Error("db down"));
    await expect(cleanupOrphanTempBlobs(NOW)).rejects.toThrow("db down");
    expect(del).not.toHaveBeenCalled();
  });

  it("PHOTOS_READ_WRITE_TOKEN 미설정 시 public store는 건너뛴다", async () => {
    delete process.env.PHOTOS_READ_WRITE_TOKEN;
    vi.mocked(prisma.listing.findMany).mockResolvedValue([] as never);
    vi.mocked(list).mockResolvedValueOnce({ blobs: [], hasMore: false, cursor: undefined } as never); // private만

    const res = await cleanupOrphanTempBlobs(NOW);

    expect(res.publicStoreEnabled).toBe(false);
    expect(list).toHaveBeenCalledTimes(1); // private store 1회만
  });
});

describe("cleanupOldRecords — retention", () => {
  it("AuditLog 365일·Notification 180일 초과분을 삭제한다", async () => {
    vi.mocked(prisma.auditLog.deleteMany).mockResolvedValue({ count: 3 } as never);
    vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 5 } as never);

    const res = await cleanupOldRecords(NOW);

    expect(res.auditDeleted).toBe(3);
    expect(res.notifDeleted).toBe(5);

    const auditArgs = vi.mocked(prisma.auditLog.deleteMany).mock.calls[0][0] as { where: { createdAt: { lt: Date } } };
    const notifArgs = vi.mocked(prisma.notification.deleteMany).mock.calls[0][0] as { where: { createdAt: { lt: Date } } };
    expect(NOW - auditArgs.where.createdAt.lt.getTime()).toBe(365 * 24 * 60 * 60 * 1000);
    expect(NOW - notifArgs.where.createdAt.lt.getTime()).toBe(180 * 24 * 60 * 60 * 1000);
  });
});

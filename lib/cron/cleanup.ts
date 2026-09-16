/**
 * 정기 정리(cleanup) 로직 — /api/cron/cleanup 에서 호출.
 *
 * 1) 폼 이탈 등으로 버려진 temp 업로드(고아 Blob) 정리
 * 2) 무한 누적 테이블(AuditLog·Notification) retention 정리
 *
 * ⚠️ 오삭제 방지가 핵심(규칙 0-5). temp URL은 매물 등록 시 이관 없이
 *    DB(Listing.photos / safetyDocuments[].url)에 "그대로" 저장된다.
 *    → prefix만으로 삭제하면 활성 매물 자산을 지운다.
 *    반드시 DB 참조를 전수 수집한 뒤 "미참조 + 24h 경과" 파일만 삭제한다.
 */
import { list, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const DAY = 24 * 60 * 60 * 1000;
const MAX_DELETE_PER_RUN = 1000; // 회당 삭제 상한 — 폭주·비용 방지
const LIST_PAGE = 1000;

// public store(vestra-photos) 토큰 — 매물 사진(listings/temp/*)용.
// 미설정 시 public temp 정리를 건너뛴다(엉뚱한 기본 store를 건드리지 않기 위함).
function photosToken(): string | undefined {
  return process.env.PHOTOS_READ_WRITE_TOKEN || undefined;
}

/**
 * 버려진 temp 업로드(고아 Blob)만 안전하게 정리한다.
 * - public store: `listings/temp/*` (photos는 blob.url 로 DB 저장 → url 로 대조)
 * - private store: `listings/docs/*` (safetyDocuments[].url 은 blob.pathname 으로 DB 저장 → pathname 으로 대조)
 * 정상 매물 삭제(DELETE /api/listings/[id])는 이미 blob을 정리하므로, 대상은 주로 폼 이탈분이다.
 */
export async function cleanupOrphanTempBlobs(now: number) {
  const cutoff = now - DAY;

  // 1) DB에 참조 중인 모든 blob 식별자 수집.
  //    이 조회가 실패하면(throw) 삭제 루프에 도달하지 못하므로 오삭제가 원천 차단된다.
  const referenced = new Set<string>();
  const listings = await prisma.listing.findMany({
    select: { photos: true, safetyDocuments: true },
  });
  for (const l of listings) {
    const photos = (l.photos as unknown as string[] | null) ?? [];
    for (const url of photos) if (typeof url === "string") referenced.add(url);
    const docs = (l.safetyDocuments as unknown as Array<{ url?: string }> | null) ?? [];
    for (const d of docs) if (d?.url) referenced.add(d.url);
  }

  let scanned = 0;
  let deleted = 0;

  // 2) public store: listings/temp/* — photos는 url 로 저장됨
  const pToken = photosToken();
  if (pToken) {
    let cursor: string | undefined;
    do {
      const res = await list({ prefix: "listings/temp/", cursor, limit: LIST_PAGE, token: pToken });
      for (const b of res.blobs) {
        scanned++;
        if (b.uploadedAt.getTime() < cutoff && !referenced.has(b.url) && deleted < MAX_DELETE_PER_RUN) {
          await del(b.url, { token: pToken }).catch(() => {});
          deleted++;
        }
      }
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor && deleted < MAX_DELETE_PER_RUN);
  }

  // 3) private store(기본 토큰): listings/docs/* — safetyDocuments[].url 은 pathname 으로 저장됨
  {
    let cursor: string | undefined;
    do {
      const res = await list({ prefix: "listings/docs/", cursor, limit: LIST_PAGE });
      for (const b of res.blobs) {
        scanned++;
        if (b.uploadedAt.getTime() < cutoff && !referenced.has(b.pathname) && deleted < MAX_DELETE_PER_RUN) {
          await del(b.url).catch(() => {});
          deleted++;
        }
      }
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor && deleted < MAX_DELETE_PER_RUN);
  }

  return { scanned, deleted, referencedCount: referenced.size, publicStoreEnabled: Boolean(pToken) };
}

// retention 보관기간
const AUDIT_LOG_RETENTION_DAYS = 365; // 감사 로그 1년
const NOTIFICATION_RETENTION_DAYS = 180; // 알림 6개월

/**
 * 무한 누적 테이블 retention 정리.
 * - AuditLog: 365일 초과분 삭제
 * - Notification: 180일 초과분 삭제 (User 삭제 시엔 cascade로 이미 정리됨)
 */
export async function cleanupOldRecords(now: number) {
  const auditCutoff = new Date(now - AUDIT_LOG_RETENTION_DAYS * DAY);
  const notifCutoff = new Date(now - NOTIFICATION_RETENTION_DAYS * DAY);

  const [audit, notif] = await Promise.all([
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
    prisma.notification.deleteMany({ where: { createdAt: { lt: notifCutoff } } }),
  ]);

  return { auditDeleted: audit.count, notifDeleted: notif.count };
}

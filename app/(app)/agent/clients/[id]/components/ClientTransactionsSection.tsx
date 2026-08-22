"use client";

import Link from "next/link";
import { Home, FileText } from "lucide-react";

export interface ClientListing {
  id: string;
  address: string;
  listingType: string;
  status: string;
  isCertified: boolean;
  createdAt: string;
  _count: { applications: number };
}

export interface ClientApplication {
  id: string;
  status: string;
  moveInDate: string;
  createdAt: string;
  listing: { address: string };
  applicant: { name: string | null; companyName: string | null };
}

const LST_STATUS: Record<string, string> = {
  ACTIVE: "공개", HIDDEN: "숨김", CONTRACTED: "계약중", COMPLETED: "완료",
};
const APP_STATUS: Record<string, string> = {
  PENDING: "검토중", ACCEPTED: "수락됨", REJECTED: "거절됨", WITHDRAWN: "철회",
};

/**
 * 중개사 고객 상세 — 그 고객(가입회원)이 등록한 매물과 받은 의향서를 표시.
 * 데이터는 GET /api/agent/clients/[id] 의 clientListings/clientApplications.
 */
export function ClientTransactionsSection({
  listings,
  applications,
}: {
  listings: ClientListing[];
  applications: ClientApplication[];
}) {
  return (
    <div className="space-y-4">
      {/* 고객 등록 매물 */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <Home size={16} className="text-[#6e6e73]" />
          <h2 className="text-sm font-semibold text-[#1d1d1f]">고객 등록 매물 ({listings.length}건)</h2>
        </div>
        {listings.length > 0 ? (
          <div className="space-y-2">
            {listings.map((l) => (
              <Link
                key={l.id}
                href={`/renewal/listing-db-detail?id=${l.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-[#e5e5e7] hover:bg-[#fafafa] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#1d1d1f] truncate">{l.address}</p>
                  <p className="text-xs text-[#86868b] mt-0.5">
                    {l.listingType === "JEONSE" ? "전세" : "매매"} · {LST_STATUS[l.status] ?? l.status} · 의향서 {l._count.applications}건
                    {l.isCertified ? " · 안심인증" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#86868b]">등록한 매물이 없습니다.</p>
        )}
      </div>

      {/* 고객 매물에 온 의향서 */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-[#6e6e73]" />
          <h2 className="text-sm font-semibold text-[#1d1d1f]">고객 매물에 온 의향서 ({applications.length}건)</h2>
        </div>
        {applications.length > 0 ? (
          <div className="space-y-2">
            {applications.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-[#e5e5e7]">
                <p className="text-sm text-[#1d1d1f] truncate">{a.listing.address}</p>
                <p className="text-xs text-[#86868b] mt-0.5">
                  {a.applicant.companyName ?? a.applicant.name ?? "신청인"} · {APP_STATUS[a.status] ?? a.status} · 입주 {new Date(a.moveInDate).toLocaleDateString("ko-KR")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#86868b]">받은 의향서가 없습니다.</p>
        )}
      </div>
    </div>
  );
}

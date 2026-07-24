"use client";

import { useEffect, useState } from "react";
import { FileSignature, CheckCircle, Clock, XCircle, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";

type Signature = { role: string; signedAt: string | null };

type Contract = {
  id: string;
  contractType: string;
  status: string;
  address: string;
  deposit: string;
  tenantEmail: string;
  brokerEmail: string | null;
  finalPdfUrl: string | null;
  createdAt: string;
  signatures: Signature[];
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "초안", color: "bg-gray-100 text-gray-600" },
  PENDING_LANDLORD: { label: "임대인 서명 대기", color: "bg-yellow-100 text-yellow-700" },
  PENDING_TENANT: { label: "임차인 서명 대기", color: "bg-blue-100 text-blue-700" },
  PENDING_BROKER: { label: "중개사 서명 대기", color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "서명 완료", color: "bg-green-100 text-green-700" },
  CANCELED: { label: "취소됨", color: "bg-red-100 text-red-700" },
};

const ROLE_LABEL: Record<string, string> = {
  LANDLORD: "임대인",
  TENANT: "임차인",
  BROKER: "중개사",
};

const TYPE_LABEL: Record<string, string> = {
  JEONSE: "전세",
  MONTHLY: "월세",
  SALE: "매매",
};

function SignBadge({ role, signedAt }: { role: string; signedAt: string | null }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
        signedAt ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"
      }`}
    >
      {signedAt ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

export function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/e-contracts?page=1")
      .then((r) => r.json())
      .then((json) => setContracts(json.contracts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">아직 전자계약이 없습니다.</p>
        <Link
          href="/e-contract"
          className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:underline"
        >
          <Plus className="w-4 h-4" />
          전자계약서 작성하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((c) => {
        const status = STATUS_LABEL[c.status] ?? { label: c.status, color: "bg-gray-100 text-gray-600" };
        const depositAmt = Number(c.deposit).toLocaleString("ko-KR");

        return (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">{TYPE_LABEL[c.contractType] ?? c.contractType}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{c.address}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  보증금 {depositAmt}원 · {c.tenantEmail}
                </p>
              </div>

              {c.finalPdfUrl && (
                <a
                  href={c.finalPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  PDF
                </a>
              )}
            </div>

            {/* 서명 현황 */}
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {c.signatures.map((s) => (
                <SignBadge key={s.role} role={s.role} signedAt={s.signedAt} />
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-2">
              생성일 {new Date(c.createdAt).toLocaleDateString("ko-KR")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

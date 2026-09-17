"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { User, X, FileText, Building2, Eye, Home, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Badge } from "@/components/common";
import { ROLE_LABELS, ROLE_COLORS, VERIFY_LABELS, ANALYSIS_TYPE_LABELS } from "../constants";
import type { UserDetail } from "../types";

interface Props {
  userId: string;
  onClose: () => void;
}

const PLAN_LABELS: Record<string, string> = { FREE: "무료", PRO: "프로", BUSINESS: "비즈니스" };
const SUB_STATUS_LABELS: Record<string, string> = { active: "활성", canceled: "취소됨", expired: "만료" };
const USER_TYPE_LABELS: Record<string, string> = { TENANT: "임차/매수인", LANDLORD: "임대/매도인" };

function fmtDate(v: string | null): string {
  return v ? new Date(v).toLocaleDateString("ko-KR") : "-";
}

export function UserDetailModal({ userId, onClose }: Props) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // userId마다 재마운트되므로(호출부 key={userId}) 초기 state에서 시작 → effect 내 동기 리셋 불필요
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/users/${userId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "회원 정보를 불러오지 못했습니다");
        }
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json.user as UserDetail);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류가 발생했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const counts = data
    ? [
        { icon: FileText, label: "분석 이력", value: data._count.analyses },
        { icon: Home, label: "자산", value: data._count.assets },
        { icon: Eye, label: "등기감시", value: data._count.monitoredProperties },
        { icon: Building2, label: "등록 매물", value: data._count.ownedListings },
      ]
    : [];

  const isBusiness = !!(data?.businessNumber || data?.companyName || data?.representName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">회원 상세</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
            title="닫기"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="py-16 text-center text-sm text-gray-400">불러오는 중…</div>
          )}

          {error && !loading && (
            <div className="py-16 text-center text-sm text-red-500">{error}</div>
          )}

          {data && !loading && (
            <div className="space-y-5">
              {/* 프로필 */}
              <div className="flex items-center gap-4">
                {data.image ? (
                  <Image src={data.image} alt="" width={56} height={56} className="w-14 h-14 rounded-full" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={22} strokeWidth={1.5} className="text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {data.name || data.companyName || "이름 없음"}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{data.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={(ROLE_COLORS[data.role] || "neutral") as never} size="md">
                      {ROLE_LABELS[data.role] || data.role}
                    </Badge>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        data.verifyStatus === "verified" && "text-emerald-600",
                        data.verifyStatus === "pending" && "text-amber-600",
                        data.verifyStatus === "rejected" && "text-red-600",
                        data.verifyStatus === "none" && "text-gray-400",
                      )}
                    >
                      {VERIFY_LABELS[data.verifyStatus] || data.verifyStatus}
                    </span>
                    {data.userType && (
                      <span className="text-xs text-gray-500">
                        · {USER_TYPE_LABELS[data.userType] || data.userType}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 등급 전환 승인 대기 안내 (개인 role인데 상위 등급을 신청한 상태) */}
              {data.verifyStatus === "pending" && data.requestedRole && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
                  <Clock size={16} strokeWidth={1.75} className="text-amber-600 shrink-0" />
                  <span className="text-sm font-medium text-amber-800">
                    {ROLE_LABELS[data.requestedRole] || data.requestedRole} 전환 승인 대기중
                  </span>
                </div>
              )}

              {/* 활동 요약 카운트 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {counts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl border border-border p-3 text-center">
                    <Icon size={16} strokeWidth={1.5} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-lg font-semibold text-gray-900 tabular-nums">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* 구독/결제 */}
              <Card className="p-4">
                <p className="text-xs font-medium text-gray-500 mb-3">구독 / 결제</p>
                {data.subscription ? (
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <Info label="플랜" value={PLAN_LABELS[data.subscription.plan] || data.subscription.plan} />
                    <Info label="상태" value={SUB_STATUS_LABELS[data.subscription.status] || data.subscription.status} />
                    <Info label="월 요금" value={`${data.subscription.price.toLocaleString("ko-KR")}원`} />
                    <Info label="일일 분석한도" value={`${data.dailyLimit}회/일`} />
                    <Info label="시작일" value={fmtDate(data.subscription.startDate)} />
                    <Info label="종료일" value={fmtDate(data.subscription.endDate)} />
                    {data.subscription.canceledAt && (
                      <Info label="취소일" value={fmtDate(data.subscription.canceledAt)} />
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    구독 정보 없음 (무료 · 일일 {data.dailyLimit}회/일)
                  </div>
                )}
              </Card>

              {/* 사업자 / 인증 상세 */}
              {(isBusiness || data.verifyStatus !== "none" || data.requestedRole) && (
                <Card className="p-4">
                  <p className="text-xs font-medium text-gray-500 mb-3">사업자 / 인증</p>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <Info label="사업자번호" value={data.businessNumber || "-"} />
                    <Info label="회사명" value={data.companyName || "-"} />
                    <Info label="대표자" value={data.representName || "-"} />
                    <Info label="인증 상태" value={VERIFY_LABELS[data.verifyStatus] || data.verifyStatus} />
                    {data.requestedRole && (
                      <Info label="신청 등급" value={ROLE_LABELS[data.requestedRole] || data.requestedRole} />
                    )}
                  </div>
                </Card>
              )}

              {/* 최근 분석 이력 */}
              <Card className="p-4">
                <p className="text-xs font-medium text-gray-500 mb-3">
                  최근 분석 이력 {data._count.analyses > data.analyses.length && `(전체 ${data._count.analyses}건 중 최근 ${data.analyses.length}건)`}
                </p>
                {data.analyses.length > 0 ? (
                  <div className="divide-y divide-border">
                    {data.analyses.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 py-2">
                        <Badge variant="neutral" size="sm">
                          {a.typeLabel || ANALYSIS_TYPE_LABELS[a.type] || a.type}
                        </Badge>
                        <span className="text-sm text-gray-700 truncate flex-1">{a.address || "-"}</span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">분석 이력 없음</div>
                )}
              </Card>

              {/* 계정 메타 */}
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm pt-1">
                <Info label="가입일" value={fmtDate(data.createdAt)} />
                <Info label="이메일 인증" value={data.emailVerified ? fmtDate(data.emailVerified) : "미인증"} />
                <Info label="최근 수정" value={fmtDate(data.updatedAt)} />
                <Info label="회원 ID" value={data.id} mono />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={cn("text-gray-800 break-all", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar,
  Plus, FileText, ShieldCheck, ShieldOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { FormInput } from "@/components/forms/FormInput";

interface ClientProperty {
  id: string;
  address: string;
  status: string;
  createdAt: string;
}

interface ClientDetail {
  id: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientUserId?: string | null;
  status: string;
  memo?: string | null;
  propertyAddress?: string | null;
  contractDate?: string | null;
  createdAt: string;
  properties: ClientProperty[];
}

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "info" | "neutral" }> = {
  active: { label: "활성", variant: "success" },
  invited: { label: "초대중", variant: "info" },
  inactive: { label: "비활성", variant: "neutral" },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 물건 추가
  const [newAddress, setNewAddress] = useState("");
  const [addingProperty, setAddingProperty] = useState(false);
  const [propertyError, setPropertyError] = useState("");

  const loadClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/clients/${id}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "고객 정보를 불러올 수 없습니다.");
        return;
      }
      const data = await res.json();
      setClient(data.client);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  // 물건 추가
  async function handleAddProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!newAddress.trim()) return;

    setAddingProperty(true);
    setPropertyError("");

    try {
      const res = await fetch(`/api/agent/clients/${id}/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: newAddress.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPropertyError(data.error || "물건 추가에 실패했습니다.");
        return;
      }

      setNewAddress("");
      loadClient();
    } catch {
      setPropertyError("네트워크 오류가 발생했습니다.");
    } finally {
      setAddingProperty(false);
    }
  }

  // 로딩
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        <Skeleton variant="text" className="h-6 w-48" />
        <Skeleton variant="card" className="h-[200px]" />
        <Skeleton variant="card" className="h-[160px]" />
      </div>
    );
  }

  // 에러
  if (error || !client) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/agent" className="inline-flex items-center gap-1.5 text-sm text-[#6e6e73] hover:text-primary mb-6">
          <ArrowLeft size={16} /> 중개관리로 돌아가기
        </Link>
        <p className="text-center text-[#86868b] py-12">{error || "고객 정보를 찾을 수 없습니다."}</p>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.inactive;
  const isTypeA = !!client.clientUserId; // VESTRA 가입 고객 (A타입)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* 뒤로가기 */}
      <Link href="/agent" className="inline-flex items-center gap-1.5 text-sm text-[#6e6e73] hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={16} /> 중개관리로 돌아가기
      </Link>

      <div className="space-y-6">
        {/* 고객 정보 카드 */}
        <Card>
          <CardContent>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f5f7]">
                  <User size={20} className="text-[#6e6e73]" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#1d1d1f]">{client.clientName}</h1>
                  <p className="text-xs text-[#86868b]">등록일: {formatDate(client.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* A/B 타입 배지 */}
                {isTypeA ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-700"
                    style={{ background: "rgba(0,113,227,0.07)", color: "#0071e3", border: "1px solid rgba(0,113,227,0.18)" }}
                  >
                    <ShieldCheck size={11} />
                    VESTRA 가입
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-700"
                    style={{ background: "rgba(110,110,115,0.07)", color: "#6e6e73", border: "1px solid rgba(110,110,115,0.18)" }}
                  >
                    <ShieldOff size={11} />
                    미가입 고객
                  </span>
                )}
                <Badge variant={statusCfg.variant} size="md">{statusCfg.label}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {client.clientPhone && (
                <div className="flex items-center gap-2 text-sm text-[#424245]">
                  <Phone size={14} className="text-[#86868b]" />
                  {client.clientPhone}
                </div>
              )}
              {client.clientEmail && (
                <div className="flex items-center gap-2 text-sm text-[#424245]">
                  <Mail size={14} className="text-[#86868b]" />
                  {client.clientEmail}
                </div>
              )}
              {client.propertyAddress && (
                <div className="flex items-center gap-2 text-sm text-[#424245]">
                  <MapPin size={14} className="text-[#86868b]" />
                  {client.propertyAddress}
                </div>
              )}
              {client.contractDate && (
                <div className="flex items-center gap-2 text-sm text-[#424245]">
                  <Calendar size={14} className="text-[#86868b]" />
                  계약일: {formatDate(client.contractDate)}
                </div>
              )}
            </div>

            {client.memo && (
              <div className="mt-4 p-3 rounded-lg bg-[#f5f5f7] text-sm text-[#424245]">
                <p className="text-xs font-medium text-[#86868b] mb-1">메모</p>
                {client.memo}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 물건 목록 */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-[#6e6e73]" />
              <h2 className="text-sm font-semibold text-[#1d1d1f]">
                물건 목록 ({client.properties.length}건)
              </h2>
            </div>

            {client.properties.length > 0 ? (
              <div className="space-y-2 mb-5">
                {client.properties.map((prop) => (
                  <div
                    key={prop.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#e5e5e7] hover:bg-[#fafafa] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={13} className="text-[#86868b] shrink-0" />
                      <span className="text-sm text-[#1d1d1f] truncate">{prop.address}</span>
                    </div>
                    <span className="text-[11px] text-[#86868b] shrink-0 ml-3">
                      {formatDate(prop.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* B타입이고 물건 없을 때 안내 */
              !isTypeA ? (
                <div
                  className="mb-5 p-4 rounded-xl"
                  style={{ background: "rgba(255,149,0,0.06)", border: "1px solid rgba(255,149,0,0.20)" }}
                >
                  <p className="text-[12.5px] font-semibold text-[#b86f00] mb-1">등기감시 물건이 없습니다</p>
                  <p className="text-[12px] text-[#6e6e73] leading-relaxed">
                    이 고객은 VESTRA에 가입되어 있지 않아 자동 연결이 불가합니다.<br />
                    아래에서 물건 주소를 직접 등록하면 중개인 명의로 등기 변경감시가 시작됩니다.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#86868b] mb-5">등록된 물건이 없습니다.</p>
              )
            )}

            {/* 물건 추가 폼 */}
            <form onSubmit={handleAddProperty} className="flex items-end gap-2">
              <div className="flex-1">
                <FormInput
                  label={isTypeA ? "물건 추가" : "물건 주소 등록 (등기 변경감시 시작)"}
                  placeholder="예: 경기도 광명시 철산동 367 108동 1403호"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Plus}
                loading={addingProperty}
                disabled={!newAddress.trim()}
                className="mb-px"
              >
                {isTypeA ? "추가" : "감시 시작"}
              </Button>
            </form>
            {propertyError && (
              <p className="mt-1.5 text-xs text-red-500">{propertyError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

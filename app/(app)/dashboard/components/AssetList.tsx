"use client";

import Link from "next/link";
import { BarChart3, Clock, Shield, TrendingUp, Calculator, Eye, CheckCircle, Loader2 } from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import type { StoredAsset } from "@/lib/store";
import type { Session } from "next-auth";

interface Props {
  assets: StoredAsset[];
  session: Session | null;
  monitoringLoading: string | null;
  monitoredAddresses: Set<string>;
  handleMonitorRegister: (address: string) => void;
}

export function AssetList({ assets, session, monitoringLoading, monitoredAddresses, handleMonitorRegister }: Props) {
  if (assets.length === 0) return null;

  return (
    <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#1d1d1f]">관리 자산</h2>
          <p className="text-xs text-[#6e6e73] mt-0.5">분석된 부동산 목록</p>
        </div>
        <span className="text-xs font-semibold text-[#1d1d1f] bg-[#f5f5f7] px-2.5 py-1 rounded-full">
          {assets.length}건
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="rounded-xl border border-gray-100 p-4 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-[#1d1d1f] truncate max-w-[200px]">{asset.address}</p>
                <p className="text-xs text-[#6e6e73] mt-0.5">{asset.type}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5f5f7]">
                <BarChart3 className="h-4 w-4 text-[#1d1d1f]" strokeWidth={1.5} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#6e6e73]">추정 시세</span>
                <span className="font-semibold text-primary">{formatKRW(asset.estimatedPrice)}</span>
              </div>
              {asset.jeonsePrice && asset.jeonsePrice > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#6e6e73]">전세가</span>
                  <span className="font-medium text-[#1d1d1f]">{formatKRW(asset.jeonsePrice)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-[#6e6e73]">안전지수</span>
                <span className={cn(
                  "font-semibold",
                  asset.safetyScore >= 70 ? "text-emerald-600" : asset.safetyScore >= 40 ? "text-amber-600" : "text-red-600"
                )}>
                  {asset.safetyScore}점
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] text-[#6e6e73] flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(asset.lastAnalyzedDate).toLocaleDateString("ko-KR")}
              </p>
              <div className="flex items-center gap-1">
                <Link href="/rights" onClick={() => localStorage.setItem("vestra_last_address", asset.address)}
                  className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all" title="권리분석">
                  <Shield size={16} strokeWidth={1.5} />
                </Link>
                <Link href="/prediction" onClick={() => localStorage.setItem("vestra_last_address", asset.address)}
                  className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all" title="시세전망">
                  <TrendingUp size={16} strokeWidth={1.5} />
                </Link>
                <Link href="/tax" onClick={() => localStorage.setItem("vestra_last_address", asset.address)}
                  className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all" title="세무">
                  <Calculator size={16} strokeWidth={1.5} />
                </Link>
                {session?.user && (
                  <button
                    onClick={() => handleMonitorRegister(asset.address)}
                    disabled={monitoringLoading === asset.address || monitoredAddresses.has(asset.address)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      monitoredAddresses.has(asset.address)
                        ? "text-emerald-500 bg-emerald-50 cursor-default"
                        : "text-[#6e6e73] hover:text-primary hover:bg-primary/5"
                    )}
                    title={monitoredAddresses.has(asset.address) ? "이미 등록됨" : "모니터링"}
                  >
                    {monitoringLoading === asset.address ? (
                      <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                    ) : monitoredAddresses.has(asset.address) ? (
                      <CheckCircle size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

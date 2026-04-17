"use client";

import { ShieldAlert, Landmark, AlertTriangle, ShieldCheck, Shield, FileText, Info } from "lucide-react";
import { Card } from "@/components/common";

export function SafetyChecklist() {
  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#1d1d1f]">
        <ShieldAlert size={18} className="text-amber-500" />
        계약 전 안전 체크리스트
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
          <div className="flex items-start gap-2.5">
            <Landmark size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">세금 체납 확인</p>
              <p className="mt-1 text-xs leading-relaxed text-red-600">
                임대인의 <strong>국세·지방세 완납증명원</strong>을 요구하세요.
                체납 세금은 근저당보다 우선 변제되어 보증금 회수에 직접 영향을 줍니다.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">등기부 말소 이력 확인</p>
              <p className="mt-1 text-xs leading-relaxed text-orange-600">
                등기부를 <strong>&apos;말소 사항 포함&apos;</strong>으로 발급받아 과거 이력을 확인하고,
                최근 말소된 근저당은 해당 은행에 직접 정상 상환 여부를 확인하세요.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">전세보증보험 가입</p>
              <p className="mt-1 text-xs leading-relaxed text-blue-600">
                <strong>HUG</strong> 또는 <strong>SGI</strong>의 전세보증금반환보증에 반드시 가입하세요.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="flex items-start gap-2.5">
            <Shield size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-800">권원보험 (Title Insurance)</p>
              <p className="mt-1 text-xs leading-relaxed text-indigo-600">
                소유권 사기·서류 위조 피해를 보상하는 보험입니다.
                매매가 3억 기준 약 <strong>10~15만원</strong>으로 가입 가능합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 sm:col-span-2">
          <div className="flex items-start gap-2.5">
            <FileText size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">등기 상태 유지 특약</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-600">
                <strong>&quot;잔금일까지 등기 상태 유지, 위반 시 계약 해제 및 배액 배상&quot;</strong> 특약을 반드시 기재하세요.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-600">
        <Info size={12} />
        <span>등기부등본에는 법적 &apos;공신력&apos;이 없습니다. 등기 내용이 실제와 달라도 국가가 보호하지 않으므로 위 항목을 반드시 확인하세요.</span>
      </div>
    </Card>
  );
}

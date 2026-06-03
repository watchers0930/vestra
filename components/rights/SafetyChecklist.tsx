"use client";

import {
  Shield,
  AlertTriangle,
  FileText,
  ShieldCheck,
  FileCheck,
  Landmark,
} from "lucide-react";
import { Card } from "@/components/common";

export function SafetyChecklist() {
  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileCheck size={18} strokeWidth={1.5} className="text-[#1d1d1f]" />
        거래 전 안전 체크리스트
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2.5">
            <Landmark size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">세금 체납 확인</p>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                집주인의 <strong>국세·지방세 완납증명원</strong>을 반드시 요구하세요.
                체납 세금(당해세)은 근저당보다 <strong>우선 변제</strong>되어 보증금 회수에 직접 영향을 줍니다.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">말소 이력 직접 확인</p>
              <p className="text-xs text-orange-600 mt-1 leading-relaxed">
                최근 1년 내 근저당이 말소되었다면, 해당 <strong>은행에 직접 전화</strong>하여
                정상 상환 여부를 확인하세요. 말소 서류 위조로 등기부만 깨끗해진 경우가 있습니다.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">전세보증보험 가입</p>
              <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                <strong>HUG(주택도시보증공사)</strong> 또는 <strong>SGI(서울보증보험)</strong>의
                전세보증금반환보증에 반드시 가입하세요. 임대인 부도 시 보증금을 보장합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-2.5">
            <Shield size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-indigo-800">권원보험 (Title Insurance)</p>
              <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
                소유권 관련 사기·서류 위조·등기 오류로 인한 피해를 보상하는 보험입니다.
                매매가 3억 기준 일시불 약 <strong>10~15만원</strong>으로 가입 가능합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg md:col-span-2">
          <div className="flex items-start gap-2.5">
            <FileText size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">등기 상태 유지 특약 명시</p>
              <p className="text-xs text-emerald-600 mt-1 leading-relaxed">
                계약서에 <strong>&quot;잔금일까지 현재의 등기 상태를 유지하며, 위반 시 계약 해제 및 배액 배상한다&quot;</strong>는
                취지의 특약을 반드시 기재하세요. 계약 후 잔금일 전에 근저당 추가, 가압류 등이 발생하는 것을 방지합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

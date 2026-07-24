"use client";

import { Plus } from "lucide-react";

const RECOMMENDED_TERMS = [
  "임차인은 잔금 지급 전 확정일자를 받고 전입신고를 완료한다.",
  "임대인은 계약 만료 후 보증금을 현금으로 반환한다.",
  "임차인은 임대인의 동의 없이 반려동물을 사육하지 않는다.",
  "에어컨, 세탁기 등 기존 비치 가전의 수리 비용은 임대인이 부담한다.",
  "계약 기간 중 임대인은 임차인 동의 없이 입주를 요구할 수 없다.",
  "보증금 반환을 위한 주택도시보증공사(HUG) 전세보증보험 가입에 임대인이 협조한다.",
  "임차인은 퇴거 시 원상복구 의무를 지되, 정상 마모는 제외한다.",
  "임대차 계약 종료 2개월 전 서면으로 갱신 의사를 상호 통보한다.",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onAppend: (term: string) => void;
}

export function SpecialTermsEditor({ value, onChange, onAppend }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          특약사항 직접 입력
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder="특약사항을 입력하거나, 아래 추천 특약을 클릭해서 추가하세요."
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          maxLength={2000}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{value.length}/2000</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">추천 특약 (클릭하면 추가)</p>
        <div className="flex flex-wrap gap-2">
          {RECOMMENDED_TERMS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => onAppend(term)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {term.length > 30 ? term.slice(0, 30) + "…" : term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

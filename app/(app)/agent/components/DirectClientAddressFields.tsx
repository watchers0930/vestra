"use client";

import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { DaumPostcodeModal } from "@/components/keepzip/DaumPostcodeModal";
import type { PostcodeResult } from "@/lib/keepzip/daum-postcode";

interface Props {
  base: string;
  detail: string;
  isBuilding: boolean;
  dong: string;
  ho: string;
  onBaseChange: (v: string) => void;
  onDetailChange: (v: string) => void;
  onIsBuildingChange: (v: boolean) => void;
  onDongChange: (v: string) => void;
  onHoChange: (v: string) => void;
}

const numInputCls =
  "flex-1 px-3 py-2 rounded-lg border border-[#e5e5e7] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

/**
 * 미가입 고객 물건 주소 입력.
 * - 다음(Daum) 우편번호 팝업으로 주소 선택
 * - 집합건물(아파트·공동주택)은 자동감지되며, 수동 토글로도 전환 가능
 * - 집합건물이면 동/호를 따로 입력, 아니면 상세주소 한 칸
 */
export function DirectClientAddressFields({
  base, detail, isBuilding, dong, ho,
  onBaseChange, onDetailChange, onIsBuildingChange, onDongChange, onHoChange,
}: Props) {
  const [showPostcode, setShowPostcode] = useState(false);

  function handlePostcode(r: PostcodeResult) {
    onBaseChange(r.roadAddress || r.jibunAddress);
    onIsBuildingChange(r.isBuilding);
  }

  return (
    <div>
      <label className="block text-[11px] font-600 text-[#6e6e73] mb-1">
        물건 주소 (등기감시 시작)
      </label>

      {/* 다음 우편번호 검색 버튼 */}
      <button
        type="button"
        onClick={() => setShowPostcode(true)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-[#e5e5e7] text-sm text-left hover:bg-[#f5f5f7] transition-colors"
      >
        <Search size={15} className="text-primary shrink-0" />
        <span className={base ? "text-[#1d1d1f]" : "text-[#8e8e93]"}>
          {base || "주소 검색 (다음 우편번호)"}
        </span>
      </button>

      {base && (
        <p className="mt-1.5 text-xs text-[#8e8e93] flex items-start gap-1">
          <MapPin size={11} className="mt-0.5 shrink-0" />
          {base}
        </p>
      )}

      {/* 집합건물 여부 (자동감지 + 수동 토글) */}
      {base && (
        <label className="mt-2.5 flex items-center gap-2 text-xs text-[#3d3d3f] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isBuilding}
            onChange={(e) => onIsBuildingChange(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          집합건물(아파트·공동주택) — 동·호수 따로 입력
        </label>
      )}

      {/* 동/호 입력 (집합건물) */}
      {base && isBuilding && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={dong}
            onChange={(e) => onDongChange(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="동 (예: 101)"
            className={numInputCls}
          />
          <input
            type="text"
            inputMode="numeric"
            value={ho}
            onChange={(e) => onHoChange(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="호 (예: 1502)"
            className={numInputCls}
          />
        </div>
      )}

      {/* 상세 주소 (비집합건물) */}
      {base && !isBuilding && (
        <input
          type="text"
          value={detail}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder="상세 주소 (동·층·호 등)"
          className="mt-2 w-full px-3 py-2 rounded-lg border border-[#e5e5e7] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      )}

      {showPostcode && (
        <DaumPostcodeModal onComplete={handlePostcode} onClose={() => setShowPostcode(false)} />
      )}
    </div>
  );
}

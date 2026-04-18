"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/common";
import { KakaoMap } from "@/components/prediction/KakaoMap";
import type { AddressTab, AddressInfo } from "../types";

interface Props {
  address: string;
  addressInfo: AddressInfo | null;
  addressTab: AddressTab;
  setAddressTab: (tab: AddressTab) => void;
  buildingName: string;
  selectedApt: string | null;
}

export function AddressInfoCard({ address, addressInfo, addressTab, setAddressTab, buildingName, selectedApt }: Props) {
  return (
    <Card className="p-4 mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <MapPin size={16} strokeWidth={1.5} />위치
      </h3>
      {addressInfo && address && (
        <div className="p-3 mb-3 bg-[#f5f5f7] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-[#6e6e73]">주소</p>
            <div className="flex gap-1">
              {([
                { key: "admin" as AddressTab, label: "행정동" },
                { key: "jibun" as AddressTab, label: "지번" },
                { key: "road" as AddressTab, label: "도로명" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAddressTab(tab.key)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded-md border transition-all",
                    addressTab === tab.key
                      ? "bg-[#1d1d1f] text-white border-[#1d1d1f]"
                      : "bg-white text-[#6e6e73] border-[#e5e5e7] hover:bg-[#f5f5f7]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm font-medium text-[#1d1d1f]">{addressInfo[addressTab]}</p>
          {(buildingName || selectedApt) && (
            <p className="text-xs text-[#6e6e73] mt-1 font-medium">{selectedApt || buildingName}</p>
          )}
          {addressInfo.zipCode && addressInfo.zipCode !== "-" && (
            <p className="text-[11px] text-[#6e6e73] mt-1">우편번호: {addressInfo.zipCode}</p>
          )}
        </div>
      )}
      {address ? (
        <KakaoMap address={address} />
      ) : (
        <div className="h-[300px] rounded-xl bg-[#e5e5e7] flex items-center justify-center text-secondary text-sm">
          지역을 선택해 주세요
        </div>
      )}
    </Card>
  );
}

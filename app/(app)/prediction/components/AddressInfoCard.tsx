"use client";

import { MapPin } from "lucide-react";
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
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        padding: "24px",
        marginBottom: "20px",
      }}
    >
      <h3
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          fontSize: "13px",
          fontWeight: 600,
          color: "#6e6e73",
          marginBottom: "14px",
        }}
      >
        <MapPin size={14} strokeWidth={1.5} style={{ color: "#1d1d1f" }} />
        위치
      </h3>

      {addressInfo && address && (
        <div
          style={{
            padding: "12px 14px",
            marginBottom: "14px",
            background: "#f5f5f7",
            borderRadius: "12px",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <p style={{ fontSize: "11px", color: "#6e6e73" }}>주소</p>
            <div style={{ display: "flex", gap: "4px" }}>
              {([
                { key: "admin" as AddressTab, label: "행정동" },
                { key: "jibun" as AddressTab, label: "지번" },
                { key: "road" as AddressTab, label: "도로명" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAddressTab(tab.key)}
                  style={{
                    padding: "2px 8px",
                    fontSize: "10px",
                    borderRadius: "6px",
                    border: addressTab === tab.key ? "none" : "1px solid rgba(0,0,0,0.10)",
                    background: addressTab === tab.key ? "#0071e3" : "#fff",
                    color: addressTab === tab.key ? "#fff" : "#6e6e73",
                    cursor: "pointer",
                    fontWeight: addressTab === tab.key ? 600 : 400,
                    transition: "all 0.12s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>{addressInfo[addressTab]}</p>
          {(buildingName || selectedApt) && (
            <p style={{ fontSize: "11.5px", color: "#6e6e73", marginTop: "4px", fontWeight: 500 }}>
              {selectedApt || buildingName}
            </p>
          )}
          {addressInfo.zipCode && addressInfo.zipCode !== "-" && (
            <p style={{ fontSize: "11px", color: "#aeaeb2", marginTop: "4px" }}>우편번호: {addressInfo.zipCode}</p>
          )}
        </div>
      )}

      {address ? (
        <KakaoMap address={address} />
      ) : (
        <div
          style={{
            height: "300px",
            borderRadius: "14px",
            background: "#f5f5f7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            color: "#aeaeb2",
          }}
        >
          지역을 선택해 주세요
        </div>
      )}
    </div>
  );
}

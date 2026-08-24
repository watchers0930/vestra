"use client";

import { useEffect, useState } from "react";
import type { ContractPrefill } from "@/lib/keepzip/use-keepzip-draft";

interface Props {
  /** 현재 연결된 계약 id (선택됨 표시용) */
  selectedId: string | null;
  onSelect: (c: ContractPrefill) => void;
  onClear: () => void;
}

const TYPE_LABEL: Record<string, string> = { JEONSE: "전세", MONTHLY: "월세" };

/** 내 완료 계약 불러오기 — 보증금반환청구 프리필(갭1). 계약이 없으면 렌더 안 함. */
export function MyContractPicker({ selectedId, onSelect, onClear }: Props) {
  const [list, setList] = useState<ContractPrefill[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/keepzip/my-contracts")
      .then((r) => (r.ok ? r.json() : { contracts: [] }))
      .then((d) => { if (alive) setList(Array.isArray(d.contracts) ? d.contracts : []); })
      .catch(() => { if (alive) setList([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading || !list || list.length === 0) return null;

  const box: React.CSSProperties = {
    border: "1.5px solid #d8dcea", borderRadius: 10, padding: "12px 14px",
    background: "#f7f9ff", marginBottom: 16,
  };
  const item = (on: boolean): React.CSSProperties => ({
    display: "block", width: "100%", textAlign: "left", cursor: "pointer",
    border: `1.5px solid ${on ? "#2e4bd8" : "#d8dcea"}`, borderRadius: 8,
    background: on ? "#eef1fd" : "#fff", padding: "9px 11px", marginTop: 8,
    fontSize: 12.5, color: "#1a1d2e",
  });

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#2e4bd8" }}>내 계약에서 불러오기</span>
        {selectedId && (
          <button type="button" onClick={onClear}
            style={{ fontSize: 11, color: "#6b7180", background: "none", border: "none", cursor: "pointer" }}>
            연결 해제
          </button>
        )}
      </div>
      <p style={{ fontSize: 11, color: "#6b7180", marginTop: 3 }}>
        계약을 선택하면 임대인·주소·보증금·계약일이 자동 입력됩니다.
      </p>
      {list.map((c) => {
        const on = selectedId === c.id;
        return (
          <button key={c.id} type="button" style={item(on)} onClick={() => onSelect(c)}>
            <div style={{ fontWeight: 600 }}>
              {TYPE_LABEL[c.contractType] ?? c.contractType} · {c.address}
            </div>
            <div style={{ fontSize: 11, color: "#6b7180", marginTop: 2 }}>
              임대인 {c.landlordName || "-"}
              {c.deposit ? ` · 보증금 ${Number(c.deposit).toLocaleString()}원` : ""}
              {c.startDate ? ` · 계약일 ${c.startDate}` : ""}
              {on ? "  ✓ 연결됨" : ""}
            </div>
          </button>
        );
      })}
    </div>
  );
}

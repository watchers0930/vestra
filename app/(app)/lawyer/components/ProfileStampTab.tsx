"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";
import { SignaturePad } from "@/app/(app)/e-contract/components/SignaturePad";

/** 전자직인 등록 탭 — 내용증명 승인 시 이 직인이 문서에 날인된다. */
export function ProfileStampTab() {
  const { showToast } = useToast();
  const [saved, setSaved] = useState<string>(""); // 저장된 직인(미리보기)
  const [stamp, setStamp] = useState<string>(""); // 새로 그린 직인
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/keepzip/expert/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.profile) setSaved(d.profile.stampImageUrl ?? ""); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const save = async () => {
    if (!stamp) { showToast("직인을 그린 뒤 저장해 주세요.", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/keepzip/expert/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stampImageUrl: stamp }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        setSaved(stamp);
        showToast("전자직인이 저장되었습니다.", "success");
      } else {
        showToast(d?.error ?? "저장 실패", "error");
      }
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-bold mb-1">전자직인</h2>
      <p className="text-sm text-gray-500 mb-4">
        내용증명을 승인하면 이 직인이 문서에 날인됩니다. 직인을 등록해야 검수·승인이 가능합니다.
      </p>

      {saved && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">현재 등록된 직인</p>
          <img src={saved} alt="등록된 전자직인" className="h-24 rounded-lg border border-gray-200 bg-white p-2 object-contain" />
        </div>
      )}

      <p className="text-xs text-gray-500 mb-1">{saved ? "새 직인으로 교체하려면 아래에 다시 그리세요" : "아래에 직인·서명을 그려 등록하세요"}</p>
      <SignaturePad value={stamp} onChange={setStamp} label="전자직인" />
      <div className="mt-3">
        <Button variant="primary" onClick={save} loading={saving}>직인 저장</Button>
      </div>
    </div>
  );
}

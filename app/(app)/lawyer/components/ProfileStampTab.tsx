"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, PenLine } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";
import { SignaturePad } from "@/app/(app)/e-contract/components/SignaturePad";

const MAX_BYTES = 2_000_000;

/** 전자직인 등록 탭 — 도장 이미지 업로드 또는 직접 그리기. 승인 시 이 직인이 문서에 날인된다. */
export function ProfileStampTab() {
  const { showToast } = useToast();
  const [saved, setSaved] = useState<string>(""); // 서버에 저장된 직인
  const [stamp, setStamp] = useState<string>(""); // 새로 등록할 직인(업로드/그리기)
  const [mode, setMode] = useState<"upload" | "draw">("upload");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/keepzip/expert/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.profile) setSaved(d.profile.stampImageUrl ?? ""); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(png|jpe?g|gif)/.test(file.type)) {
      showToast("PNG·JPG·GIF 이미지만 등록할 수 있습니다.", "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      showToast("2MB 이하 이미지만 등록할 수 있습니다.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setStamp(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!stamp) { showToast("직인을 등록한 뒤 저장해 주세요.", "error"); return; }
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
        setStamp("");
        if (fileRef.current) fileRef.current.value = "";
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
        내용증명을 승인하면 이 직인이 문서에 날인됩니다. <strong>직인을 등록해야 검수·승인이 가능</strong>합니다.
      </p>

      {saved && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">현재 등록된 직인</p>
          <img src={saved} alt="등록된 전자직인" className="h-24 rounded-lg border border-gray-200 bg-white p-2 object-contain" />
        </div>
      )}

      {/* 등록 방식 선택 */}
      <div className="mb-3 inline-flex rounded-lg border border-gray-200 p-0.5">
        <button
          type="button"
          onClick={() => { setMode("upload"); setStamp(""); }}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === "upload" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Upload size={13} /> 이미지 업로드
        </button>
        <button
          type="button"
          onClick={() => { setMode("draw"); setStamp(""); }}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === "draw" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <PenLine size={13} /> 직접 그리기
        </button>
      </div>

      {mode === "upload" ? (
        <div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif" onChange={onFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-8 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <Upload size={22} strokeWidth={1.5} />
            <span className="text-sm">도장 이미지 선택 (PNG·JPG·GIF, 2MB 이하)</span>
          </button>
          {stamp && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">선택한 직인 미리보기</p>
              <img src={stamp} alt="직인 미리보기" className="h-24 rounded-lg border border-blue-200 bg-white p-2 object-contain" />
            </div>
          )}
        </div>
      ) : (
        <SignaturePad value={stamp} onChange={setStamp} label="직인" />
      )}

      <div className="mt-4">
        <Button variant="primary" onClick={save} loading={saving} disabled={!stamp}>직인 저장</Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";

const MAX = 3_000_000;

/** 프로필 사진 + 한 줄 소개 편집 탭 — 전문가 목록·프로필 모달에 노출 */
export function ProfilePhotoTab() {
  const { showToast } = useToast();
  const [photo, setPhoto] = useState("");
  const [headline, setHeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/keepzip/expert/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.profile) { setPhoto(d.profile.photoUrl ?? ""); setHeadline(d.profile.headline ?? ""); } })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/image\/(png|jpe?g|gif)/.test(f.type)) { showToast("PNG·JPG·GIF 이미지만 등록할 수 있습니다.", "error"); return; }
    if (f.size > MAX) { showToast("3MB 이하 이미지만 등록할 수 있습니다.", "error"); return; }
    const r = new FileReader();
    r.onload = () => setPhoto(typeof r.result === "string" ? r.result : "");
    r.readAsDataURL(f);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/keepzip/expert/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: photo, headline }),
      });
      const d = await res.json().catch(() => null);
      showToast(res.ok ? "프로필이 저장되었습니다." : (d?.error ?? "저장 실패"), res.ok ? "success" : "error");
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-bold mb-1">프로필 사진 · 소개</h2>
      <p className="text-sm text-gray-500 mb-5">전문가 목록과 프로필 상세에 노출됩니다.</p>

      <p className="text-xs font-semibold text-gray-500 mb-2">프로필 사진</p>
      <div className="flex items-center gap-4 mb-6">
        <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
          {photo ? <img src={photo} alt="프로필" className="h-full w-full object-cover" /> : <span className="text-gray-300 text-3xl">👤</span>}
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif" onChange={onFile} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
            사진 선택
          </button>
          <p className="mt-1.5 text-[11px] text-gray-400">PNG·JPG·GIF · 3MB 이하 · 정사각형 권장</p>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-500 mb-1.5">한 줄 소개</p>
      <input
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        maxLength={120}
        placeholder="예) 임대차 분쟁 12년 · 보증금 반환 700건 이상 해결"
        className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-blue-400 mb-1"
      />
      <p className="text-[11px] text-gray-400 mb-5">약력과 별개로, 목록 카드·프로필 상단에 크게 노출되는 짧은 소개입니다. (최대 120자)</p>

      <Button variant="primary" onClick={save} loading={saving}>저장</Button>
    </div>
  );
}

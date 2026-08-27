"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";
import { PROFILE_TEXT } from "../constants";

// 탭 키 → DB 필드
const FIELD_MAP: Record<"bio" | "etc", "bio" | "etcInfo"> = { bio: "bio", etc: "etcInfo" };

/** 약력·기타정보 — 텍스트 편집 탭 (DB 로드·저장) */
export function ProfileFieldTab({ tabKey }: { tabKey: "bio" | "etc" }) {
  const f = PROFILE_TEXT[tabKey];
  const dbField = FIELD_MAP[tabKey];
  const { showToast } = useToast();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/keepzip/expert/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.profile) setValue(d.profile[dbField] ?? ""); })
      .catch(() => {});
    return () => { alive = false; };
  }, [dbField]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/keepzip/expert/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [dbField]: value }),
      });
      const d = await res.json().catch(() => null);
      showToast(res.ok ? `${f.title} 저장되었습니다.` : (d?.error ?? "저장 실패"), res.ok ? "success" : "error");
    } catch {
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold mb-1">{f.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{f.desc}</p>
      <textarea
        className="w-full min-h-[220px] border rounded-lg p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
        value={value}
        placeholder={f.placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="mt-3">
        <Button variant="primary" onClick={save} loading={saving}>저장</Button>
      </div>
    </div>
  );
}

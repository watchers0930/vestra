"use client";

import { useState, useRef } from "react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";

/**
 * 매물 상세 — 소유자 전용 사진 추가/삭제 관리.
 * 등록 시점의 임시 업로드(temp-photo)와 별개로, 등록 후 사진을 편집한다.
 */
export function PhotoManager({
  listingId,
  photos,
  onReload,
}: {
  listingId: string;
  photos: string[];
  onReload?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const full = photos.length >= 10;

  async function handleUpload(file: File) {
    setUploading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/listings/${listingId}/photos`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error ?? "업로드에 실패했습니다.");
        return;
      }
      onReload?.();
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(url: string) {
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;
    setDeleting(url);
    setErr("");
    try {
      const res = await fetch(`/api/listings/${listingId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error ?? "삭제에 실패했습니다.");
        return;
      }
      onReload?.();
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid #e5e5ea", background: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>사진 관리</p>
        <span style={{ fontSize: 11, color: "#86868b" }}>{photos.length} / 10</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8 }}>
        {photos.map((url) => (
          <div key={url} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", background: "#f0f0f5" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="매물 사진" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button
              onClick={() => handleDelete(url)}
              disabled={deleting === url}
              title="사진 삭제"
              style={{
                position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%",
                border: "none", background: "rgba(0,0,0,0.55)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: deleting === url ? "not-allowed" : "pointer",
              }}
            >
              {deleting === url
                ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                : <Trash2 size={12} strokeWidth={2} />}
            </button>
          </div>
        ))}

        {!full && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              aspectRatio: "1 / 1", borderRadius: 10, border: "1.5px dashed #c7c7cc",
              background: "#fff", color: "#86868b", cursor: uploading ? "not-allowed" : "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            }}
          >
            {uploading
              ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              : <ImagePlus size={18} strokeWidth={1.8} />}
            <span style={{ fontSize: 10 }}>{uploading ? "업로드 중" : "추가"}</span>
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />

      {err && <p style={{ marginTop: 8, fontSize: 11.5, color: "#c0392b" }}>{err}</p>}
      <p style={{ marginTop: 8, fontSize: 11, color: "#aeaeb2" }}>JPG·PNG·WEBP, 장당 5MB 이하, 최대 10장</p>
    </div>
  );
}

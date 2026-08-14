"use client";

import { useEffect, useRef, useState } from "react";
import { X, MapPin, Phone, Search, Loader2, Navigation } from "lucide-react";
import KakaoScript from "@/components/common/KakaoScript";

interface Center {
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  placeUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommunityCenterModal({ open, onClose }: Props) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<Center[] | null>(null);
  const [error, setError] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInst = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  // ESC 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  // 지도 초기화 (모달 열릴 때)
  useEffect(() => {
    if (!open) { mapInst.current = null; markersRef.current = []; return; }
    let cancelled = false;
    const init = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;
      if (cancelled || !mapRef.current || mapInst.current || !kakao?.maps?.Map) return;
      mapInst.current = new kakao.maps.Map(mapRef.current, { center: new kakao.maps.LatLng(37.5665, 126.978), level: 6 });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (kakao?.maps?.Map) init();
    else if (kakao?.maps?.load) kakao.maps.load(() => { if (!cancelled) init(); });
    const poll = setInterval(() => {
      if (mapInst.current) { clearInterval(poll); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const k = (window as any).kakao;
      if (k?.maps?.Map) { init(); }
      else if (k?.maps?.load) { k.maps.load(() => { if (!cancelled) init(); }); }
    }, 300);
    const to = setTimeout(() => clearInterval(poll), 12000);
    return () => { cancelled = true; clearInterval(poll); clearTimeout(to); };
  }, [open]);

  // 결과 → 지도 마커
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (!mapInst.current || !kakao?.maps || !centers || centers.length === 0) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    const bounds = new kakao.maps.LatLngBounds();
    centers.forEach((c) => {
      const pos = new kakao.maps.LatLng(c.lat, c.lng);
      const marker = new kakao.maps.Marker({ map: mapInst.current, position: pos });
      const overlay = new kakao.maps.CustomOverlay({
        map: mapInst.current,
        position: pos,
        yAnchor: 2.1,
        content: `<div style="background:#2e4bd8;color:#fff;padding:3px 8px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2)">${c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name}</div>`,
      });
      markersRef.current.push(marker, overlay);
      bounds.extend(pos);
    });
    mapInst.current.setBounds(bounds);
    if (centers.length === 1) mapInst.current.setLevel(4);
  }, [centers]);

  const focusCenter = (c: Center) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (!mapInst.current || !kakao?.maps) return;
    mapInst.current.setCenter(new kakao.maps.LatLng(c.lat, c.lng));
    mapInst.current.setLevel(3);
  };

  const search = async () => {
    const q = address.trim();
    if (q.length < 2) { setError("주소를 2자 이상 입력해 주세요."); return; }
    setLoading(true);
    setError("");
    setCenters(null);
    try {
      const res = await fetch(`/api/community-center?address=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "조회에 실패했습니다."); return; }
      setCenters(json.centers ?? []);
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="관할 주민센터 찾기"
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(10,15,30,0.5)", backdropFilter: "blur(3px)" }}
    >
      <KakaoScript />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "100%", maxWidth: "900px", height: "78vh", maxHeight: "640px", display: "flex", flexDirection: "column", background: "#fff", borderRadius: "18px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.26)" }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #eef0f6", flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a1d2e" }}>관할 주민센터 찾기</h3>
            <p style={{ fontSize: "12px", color: "#8a90a6", marginTop: "2px" }}>주소를 입력하면 관할 주민센터의 위치·전화번호를 지도에서 보여드립니다.</p>
          </div>
          <button onClick={onClose} aria-label="닫기" style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: "8px", color: "#8a90a6", cursor: "pointer", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* 본문 2단 */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* 좌: 검색 + 결과 */}
          <div style={{ width: "340px", flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #eef0f6", minHeight: 0 }}>
            <div style={{ display: "flex", gap: "8px", padding: "16px 18px", borderBottom: "1px solid #f4f6fb", flexShrink: 0 }}>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") search(); }}
                placeholder="주소 입력 (예: 강남구 테헤란로 152)"
                autoFocus
                style={{ flex: 1, height: "42px", padding: "0 12px", border: "1.5px solid #d0d4e8", borderRadius: "10px", fontSize: "13.5px", fontFamily: "inherit", color: "#1a1d2e", outline: "none", minWidth: 0 }}
              />
              <button onClick={search} disabled={loading} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "44px", height: "42px", border: "none", borderRadius: "10px", background: "#2e4bd8", color: "#fff", cursor: loading ? "not-allowed" : "pointer", flexShrink: 0 }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
              {error && <p style={{ fontSize: "13px", color: "#d92d20" }}>{error}</p>}
              {!error && !centers && !loading && (
                <p style={{ fontSize: "12.5px", color: "#aeb2c0", textAlign: "center", marginTop: "30px" }}>주소를 입력하고 검색하세요.</p>
              )}
              {centers && centers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {centers.map((c, i) => (
                    <button key={i} onClick={() => focusCenter(c)} style={{ textAlign: "left", border: "1px solid #e8eaf2", borderRadius: "12px", padding: "13px 14px", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#1a1d2e", marginBottom: "7px" }}>{c.name}</div>
                      {c.address && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "12px", color: "#6e6e73", marginBottom: "4px" }}>
                          <MapPin size={13} style={{ color: "#8a90a6", flexShrink: 0, marginTop: "1px" }} />{c.address}
                        </div>
                      )}
                      {c.phone && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", marginBottom: "8px" }}>
                          <Phone size={13} style={{ color: "#8a90a6", flexShrink: 0 }} />
                          <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} style={{ color: "#2e4bd8", fontWeight: 600, textDecoration: "none" }}>{c.phone}</a>
                        </div>
                      )}
                      <a href={`https://map.kakao.com/link/to/${encodeURIComponent(c.name)},${c.lat},${c.lng}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11.5px", fontWeight: 600, color: "#2e4bd8", textDecoration: "none" }}>
                        <Navigation size={12} />카카오맵 길찾기
                      </a>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 우: 지도 */}
          <div style={{ flex: 1, position: "relative", background: "#e8ecef", minWidth: 0 }}>
            <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />
            {!centers && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#aeb2c0", pointerEvents: "none" }}>
                <MapPin size={30} strokeWidth={1.4} />
                <span style={{ fontSize: "13px" }}>검색하면 지도에 표시됩니다</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

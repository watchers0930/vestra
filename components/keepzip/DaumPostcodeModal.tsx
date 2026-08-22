"use client";

import { useEffect, useRef } from "react";
import { loadDaumPostcode, toResult, type DaumPostcodeData, type PostcodeResult } from "@/lib/keepzip/daum-postcode";

interface Props {
  onComplete: (r: PostcodeResult) => void;
  onClose: () => void;
}

/**
 * 다음 우편번호 검색 — embed(레이어) 모달.
 * 페이지 내 컨테이너에 iframe을 삽입하므로 부모 CSP(frame-src)가 적용된다.
 * (팝업/새 창 모드는 about:blank에서 iframe이 차단되어 사용하지 않음)
 */
export function DaumPostcodeModal({ onComplete, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadDaumPostcode()
      .then(() => {
        if (cancelled || !ref.current) return;
        const w = window as unknown as {
          daum: {
            Postcode: new (opts: {
              oncomplete: (d: DaumPostcodeData) => void;
              onclose?: () => void;
              width?: string; height?: string;
            }) => { embed: (el: HTMLElement, opt?: { autoClose?: boolean }) => void };
          };
        };
        new w.daum.Postcode({
          oncomplete: (d) => { onComplete(toResult(d)); onClose(); },
          width: "100%",
          height: "100%",
        }).embed(ref.current, { autoClose: true });
      })
      .catch(() => onClose());
    return () => { cancelled = true; };
  }, [onComplete, onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 12, width: "100%", maxWidth: 512, height: 500,
          overflow: "hidden", position: "relative", boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: "absolute", top: 8, right: 12, zIndex: 10, background: "none",
            border: "none", fontSize: 22, lineHeight: 1, color: "#888", cursor: "pointer",
          }}
        >
          ×
        </button>
        <div ref={ref} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

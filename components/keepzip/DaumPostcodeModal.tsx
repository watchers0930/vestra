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
      className="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg h-[500px] overflow-hidden relative shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-2 right-3 z-10 text-gray-400 hover:text-gray-700 text-xl leading-none"
        >
          ×
        </button>
        <div ref={ref} className="w-full h-full" />
      </div>
    </div>
  );
}

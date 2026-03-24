"use client";

import Script from "next/script";

export default function KakaoScript() {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!kakaoKey) return null;

  return (
    <Script
      src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services&autoload=false`}
      strategy="afterInteractive"
      onReady={() => {
        tryLoadWithRetry(0);
      }}
    />
  );
}

function tryLoadWithRetry(attempt: number) {
  if (attempt > 5 || window.__kakaoMapsReady) return;

  if (!window.kakao?.maps?.load) {
    // SDK 자체가 아직 안 됐으면 재시도
    setTimeout(() => tryLoadWithRetry(attempt + 1), 1000);
    return;
  }

  let loaded = false;
  window.kakao.maps.load(() => {
    loaded = true;
    window.__kakaoMapsReady = true;
    window.dispatchEvent(new Event("kakao-maps-ready"));
  });

  // 3초 안에 load 콜백이 안 불리면 서브 리소스 503 → 재시도
  setTimeout(() => {
    if (!loaded && !window.__kakaoMapsReady) {
      // 기존 kakao.js 스크립트 제거
      document.querySelectorAll('script[src*="daumcdn.net/mapjsapi"]').forEach(s => s.remove());
      // kakao 객체 초기화
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).kakao;
      // SDK 재삽입
      const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || document.querySelector('script[src*="dapi.kakao.com"]')?.getAttribute("src")?.match(/appkey=([^&]+)/)?.[1];
      if (key) {
        const s = document.createElement("script");
        s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false&_retry=${attempt}`;
        s.onload = () => tryLoadWithRetry(attempt + 1);
        document.head.appendChild(s);
      }
    }
  }, 3000);
}

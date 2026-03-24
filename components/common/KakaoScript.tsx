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
        if (window.kakao?.maps?.load) {
          window.kakao.maps.load(() => {
            window.__kakaoMapsReady = true;
            window.dispatchEvent(new Event("kakao-maps-ready"));
          });
        }
      }}
    />
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/common";

// Leaflet은 SSR에서 window 접근 문제가 있으므로 dynamic import
const LeafletMap = dynamic(
  () => import("./LeafletMap").then((mod) => mod.LeafletMap),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse bg-gray-100 rounded-xl" /> }
);

interface KakaoMapProps {
  address: string;
}

// 카카오 Geocoder 결과 타입 (주소 변환용)
export interface KakaoGeocoderResult {
  address_name: string;
  x: string;
  y: string;
  address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    region_3depth_h_name: string;
  } | null;
  road_address: {
    address_name: string;
    zone_no: string;
  } | null;
}

// 카카오 Places 키워드 검색 결과 타입
export interface KakaoPlaceResult {
  address_name: string;
  road_address_name: string;
  place_name: string;
  x: string;
  y: string;
}

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => {
          setCenter: (latlng: unknown) => void;
          relayout: () => void;
        };
        Marker: new (options: { map: unknown; position: unknown }) => unknown;
        services: {
          Geocoder: new () => {
            addressSearch: (
              address: string,
              callback: (result: KakaoGeocoderResult[], status: string) => void
            ) => void;
          };
          Places: new () => {
            keywordSearch: (
              keyword: string,
              callback: (result: KakaoPlaceResult[], status: string) => void
            ) => void;
          };
          Status: { OK: string };
        };
      };
    };
  }
}

export function KakaoMap({ address }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const hasKakaoKey = !!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">(hasKakaoKey ? "loading" : "no-key");

  useEffect(() => {
    if (!hasKakaoKey) return;

    const initMap = () => {
      if (!window.kakao?.maps || !mapRef.current) return;

      window.kakao.maps.load(() => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        const OK = window.kakao.maps.services.Status.OK;

        // 번지 제거한 주소 (동 단위까지만)
        const addrWithoutNumber = address.replace(/\s+\d+(-\d+)?$/, "").trim();

        const createMap = (coords: unknown, level: number) => {
          const map = new window.kakao.maps.Map(mapRef.current!, { center: coords, level });
          new window.kakao.maps.Marker({ map, position: coords });
          setStatus("ready");

          // 타일 로드 실패 감지: 3초 후 타일 이미지 확인
          setTimeout(() => {
            const tiles = mapRef.current?.querySelectorAll("img");
            const hasLoadedTile = tiles && Array.from(tiles).some(
              (img) => img.naturalWidth > 0 && !img.src.includes("logo")
            );
            if (!hasLoadedTile) setStatus("error");
          }, 3000);
        };

        // 1차: 전체 주소로 검색
        geocoder.addressSearch(address, (result, statusCode) => {
          if (statusCode === OK && result[0]) {
            createMap(
              new window.kakao.maps.LatLng(parseFloat(result[0].y), parseFloat(result[0].x)),
              5
            );
            return;
          }

          // 2차: 번지 제거 후 재시도
          if (addrWithoutNumber !== address) {
            geocoder.addressSearch(addrWithoutNumber, (result2, status2) => {
              if (status2 === OK && result2[0]) {
                createMap(
                  new window.kakao.maps.LatLng(parseFloat(result2[0].y), parseFloat(result2[0].x)),
                  5
                );
              } else {
                createMap(new window.kakao.maps.LatLng(37.4979, 127.0276), 7);
              }
            });
          } else {
            createMap(new window.kakao.maps.LatLng(37.4979, 127.0276), 7);
          }
        });
      });
    };

    if (window.kakao?.maps) {
      initMap();
    } else {
      // SDK 스크립트 로드 대기 (next/script afterInteractive)
      const timeout = setTimeout(() => {
        if (window.kakao?.maps) {
          initMap();
        } else {
          setStatus("error");
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [address, hasKakaoKey]);

  // 카카오맵 키가 없거나 에러 시 OpenStreetMap(Leaflet) 사용
  if (status === "no-key" || status === "error") {
    return <LeafletMap address={address} />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative h-[300px] w-full">
        {status === "loading" && (
          <div className="absolute inset-0 z-10 animate-pulse bg-gray-100 rounded-xl" />
        )}
        <div
          ref={mapRef}
          className="h-full w-full"
        />
      </div>
    </Card>
  );
}

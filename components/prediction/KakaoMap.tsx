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

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => {
          setCenter: (latlng: unknown) => void;
        };
        Marker: new (options: { map: unknown; position: unknown }) => unknown;
        services: {
          Geocoder: new () => {
            addressSearch: (
              address: string,
              callback: (result: { x: string; y: string }[], status: string) => void
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
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">("loading");
  const [useKakao] = useState(() => !!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY);

  useEffect(() => {
    if (!useKakao) {
      setStatus("no-key");
      return;
    }

    const initMap = () => {
      if (!window.kakao?.maps || !mapRef.current) return;

      window.kakao.maps.load(() => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, (result, statusCode) => {
          if (statusCode === window.kakao.maps.services.Status.OK && result[0]) {
            const coords = new window.kakao.maps.LatLng(
              parseFloat(result[0].y),
              parseFloat(result[0].x)
            );
            const map = new window.kakao.maps.Map(mapRef.current!, {
              center: coords,
              level: 5,
            });
            new window.kakao.maps.Marker({ map, position: coords });
            setStatus("ready");
          } else {
            const defaultCoords = new window.kakao.maps.LatLng(37.4979, 127.0276);
            new window.kakao.maps.Map(mapRef.current!, {
              center: defaultCoords,
              level: 7,
            });
            setStatus("ready");
          }
        });
      });
    };

    if (window.kakao?.maps) {
      initMap();
    } else {
      const checkInterval = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 200);
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.kakao?.maps) setStatus("error");
      }, 5000);
      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [address, useKakao]);

  // 카카오맵 키가 없거나 에러 시 OpenStreetMap(Leaflet) 사용
  if (status === "no-key" || status === "error") {
    return <LeafletMap address={address} />;
  }

  return (
    <Card className="overflow-hidden">
      {status === "loading" && (
        <div className="h-[300px] animate-pulse bg-gray-100 rounded-xl" />
      )}
      <div
        ref={mapRef}
        className="h-[300px] w-full"
        style={{ display: status === "ready" ? "block" : "none" }}
      />
    </Card>
  );
}

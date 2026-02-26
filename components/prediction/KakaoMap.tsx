"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/common";
import { MapPin } from "lucide-react";

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

  useEffect(() => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!kakaoKey) {
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
            // 주소를 찾을 수 없는 경우 기본 좌표 (강남)
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

    // SDK 로드 확인 (layout.tsx에서 로드)
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
  }, [address]);

  if (status === "no-key") {
    return (
      <Card className="flex flex-col items-center justify-center h-[300px] text-secondary">
        <MapPin size={32} className="text-muted mb-2" />
        <p className="text-sm">카카오맵 API 키를 설정하면</p>
        <p className="text-sm">지도에서 위치를 확인할 수 있습니다</p>
        <p className="text-xs text-muted mt-2">NEXT_PUBLIC_KAKAO_MAP_KEY</p>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="flex items-center justify-center h-[300px] text-secondary text-sm">
        지도를 불러올 수 없습니다
      </Card>
    );
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

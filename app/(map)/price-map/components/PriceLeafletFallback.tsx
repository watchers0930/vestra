"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatPrice, escapeHtml } from "@/lib/format";
import type { AptData } from "../types";

interface Props {
  apartments: AptData[];
  center?: { lat: number; lng: number };
}

const DEFAULT_CENTER: [number, number] = [37.4979, 127.0276];

export function PriceLeafletFallback({ apartments, center }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialCenter: [number, number] = center ? [center.lat, center.lng] : DEFAULT_CENTER;
    const map = L.map(mapRef.current, {
      center: initialCenter,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (apartments.length > 0) {
      const bounds = L.latLngBounds([]);

      apartments.forEach((apt) => {
        const latLng = L.latLng(apt.lat, apt.lng);
        bounds.extend(latLng);

        L.circleMarker(latLng, {
          radius: 7,
          weight: 2,
          color: "#1d4ed8",
          fillColor: "#3b82f6",
          fillOpacity: 0.65,
        })
          .addTo(map)
          .bindPopup(
            `<div style="min-width:160px">
              <strong>${escapeHtml(apt.name)}</strong><br/>
              ${escapeHtml(apt.dong)}<br/>
              ${escapeHtml(String(apt.area))}평 · ${escapeHtml(formatPrice(apt.price))}
            </div>`
          );
      });

      map.fitBounds(bounds.pad(0.15));
    }

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [apartments, center]);

  return <div ref={mapRef} className="absolute inset-0" />;
}

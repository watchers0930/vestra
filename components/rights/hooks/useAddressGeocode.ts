/**
 * 주소 → 카카오 지오코딩 훅
 *
 * 물건 주소를 카카오 지도 Geocoder로 조회해 행정동/지번/도로명/우편번호를 채운다.
 * 카카오 SDK 로드 전이면 최대 3초 대기 후 폴백(입력 주소 그대로)한다.
 */
import { useState, useEffect } from "react";
import type { AddressInfo } from "../rights-result-types";
import type { KakaoGeocoderResult } from "@/components/prediction/KakaoMap";

export function useAddressGeocode(propertyAddress: string | undefined): AddressInfo | null {
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);

  useEffect(() => {
    if (!propertyAddress) return;

    const address = propertyAddress;

    const geocode = () => {
      if (!window.kakao?.maps) return;

      window.kakao.maps.load(() => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(address, (results: KakaoGeocoderResult[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && results[0]) {
            const r = results[0];
            setAddressInfo({
              admin: r.address
                ? `${r.address.region_1depth_name} ${r.address.region_2depth_name} ${r.address.region_3depth_h_name}`
                : address,
              jibun: r.address?.address_name || address,
              road: r.road_address?.address_name || "-",
              zipCode: r.road_address?.zone_no || "-",
            });
          } else {
            setAddressInfo({ admin: address, jibun: address, road: "-", zipCode: "-" });
          }
        });
      });
    };

    if (window.kakao?.maps) {
      geocode();
    } else {
      const timeout = setTimeout(() => {
        if (window.kakao?.maps) {
          geocode();
        } else {
          setAddressInfo({ admin: address, jibun: address, road: "-", zipCode: "-" });
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [propertyAddress]);

  return addressInfo;
}

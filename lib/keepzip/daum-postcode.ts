/**
 * 다음(카카오) 우편번호 서비스 로더 — embed(레이어) 방식용.
 * 스크립트를 지연 로드하고, 선택 결과를 앱 표준형(PostcodeResult)으로 변환한다.
 * CSP: script-src t1.daumcdn.net(https), frame-src postcode.map.kakao.com 허용됨.
 */

const SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

export interface PostcodeResult {
  zonecode: string;      // 우편번호
  roadAddress: string;   // 도로명 주소
  jibunAddress: string;  // 지번 주소
  buildingName: string;  // 건물명
  isBuilding: boolean;   // 집합건물(공동주택) 여부 → 동/호수 입력 노출
}

export interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName?: string;
  apartment?: string; // "Y" | "N" (공동주택 여부)
}

export function toResult(d: DaumPostcodeData): PostcodeResult {
  return {
    zonecode: d.zonecode,
    roadAddress: d.roadAddress,
    jibunAddress: d.jibunAddress,
    buildingName: d.buildingName ?? "",
    isBuilding: d.apartment === "Y" || !!(d.buildingName && d.buildingName.trim()),
  };
}

export function loadDaumPostcode(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    const w = window as unknown as { daum?: { Postcode?: unknown } };
    if (w.daum?.Postcode) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("우편번호 서비스 로드 실패")));
      return;
    }
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("우편번호 서비스 로드 실패"));
    document.head.appendChild(el);
  });
}

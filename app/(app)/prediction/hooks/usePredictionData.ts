"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatKRW } from "@/lib/utils";
import { addAnalysis, addOrUpdateAsset, getLatestAnalysisForAddress } from "@/lib/store";
import { addNotification } from "@/lib/notification-client";
import { useToast } from "@/components/common/toast";
import type { KakaoGeocoderResult, KakaoPlaceResult } from "@/components/prediction/KakaoMap";
import type { PredictionTabId } from "@/components/prediction/PredictionTabs";
import type {
  PredictionResult,
  RealTransaction,
  AddressTab,
  AddressInfo,
  DaumPostcodeData,
} from "../types";

export function usePredictionData() {
  const { showToast } = useToast();
  const resultRef = useRef<HTMLDivElement>(null);

  const [roadResult, setRoadResult] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [selectedApt, setSelectedApt] = useState<string | null>(null);
  const [addressTab, setAddressTab] = useState<AddressTab>("admin");
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [activeTab, setActiveTab] = useState<PredictionTabId>("dashboard");
  const [analysisId, setAnalysisId] = useState<string>("");
  const [previousAnalysis, setPreviousAnalysis] = useState<{ date: string; summary: string } | null>(null);

  // localStorage 프리필 + 이전 분석 기록
  useEffect(() => {
    const lastAddr = localStorage.getItem("vestra_last_address");
    if (lastAddr) {
      setRoadResult(lastAddr);
      localStorage.removeItem("vestra_last_address");
      const prev = getLatestAnalysisForAddress(lastAddr);
      if (prev) {
        setPreviousAnalysis({
          date: new Date(prev.date).toLocaleDateString("ko-KR"),
          summary: prev.summary,
        });
      }
    }
  }, []);

  // Daum Postcode 스크립트 로드
  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) return;
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const openDaumPostcode = useCallback(() => {
    if (!window.daum?.Postcode) {
      showToast("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.", "info");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeData) => {
        const addr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
        setRoadResult(addr);
        setBuildingName(data.buildingName || "");
      },
    }).open();
  }, [showToast]);

  const canSearch = !!roadResult.trim();

  const handleAnalyze = async () => {
    const builtAddress = roadResult.trim();
    if (!builtAddress) return;
    setAddress(builtAddress);
    setLoading(true);
    setResult(null);
    setSelectedArea(null);
    setSelectedApt(null);
    setAddressInfo(null);
    setAddressTab("admin");
    setActiveTab("dashboard");

    try {
      const res = await fetch("/api/predict-value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: builtAddress, buildingName: buildingName || undefined }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);

      if (data.realTransactions?.length) {
        const aptNames = [...new Set(data.realTransactions.map((t: RealTransaction) => t.aptName))] as string[];
        const bldg = buildingName.replace(/\s/g, "").replace(/아파트$/, "");
        const normalize = (s: string) => s.replace(/\s/g, "").replace(/아파트$/, "");
        let matched: string | undefined;
        if (bldg) {
          matched = aptNames.find((name) => normalize(name) === bldg);
          if (!matched) matched = aptNames.find((name) => {
            const n = normalize(name);
            return bldg.includes(n) || n.includes(bldg);
          });
        }
        const query = builtAddress.replace(/\s/g, "");
        if (!matched) matched = aptNames.find((name) => query.includes(name.replace(/\s/g, "")));
        if (matched) setSelectedApt(matched);
      }

      addAnalysis({
        type: "prediction",
        typeLabel: "시세전망",
        address: builtAddress,
        summary: `현재 ${formatKRW(data.currentPrice)}, 신뢰도 ${data.confidence}%`,
        data: data as Record<string, unknown>,
      });
      addOrUpdateAsset({
        address: builtAddress,
        type: "부동산",
        estimatedPrice: data.currentPrice,
        safetyScore: data.confidence,
        riskScore: 100 - data.confidence,
      });

      addNotification(`시세전망 완료: ${builtAddress}`);
      setAnalysisId(`prediction_${Date.now()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      if (confirm(msg + "\n\n회원가입 페이지로 이동하시겠습니까?")) {
        window.location.href = "/signup";
      }
    } finally {
      setLoading(false);
    }
  };

  // 카카오 Geocoder 주소 변환
  useEffect(() => {
    if (!result || !address.trim()) { setAddressInfo(null); return; }
    const addr = address.trim();
    const applyGeocoderResult = (r: KakaoGeocoderResult) => {
      setAddressInfo({
        admin: r.address ? `${r.address.region_1depth_name} ${r.address.region_2depth_name} ${r.address.region_3depth_h_name}` : addr,
        jibun: r.address?.address_name || addr,
        road: r.road_address?.address_name || "-",
        zipCode: r.road_address?.zone_no || "-",
      });
    };
    const addrParts = addr.split(/\s+/);
    const origRegion = addrParts.slice(0, 2).join(" ");
    const addrWithoutNumber = addr.replace(/\s+\d+(-\d+)?$/, "").trim();

    const geocode = () => {
      if (!window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        const OK = window.kakao.maps.services.Status.OK;
        geocoder.addressSearch(addr, (results: KakaoGeocoderResult[], status: string) => {
          if (status === OK && results[0]) { applyGeocoderResult(results[0]); return; }
          if (addrWithoutNumber !== addr) {
            geocoder.addressSearch(addrWithoutNumber, (results2: KakaoGeocoderResult[], status2: string) => {
              if (status2 === OK && results2[0]) { applyGeocoderResult(results2[0]); return; }
              fallbackKeywordSearch(geocoder, OK);
            });
          } else { fallbackKeywordSearch(geocoder, OK); }
        });
      });
    };

    const fallbackKeywordSearch = (geocoder: InstanceType<typeof window.kakao.maps.services.Geocoder>, OK: string) => {
      const places = new window.kakao.maps.services.Places();
      places.keywordSearch(addr, (placeResults: KakaoPlaceResult[], placeStatus: string) => {
        if (placeStatus === OK && placeResults[0]) {
          const matched = placeResults.find((p) => p.address_name.includes(addrParts[1] || ""));
          const p = matched || placeResults[0];
          if (!matched && origRegion && !p.address_name.startsWith(addrParts[0]?.replace(/도|시$/, "") || "")) {
            setAddressInfo({ admin: addrWithoutNumber || addr, jibun: addr, road: "-", zipCode: "-" });
            return;
          }
          geocoder.addressSearch(p.address_name, (geoResults: KakaoGeocoderResult[], geoStatus: string) => {
            if (geoStatus === OK && geoResults[0]) { applyGeocoderResult(geoResults[0]); }
            else {
              setAddressInfo({ admin: p.address_name.replace(/\s*\d+(-\d+)?$/, ""), jibun: p.address_name, road: p.road_address_name || "-", zipCode: "-" });
            }
          });
        } else {
          setAddressInfo({ admin: addrWithoutNumber || addr, jibun: addr, road: "-", zipCode: "-" });
        }
      });
    };

    if (window.kakao?.maps?.services) { geocode(); }
    else if (window.kakao?.maps) { window.kakao.maps.load(geocode); }
    else {
      const timeout = setTimeout(() => {
        if (window.kakao?.maps?.services) { geocode(); }
        else if (window.kakao?.maps) { window.kakao.maps.load(geocode); }
        else { setAddressInfo({ admin: addr, jibun: addr, road: "-", zipCode: "-" }); }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [result, address]);

  // 필터링 파생값
  const availableApts = result?.realTransactions
    ? [...new Set(result.realTransactions.map((t) => t.aptName))].sort()
    : [];
  const aptFilteredTransactions = result?.realTransactions?.filter(
    (t) => selectedApt === null || t.aptName === selectedApt
  ) ?? [];
  const filteredTransactions = aptFilteredTransactions.filter(
    (t) => selectedArea === null || Math.round(t.area) === selectedArea
  );
  const availableAreas = aptFilteredTransactions.length > 0
    ? [...new Set(aptFilteredTransactions.map((t) => Math.round(t.area)))].sort((a, b) => a - b)
    : [];
  const filteredStats = (() => {
    if (filteredTransactions.length === 0) return null;
    const now = new Date();
    let totalWeight = 0;
    let weightedSum = 0;
    for (const t of filteredTransactions) {
      const txDate = new Date(t.dealYear, t.dealMonth - 1, t.dealDay);
      const months = Math.max(0, (now.getTime() - txDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
      const w = Math.exp(-0.1 * months);
      weightedSum += t.dealAmount * w;
      totalWeight += w;
    }
    const avgPrice = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : filteredTransactions[0].dealAmount;
    return { avgPrice, count: filteredTransactions.length };
  })();

  const scenarios = [
    { id: "all", label: "전체 비교", color: "#000" },
    { id: "optimistic", label: "낙관적", color: "#10b981" },
    { id: "base", label: "기본", color: "#2563eb" },
    { id: "pessimistic", label: "비관적", color: "#ef4444" },
  ];

  const getChartData = () => {
    if (!result) return [];
    return [
      { year: "현재", optimistic: result.currentPrice, base: result.currentPrice, pessimistic: result.currentPrice },
      { year: "1년 후", optimistic: result.predictions.optimistic["1y"], base: result.predictions.base["1y"], pessimistic: result.predictions.pessimistic["1y"] },
      { year: "5년 후", optimistic: result.predictions.optimistic["5y"], base: result.predictions.base["5y"], pessimistic: result.predictions.pessimistic["5y"] },
      { year: "10년 후", optimistic: result.predictions.optimistic["10y"], base: result.predictions.base["10y"], pessimistic: result.predictions.pessimistic["10y"] },
    ];
  };

  const getHistoricalData = () => {
    if (!filteredTransactions.length) return [];
    return filteredTransactions.slice().sort(
      (a, b) => a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay - (b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay)
    ).map((t) => ({
      date: `${t.dealYear}.${String(t.dealMonth).padStart(2, "0")}`,
      price: t.dealAmount,
      label: `${t.aptName} ${Math.round(t.area)}㎡`,
    }));
  };

  const getMonthlyTrendData = () => {
    if (!filteredTransactions.length) return [];
    const monthMap = new Map<string, { total: number; count: number; min: number; max: number }>();
    for (const t of filteredTransactions) {
      const key = `${t.dealYear}.${String(t.dealMonth).padStart(2, "0")}`;
      const existing = monthMap.get(key);
      if (existing) {
        existing.total += t.dealAmount;
        existing.count += 1;
        existing.min = Math.min(existing.min, t.dealAmount);
        existing.max = Math.max(existing.max, t.dealAmount);
      } else {
        monthMap.set(key, { total: t.dealAmount, count: 1, min: t.dealAmount, max: t.dealAmount });
      }
    }
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        avgPrice: Math.round(data.total / data.count),
        minPrice: data.min,
        maxPrice: data.max,
        count: data.count,
      }));
  };

  const disabledTabs: PredictionTabId[] = [];
  if (!result) disabledTabs.push("compare");
  if (!result?.backtestResult) disabledTabs.push("backtest");
  if (!result?.realTransactions || result.realTransactions.length < 3) disabledTabs.push("anomaly");

  return {
    resultRef,
    roadResult, setRoadResult,
    buildingName,
    address,
    loading,
    result,
    activeScenario, setActiveScenario,
    selectedArea, setSelectedArea,
    selectedApt, setSelectedApt,
    addressTab, setAddressTab,
    addressInfo,
    activeTab, setActiveTab,
    analysisId,
    previousAnalysis,
    canSearch,
    openDaumPostcode,
    handleAnalyze,
    availableApts,
    availableAreas,
    filteredTransactions,
    filteredStats,
    scenarios,
    disabledTabs,
    getChartData,
    getHistoricalData,
    getMonthlyTrendData,
  };
}

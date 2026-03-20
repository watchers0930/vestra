"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  BarChart3,
  Target,
  Zap,
  MapPin,
  Database,
} from "lucide-react";
import { cn, formatKRW } from "@/lib/utils";
import { addAnalysis, addOrUpdateAsset } from "@/lib/store";
import { getSidoList, getSigunguList, getEupmyeondongList } from "@/lib/korea-address";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PageHeader, Card, Button, Alert } from "@/components/common";
import { IntegrityBadge } from "@/components/common/IntegrityBadge";
import { ScholarPapers } from "@/components/results";
import { AnomalyDetectionView } from "@/components/prediction/AnomalyDetectionView";
import AiDisclaimer from "@/components/common/ai-disclaimer";
import PdfDownloadButton from "@/components/common/pdf-download-button";
import { LoadingSpinner } from "@/components/loading";
import { KakaoMap } from "@/components/prediction/KakaoMap";
import type { KakaoGeocoderResult, KakaoPlaceResult } from "@/components/prediction/KakaoMap";

// 신규 컴포넌트 (prediction-enhancement)
import { PredictionTabs, type PredictionTabId } from "@/components/prediction/PredictionTabs";
import { PredictionDashboard } from "@/components/prediction/Dashboard";
import { MonthlyForecastChart } from "@/components/prediction/MonthlyForecast";
import { RegionCompare } from "@/components/prediction/RegionCompare";
import { BacktestView } from "@/components/prediction/BacktestView";

import type { MonthlyPrediction, MacroEconomicFactors, BacktestResult, MarketCycleInfo } from "@/lib/prediction-engine";

interface RealTransaction {
  dealAmount: number;
  buildYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  aptName: string;
  area: number;
  floor: number;
  dong: string;
}

interface PredictionFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

interface ModelResult {
  modelName: string;
  prediction: { "1y": number; "5y": number; "10y": number };
  r2: number;
  weight: number;
}

interface EnsemblePredictionResult {
  models: ModelResult[];
  ensemble: { "1y": number; "5y": number; "10y": number };
  dominantModel: string;
  modelAgreement: number;
}

interface PredictionResult {
  currentPrice: number;
  predictions: {
    optimistic: { "1y": number; "5y": number; "10y": number };
    base: { "1y": number; "5y": number; "10y": number };
    pessimistic: { "1y": number; "5y": number; "10y": number };
  };
  variables: string[];
  factors: PredictionFactor[];
  confidence: number;
  aiOpinion: string;
  realTransactions: RealTransaction[];
  priceStats: {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    transactionCount: number;
    period: string;
  } | null;
  // prediction-enhancement 확장 필드
  ensemble?: EnsemblePredictionResult;
  monthlyForecast?: MonthlyPrediction[];
  macroFactors?: MacroEconomicFactors;
  backtestResult?: BacktestResult;
  marketCycle?: MarketCycleInfo;
}

type InputMode = "dong" | "jibun" | "road";
type AddressTab = "admin" | "jibun" | "road";

interface AddressInfo {
  admin: string;
  jibun: string;
  road: string;
  zipCode: string;
}

interface DaumPostcodeData {
  zonecode: string;
  address: string;
  addressEnglish: string;
  addressType: string;
  userSelectedType: string;
  jibunAddress: string;
  roadAddress: string;
  bname: string;
  buildingName: string;
  apartment: string;
  sido: string;
  sigungu: string;
  bname1: string;
  bname2: string;
  roadname: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeData) => void;
        width?: string;
        height?: string;
      }) => { open: () => void; embed: (el: HTMLElement) => void };
    };
  }
}

export default function PredictionPage() {
  const [inputMode, setInputMode] = useState<InputMode>("dong");
  const [selectedSido, setSelectedSido] = useState("");
  const [selectedSigungu, setSelectedSigungu] = useState("");
  const [selectedDong, setSelectedDong] = useState("");
  const [detailAddr, setDetailAddr] = useState("");
  const [jibunInput, setJibunInput] = useState("");
  const [roadResult, setRoadResult] = useState("");

  const resultRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [selectedApt, setSelectedApt] = useState<string | null>(null);
  const [addressTab, setAddressTab] = useState<AddressTab>("admin");
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [activeTab, setActiveTab] = useState<PredictionTabId>("dashboard");

  const sidoList = getSidoList();
  const sigunguList = selectedSido ? getSigunguList(selectedSido) : [];
  const dongList = selectedSido && selectedSigungu ? getEupmyeondongList(selectedSido, selectedSigungu) : [];

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
      alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeData) => {
        const addr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
        setRoadResult(addr);
      },
    }).open();
  }, []);

  const buildAddress = () => {
    if (inputMode === "jibun") return jibunInput.trim();
    if (inputMode === "road") return roadResult.trim();
    return [selectedSido, selectedSigungu, selectedDong, detailAddr.trim()].filter(Boolean).join(" ");
  };

  const canSearch =
    inputMode === "dong" ? !!(selectedSido && selectedSigungu) :
    inputMode === "jibun" ? !!jibunInput.trim() :
    !!roadResult.trim();

  const handleAnalyze = async () => {
    const builtAddress = buildAddress();
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
        body: JSON.stringify({ address: builtAddress }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);

      if (data.realTransactions?.length) {
        const aptNames = [...new Set(data.realTransactions.map((t: RealTransaction) => t.aptName))] as string[];
        const query = address.trim().replace(/\s/g, "");
        const matched = aptNames.find((name) => query.includes(name.replace(/\s/g, "")));
        if (matched) setSelectedApt(matched);
      }

      addAnalysis({
        type: "prediction",
        typeLabel: "시세전망",
        address: address.trim(),
        summary: `현재 ${formatKRW(data.currentPrice)}, 신뢰도 ${data.confidence}%`,
        data: data as Record<string, unknown>,
      });
      addOrUpdateAsset({
        address: address.trim(),
        type: "부동산",
        estimatedPrice: data.currentPrice,
        safetyScore: data.confidence,
        riskScore: 100 - data.confidence,
      });
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

  // 필터링 로직
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
    const prices = filteredTransactions.map((t) => t.dealAmount);
    return { avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length), count: filteredTransactions.length };
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

  // 탭 비활성 목록 계산
  const disabledTabs: PredictionTabId[] = [];
  if (!result?.backtestResult) disabledTabs.push("backtest");
  if (!result?.realTransactions || result.realTransactions.length < 3) disabledTabs.push("anomaly");

  return (
    <div>
      <PageHeader icon={TrendingUp} title="시세전망" description="실거래 데이터 + AI 기반 부동산 시세 분석 및 미래 가격 전망" />

      <div className="mb-6 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-[11px] text-gray-500 leading-relaxed">
          ※ 본 분석 결과는 참고용 정보이며 투자 권유가 아닙니다. VESTRA는 이를 근거로 한 투자 결과에 대해 어떠한 책임도 지지 않습니다.
        </p>
      </div>

      {/* 검색 섹션 */}
      <Card className="p-4 sm:p-6 mb-6">
        <div className="flex gap-1 sm:gap-1.5 mb-3 sm:mb-4">
          {([
            { key: "dong" as InputMode, label: "읍면동" },
            { key: "jibun" as InputMode, label: "지번" },
            { key: "road" as InputMode, label: "도로명" },
          ]).map((tab) => (
            <button key={tab.key} onClick={() => setInputMode(tab.key)} className={cn(
              "px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-all font-medium",
              inputMode === tab.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            )}>{tab.label}</button>
          ))}
        </div>

        {inputMode === "dong" && (
          <>
            <p className="text-xs text-gray-400 mb-3 sm:mb-4 sm:text-center">시도 &gt; 시군구 &gt; 읍면동 순서로 선택하세요. 번지는 선택사항입니다.</p>
            <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center gap-2">
              <select value={selectedSido} onChange={(e) => { setSelectedSido(e.target.value); setSelectedSigungu(""); setSelectedDong(""); }} className="col-span-1 min-w-0 px-2.5 sm:px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary sm:flex-1">
                <option value="">시도 선택</option>
                {sidoList.map((sido) => <option key={sido} value={sido}>{sido}</option>)}
              </select>
              <select value={selectedSigungu} onChange={(e) => { setSelectedSigungu(e.target.value); setSelectedDong(""); }} disabled={!selectedSido} className="col-span-1 min-w-0 px-2.5 sm:px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-100 disabled:text-gray-400 sm:flex-1">
                <option value="">시군구</option>
                {sigunguList.map((sg) => <option key={sg} value={sg}>{sg}</option>)}
              </select>
              <select value={selectedDong} onChange={(e) => setSelectedDong(e.target.value)} disabled={!selectedSigungu} className="col-span-1 min-w-0 px-2.5 sm:px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-100 disabled:text-gray-400 sm:flex-1">
                <option value="">읍면동</option>
                {dongList.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input type="text" value={detailAddr} onChange={(e) => setDetailAddr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && canSearch && handleAnalyze()} placeholder="번지" className="col-span-1 min-w-0 px-2.5 sm:px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary sm:w-28 sm:flex-none" />
              <Button icon={Search} loading={loading} disabled={!canSearch} size="lg" onClick={handleAnalyze} className="col-span-2 sm:col-span-1">검색</Button>
            </div>
          </>
        )}

        {inputMode === "jibun" && (
          <>
            <p className="text-xs text-gray-400 mb-3 sm:mb-4 sm:text-center">예: 서울 강남구 역삼동 677, 경기 성남시 분당구 정자동 178-1</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input type="text" value={jibunInput} onChange={(e) => setJibunInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && canSearch && handleAnalyze()} placeholder="지번 주소를 입력하세요" className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm" />
              <Button icon={Search} loading={loading} disabled={!canSearch} size="lg" onClick={handleAnalyze}>검색</Button>
            </div>
            <div className="flex gap-1.5 sm:gap-2 mt-2.5 sm:mt-3 flex-wrap">
              {["서울 강남구 역삼동 래미안", "서울 송파구 잠실동 40", "서울 서초구 반포동 18-1", "경기 성남시 분당구 정자동"].map((q) => (
                <button key={q} onClick={() => setJibunInput(q)} className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs bg-gray-100 text-secondary rounded-full hover:bg-gray-200 transition-colors">{q}</button>
              ))}
            </div>
          </>
        )}

        {inputMode === "road" && (
          <>
            <p className="text-xs text-gray-400 mb-3 sm:mb-4 sm:text-center">검색 버튼을 눌러 도로명주소를 선택하세요.</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div onClick={openDaumPostcode} className={cn(
                "flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border text-sm cursor-pointer transition-colors",
                roadResult ? "border-border bg-white text-gray-900" : "border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:bg-gray-100"
              )}>{roadResult || "클릭하여 도로명주소 검색"}</div>
              {roadResult ? (
                <Button icon={Search} loading={loading} disabled={!canSearch} size="lg" onClick={handleAnalyze}>검색</Button>
              ) : (
                <Button icon={Search} size="lg" onClick={openDaumPostcode}>주소 검색</Button>
              )}
            </div>
          </>
        )}
      </Card>

      {/* 지도 + 주소 정보 */}
      <Card className="p-4 mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><MapPin size={16} strokeWidth={1.5} />위치</h3>
        {addressInfo && result && (
          <div className="p-3 mb-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-gray-400">주소</p>
              <div className="flex gap-1">
                {([
                  { key: "admin" as AddressTab, label: "행정동" },
                  { key: "jibun" as AddressTab, label: "지번" },
                  { key: "road" as AddressTab, label: "도로명" },
                ]).map((tab) => (
                  <button key={tab.key} onClick={() => setAddressTab(tab.key)} className={cn(
                    "px-2 py-0.5 text-[10px] rounded-md border transition-all",
                    addressTab === tab.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  )}>{tab.label}</button>
                ))}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900">{addressInfo[addressTab]}</p>
            {addressInfo.zipCode && addressInfo.zipCode !== "-" && (
              <p className="text-[11px] text-gray-400 mt-1">우편번호: {addressInfo.zipCode}</p>
            )}
          </div>
        )}
        {address ? <KakaoMap address={address} /> : (
          <div className="h-[300px] rounded-xl bg-gray-100 flex items-center justify-center text-secondary text-sm">지역을 선택해 주세요</div>
        )}
      </Card>

      {loading && <LoadingSpinner message="실거래 데이터 수집 및 AI 가치 예측 분석 중입니다..." />}

      {/* 결과 영역 (탭 기반) */}
      {result && !loading && (
        <div ref={resultRef} className="space-y-6">
          <div className="flex items-center justify-between">
            <AiDisclaimer compact />
            <PdfDownloadButton targetRef={resultRef} filename="vestra-prediction.pdf" title="VESTRA 시세전망 리포트" />
          </div>

          {/* 아파트 + 면적 필터 */}
          {(availableApts.length > 0 || availableAreas.length > 0) && (
            <Card className="p-4 space-y-3">
              {availableApts.length > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-secondary whitespace-nowrap">아파트</span>
                  <select value={selectedApt ?? ""} onChange={(e) => { setSelectedApt(e.target.value || null); setSelectedArea(null); }} className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-xs">
                    <option value="">전체 ({availableApts.length}개 단지)</option>
                    {availableApts.map((apt) => <option key={apt} value={apt}>{apt}</option>)}
                  </select>
                </div>
              )}
              {availableAreas.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-secondary whitespace-nowrap">전용면적</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setSelectedArea(null)} className={cn("px-3 py-1 text-xs rounded-full border transition-all", selectedArea === null ? "bg-gray-900 text-white border-gray-900" : "bg-white text-secondary border-border hover:bg-gray-50")}>전체평수</button>
                    {availableAreas.map((area) => (
                      <button key={area} onClick={() => setSelectedArea(area)} className={cn("px-3 py-1 text-xs rounded-full border transition-all", selectedArea === area ? "bg-gray-900 text-white border-gray-900" : "bg-white text-secondary border-border hover:bg-gray-50")}>{area}㎡</button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 탭 네비게이션 */}
          <PredictionTabs activeTab={activeTab} onTabChange={setActiveTab} disabledTabs={disabledTabs} />

          {/* 대시보드 탭 */}
          {activeTab === "dashboard" && (
            <PredictionDashboard result={result as never} address={address} />
          )}

          {/* 차트 탭 */}
          {activeTab === "chart" && (
            <div className="space-y-6">
              {/* 실거래가 추이 */}
              <Card className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 size={16} strokeWidth={1.5} />실거래가 추이</h3>
                {getHistoricalData().length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getHistoricalData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `${(v / 100000000).toFixed(1)}억`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => [formatKRW(Number(value)), "거래가"]} labelFormatter={(label) => `거래시점: ${label}`} />
                        <Area type="monotone" dataKey="price" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-secondary text-sm">실거래 데이터가 없습니다</div>
                )}
              </Card>

              {/* 월별 예측 추이 */}
              {result.monthlyForecast && result.monthlyForecast.length > 0 && (
                <MonthlyForecastChart forecasts={result.monthlyForecast} currentPrice={result.currentPrice} />
              )}

              {/* 시나리오별 예측 차트 */}
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="font-semibold">시나리오별 가격 예측</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {scenarios.map((s) => (
                      <button key={s.id} onClick={() => setActiveScenario(s.id)} className={cn("px-3 py-1 text-xs rounded-full border transition-all", activeScenario === s.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-secondary border-border hover:bg-gray-50")}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(v) => `${(v / 100000000).toFixed(0)}억`} />
                      <Tooltip formatter={(value) => [formatKRW(Number(value)), ""]} />
                      <Legend />
                      {(activeScenario === "all" || activeScenario === "optimistic") && (
                        <Line type="monotone" dataKey="optimistic" name="낙관적" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} strokeDasharray={activeScenario === "all" ? "5 5" : "0"} />
                      )}
                      {(activeScenario === "all" || activeScenario === "base") && (
                        <Line type="monotone" dataKey="base" name="기본" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                      )}
                      {(activeScenario === "all" || activeScenario === "pessimistic") && (
                        <Line type="monotone" dataKey="pessimistic" name="비관적" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} strokeDasharray={activeScenario === "all" ? "5 5" : "0"} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* 가격 영향 요인 */}
              {result.factors && result.factors.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap size={16} strokeWidth={1.5} />가격 영향 요인 분석</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.factors.map((factor, i) => (
                      <div key={i} className="p-4 rounded-lg border border-border bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-2">
                          {factor.impact === "positive" && <TrendingUp size={16} className="text-emerald-600" />}
                          {factor.impact === "negative" && <TrendingDown size={16} className="text-red-600" />}
                          {factor.impact === "neutral" && <Minus size={16} className="text-gray-500" />}
                          <span className="font-medium text-sm">{factor.name}</span>
                          <span className={cn("px-2 py-0.5 text-[10px] rounded-full font-medium",
                            factor.impact === "positive" && "bg-emerald-100 text-emerald-700",
                            factor.impact === "negative" && "bg-red-100 text-red-700",
                            factor.impact === "neutral" && "bg-gray-100 text-gray-600"
                          )}>{factor.impact === "positive" ? "상승요인" : factor.impact === "negative" ? "하락요인" : "중립"}</span>
                        </div>
                        <p className="text-xs text-secondary leading-relaxed">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 시나리오별 예측 상세 테이블 */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">시나리오별 예측 상세</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-secondary">시나리오</th>
                        <th className="text-right py-3 px-4 font-medium text-secondary">1년 후</th>
                        <th className="text-right py-3 px-4 font-medium text-secondary">5년 후</th>
                        <th className="text-right py-3 px-4 font-medium text-secondary">10년 후</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: "optimistic" as const, label: "낙관적", color: "text-emerald-600" },
                        { key: "base" as const, label: "기본", color: "text-blue-600" },
                        { key: "pessimistic" as const, label: "비관적", color: "text-red-600" },
                      ].map((scenario) => (
                        <tr key={scenario.key} className="border-b border-border/50 hover:bg-gray-50">
                          <td className={cn("py-3 px-4 font-medium", scenario.color)}>{scenario.label}</td>
                          <td className="text-right py-3 px-4">{formatKRW(result.predictions[scenario.key]["1y"])}</td>
                          <td className="text-right py-3 px-4">{formatKRW(result.predictions[scenario.key]["5y"])}</td>
                          <td className="text-right py-3 px-4 font-semibold">{formatKRW(result.predictions[scenario.key]["10y"])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 비교 탭 */}
          {activeTab === "compare" && (
            <RegionCompare primaryResult={result ? {
              address,
              currentPrice: result.currentPrice,
              prediction1y: result.predictions.base["1y"],
              confidence: result.confidence,
            } : undefined} />
          )}

          {/* 백테스트 탭 */}
          {activeTab === "backtest" && result.backtestResult && (
            <BacktestView result={result.backtestResult} />
          )}

          {/* 이상탐지 탭 */}
          {activeTab === "anomaly" && result.realTransactions?.length >= 3 && (
            <AnomalyDetectionView transactions={result.realTransactions} currentPrice={result.currentPrice} />
          )}

          {/* 무결성 검증 배지 */}
          <IntegrityBadge steps={5} />

          {/* 실거래 내역 */}
          {filteredTransactions.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">
                실거래 내역
                <span className="text-sm font-normal text-secondary ml-2">
                  ({result.priceStats?.period ?? ""} / {filteredTransactions.length}건{selectedArea !== null && ` / ${selectedArea}㎡`})
                </span>
              </h3>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-secondary">아파트</th>
                      <th className="text-right py-3 px-4 font-medium text-secondary">거래가</th>
                      <th className="text-right py-3 px-4 font-medium text-secondary">면적</th>
                      <th className="text-right py-3 px-4 font-medium text-secondary">층</th>
                      <th className="text-right py-3 px-4 font-medium text-secondary">거래일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.slice(0, 30).map((t, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-gray-50">
                        <td className="py-3 px-4">{t.aptName}</td>
                        <td className="text-right py-3 px-4 font-medium">{formatKRW(t.dealAmount)}</td>
                        <td className="text-right py-3 px-4">{Math.round(t.area)}㎡</td>
                        <td className="text-right py-3 px-4">{t.floor}층</td>
                        <td className="text-right py-3 px-4 text-secondary">{t.dealYear}.{String(t.dealMonth).padStart(2, "0")}.{String(t.dealDay).padStart(2, "0")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* AI 분석 의견 */}
          <div className="bg-[#f5f5f7] border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2"><TrendingUp size={20} strokeWidth={1.5} />AI 분석 의견</h3>
            <p className="text-[#1d1d1f] text-sm leading-relaxed whitespace-pre-line">{result.aiOpinion}</p>
          </div>

          {/* 반영 변수 */}
          {result.variables && result.variables.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-secondary mb-3"><Zap size={16} strokeWidth={1.5} />반영 변수</div>
              <div className="flex flex-wrap gap-1.5">
                {result.variables.map((v, i) => <span key={i} className="px-2.5 py-1 bg-[#f5f5f7] text-[#1d1d1f] text-xs rounded-full">{v}</span>)}
              </div>
            </Card>
          )}

          <ScholarPapers keywords={["부동산 가격예측", "실거래가", addressInfo?.admin?.split(" ").slice(0, 2).join(" ") || "부동산"].filter(Boolean)} />

          <Alert variant="warning">
            <strong>면책 조항 (Disclaimer)</strong><br />
            본 분석은 AI(인공지능) 기반의 참고 자료이며, 투자 조언이 아닙니다.
            실거래 데이터는 국토교통부 공공데이터를 기반으로 하나, 실시간 시세와 차이가 있을 수 있습니다.
            부동산 투자 결정 시 반드시 공인중개사, 감정평가사 등 전문가와 상담하시기 바랍니다.
            VESTRA는 본 분석 결과에 따른 투자 손실에 대해 책임을 지지 않습니다.
          </Alert>
        </div>
      )}
    </div>
  );
}

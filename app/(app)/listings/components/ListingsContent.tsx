"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useListings, type ListingType } from "../hooks/useListings";
import { ListingCard } from "./ListingCard";
import { useSession } from "next-auth/react";
import { ListingsMapView } from "./ListingsMapView";

const REGIONS: Record<string, string[]> = {
  "서울특별시": ["강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"],
  "부산광역시": ["강서구","금정구","남구","동구","동래구","부산진구","북구","사상구","사하구","서구","수영구","연제구","영도구","중구","해운대구"],
  "대구광역시": ["남구","달서구","달성군","동구","북구","서구","수성구","중구"],
  "인천광역시": ["강화군","계양구","남동구","동구","미추홀구","부평구","서구","연수구","옹진군","중구"],
  "광주광역시": ["광산구","남구","동구","북구","서구"],
  "대전광역시": ["대덕구","동구","서구","유성구","중구"],
  "울산광역시": ["남구","동구","북구","울주군","중구"],
  "세종특별자치시": ["세종시"],
  "경기도": ["고양시","과천시","광명시","광주시","구리시","군포시","김포시","남양주시","부천시","성남시","수원시","시흥시","안산시","안성시","안양시","양주시","양평군","여주시","연천군","오산시","용인시","의왕시","의정부시","이천시","파주시","평택시","포천시","하남시","화성시"],
  "강원도": ["강릉시","고성군","동해시","삼척시","속초시","양구군","양양군","영월군","원주시","인제군","정선군","철원군","춘천시","태백시","평창군","홍천군","화천군","횡성군"],
  "충청북도": ["괴산군","단양군","보은군","영동군","옥천군","음성군","제천시","증평군","진천군","청주시","충주시"],
  "충청남도": ["계룡시","공주시","금산군","논산시","당진시","보령시","부여군","서산시","서천군","아산시","예산군","천안시","청양군","태안군","홍성군"],
  "전라북도": ["고창군","군산시","김제시","남원시","무주군","부안군","순창군","완주군","익산시","임실군","장수군","전주시","정읍시","진안군"],
  "전라남도": ["강진군","고흥군","곡성군","광양시","구례군","나주시","담양군","목포시","무안군","보성군","순천시","신안군","여수시","영광군","영암군","완도군","장성군","장흥군","진도군","함평군","해남군","화순군"],
  "경상북도": ["경산시","경주시","고령군","구미시","군위군","김천시","문경시","봉화군","상주시","성주군","안동시","영덕군","영양군","영주시","영천시","예천군","울릉군","울진군","의성군","청도군","청송군","칠곡군","포항시"],
  "경상남도": ["거제시","거창군","고성군","김해시","남해군","밀양시","사천시","산청군","양산시","의령군","진주시","창녕군","창원시","통영시","하동군","함안군","함양군","합천군"],
  "제주특별자치도": ["서귀포시","제주시"],
};

const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 11 11' fill='none' stroke='%23aaa' stroke-width='1.8'%3E%3Cpolyline points='2,4 5.5,7.5 9,4'/%3E%3C/svg%3E")`;

interface DdProps {
  defaultLabel: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  open: boolean;
  onToggle: () => void;
}

function FilterDropdown({ defaultLabel, options, value, onChange, open, onToggle }: DdProps) {
  const isActive = value !== defaultLabel;
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 16px", border: `1px solid ${isActive ? "#2e4bd8" : "#dde0ec"}`,
          borderRadius: 6, fontSize: 13, fontFamily: "inherit",
          background: "#fff", color: isActive ? "#2e4bd8" : "#333",
          cursor: "pointer", whiteSpace: "nowrap", fontWeight: isActive ? 600 : 400,
          transition: "border-color 0.15s, color 0.15s",
        }}
      >
        <span>{value}</span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polyline points="2,4 6,8 10,4"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: "#fff", border: "1px solid #dde0ec", borderRadius: 8,
          boxShadow: "0 6px 20px rgba(0,0,0,0.10)", zIndex: 200,
          minWidth: 160, overflow: "hidden", padding: "4px 0",
        }}>
          <button
            type="button"
            onClick={() => onChange(defaultLabel)}
            style={{
              display: "block", width: "100%", padding: "10px 18px",
              fontSize: 13, fontFamily: "inherit", textAlign: "left",
              background: value === defaultLabel ? "#f5f7ff" : "none", border: "none",
              cursor: "pointer", color: value === defaultLabel ? "#2e4bd8" : "#333",
              fontWeight: value === defaultLabel ? 600 : 400, whiteSpace: "nowrap",
            }}
          >
            {defaultLabel} (전체)
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                display: "block", width: "100%", padding: "10px 18px",
                fontSize: 13, fontFamily: "inherit", textAlign: "left",
                background: value === opt ? "#f5f7ff" : "none", border: "none",
                cursor: "pointer", color: value === opt ? "#2e4bd8" : "#333",
                fontWeight: value === opt ? 600 : 400, whiteSpace: "nowrap",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ListingsContent() {
  const { data: session } = useSession();
  const [view, setView] = useState<"list" | "map">("list");

  const [roomType, setRoomType] = useState("건물유형");
  const [tradeType, setTradeType] = useState("거래유형");
  const [sizeLabel, setSizeLabel] = useState("전체 평형");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [openDd, setOpenDd] = useState<string | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenDd(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const listingType: ListingType | undefined =
    tradeType === "전세" ? "JEONSE" :
    tradeType === "매매" ? "SALE" :
    undefined;

  const region = sigungu || sido || undefined;

  const { listings, total, loading } = useListings(listingType, {
    roomType: roomType !== "건물유형" ? roomType : undefined,
    region,
  });

  const canRegister = session && session.user?.userType !== "TENANT";

  if (view === "map") {
    return <ListingsMapView onClose={() => setView("list")} canRegister={!!canRegister} />;
  }

  const sigunguList = sido ? (REGIONS[sido] ?? []) : [];

  return (
    <>
      {/* Sub hero */}
      <section
        className="-mx-4 lg:-mx-6"
        style={{ position: "relative", height: 196, background: "#060c2a", overflow: "hidden", marginTop: -20 }}
      >
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(rgba(4,8,30,0.78), rgba(4,8,30,0.78)), url('https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&auto=format&fit=crop&q=80') center/cover no-repeat",
        }} />
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ textAlign: "center", fontSize: 19, fontWeight: 300, color: "rgba(255,255,255,0.93)", lineHeight: 1.65 }}>
            베스트라의 매물은 안심인증등록제로 운영되어<br />
            안심하고 거래할 수 있습니다.
          </p>
        </div>
      </section>

      {/* Listings section */}
      <section style={{ paddingTop: 52, paddingBottom: 80 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1a1d2e", textAlign: "center", marginBottom: 26 }}>
          베스트라 인증 안심전세 매물
        </h2>

        {/* Results header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontSize: 13, color: "#888" }}>
            총 <strong style={{ color: "#1a1d2e", fontWeight: 600 }}>{total}개</strong> 매물
          </p>

          <div ref={filterRef} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <FilterDropdown
              defaultLabel="건물유형"
              options={["아파트", "단독", "다가구", "연립", "빌라"]}
              value={roomType}
              onChange={(v) => { setRoomType(v); setOpenDd(null); }}
              open={openDd === "type"}
              onToggle={() => setOpenDd(prev => prev === "type" ? null : "type")}
            />
            <FilterDropdown
              defaultLabel="거래유형"
              options={["매매", "전세", "단기임대", "초단기임대"]}
              value={tradeType}
              onChange={(v) => { setTradeType(v); setOpenDd(null); }}
              open={openDd === "trade"}
              onToggle={() => setOpenDd(prev => prev === "trade" ? null : "trade")}
            />
            <FilterDropdown
              defaultLabel="전체 평형"
              options={["10평형", "20평형", "30평형", "40평형", "50평형", "50평형 이상"]}
              value={sizeLabel}
              onChange={(v) => { setSizeLabel(v); setOpenDd(null); }}
              open={openDd === "size"}
              onToggle={() => setOpenDd(prev => prev === "size" ? null : "size")}
            />

            <div style={{ width: 1, height: 20, background: "#e8eaf0", margin: "0 4px" }} />

            {/* Location selects */}
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={sido}
                onChange={(e) => { setSido(e.target.value); setSigungu(""); }}
                style={{
                  appearance: "none", WebkitAppearance: "none",
                  padding: "7px 28px 7px 12px", border: "1px solid #dde0ec",
                  borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                  color: "#333", background: `#fff ${SELECT_ARROW} no-repeat right 10px center`,
                  backgroundSize: "11px", cursor: "pointer", outline: "none",
                }}
              >
                <option value="">시 / 도</option>
                {Object.keys(REGIONS).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select
                value={sigungu}
                onChange={(e) => setSigungu(e.target.value)}
                disabled={sigunguList.length === 0}
                style={{
                  appearance: "none", WebkitAppearance: "none",
                  padding: "7px 28px 7px 12px", border: "1px solid #dde0ec",
                  borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                  color: sigunguList.length === 0 ? "#bbb" : "#333",
                  background: `${sigunguList.length === 0 ? "#fafbfc" : "#fff"} ${SELECT_ARROW} no-repeat right 10px center`,
                  backgroundSize: "11px", cursor: sigunguList.length === 0 ? "default" : "pointer", outline: "none",
                }}
              >
                <option value="">시 / 군 / 구</option>
                {sigunguList.map((sg) => (
                  <option key={sg} value={sg}>{sg}</option>
                ))}
              </select>
            </div>

            {/* View toggle */}
            <div style={{ display: "flex", border: "1px solid #dde0ec", borderRadius: 6, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setView("list")}
                title="목록보기"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "7px 10px", background: "#f0f3ff",
                  border: "none", color: "#2e4bd8", cursor: "pointer",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1">
                  <line x1="1" y1="3" x2="14" y2="3"/>
                  <line x1="1" y1="7.5" x2="14" y2="7.5"/>
                  <line x1="1" y1="12" x2="14" y2="12"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                title="지도보기"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "7px 10px", background: "#fff",
                  border: "none", borderLeft: "1px solid #dde0ec", color: "#bbb", cursor: "pointer",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M7.5 1C5.3 1 3.5 2.8 3.5 5c0 3.2 4 9 4 9s4-5.8 4-9c0-2.2-1.8-4-4-4Z"/>
                  <circle cx="7.5" cy="5" r="1.4"/>
                </svg>
              </button>
            </div>

            {canRegister && (
              <Link href="/listings/new" style={{ textDecoration: "none" }}>
                <button
                  type="button"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "9px 16px", borderRadius: 6,
                    background: "#2e4bd8", color: "#fff",
                    fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                  }}
                >
                  <Plus size={14} strokeWidth={2} />매물 등록
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-[18px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 280, borderRadius: 10, background: "#f5f5f7" }} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#aeaeb2" }}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>등록된 매물이 없습니다</p>
            <p style={{ fontSize: 13 }}>첫 번째 매물을 등록해보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-[18px]">
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>
    </>
  );
}

"use client";

import { useState, useRef } from "react";
import { MapPin, FileText, Paperclip, AlertTriangle } from "lucide-react";
import s from "./jeonse-renewal.module.css";
import JeonseRenewalNav from "./components/JeonseRenewalNav";
import { JeonseEnvAnalysis } from "./components/JeonseEnvAnalysis";

const ADDR_DB = [
  { zip: "06253", road: "서울특별시 강남구 강남대로 354", jibun: "역삼동 837-34", bldg: "혜천빌딩" },
  { zip: "04084", road: "서울특별시 마포구 독막로 186", jibun: "합정동 402-5", bldg: "" },
  { zip: "05551", road: "서울특별시 송파구 올림픽로35길 137", jibun: "잠실동 40", bldg: "잠실 롯데캐슬" },
  { zip: "06612", road: "서울특별시 서초구 반포대로 201", jibun: "반포동 19-3", bldg: "" },
  { zip: "04349", road: "서울특별시 용산구 이태원로 177", jibun: "이태원동 210", bldg: "" },
  { zip: "06524", road: "서울특별시 서초구 서초대로 411", jibun: "서초동 1305-3", bldg: "" },
  { zip: "03929", road: "서울특별시 마포구 월드컵북로 396", jibun: "상암동 1703", bldg: "DMC 디지털큐브" },
  { zip: "06175", road: "서울특별시 강남구 테헤란로 152", jibun: "역삼동 737", bldg: "강남파이낸스센터" },
  { zip: "04527", road: "서울특별시 중구 세종대로 110", jibun: "태평로1가 31", bldg: "서울시청" },
];

type AddrEntry = typeof ADDR_DB[0];

interface ChecklistState {
  [key: number]: boolean;
}

export default function JeonseRenewalContent() {
  const [activeTab, setActiveTab] = useState("analysis");
  const [mode, setMode] = useState<"addr" | "file">("addr");
  const [addrZip, setAddrZip] = useState("");
  const [addrBase, setAddrBase] = useState("");
  const [addrBaseFilled, setAddrBaseFilled] = useState(false);
  const [addrDetail, setAddrDetail] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSelected, setFileSelected] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [modalResults, setModalResults] = useState<AddrEntry[] | null>(null);
  const [checklist, setChecklist] = useState<ChecklistState>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const snavRef = useRef<HTMLDivElement>(null);

  const CK_TOTAL = 15;
  const checkedCount = Object.values(checklist).filter(Boolean).length;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (snavRef.current) {
      const top = snavRef.current.offsetTop - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const analyzeReady = addrZip && addrBase && addrDetail.trim();
  const fileAnalyzeReady = fileSelected;

  const handleFile = (files: FileList | null) => {
    if (files && files[0]) {
      setFileName(files[0].name);
      setFileSelected(true);
    }
  };

  const clearFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileName("");
    setFileSelected(false);
  };

  const startAnalysis = () => {
    alert("분석 요청이 접수되었습니다.\n\n실제 서비스에서는 AI 분석 결과 페이지로 이동합니다.");
  };

  const openModal = () => {
    setModalQuery("");
    setModalResults(null);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const doSearch = () => {
    const q = modalQuery.trim();
    if (!q) return;
    let results = ADDR_DB.filter(
      (a) => a.road.includes(q) || a.jibun.includes(q) || (a.bldg && a.bldg.includes(q))
    );
    if (results.length === 0) results = ADDR_DB;
    setModalResults(results);
  };

  const selectAddr = (zip: string, road: string) => {
    setAddrZip(zip);
    setAddrBase(road);
    setAddrBaseFilled(true);
    closeModal();
  };

  const toggleCk = (idx: number) => {
    setChecklist((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const ckBarWidth = `${(checkedCount / CK_TOTAL) * 100}%`;

  const tabs = [
    { id: "guide", label: "절차안내" },
    { id: "analysis", label: "전세안전분석" },
    { id: "movein", label: "전입신고" },
    { id: "fixeddate", label: "확정일자" },
    { id: "setreg", label: "전세권설정등기" },
    { id: "tenancy", label: "임차권등기명령" },
    { id: "rental", label: "주택임대차신고" },
    { id: "checklist", label: "계약체크리스트" },
    { id: "env", label: "주변환경분석" },
  ];

  return (
    <>
      <JeonseRenewalNav />

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>AI Jeonse Protection</span>
          <h1>전세보호</h1>
          <p className={s.subHeroSub}>계약 전 AI가 전세 위험 요소를 빠짐없이 검사합니다</p>
        </div>
      </section>

      {/* SUB NAV */}
      <div className={s.snavWrap} ref={snavRef}>
        <div className={s.snavIn}>
          <nav className={s.snav}>
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`${s.snavBtn}${activeTab === t.id ? " " + s.on : ""}`}
                onClick={() => handleTabChange(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ████ PANEL: 전세안전분석 ████ */}
      <div className={`${s.tab}${activeTab === "analysis" ? " " + s.on : ""}`}>
        <div className={s.panelWrap}>
          <div className={s.analysisGrid}>
            {/* Left: 입력 폼 */}
            <div className={`${s.analysisLeft} ${s.analysisSticky}`}>
              <div className={s.acard}>
                <p className={s.secEyebrow} style={{ marginBottom: "6px" }}>전세안전분석</p>
                <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "18px" }}>분석 방법을 선택하세요</h2>
                <div className={s.amodeToggle}>
                  <button
                    className={`${s.amodeBtn}${mode === "addr" ? " " + s.on : ""}`}
                    onClick={() => setMode("addr")}
                  >
                    <MapPin size={15} /> 주소 입력
                  </button>
                  <button
                    className={`${s.amodeBtn}${mode === "file" ? " " + s.on : ""}`}
                    onClick={() => setMode("file")}
                  >
                    <FileText size={15} /> 등기부등본 업로드
                  </button>
                </div>

                {/* 주소 입력 폼 */}
                <div className={`${s.addrForm}${mode === "addr" ? " " + s.on : ""}`}>
                  <div className={s.addrRow}>
                    <input
                      className={s.addrZip}
                      type="text"
                      readOnly
                      placeholder="우편번호"
                      value={addrZip}
                    />
                    <button className={s.addrSearchBtn} onClick={openModal}>주소 검색</button>
                  </div>
                  <input
                    className={`${s.addrBase}${addrBaseFilled ? " " + s.filled : ""}`}
                    type="text"
                    readOnly
                    placeholder="도로명 주소 (주소 검색 후 자동 입력)"
                    value={addrBase}
                  />
                  <input
                    className={`${s.addrDetail}${addrBase ? " " + s.enabled : ""}`}
                    type="text"
                    placeholder="상세주소 예) 101동 1302호, 3층"
                    value={addrDetail}
                    onChange={(e) => setAddrDetail(e.target.value)}
                  />
                  <p className={s.addrHint}>※ 아파트·오피스텔은 동·호수까지, 빌라·단독주택은 층수를 입력해 주세요.</p>
                  <button
                    className={s.analyzeBtn}
                    onClick={startAnalysis}
                    disabled={!analyzeReady}
                  >
                    분석 시작하기
                  </button>
                </div>

                {/* 파일 업로드 폼 */}
                <div className={`${s.fileForm}${mode === "file" ? " " + s.on : ""}`}>
                  <div
                    className={s.dropZone}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add(s.drag); }}
                    onDragLeave={(e) => { (e.currentTarget as HTMLElement).classList.remove(s.drag); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).classList.remove(s.drag);
                      handleFile(e.dataTransfer.files);
                    }}
                  >
                    <div className={s.dropIcon}><Paperclip size={32} /></div>
                    <div className={s.dropTitle}>파일을 끌어다 놓거나 클릭하여 업로드</div>
                    <div className={s.dropDesc}>
                      등기부등본 PDF 또는 이미지 파일을 업로드하면<br />
                      AI가 자동으로 내용을 분석합니다
                    </div>
                    <div className={s.dropTypes}>
                      <span className={s.dropType}>PDF</span>
                      <span className={s.dropType}>JPG</span>
                      <span className={s.dropType}>PNG</span>
                      <span className={s.dropType}>최대 10MB</span>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files)}
                  />
                  <div className={`${s.fileSelected}${fileSelected ? " " + s.show : ""}`}>
                    <FileText size={14} />
                    <span className={s.fileName}>{fileName}</span>
                    <button className={s.fileDel} onClick={clearFile}>×</button>
                  </div>
                  <button
                    className={s.analyzeBtn}
                    onClick={startAnalysis}
                    disabled={!fileAnalyzeReady}
                  >
                    분석 시작하기
                  </button>
                </div>
              </div>
            </div>

            {/* Right: 분석 결과 */}
            <div className={s.analysisRight}>
              <div className={s.acard}>
                <p className={s.secEyebrow} style={{ marginBottom: "4px" }}>Sample Analysis</p>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1d2e", marginBottom: "6px", letterSpacing: "-.3px" }}>
                  이런 형태로 결과가 제공됩니다
                </h3>
                <div className={s.rscoreAddr} style={{ marginBottom: "16px" }}>서울시 마포구 합정동 402-5 3층</div>

                {/* KPI 요약 */}
                <div className={s.resultKpi}>
                  <div className={s.resultKpiCard}>
                    <div className={s.resultKpiLabel}>안전 점수</div>
                    <div className={s.resultKpiVal}>72<span className={s.resultKpiUnit}>점</span></div>
                    <div className={s.resultKpiTag} style={{ color: "#b45309" }}><AlertTriangle size={12} style={{ verticalAlign: "-2px" }} /> 주의 필요</div>
                  </div>
                  <div className={s.resultKpiCard}>
                    <div className={s.resultKpiLabel}>전세가율 (LTV)</div>
                    <div className={s.resultKpiVal}>81<span className={s.resultKpiUnit}>%</span></div>
                    <div className={s.resultKpiTag} style={{ color: "#b91c1c" }}>기준(80%) 초과</div>
                  </div>
                  <div className={s.resultKpiCard}>
                    <div className={s.resultKpiLabel}>보증보험</div>
                    <div className={s.resultKpiVal} style={{ fontSize: "14px" }}>HUG 불가</div>
                    <div className={s.resultKpiTag} style={{ color: "#15803d" }}>SGI 가입 검토</div>
                  </div>
                </div>

                {/* 점수 + 체크리스트 */}
                <div className={s.resultSplit}>
                  <div className={s.resultGaugeCol}>
                    <div className={s.gaugeWrap}>
                      <svg width="140" height="140" viewBox="0 0 156 156">
                        <circle cx="78" cy="78" r="58" fill="none" stroke="#f0f2f6" strokeWidth="13" />
                        <circle cx="78" cy="78" r="58" fill="none" stroke="#f59e0b" strokeWidth="13"
                          strokeDasharray="262.9 364.4" strokeLinecap="round" transform="rotate(-90 78 78)" />
                      </svg>
                      <div className={s.gaugeMid}>
                        <div className={s.gaugeN}>72</div>
                        <div className={s.gaugeU}>/ 100점</div>
                      </div>
                    </div>
                    <div style={{ marginTop: "8px" }}><span className={s.gaugeGrade}><AlertTriangle size={14} style={{ verticalAlign: "-2px" }} /> 주의 필요</span></div>
                    <div className={s.rmeta} style={{ justifyContent: "center", gap: "10px", marginTop: "8px" }}>
                      <span>2026.08.10</span><span>6개 항목</span>
                    </div>
                  </div>
                  <div className={s.resultCheckCol}>
                    <div className={s.rcheckTitle}>항목별 분석 결과</div>
                    <div className={s.clist}>
                      <div className={`${s.ci} ${s.d}`}><div className={s.cdot}></div><div className={s.clabel}>선순위 채권비율 초과</div><div className={s.cdetail}>근저당 1.2억 · 전세가 2.8억 → 78%</div><span className={s.cbadge}>위험</span></div>
                      <div className={`${s.ci} ${s.w}`}><div className={s.cdot}></div><div className={s.clabel}>전세가율 기준 초과</div><div className={s.cdetail}>전세가율 81% · HUG 기준(80%) 초과</div><span className={s.cbadge}>주의</span></div>
                      <div className={`${s.ci} ${s.w}`}><div className={s.cdot}></div><div className={s.clabel}>전세보증보험 가입 불가</div><div className={s.cdetail}>전세가율 초과로 HUG 보증 대상 제외</div><span className={s.cbadge}>주의</span></div>
                      <div className={`${s.ci} ${s.s}`}><div className={s.cdot}></div><div className={s.clabel}>등기부등본 이상 없음</div><div className={s.cdetail}>압류·가압류·예고등기 없음</div><span className={s.cbadge}>안전</span></div>
                      <div className={`${s.ci} ${s.s}`}><div className={s.cdot}></div><div className={s.clabel}>확정일자 취득 가능</div><div className={s.cdetail}>전입신고 후 주민센터 또는 인터넷등기소</div><span className={s.cbadge}>안전</span></div>
                      <div className={`${s.ci} ${s.s}`}><div className={s.cdot}></div><div className={s.clabel}>건축물대장 이상 없음</div><div className={s.cdetail}>위반건축물 이력 없음 · 주거용 유지</div><span className={s.cbadge}>안전</span></div>
                    </div>
                    <div className={s.rnote}>※ 위 결과는 시안 예시입니다. AI 분석 결과는 참고용이며 법적 효력이 없습니다.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6대 보호항목 */}
          <p className={s.secEyebrow}>Protection Scope</p>
          <h2 className={s.secTitle}>6대 전세보호 항목</h2>
          <p className={s.secDesc}>
            VESTRA는 계약 전 반드시 확인해야 할 6가지 항목을 AI로 자동 검사합니다.<br />
            한 항목이라도 이상이 있으면 전세금을 잃을 수 있습니다.
          </p>
          <div className={s.cardsGrid}>
            <div className={s.pcard}>
              <div className={s.pcardIcon}><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></div>
              <div className={s.pcardTitle}>등기부등본 AI 분석</div>
              <div className={s.pcardDesc}>근저당·가압류·압류·신탁등기 등 권리 이상을 자동 탐지하고 선순위 채권 총액을 계산합니다.</div>
              <span className={`${s.pcardTag} ${s.tagR}`}>핵심 위험 항목</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}><svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg></div>
              <div className={s.pcardTitle}>LTV · 전세가율 계산</div>
              <div className={s.pcardDesc}>전세 보증금이 매매가 대비 몇 %인지 계산합니다. 80% 초과 시 보증금 반환 위험이 급격히 높아집니다.</div>
              <span className={`${s.pcardTag} ${s.tagC}`}>요주의</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
              <div className={s.pcardTitle}>전세보증보험 판정</div>
              <div className={s.pcardDesc}>HUG·HF·SGI 보증보험 가입 가능 여부를 사전 판정합니다. 가입 불가 시 대안 보호 수단을 안내합니다.</div>
              <span className={`${s.pcardTag} ${s.tagS}`}>HUG / HF / SGI</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 16 11 18 15 14" /></svg></div>
              <div className={s.pcardTitle}>확정일자 · 우선변제권</div>
              <div className={s.pcardDesc}>전입신고 및 확정일자 취득 여부와 우선변제 순위를 검사합니다. 미취득 시 배당 순위에서 밀립니다.</div>
              <span className={`${s.pcardTag} ${s.tagS}`}>필수 체크</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div>
              <div className={s.pcardTitle}>권리관계 이상탐지</div>
              <div className={s.pcardDesc}>가등기·예고등기·경매개시결정·신탁등기 등 고위험 등기를 집중 탐지합니다.</div>
              <span className={`${s.pcardTag} ${s.tagR}`}>AI 자동 탐지</span>
            </div>
            <div className={s.pcard}>
              <div className={s.pcardIcon}><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg></div>
              <div className={s.pcardTitle}>건축물대장 검사</div>
              <div className={s.pcardDesc}>위반건축물·불법 증개축·용도변경 이력을 확인합니다. 이상 건물은 보증보험 가입이 불가할 수 있습니다.</div>
              <span className={`${s.pcardTag} ${s.tagC}`}>대장 연동</span>
            </div>
          </div>

          {/* 이용 절차 */}
          <div style={{ marginTop: "56px" }}>
            <p className={s.secEyebrow}>How It Works</p>
            <h2 className={s.secTitle}>분석은 4단계로 진행됩니다</h2>
            <div className={s.procSteps}>
              <div className={s.pstep}><div className={`${s.pstepN} ${s.pn1}`}>01</div><div className={s.pstepT}>주소 입력</div><div className={s.pstepD}>계약 예정 주소를 입력합니다. 아파트명도 가능합니다.</div></div>
              <div className={s.pstep}><div className={`${s.pstepN} ${s.pn2}`}>02</div><div className={s.pstepT}>공공데이터 수집</div><div className={s.pstepD}>등기부등본·건축물대장·실거래가를 자동 수집합니다.</div></div>
              <div className={s.pstep}><div className={`${s.pstepN} ${s.pn3}`}>03</div><div className={s.pstepT}>AI 위험도 분석</div><div className={s.pstepD}>6개 항목을 AI가 종합 분석하여 점수를 산정합니다.</div></div>
              <div className={s.pstep}><div className={`${s.pstepN} ${s.pn4}`}>04</div><div className={s.pstepT}>리포트 제공</div><div className={s.pstepD}>항목별 상세 결과와 전문가 권고사항을 제공합니다.</div></div>
            </div>
          </div>

          {/* CTA */}
          <div className={s.ctaSec}>
            <div className={s.ctaIn}>
              <h2 className={s.ctaT}>지금 무료로 분석을 시작하세요</h2>
              <p className={s.ctaD}>
                전세 계약 전 1번의 분석이 수억 원의 전세금을 지킵니다.<br />
                VESTRA AI가 빠르게 위험 요소를 알려드립니다.
              </p>
              <div className={s.ctaBtns}>
                <button className={s.ctaP}>무료 분석 시작하기</button>
                <button className={s.ctaO}>서비스 소개 보기</button>
              </div>
              <div className={s.ctaBadges}>
                <span className={s.ctaBadge}>무료 이용</span>
                <span className={s.ctaBadge}>회원가입 불필요</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ████ PANEL: 절차안내 ████ */}
      <div className={`${s.tab}${activeTab === "guide" ? " " + s.on : ""}`}>
        <div className={`${s.panelWrap} ${s.narrow}`}>
          <p className={s.secEyebrow}>Step-by-Step Guide</p>
          <h2 className={s.secTitle}>전세 계약 단계별 보호 절차</h2>
          <p className={s.secDesc}>계약 전부터 만기까지, 단계별로 해야 할 일을 순서대로 안내합니다.</p>
          <div className={s.guideTimeline}>
            {[
              { badge: "pre", label: "계약 전", title: "01. 전세안전분석으로 위험 사전 확인", desc: "등기부등본 또는 주소 입력으로 AI 분석을 실행합니다. 선순위 채권비율, 전세가율, 권리이상 여부를 확인하고 안전 점수를 받습니다. 위험 항목이 있으면 계약 전 반드시 해소해야 합니다.", chips: ["전세안전분석", "등기부등본 확인", "LTV 계산"] },
              { badge: "pre", label: "계약 전", title: "02. 계약체크리스트 점검", desc: "계약서에 반드시 포함되어야 할 특약사항, 임대인 신원 확인, 중개인 자격증 확인 등 계약 전 체크리스트를 검토합니다.", chips: ["계약체크리스트", "임대인 신원확인"] },
              { badge: "on", label: "계약 당일", title: "03. 잔금 지급 직전 등기부 재확인", desc: "잔금 지급 당일 아침 등기부등본을 다시 열람합니다. 계약 후 갑자기 근저당이 설정되는 사례가 있습니다. 이상이 생기면 잔금 지급을 중단하고 계약을 재검토합니다.", chips: ["등기부 재열람"] },
              { badge: "post", label: "입주 후", title: "04. 전입신고 — 입주 당일 또는 익일", desc: "입주 당일 또는 다음날 바로 전입신고를 합니다. 전입신고가 완료되어야 대항력이 생깁니다. 정부24에서 온라인으로도 가능합니다.", chips: ["전입신고", "대항력 취득"] },
              { badge: "post", label: "입주 후", title: "05. 확정일자 — 가능하면 당일", desc: "전입신고와 함께 주민센터에서 확정일자를 받습니다. 600원의 인지세가 발생합니다. 확정일자가 있어야 경매 시 우선변제권이 생깁니다.", chips: ["확정일자", "우선변제권"] },
              { badge: "post", label: "입주 후", title: "06. 전세보증보험 가입", desc: "HUG(주택도시보증공사) 또는 SGI서울보증 전세보증보험에 가입합니다. 임대인이 보증금을 돌려주지 않아도 보험사가 대신 변제합니다. 전세가율이 80% 이하여야 가입 가능합니다.", chips: ["HUG 보증", "SGI 보증"] },
              { badge: "opt", label: "선택", title: "07. 전세권설정등기 (필요 시)", desc: "전세보증보험 가입이 불가한 경우, 또는 더 강한 물권 보호가 필요한 경우 전세권설정등기를 검토합니다. 임대인의 동의가 필요하며 법무사 비용이 발생합니다.", chips: ["전세권설정등기", "물권적 보호"] },
              { badge: "opt", label: "만기 대응", title: "08. 임차권등기명령 (보증금 미반환 시)", desc: "계약 만기 후 임대인이 보증금을 돌려주지 않으면 임차권등기명령을 신청합니다. 이사 후에도 대항력과 우선변제권이 유지됩니다.", chips: ["임차권등기명령", "대항력 유지"] },
            ].map((item, idx) => (
              <div key={idx} className={s.gtItem}>
                <div className={s.gtLeft}>
                  <span className={`${s.gtBadge} ${s[item.badge as keyof typeof s]}`}>{item.label}</span>
                  <div className={s.gtLine}></div>
                </div>
                <div className={s.gtRight}>
                  <div className={s.gtTitle}>{item.title}</div>
                  <div className={s.gtDesc}>{item.desc}</div>
                  <div className={s.gtChips}>{item.chips.map((c, i) => <span key={i} className={s.gtChip}>{c}</span>)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ████ PANEL: 전입신고 ████ */}
      <div className={`${s.tab}${activeTab === "movein" ? " " + s.on : ""}`}>
        <div className={`${s.panelWrap} ${s.narrow}`}>
          <p className={s.secEyebrow}>Move-in Registration</p>
          <h2 className={s.secTitle}>전입신고</h2>
          <p className={s.secDesc}>전입신고는 임차인의 대항력을 발생시키는 가장 기본적인 보호 수단입니다.<br />입주 당일 또는 다음날 반드시 완료해야 합니다.</p>
          <div className={s.infoHero}>
            <div className={s.infoIconBox}><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
            <div>
              <div className={s.infoHeroTitle}>전입신고란?</div>
              <div className={s.infoHeroDesc}>새로운 주소지에 거주하기 시작했다는 사실을 행정기관에 신고하는 절차입니다.<br />전입신고 다음날 0시부터 <strong>대항력</strong>이 발생하여, 집이 경매에 넘어가더라도 새 소유자에게 임차권을 주장할 수 있습니다.</div>
            </div>
          </div>
          <div className={s.infoGrid}>
            <div className={s.icard}><div className={s.icardLabel}>신고 기한</div><div className={s.icardVal}>입주 후 14일 이내</div><div className={s.icardDesc}>기한 초과 시 5만원 이하 과태료가 부과될 수 있습니다.</div></div>
            <div className={s.icard}><div className={s.icardLabel}>비용</div><div className={s.icardVal}>무료</div><div className={s.icardDesc}>별도 수수료 없이 무료로 신고할 수 있습니다.</div></div>
            <div className={s.icard}><div className={s.icardLabel}>대항력 발생</div><div className={s.icardVal}>신고 다음날 0시</div><div className={s.icardDesc}>전입신고 당일이 아닌 다음날 0시부터 효력이 발생합니다.</div></div>
          </div>
          <div className={s.infoSteps}>
            <div className={s.istep}><div className={s.istepNum}>1</div><div><div className={s.istepT}>온라인 신고 — 정부24</div><div className={s.istepD}>정부24(gov.kr) → 전입신고 → 공동인증서 또는 간편인증 로그인 → 이전 주소·새 주소 입력 → 제출. 24시간 가능합니다.</div></div></div>
            <div className={s.istep}><div className={s.istepNum}>2</div><div><div className={s.istepT}>오프라인 신고 — 주민센터 방문</div><div className={s.istepD}>새 주소지 관할 주민센터에 방문합니다. 신분증(주민등록증 또는 여권)만 있으면 됩니다. 가족이 대신 신고할 경우 위임장이 필요합니다.</div></div></div>
            <div className={s.istep}><div className={s.istepNum}>3</div><div><div className={s.istepT}>주민등록등본으로 확인</div><div className={s.istepD}>신고 완료 후 주민등록등본을 발급해 새 주소가 정확히 기재되었는지 반드시 확인하세요.</div></div></div>
          </div>
          <a href="#" className={s.actionLink}>정부24 전입신고 바로가기 →</a>
        </div>
      </div>

      {/* ████ PANEL: 확정일자 ████ */}
      <div className={`${s.tab}${activeTab === "fixeddate" ? " " + s.on : ""}`}>
        <div className={`${s.panelWrap} ${s.narrow}`}>
          <p className={s.secEyebrow}>Fixed Date</p>
          <h2 className={s.secTitle}>확정일자</h2>
          <p className={s.secDesc}>확정일자는 임대차 계약서에 공인된 날짜를 부여받는 절차입니다.<br />전입신고와 함께 받아야 경매 시 우선변제권이 인정됩니다.</p>
          <div className={s.infoHero}>
            <div className={s.infoIconBox}><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 16 11 18 15 14" /></svg></div>
            <div>
              <div className={s.infoHeroTitle}>확정일자란?</div>
              <div className={s.infoHeroDesc}>임대차 계약서 원본에 공인기관이 날짜 도장을 찍어주는 제도입니다.<br />전입신고 + 확정일자 두 조건이 모두 충족되어야 <strong>우선변제권</strong>이 발생합니다. 집이 경매에 넘어갔을 때 확정일자 순서에 따라 배당을 받습니다.</div>
            </div>
          </div>
          <div className={s.infoGrid}>
            <div className={s.icard}><div className={s.icardLabel}>비용</div><div className={s.icardVal}>600원</div><div className={s.icardDesc}>인지세 600원만 납부하면 됩니다.</div></div>
            <div className={s.icard}><div className={s.icardLabel}>신청 시기</div><div className={s.icardVal}>입주 당일 권장</div><div className={s.icardDesc}>전입신고와 같은 날 처리하는 것이 가장 유리합니다.</div></div>
            <div className={s.icard}><div className={s.icardLabel}>효력 발생</div><div className={s.icardVal}>신고 당일</div><div className={s.icardDesc}>확정일자는 받은 날짜 기준으로 우선순위가 결정됩니다.</div></div>
          </div>
          <div className={s.infoSteps}>
            <div className={s.istep}><div className={s.istepNum}>1</div><div><div className={s.istepT}>주민센터 방문</div><div className={s.istepD}>임대차계약서 원본을 지참하고 관할 주민센터를 방문합니다. 담당자에게 확정일자 날인을 요청하면 즉시 처리됩니다.</div></div></div>
            <div className={s.istep}><div className={s.istepNum}>2</div><div><div className={s.istepT}>인터넷등기소 온라인 신청</div><div className={s.istepD}>대법원 인터넷등기소(iros.go.kr)에서 온라인으로도 신청할 수 있습니다. 계약서 파일 업로드 후 전자결제로 수수료를 납부합니다.</div></div></div>
            <div className={s.istep}><div className={s.istepNum}>3</div><div><div className={s.istepT}>공증사무소 (계약서 원본 불필요 시)</div><div className={s.istepD}>공증사무소에서도 확정일자를 받을 수 있습니다. 영업시간이 주민센터보다 유연한 경우가 많습니다.</div></div></div>
          </div>
          <a href="#" className={s.actionLink}>인터넷등기소 바로가기 →</a>
        </div>
      </div>

      {/* ████ PANEL: 전세권설정등기 ████ */}
      <div className={`${s.tab}${activeTab === "setreg" ? " " + s.on : ""}`}>
        <div className={`${s.panelWrap} ${s.narrow}`}>
          <p className={s.secEyebrow}>Lease Right Registration</p>
          <h2 className={s.secTitle}>전세권설정등기</h2>
          <p className={s.secDesc}>전세권설정등기는 등기부에 임차인의 전세권을 물권으로 등록하는 가장 강력한 보호 방법입니다.<br />임대인의 동의가 필요하지만, 보증보험 가입이 불가할 때 대안이 됩니다.</p>
          <div className={s.infoHero}>
            <div className={s.infoIconBox}><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
            <div>
              <div className={s.infoHeroTitle}>전세권설정등기란?</div>
              <div className={s.infoHeroDesc}>임차인이 등기부에 직접 전세권자로 등록되는 절차입니다. 전입신고·확정일자와 달리 <strong>물권</strong>으로서의 강력한 효력을 가지며, 임대인 동의 없이 제3자에게 양도·전대도 가능합니다.</div>
            </div>
          </div>
          <table className={s.infoCompare}>
            <tbody>
              <tr><th>구분</th><th>확정일자 + 전입신고</th><th>전세권설정등기</th></tr>
              <tr><td>임대인 동의</td><td><span className={s.badgeGray}>불필요</span></td><td><span className={s.badgeBlue}>필요</span></td></tr>
              <tr><td>비용</td><td>600원</td><td>보증금의 0.2% + 법무사비</td></tr>
              <tr><td>효력</td><td>채권적 보호</td><td><strong>물권적 보호</strong></td></tr>
              <tr><td>경매 배당</td><td>우선변제권</td><td>우선변제권 (더 강력)</td></tr>
              <tr><td>이사 후 효력</td><td>전입 유지 시만 유효</td><td>이사 후에도 유효</td></tr>
              <tr><td>권리 양도</td><td>불가</td><td>가능</td></tr>
            </tbody>
          </table>
          <a href="#" className={s.actionLink}>법무사 연결하기 →</a>
        </div>
      </div>

      {/* ████ PANEL: 임차권등기명령 ████ */}
      <div className={`${s.tab}${activeTab === "tenancy" ? " " + s.on : ""}`}>
        <div className={`${s.panelWrap} ${s.narrow}`}>
          <p className={s.secEyebrow}>Lease Registration Order</p>
          <h2 className={s.secTitle}>임차권등기명령</h2>
          <p className={s.secDesc}>계약 만기 후 임대인이 보증금을 돌려주지 않을 때 신청합니다.<br />이사를 가도 기존 대항력과 우선변제권이 유지됩니다.</p>
          <div className={s.infoHero}>
            <div className={s.infoIconBox}><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div>
            <div>
              <div className={s.infoHeroTitle}>임차권등기명령이란?</div>
              <div className={s.infoHeroDesc}>계약 종료 후 임대인이 보증금을 반환하지 않을 때, 법원에 신청하여 등기부에 임차권을 등재하는 제도입니다. 등기 후에는 이사를 나가더라도 <strong>대항력과 우선변제권이 그대로 유지</strong>됩니다.</div>
            </div>
          </div>
          <div className={s.infoGrid}>
            <div className={s.icard}><div className={s.icardLabel}>신청 기관</div><div className={s.icardVal}>관할 지방법원</div><div className={s.icardDesc}>임차 주택 소재지 관할 법원에 신청합니다.</div></div>
            <div className={s.icard}><div className={s.icardLabel}>처리 기간</div><div className={s.icardVal}>약 1~2주</div><div className={s.icardDesc}>법원 결정 후 등기소 촉탁까지 약 2주가 소요됩니다.</div></div>
            <div className={s.icard}><div className={s.icardLabel}>비용</div><div className={s.icardVal}>인지대 + 등록면허세</div><div className={s.icardDesc}>소액 (1~2만원 수준). 임대인에게 비용 청구 가능합니다.</div></div>
          </div>
          <div className={s.infoSteps}>
            <div className={s.istep}><div className={s.istepNum}>1</div><div><div className={s.istepT}>보증금 반환 요청 (내용증명)</div><div className={s.istepD}>계약 만기 1개월 전부터 보증금 반환을 요청합니다. 내용증명 우편으로 요청 사실을 남겨두세요.</div></div></div>
            <div className={s.istep}><div className={s.istepNum}>2</div><div><div className={s.istepT}>법원에 임차권등기명령 신청</div><div className={s.istepD}>임대차계약서, 주민등록등본, 내용증명 사본 등을 첨부하여 관할 법원에 신청합니다. 전자소송도 가능합니다.</div></div></div>
            <div className={s.istep}><div className={s.istepNum}>3</div><div><div className={s.istepT}>등기 완료 후 이사</div><div className={s.istepD}>법원 결정 후 등기부에 임차권이 등재됩니다. 등기 완료를 확인한 뒤 이사하면 대항력이 유지됩니다.</div></div></div>
            <div className={s.istep}><div className={s.istepNum}>4</div><div><div className={s.istepT}>보증금 반환 소송 또는 경매 신청</div><div className={s.istepD}>임차권등기 후에도 반환하지 않으면 보증금반환청구소송 또는 강제집행을 진행합니다.</div></div></div>
          </div>
          <a href="#" className={s.actionLink}>전문가 상담 연결 →</a>
        </div>
      </div>

      {/* ████ PANEL: 주택임대차신고 ████ */}
      <div className={`${s.tab}${activeTab === "rental" ? " " + s.on : ""}`}>
        <div className={`${s.panelWrap} ${s.narrow}`}>
          <p className={s.secEyebrow}>Rental Contract Report</p>
          <h2 className={s.secTitle}>주택임대차신고</h2>
          <p className={s.secDesc}>2021년 6월부터 시행된 제도로, 일정 금액 이상의 임대차 계약은 의무적으로 신고해야 합니다.<br />신고 시 확정일자가 자동으로 부여됩니다.</p>
          <div className={s.infoHero}>
            <div className={s.infoIconBox}><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
            <div>
              <div className={s.infoHeroTitle}>주택임대차신고제란?</div>
              <div className={s.infoHeroDesc}>임대보증금 6,000만 원 초과 또는 월세 30만 원 초과인 임대차 계약 체결 시 30일 이내에 시·군·구청 또는 부동산거래전자계약시스템에 신고해야 합니다. 신고 시 <strong>확정일자가 자동 부여</strong>됩니다.</div>
            </div>
          </div>
          <div className={s.infoGrid}>
            <div className={s.icard}><div className={s.icardLabel}>신고 의무 대상</div><div className={s.icardVal}>보증금 6천만원 초과</div><div className={s.icardDesc}>또는 월세 30만원 초과 계약</div></div>
            <div className={s.icard}><div className={s.icardLabel}>신고 기한</div><div className={s.icardVal}>계약 후 30일 이내</div><div className={s.icardDesc}>계약 체결일로부터 30일 이내 신고</div></div>
            <div className={s.icard}><div className={s.icardLabel}>미신고 과태료</div><div className={s.icardVal}>4~100만원</div><div className={s.icardDesc}>위반 정도에 따라 과태료 부과</div></div>
          </div>
          <div className={s.infoSteps}>
            <div className={s.istep}><div className={s.istepNum}>1</div><div><div className={s.istepT}>부동산거래전자계약시스템 접속</div><div className={s.istepD}>국토교통부 부동산거래관리시스템(rtms.molit.go.kr)에 접속합니다.</div></div></div>
            <div className={s.istep}><div className={s.istepNum}>2</div><div><div className={s.istepT}>임대차 계약 정보 입력</div><div className={s.istepD}>임대인·임차인 정보, 계약 기간, 보증금·월세 금액, 계약 갱신 여부 등을 입력합니다.</div></div></div>
            <div className={s.istep}><div className={s.istepNum}>3</div><div><div className={s.istepT}>확정일자 자동 부여 확인</div><div className={s.istepD}>신고 완료 시 확정일자가 자동으로 부여됩니다. 별도로 주민센터를 방문할 필요가 없습니다.</div></div></div>
          </div>
          <a href="#" className={s.actionLink}>부동산거래관리시스템 바로가기 →</a>
        </div>
      </div>

      {/* ████ PANEL: 계약체크리스트 ████ */}
      <div className={`${s.tab}${activeTab === "checklist" ? " " + s.on : ""}`}>
        <div className={s.panelWrap}>
          <p className={s.secEyebrow}>Contract Checklist</p>
          <h2 className={s.secTitle}>계약체크리스트</h2>
          <p className={s.secDesc}>전세 계약 전·중·후 반드시 확인해야 할 항목들입니다.<br />체크가 완료되지 않은 항목이 있으면 계약을 진행하지 마세요.</p>
          <div className={s.ckProgress}>
            <span style={{ fontSize: "13px", color: "#666", whiteSpace: "nowrap" }}>완료율</span>
            <div className={s.ckBarWrap}><div className={s.ckBar} style={{ width: ckBarWidth }}></div></div>
            <span className={s.ckProgTxt}>{checkedCount} / {CK_TOTAL}</span>
          </div>
          <div className={s.ckGroupsGrid}>
            <div className={s.ckGroup}>
              <div className={s.ckGroupTitle}>계약 전 확인</div>
              {[
                { id: 0, label: "등기부등본 열람 및 AI 분석 완료", sub: "근저당·압류·가압류 이상 없음 확인" },
                { id: 1, label: "전세가율 80% 이하 확인", sub: "매매가 대비 전세 보증금 비율 확인" },
                { id: 2, label: "임대인 신원 및 소유권 확인", sub: "등기부상 소유자 = 임대인 일치 여부" },
                { id: 3, label: "공인중개사 자격증 및 사무소 확인", sub: "국가공간정보포털에서 자격증 진위 확인" },
                { id: 4, label: "건축물대장 위반건축물 여부 확인", sub: "불법 증개축·용도변경 이력 없음" },
              ].map((item) => (
                <div key={item.id} className={s.ckItem}>
                  <input type="checkbox" className={s.ckCb} checked={!!checklist[item.id]} onChange={() => toggleCk(item.id)} />
                  <label className={`${s.ckLabel}${checklist[item.id] ? " " + s.checked : ""}`} onClick={() => toggleCk(item.id)}>
                    {item.label}<div className={s.ckSub}>{item.sub}</div>
                  </label>
                </div>
              ))}
            </div>
            <div className={s.ckGroup}>
              <div className={s.ckGroupTitle}>계약 시 확인</div>
              {[
                { id: 5, label: "계약서에 특약사항 명시", sub: '"선순위 근저당 ○○원 초과 시 계약 해지" 등' },
                { id: 6, label: "보증금 지급 계좌 = 임대인 계좌 확인", sub: "제3자 계좌로 이체 요청 시 즉시 거절" },
                { id: 7, label: "계약서 원본 수령 및 서명 확인", sub: "중개사 기명날인 포함 여부 확인" },
                { id: 8, label: "잔금 당일 오전 등기부 재열람", sub: "새 근저당·압류 설정 여부 재확인" },
              ].map((item) => (
                <div key={item.id} className={s.ckItem}>
                  <input type="checkbox" className={s.ckCb} checked={!!checklist[item.id]} onChange={() => toggleCk(item.id)} />
                  <label className={`${s.ckLabel}${checklist[item.id] ? " " + s.checked : ""}`} onClick={() => toggleCk(item.id)}>
                    {item.label}<div className={s.ckSub}>{item.sub}</div>
                  </label>
                </div>
              ))}
            </div>
            <div className={s.ckGroup}>
              <div className={s.ckGroupTitle}>입주 후 즉시</div>
              {[
                { id: 9, label: "전입신고 완료", sub: "입주 당일 또는 다음날 처리" },
                { id: 10, label: "확정일자 취득", sub: "주민센터 또는 인터넷등기소" },
                { id: 11, label: "주택임대차신고 완료 (해당 시)", sub: "보증금 6천만원 초과 또는 월세 30만원 초과" },
              ].map((item) => (
                <div key={item.id} className={s.ckItem}>
                  <input type="checkbox" className={s.ckCb} checked={!!checklist[item.id]} onChange={() => toggleCk(item.id)} />
                  <label className={`${s.ckLabel}${checklist[item.id] ? " " + s.checked : ""}`} onClick={() => toggleCk(item.id)}>
                    {item.label}<div className={s.ckSub}>{item.sub}</div>
                  </label>
                </div>
              ))}
            </div>
            <div className={s.ckGroup}>
              <div className={s.ckGroupTitle}>보험 · 등기</div>
              {[
                { id: 12, label: "전세보증보험 가입 신청", sub: "HUG 또는 SGI — 전입신고 후 1개월 이내" },
                { id: 13, label: "보증보험 가입증서 수령 및 보관", sub: "만기 시 필요하므로 안전한 곳에 보관" },
                { id: 14, label: "등기부등본 변동 모니터링 설정", sub: "VESTRA 등기감시로 이상 발생 시 즉시 알림" },
              ].map((item) => (
                <div key={item.id} className={s.ckItem}>
                  <input type="checkbox" className={s.ckCb} checked={!!checklist[item.id]} onChange={() => toggleCk(item.id)} />
                  <label className={`${s.ckLabel}${checklist[item.id] ? " " + s.checked : ""}`} onClick={() => toggleCk(item.id)}>
                    {item.label}<div className={s.ckSub}>{item.sub}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ████ PANEL: 주변환경분석 ████ */}
      <div className={`${s.tab}${activeTab === "env" ? " " + s.on : ""}`}>
        {activeTab === "env" && <JeonseEnvAnalysis active />}
      </div>

      {/* ADDRESS MODAL */}
      <div className={`${s.modalBg}${modalOpen ? " " + s.open : ""}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className={s.modal}>
          <div className={s.modalHead}>
            <span className={s.modalHeadTitle}>주소 검색</span>
            <button className={s.modalClose} onClick={closeModal}>×</button>
          </div>
          <div className={s.modalNotice}>도로명·지번·건물명으로 검색하세요. (예: 독막로 186, 합정동 402, 래미안)</div>
          <div className={s.modalSearch}>
            <input
              className={s.modalInput}
              type="text"
              placeholder="검색어를 입력하세요"
              value={modalQuery}
              onChange={(e) => setModalQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
            />
            <button className={s.modalSearchBtn} onClick={doSearch}>검색</button>
          </div>
          <div className={s.modalResults}>
            {modalResults === null ? (
              <div className={s.modalEmpty}>위 검색창에 주소를 입력하고 검색 버튼을 눌러주세요.</div>
            ) : modalResults.length === 0 ? (
              <div className={s.modalEmpty}>검색 결과가 없습니다.</div>
            ) : (
              <>
                <div className={s.modalResultsHd}>{modalResults.length}개 검색결과 (시안 예시 데이터)</div>
                {modalResults.map((a, i) => (
                  <div key={i} className={s.modalResultItem} onClick={() => selectAddr(a.zip, a.road)}>
                    <span className={s.mzip}>{a.zip}</span>
                    <div>
                      <div className={s.maddrRoad}>{a.road}{a.bldg && <span style={{ color: "#aaa", fontSize: "12px" }}> ({a.bldg})</span>}</div>
                      <div className={s.maddrJibun}>지번 {a.jibun}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

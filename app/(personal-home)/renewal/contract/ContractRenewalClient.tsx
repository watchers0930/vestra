"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import s from "./contract-renewal.module.css";

// Sample contract texts
const SAMPLES: Record<string, string> = {
  jeonse: `주택임대차 계약서\n\n임대인 홍길동(이하 "임대인")과 임차인 김철수(이하 "임차인")는 아래 표시 주택에 관하여 다음과 같이 임대차계약을 체결한다.\n\n[부동산의 표시]\n소재지: 서울특별시 강남구 역삼동 826-22 역삼파크빌 101동 1504호\n구조: 철근콘크리트조 / 면적: 84.21㎡\n\n제1조 (보증금) 보증금은 금 삼억원정(₩300,000,000)으로 한다.\n제2조 (임대 기간) 임대 기간은 2026년 9월 1일부터 2028년 8월 31일까지(24개월)로 한다.\n제3조 (현황 고지) 임대인은 임차 목적물의 현재 상태를 고지하며, 임차인은 이를 확인하고 임차함을 인정한다. 임차인은 현 상태를 충분히 인지한 것으로 본다.\n제4조 (보증금 지급) 임차인은 보증금을 계약 시 금 삼천만원, 잔금 금 이억칠천만원을 2026.09.01에 지급한다.\n제5조 (보증금 반환) 계약 종료 후 임차인이 목적물을 인도한 때로부터 상당한 기간 내에 임대인은 보증금을 반환한다.\n제6조 (수선) 임차인 귀책에 의한 손상은 임차인이 원상 복구한다.\n제7조 (금지사항) 임차인은 임대인의 동의 없이 전대, 양도, 개조를 할 수 없다.\n제8조 (해지) 임대인은 다음 각 호에 해당하는 경우 계약을 해지할 수 있으며, 이 경우 임차인은 즉시 목적물을 반환하여야 한다: ①임차인의 월 2회 이상 소음 유발, ②임대인의 사정으로 목적물 처분이 필요한 경우, ③기타 임대인이 상당하다고 인정하는 사유.`,
  maemae: `부동산 매매 계약서\n\n매도인 이영희(이하 "매도인")와 매수인 박민준(이하 "매수인")은 아래 부동산에 관하여 다음과 같이 매매계약을 체결한다.\n\n[부동산의 표시]\n소재지: 서울특별시 서초구 방배동 2523-1 방배더샵 302호\n면적: 59.97㎡ (전용) / 등기부상 면적 동일\n\n제1조 (매매대금) 금 칠억원정(₩700,000,000)으로 한다.\n제2조 (지급 방법) 계약금 7천만원(계약 시), 중도금 2억원(2026.09.15), 잔금 4억 3천만원(2026.10.31)\n제3조 (소유권 이전) 매도인은 잔금 수령과 동시에 소유권이전등기에 필요한 서류를 매수인에게 교부한다.\n제4조 (하자 담보) 매도인은 목적물의 숨은 하자에 대해 담보 책임을 진다.\n제5조 (위약금) 매도인 귀책 해제 시 계약금의 2배 반환, 매수인 귀책 해제 시 계약금 몰수.`,
  "jeonse-dam": `주택임대차 계약서 (근저당 설정 물건)\n\n임대인 최부자와 임차인 가난이는 아래 주택에 관하여 임대차계약을 체결한다.\n\n[부동산의 표시]\n서울 강남구 역삼동 826-22 역삼파크빌 101동 1504호 (84.21㎡)\n\n【등기부 현황: 근저당 채권최고액 240,000,000원 (채권자: KB국민은행) — 계약서 내 미고지】\n\n제1조 보증금: 삼억원(₩300,000,000)\n제2조 기간: 2026.09.01 ~ 2028.08.31\n제3조 임차인은 현 상태를 충분히 인지한 것으로 본다.\n제4조 보증금은 계약 종료 후 상당한 기간 내 반환한다.\n제5조 임대인은 다음 각 호의 사유로 계약을 해지할 수 있다: ①임차인의 2회 이상 소음, ②임대인 사정으로 처분 필요, ③임대인이 상당하다고 인정하는 사유.`,
};

type ViewType = "input" | "analyzing" | "result";

export default function ContractRenewalClient() {
  const [activeView, setActiveView] = useState<ViewType>("input");
  const [inputTab, setInputTab] = useState<"text" | "file">("text");
  const [contractText, setContractText] = useState("");
  const [sampleKey, setSampleKey] = useState("");
  const [charCount, setCharCount] = useState(0);

  // Clause accordion states
  const [openClauses, setOpenClauses] = useState<Record<number, boolean>>({});
  // Term accordion states
  const [openTerms, setOpenTerms] = useState<Record<number, boolean>>({});

  // Sidebar active section
  const [activeSec, setActiveSec] = useState(0);

  const SEC_IDS = ["sec-info", "sec-issues", "sec-clauses", "sec-missing", "sec-terms", "sec-checklist", "sec-report"];

  function showView(v: ViewType) {
    setActiveView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAnalyze() {
    showView("analyzing");
    setTimeout(() => showView("result"), 2500);
  }

  function loadSample() {
    if (!sampleKey) {
      alert("샘플을 선택해 주세요.");
      return;
    }
    const text = SAMPLES[sampleKey] ?? "";
    setContractText(text);
    setCharCount(text.length);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContractText(e.target.value);
    setCharCount(e.target.value.length);
  }

  function toggleClause(i: number) {
    setOpenClauses((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function toggleTerm(i: number) {
    setOpenTerms((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function scrollToSec(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Scroll spy
  useEffect(() => {
    if (activeView !== "result") return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = SEC_IDS.indexOf(entry.target.id);
            if (idx !== -1) setActiveSec(idx);
          }
        });
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    SEC_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [activeView]);

  return (
    <>
      {/* DEMO BAR */}
      <div className={s.demoBar}>
        <span className={s.demoLabel}>Demo</span>
        <button
          className={`${s.demoBtn} ${activeView === "input" ? s.demoBtnOn : ""}`}
          onClick={() => showView("input")}
        >
          ① 입력 화면
        </button>
        <button
          className={`${s.demoBtn} ${activeView === "analyzing" ? s.demoBtnOn : ""}`}
          onClick={() => showView("analyzing")}
        >
          ② 분석 중
        </button>
        <button
          className={`${s.demoBtn} ${activeView === "result" ? s.demoBtnOn : ""}`}
          onClick={() => showView("result")}
        >
          ③ 분석 결과
        </button>
      </div>

      {/* NAV */}
      <nav>
        <div className={s.navInner}>
          <Link href="/home" className={s.navLogo}>
            <div className={s.logoIcon}>V</div>
            <span className={s.logoText}>VESTRA</span>
          </Link>
          <ul className={s.navMenu}>
            <li><Link href="/listings">매물검색</Link></li>
            <li><Link href="/jeonse">전세보호</Link></li>
            <li><Link href="/rights">권리분석</Link></li>
            <li><Link href="/monitoring">등기감시</Link></li>
            <li><Link href="/renewal/contract" className="active">계약검토</Link></li>
            <li><Link href="/prediction">시세지도</Link></li>
            <li><Link href="/expert-connect">전문가상담</Link></li>
          </ul>
          <div className={s.navAuth}>
            <a href="#">홍길동</a><span className={s.navAuthDiv}>|</span>
            <a href="#">마이페이지</a><span className={s.navAuthDiv}>|</span>
            <a href="#">로그아웃</a>
          </div>
        </div>
      </nav>

      {/* ── VIEW: INPUT ── */}
      <div className={activeView === "input" ? s.viewOn : s.view}>
        <section className={s.subHero}>
          <div className={s.subHeroBg}></div>
          <div className={s.subHeroIn}>
            <span className={s.heroChip}>Contract Review</span>
            <h1>계약검토</h1>
            <p className={s.subHeroSub}>부동산 계약서 AI 자동 분석</p>
          </div>
        </section>

        <div className={s.pageWrap}>
          <div className={s.inputNotice}>
            <span className={s.inputNoticeIco}>⚠️</span>
            <div>
              <div className={s.inputNoticeT}>부동산 관련 계약서만 분석이 가능합니다</div>
              <div className={s.inputNoticeS}>임대차계약서(전세·월세), 매매계약서, 분양계약서 등 부동산 거래와 직접 관련된 계약서를 입력해 주세요. 다른 종류의 계약서는 분석 결과가 부정확할 수 있습니다.</div>
            </div>
          </div>

          <div className={s.inputCard}>
            <div className={s.inputTabs}>
              <button
                className={`${s.inputTab} ${inputTab === "text" ? s.inputTabOn : ""}`}
                onClick={() => setInputTab("text")}
              >
                텍스트 입력
              </button>
              <button
                className={`${s.inputTab} ${inputTab === "file" ? s.inputTabOn : ""}`}
                onClick={() => setInputTab("file")}
              >
                파일 업로드
              </button>
            </div>

            {/* Text Tab */}
            {inputTab === "text" && (
              <div>
                <div className={s.inputBody}>
                  <div>
                    <div className={s.inputLabelRow}>
                      <span className={s.inputLabel}>계약서 내용</span>
                      <span className={s.inputCharCnt}>{charCount.toLocaleString()} / 20,000자</span>
                    </div>
                    <textarea
                      className={s.inputTextarea}
                      value={contractText}
                      onChange={handleTextChange}
                      placeholder={"계약서 내용을 여기에 붙여넣기 해주세요.\n\n예) 임대차 계약서, 매매 계약서 등의 전문을 복사하여 입력하세요."}
                    />
                  </div>
                  <div className={s.sampleRow}>
                    <span className={s.sampleLabel}>샘플 계약서 불러오기:</span>
                    <select
                      className={s.sampleSelect}
                      value={sampleKey}
                      onChange={(e) => setSampleKey(e.target.value)}
                    >
                      <option value="">-- 샘플 선택 --</option>
                      <option value="jeonse">전세 임대차 계약서 (표준)</option>
                      <option value="maemae">매매 계약서 (아파트)</option>
                      <option value="jeonse-dam">전세 + 담보 설정 계약서 (위험 포함)</option>
                    </select>
                    <button className={s.sampleBtn} onClick={loadSample}>불러오기</button>
                  </div>
                </div>
              </div>
            )}

            {/* File Tab */}
            {inputTab === "file" && (
              <div>
                <div className={s.inputBody}>
                  <div className={s.fileDrop} onClick={() => alert("파일 선택 (시안)")}>
                    <div className={s.fileDropIco}>📄</div>
                    <div className={s.fileDropT}>계약서 파일을 여기에 끌어다 놓거나 클릭하세요</div>
                    <div className={s.fileDropS}>지원 형식: PDF, DOCX, HWP · 최대 20MB</div>
                  </div>
                </div>
              </div>
            )}

            <div className={s.inputFooter}>
              <div className={s.inputHint}>
                분석 결과는 참고용이며 법적 효력이 없습니다.<br />중요한 계약 전 반드시 법률 전문가의 검토를 받으세요.
              </div>
              <button className={s.analyzeBtn} onClick={handleAnalyze}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                계약서 AI 분석하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── VIEW: ANALYZING ── */}
      <div className={activeView === "analyzing" ? s.viewOn : s.view}>
        <section className={s.subHero} style={{ opacity: 0.6 }}>
          <div className={s.subHeroBg}></div>
          <div className={s.subHeroIn}>
            <span className={s.heroChip}>Contract Review</span>
            <h1>계약검토</h1>
          </div>
        </section>

        <div className={s.pageWrap}>
          <div className={s.analyzingWrap}>
            <div className={s.analyzingCard}>
              <div className={s.analyzingSpinner}></div>
              <div className={s.analyzingT}>계약서를 분석하고 있습니다</div>
              <div className={s.analyzingS}>AI가 조항을 읽고 위험 요소를 파악 중입니다.<br />잠시만 기다려 주세요.</div>
              <div className={s.stepList}>
                <div className={`${s.step} ${s.stepDone}`}>
                  <div className={s.stepIco}>✓</div>
                  <div>
                    <div className={s.stepT}>계약서 텍스트 추출 완료</div>
                    <div className={s.stepS}>총 3,842자 인식</div>
                  </div>
                </div>
                <div className={`${s.step} ${s.stepDone}`}>
                  <div className={s.stepIco}>✓</div>
                  <div>
                    <div className={s.stepT}>핵심 조항 식별 완료</div>
                    <div className={s.stepS}>12개 조항 파싱 완료</div>
                  </div>
                </div>
                <div className={`${s.step} ${s.stepActive}`}>
                  <div className={s.stepIco}>⋯</div>
                  <div>
                    <div className={s.stepT}>위험 조항 분석 중</div>
                    <div className={s.stepS}>GPT-4o 법률 모델 처리 중</div>
                  </div>
                </div>
                <div className={`${s.step} ${s.stepPending}`}>
                  <div className={s.stepIco}>4</div>
                  <div>
                    <div className={s.stepT}>안전 점수 산출 및 보고서 생성</div>
                    <div className={s.stepS}>대기 중</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── VIEW: RESULT ── */}
      <div className={activeView === "result" ? s.viewOn : s.view}>
        <section className={s.subHero}>
          <div className={s.subHeroBg}></div>
          <div className={s.subHeroIn}>
            <span className={s.heroChip}>Contract Review</span>
            <h1>계약검토</h1>
            <p className={s.subHeroSub}>분석 결과</p>
          </div>
        </section>

        <div className={s.pageWrap}>
          {/* Topbar */}
          <div className={s.resultTopbar}>
            <div className={s.resultMeta}>
              <strong>서울 강남구 역삼동 826-22 역삼파크빌 101동 1504호</strong><br />
              전세 임대차 계약서 · 분석 완료 2026.08.11 14:32
            </div>
            <div className={s.resultActions}>
              <button className={s.rBtnOutline}>PDF 저장</button>
              <button className={s.rBtnPrimary}>다시 분석</button>
            </div>
          </div>

          {/* Score Hero 2-col */}
          <div className={s.scoreHeroV2}>
            {/* Left: gauge + grade + AI opinion */}
            <div className={s.shLeft}>
              <div className={s.shGaugeRow}>
                <div className={s.gaugeWrap}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle className={s.gaugeBg} cx="50" cy="50" r="40" />
                    <circle
                      className={s.gaugeFg}
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#f59e0b"
                      strokeDasharray="251.33"
                      strokeDashoffset="95.5"
                    />
                  </svg>
                  <div className={s.gaugeScore}>
                    <span className={s.gaugeNum} style={{ color: "#f59e0b" }}>62</span>
                    <span className={s.gaugeLabel} style={{ color: "#f59e0b" }}>주의</span>
                  </div>
                </div>
                <div className={s.shGradeInfo}>
                  <span className={`${s.shGradeBadge} ${s.sgbCaution}`}>⚠️ 주의 — 계약 전 검토 필요</span>
                  <div className={s.shProp}>전세 임대차 계약서</div>
                  <div className={s.shMeta}>역삼파크빌 101동 1504호 · 보증금 3억</div>
                </div>
              </div>
              <div className={s.shAiBox}>
                <div className={s.shAiLabel}>AI 종합 의견</div>
                <div className={s.shAiText}>근저당 설정 물건에 대한 명시적 고지가 누락되어 있으며, 해지 조항이 임차인에게 불리하게 작성되어 있습니다. 보증금 반환 조항의 표현이 모호하여 분쟁 가능성이 있으므로 계약 전 특약 추가를 강력히 권고합니다.</div>
              </div>
            </div>

            {/* Right: stacked bar + summary */}
            <div className={s.shRight}>
              <div className={s.shBarSection}>
                <div className={s.shBarLabelRow}>
                  <span className={s.shBarTitle}>조항 분포</span>
                  <div className={s.shBarLegend}>
                    <span className={`${s.shLegendDot} ${s.ldDanger}`}>위험</span>
                    <span className={`${s.shLegendDot} ${s.ldWarning}`}>주의</span>
                    <span className={`${s.shLegendDot} ${s.ldSafe}`}>안전</span>
                  </div>
                </div>
                <div className={s.shStackedBar}>
                  <div className={`${s.sbSeg} ${s.sbDanger}`} style={{ width: "17%" }}></div>
                  <div className={`${s.sbSeg} ${s.sbWarning}`} style={{ width: "25%" }}></div>
                  <div className={`${s.sbSeg} ${s.sbSafe}`} style={{ width: "58%" }}></div>
                </div>
                <div className={s.shBarCounts}>
                  <div className={s.shCountItem}>
                    <div className={`${s.shCountN} ${s.shcDanger}`}>2</div>
                    <div className={s.shCountL}>위험 조항</div>
                  </div>
                  <div className={s.shCountItem}>
                    <div className={`${s.shCountN} ${s.shcWarning}`}>3</div>
                    <div className={s.shCountL}>주의 조항</div>
                  </div>
                  <div className={s.shCountItem}>
                    <div className={`${s.shCountN} ${s.shcSafe}`}>7</div>
                    <div className={s.shCountL}>안전 조항</div>
                  </div>
                  <div className={s.shCountItem}>
                    <div className={`${s.shCountN} ${s.shcMissing}`}>4</div>
                    <div className={s.shCountL}>누락 조항</div>
                  </div>
                </div>
              </div>

              <div>
                <div className={s.shSummaryTitle}>즉시 확인 필요</div>
                <div className={s.shSummaryCards}>
                  <div className={`${s.shSumCard} ${s.scCritical}`}>
                    <span className={`${s.shSumSev} ${s.sscCritical}`}>긴급</span>
                    <span className={s.shSumText}>근저당 2.4억 미고지 — 경매 시 보증금 회수 불가 위험</span>
                  </div>
                  <div className={`${s.shSumCard} ${s.scHigh}`}>
                    <span className={`${s.shSumSev} ${s.sscHigh}`}>중요</span>
                    <span className={s.shSumText}>해지 조항(제8조) 불균형 — 임대인 일방 해지 가능</span>
                  </div>
                  <div className={`${s.shSumCard} ${s.scWarning}`}>
                    <span className={`${s.shSumSev} ${s.sscWarning}`}>확인</span>
                    <span className={s.shSumText}>보증금 반환 기한 모호 — "상당한 기간" 분쟁 위험</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2-col layout */}
          <div className={s.resultLayout}>
            {/* Sidebar */}
            <aside className={s.resultSidebar}>
              <div className={s.rsLabel}>목차</div>
              <ul className={s.rsNav}>
                <li className={`${s.rsItem} ${activeSec === 0 ? s.rsItemOn : ""}`} onClick={() => scrollToSec("sec-info")}>
                  <span className={`${s.rsDot} ${s.rsdGray}`}></span>핵심 계약 정보
                </li>
                <li className={`${s.rsItem} ${activeSec === 1 ? s.rsItemOn : ""}`} onClick={() => scrollToSec("sec-issues")}>
                  <span className={`${s.rsDot} ${s.rsdCritical}`}></span>우선 검토 이슈
                  <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "#ef4444" }}>긴급 1</span>
                </li>
                <li className={`${s.rsItem} ${activeSec === 2 ? s.rsItemOn : ""}`} onClick={() => scrollToSec("sec-clauses")}>
                  <span className={`${s.rsDot} ${s.rsdHigh}`}></span>조항별 분석
                  <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "#f59e0b" }}>위험 2</span>
                </li>
                <li className={`${s.rsItem} ${activeSec === 3 ? s.rsItemOn : ""}`} onClick={() => scrollToSec("sec-missing")}>
                  <span className={`${s.rsDot} ${s.rsdBlue}`}></span>누락 조항
                  <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "#6366f1" }}>4건</span>
                </li>
                <hr className={s.rsDivider} />
                <li className={`${s.rsItem} ${activeSec === 4 ? s.rsItemOn : ""}`} onClick={() => scrollToSec("sec-terms")}>
                  <span className={`${s.rsDot} ${s.rsdGreen}`}></span>맞춤 특약 추천
                </li>
                <li className={`${s.rsItem} ${activeSec === 5 ? s.rsItemOn : ""}`} onClick={() => scrollToSec("sec-checklist")}>
                  <span className={`${s.rsDot} ${s.rsdGray}`}></span>안전 체크리스트
                </li>
                <li className={`${s.rsItem} ${activeSec === 6 ? s.rsItemOn : ""}`} onClick={() => scrollToSec("sec-report")}>
                  <span className={`${s.rsDot} ${s.rsdGray}`}></span>분석 정보
                </li>
              </ul>
            </aside>

            {/* Main content sections */}
            <div>
              {/* 핵심 계약 정보 */}
              <div className={s.sec} id="sec-info">
                <div className={s.secHead}>
                  <div className={s.secEyebrow}>Key Information</div>
                  <div className={s.secTitle}>핵심 계약 정보</div>
                </div>
                <div className={s.secBody}>
                  <div className={s.kinfoGrid}>
                    <div className={s.kinfoTile}>
                      <div className={s.kinfoLabel}>계약 유형</div>
                      <div className={s.kinfoVal}>전세 임대차</div>
                    </div>
                    <div className={s.kinfoTile}>
                      <div className={s.kinfoLabel}>보증금</div>
                      <div className={s.kinfoVal}>3억 원</div>
                    </div>
                    <div className={s.kinfoTile}>
                      <div className={s.kinfoLabel}>임대 기간</div>
                      <div className={s.kinfoVal}>2026.09.01</div>
                      <div className={s.kinfoSub}>~ 2028.08.31 (24개월)</div>
                    </div>
                    <div className={s.kinfoTile}>
                      <div className={s.kinfoLabel}>특약 조항 수</div>
                      <div className={s.kinfoVal}>3개</div>
                      <div className={s.kinfoSub}>당사자 직접 작성</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 우선 검토 이슈 */}
              <div className={s.sec} id="sec-issues">
                <div className={s.secHead}>
                  <div className={s.secEyebrow}>Priority Issues</div>
                  <div className={s.secTitle}>우선 검토 이슈</div>
                  <div className={s.secSub}>즉시 확인이 필요한 위험 요소입니다</div>
                </div>
                <div className={s.secBody}>
                  <div className={`${s.issueCountBadge} ${s.icbRed}`}>🚨 긴급 1건 · 중요 1건 · 확인 2건</div>

                  <div className={s.issueItem}>
                    <div className={s.issueSevCol}>
                      <div className={`${s.issueSevDot} ${s.sevCritical}`}></div>
                      <span className={`${s.issueSevLabel} ${s.sevlCritical}`}>긴급</span>
                    </div>
                    <div className={s.issueInfo}>
                      <div className={s.issueTitle}>근저당 설정 미고지</div>
                      <div className={s.issueDesc}>해당 물건에 채권최고액 2억 4천만 원의 근저당이 설정되어 있으나 계약서에 이에 대한 고지가 없습니다. 경매 시 보증금 전액 회수가 불가능할 수 있습니다.</div>
                      <div className={s.issueRecommend}>💡 권리분석 및 등기부 확인 후 특약 명시 또는 계약 재검토를 권고합니다.</div>
                    </div>
                  </div>

                  <div className={s.issueItem}>
                    <div className={s.issueSevCol}>
                      <div className={`${s.issueSevDot} ${s.sevHigh}`}></div>
                      <span className={`${s.issueSevLabel} ${s.sevlHigh}`}>중요</span>
                    </div>
                    <div className={s.issueInfo}>
                      <div className={s.issueTitle}>계약 해지 조항 불균형</div>
                      <div className={s.issueDesc}>임대인의 해지 조건(제8조)이 임차인 해지 조건보다 광범위하게 설정되어 있습니다. 임대인이 일방적으로 계약을 종료할 수 있는 상황이 다수 포함되어 있습니다.</div>
                      <div className={s.issueRecommend}>💡 해지 조건을 상호 대등하게 수정하거나, 위약금 조항을 추가하는 특약을 권고합니다.</div>
                    </div>
                  </div>

                  <div className={s.issueItem}>
                    <div className={s.issueSevCol}>
                      <div className={`${s.issueSevDot} ${s.sevWarning}`}></div>
                      <span className={`${s.issueSevLabel} ${s.sevlWarning}`}>확인</span>
                    </div>
                    <div className={s.issueInfo}>
                      <div className={s.issueTitle}>보증금 반환 시기 모호</div>
                      <div className={s.issueDesc}>제5조의 "계약 종료 후 상당한 기간 내" 표현은 법적으로 불명확합니다. 반환 지연 시 분쟁 가능성이 있습니다.</div>
                      <div className={s.issueRecommend}>💡 "계약 종료일로부터 30일 이내" 등 명확한 기간을 특약으로 명시하세요.</div>
                    </div>
                  </div>

                  <div className={s.issueItem}>
                    <div className={s.issueSevCol}>
                      <div className={`${s.issueSevDot} ${s.sevWarning}`}></div>
                      <span className={`${s.issueSevLabel} ${s.sevlWarning}`}>확인</span>
                    </div>
                    <div className={s.issueInfo}>
                      <div className={s.issueTitle}>수선 의무 범위 불명확</div>
                      <div className={s.issueDesc}>제6조 수선 의무 조항이 "임차인 귀책에 의한 손상"만 언급하고 있어, 자연 노후화에 대한 임대인 의무가 명시되지 않았습니다.</div>
                      <div className={s.issueRecommend}>💡 주요 설비(보일러, 수도 등)에 대한 임대인 수선 의무를 명시하는 조항을 추가하세요.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 조항별 분석 */}
              <div className={s.sec} id="sec-clauses">
                <div className={s.secHead}>
                  <div className={s.secEyebrow}>Clause Analysis</div>
                  <div className={s.secTitle}>조항별 분석</div>
                  <div className={s.secSub}>계약서의 각 조항을 읽고 위험도를 판단했습니다</div>
                </div>
                <div className={s.secBody}>
                  {/* Clause 1 */}
                  <div className={s.clauseItem}>
                    <div className={s.clauseHead} onClick={() => toggleClause(0)}>
                      <div className={`${s.clauseLeftBar} ${s.clbHigh}`}></div>
                      <div className={s.clauseTitleBlock}>
                        <div className={s.clauseName}>제3조 — 임차 목적물의 상태 고지</div>
                        <div className={s.clauseExcerpt}>임대인은 임차 목적물의 현재 상태를 고지하며, 임차인은 이를 확인하고...</div>
                      </div>
                      <div className={s.clauseBadges}>
                        <span className={`${s.clauseRiskB} ${s.crbHigh}`}>위험</span>
                        <span className={openClauses[0] ? `${s.clauseArrow} ${s.clauseArrowOpen}` : s.clauseArrow}>›</span>
                      </div>
                    </div>
                    {openClauses[0] && (
                      <div className={s.clauseBody}>
                        <div className={s.clauseOriginalLabel}>원문</div>
                        <div className={s.clauseOriginal}>임대인은 임차 목적물의 현재 상태를 고지하며, 임차인은 이를 확인하고 임차함을 인정한다. 임차인은 현 상태를 충분히 인지한 것으로 본다.</div>
                        <div className={s.clauseAnalysisLabel} style={{ marginTop: "12px" }}>AI 분석</div>
                        <div className={s.clauseAnalysis}>근저당 설정(채권최고액 2억 4천만 원)에 대한 명시적 고지가 없음에도 불구하고 "임차인이 현 상태를 충분히 인지"했다고 규정하고 있습니다. 이는 임차인의 권리를 크게 침해할 수 있으며, 경매 발생 시 보증금 보호에 심각한 문제가 될 수 있습니다. 등기부등본상의 권리 현황을 계약서에 명시하도록 수정이 필요합니다.</div>
                      </div>
                    )}
                  </div>

                  {/* Clause 2 */}
                  <div className={s.clauseItem}>
                    <div className={s.clauseHead} onClick={() => toggleClause(1)}>
                      <div className={`${s.clauseLeftBar} ${s.clbHigh}`}></div>
                      <div className={s.clauseTitleBlock}>
                        <div className={s.clauseName}>제8조 — 계약 해지 및 해제</div>
                        <div className={s.clauseExcerpt}>임대인은 다음 각 호에 해당하는 경우 계약을 해지할 수 있으며...</div>
                      </div>
                      <div className={s.clauseBadges}>
                        <span className={`${s.clauseRiskB} ${s.crbHigh}`}>위험</span>
                        <span className={openClauses[1] ? `${s.clauseArrow} ${s.clauseArrowOpen}` : s.clauseArrow}>›</span>
                      </div>
                    </div>
                    {openClauses[1] && (
                      <div className={s.clauseBody}>
                        <div className={s.clauseOriginalLabel}>원문</div>
                        <div className={s.clauseOriginal}>임대인은 다음 각 호에 해당하는 경우 계약을 해지할 수 있으며, 이 경우 임차인은 즉시 목적물을 반환하여야 한다: ①임차인의 월 2회 이상 소음 유발, ②임대인의 사정으로 목적물 처분이 필요한 경우, ③기타 임대인이 상당하다고 인정하는 사유.</div>
                        <div className={s.clauseAnalysisLabel} style={{ marginTop: "12px" }}>AI 분석</div>
                        <div className={s.clauseAnalysis}>②·③ 항목은 임대인의 자의적 판단으로 언제든 계약을 해지할 수 있어 임차인의 주거 안정성을 심각하게 위협합니다. 해당 항목 삭제 또는 최소 6개월 사전 통보 의무를 명시하도록 수정을 강력히 권고합니다.</div>
                      </div>
                    )}
                  </div>

                  {/* Clause 3 */}
                  <div className={s.clauseItem}>
                    <div className={s.clauseHead} onClick={() => toggleClause(2)}>
                      <div className={`${s.clauseLeftBar} ${s.clbWarning}`}></div>
                      <div className={s.clauseTitleBlock}>
                        <div className={s.clauseName}>제5조 — 보증금 반환</div>
                        <div className={s.clauseExcerpt}>계약 종료 후 임차인이 목적물을 인도한 때로부터 상당한 기간 내에...</div>
                      </div>
                      <div className={s.clauseBadges}>
                        <span className={`${s.clauseRiskB} ${s.crbWarning}`}>주의</span>
                        <span className={openClauses[2] ? `${s.clauseArrow} ${s.clauseArrowOpen}` : s.clauseArrow}>›</span>
                      </div>
                    </div>
                    {openClauses[2] && (
                      <div className={s.clauseBody}>
                        <div className={s.clauseOriginalLabel}>원문</div>
                        <div className={s.clauseOriginal}>계약 종료 후 임차인이 목적물을 인도한 때로부터 상당한 기간 내에 임대인은 보증금을 반환한다.</div>
                        <div className={s.clauseAnalysisLabel} style={{ marginTop: "12px" }}>AI 분석</div>
                        <div className={s.clauseAnalysis}>"상당한 기간"은 법적으로 불확정 개념으로, 실제 분쟁 시 해석 차이가 발생할 수 있습니다. 특약으로 "계약 종료일로부터 30일 이내"로 명확히 정하고, 지연 시 이자 지급 조항을 추가하세요.</div>
                      </div>
                    )}
                  </div>

                  {/* Clause 4 */}
                  <div className={s.clauseItem}>
                    <div className={s.clauseHead} onClick={() => toggleClause(3)}>
                      <div className={`${s.clauseLeftBar} ${s.clbSafe}`}></div>
                      <div className={s.clauseTitleBlock}>
                        <div className={s.clauseName}>제2조 — 임대 기간</div>
                        <div className={s.clauseExcerpt}>임대 기간은 2026년 9월 1일부터 2028년 8월 31일까지로 한다...</div>
                      </div>
                      <div className={s.clauseBadges}>
                        <span className={`${s.clauseRiskB} ${s.crbSafe}`}>안전</span>
                        <span className={openClauses[3] ? `${s.clauseArrow} ${s.clauseArrowOpen}` : s.clauseArrow}>›</span>
                      </div>
                    </div>
                    {openClauses[3] && (
                      <div className={s.clauseBody}>
                        <div className={s.clauseOriginalLabel}>원문</div>
                        <div className={s.clauseOriginal}>임대 기간은 2026년 9월 1일부터 2028년 8월 31일까지(24개월)로 한다. 계약 만료 3개월 전까지 당사자 일방이 갱신 거절 의사를 서면으로 통지하지 않는 경우, 동일한 조건으로 묵시적 갱신된 것으로 본다.</div>
                        <div className={s.clauseAnalysisLabel} style={{ marginTop: "12px" }}>AI 분석</div>
                        <div className={s.clauseAnalysis}>주택임대차보호법 기준(최단 2년)을 준수하고 있으며, 묵시적 갱신 조항도 법률에 부합합니다. 다만 "서면 통지" 방법(이메일/문자 포함 여부)을 특약으로 구체화하면 분쟁 예방에 도움이 됩니다.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 누락 조항 */}
              <div className={s.sec} id="sec-missing">
                <div className={s.secHead}>
                  <div className={s.secEyebrow}>Missing Clauses</div>
                  <div className={s.secTitle}>누락 조항</div>
                  <div className={s.secSub}>계약서에 포함되어야 할 중요 조항이 없습니다</div>
                </div>
                <div className={s.secBody}>
                  <div className={s.missingItem}>
                    <span className={`${s.missingPriority} ${s.mpHigh}`}>필수</span>
                    <div className={s.missingInfo}>
                      <div className={s.missingTitle}>전세보증보험 가입 의무 조항</div>
                      <div className={s.missingDesc}>임차인의 보증금 보호를 위한 전세보증보험(HUG 또는 SGI) 가입 의무 및 임대인의 협조 의무에 관한 조항이 없습니다. 보증금이 3억 원으로 고액이므로 사실상 필수입니다.</div>
                    </div>
                  </div>
                  <div className={s.missingItem}>
                    <span className={`${s.missingPriority} ${s.mpHigh}`}>필수</span>
                    <div className={s.missingInfo}>
                      <div className={s.missingTitle}>등기부 현황 기준 명시</div>
                      <div className={s.missingDesc}>계약 체결 기준일의 등기부등본 현황(근저당, 가압류, 가처분 등)을 별지로 첨부하거나 계약서에 명시하는 조항이 없습니다. 계약 후 근저당 추가 설정을 방지하기 위한 조항도 필요합니다.</div>
                    </div>
                  </div>
                  <div className={s.missingItem}>
                    <span className={`${s.missingPriority} ${s.mpMedium}`}>권장</span>
                    <div className={s.missingInfo}>
                      <div className={s.missingTitle}>주요 설비 수선 의무 명시</div>
                      <div className={s.missingDesc}>보일러, 수도, 전기 등 주요 설비에 대한 임대인의 수선 의무 범위가 명시되지 않았습니다. 법정 의무와 약정 의무의 경계를 명확히 하면 분쟁을 예방할 수 있습니다.</div>
                    </div>
                  </div>
                  <div className={s.missingItem}>
                    <span className={`${s.missingPriority} ${s.mpMedium}`}>권장</span>
                    <div className={s.missingInfo}>
                      <div className={s.missingTitle}>전입신고 및 확정일자 수령 협조 조항</div>
                      <div className={s.missingDesc}>임차인이 전입신고와 확정일자를 통해 대항력을 취득할 수 있도록 임대인이 적극 협조한다는 조항이 없습니다.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 맞춤 특약 추천 */}
              <div className={s.sec} id="sec-terms">
                <div className={s.secHead}>
                  <div className={s.secEyebrow}>Recommended Special Terms</div>
                  <div className={s.secTitle}>맞춤 특약 추천</div>
                  <div className={s.secSub}>이 계약서에 추가하면 좋을 특약 조항입니다. 클릭하여 내용을 확인하세요.</div>
                </div>
                <div className={s.secBody}>
                  {/* Term 1 */}
                  <div className={s.termItem}>
                    <div className={s.termHead} onClick={() => toggleTerm(0)}>
                      <span className={`${s.termPriority} ${s.tpCritical}`}>필수</span>
                      <span className={s.termTitle}>근저당 설정 제한 특약</span>
                      <span className={openTerms[0] ? `${s.termArrow} ${s.termArrowOpen}` : s.termArrow}>›</span>
                    </div>
                    {openTerms[0] && (
                      <div className={s.termBody}>
                        <div className={s.termText}>임대인은 임대차 기간 중 본 계약 체결일 이후 이 건물에 추가로 근저당권·전세권·가압류 등 어떠한 담보권도 설정하지 아니하며, 이를 위반할 경우 임차인은 즉시 계약을 해제하고 임대인은 위약금으로 보증금의 10%를 임차인에게 지급한다.</div>
                        <div className={s.termReason}>📌 이유: 계약 후 임대인이 근저당을 추가 설정하면 임차인의 보증금 순위가 밀려 경매 시 손해를 입을 수 있습니다.</div>
                      </div>
                    )}
                  </div>

                  {/* Term 2 */}
                  <div className={s.termItem}>
                    <div className={s.termHead} onClick={() => toggleTerm(1)}>
                      <span className={`${s.termPriority} ${s.tpCritical}`}>필수</span>
                      <span className={s.termTitle}>보증금 반환 기한 명확화 특약</span>
                      <span className={openTerms[1] ? `${s.termArrow} ${s.termArrowOpen}` : s.termArrow}>›</span>
                    </div>
                    {openTerms[1] && (
                      <div className={s.termBody}>
                        <div className={s.termText}>임대인은 임대차 계약 종료일로부터 30일 이내에 임차인의 보증금 전액을 반환하여야 하며, 반환이 지연될 경우 지연일수에 대하여 연 12%의 비율로 계산한 지연손해금을 가산하여 지급한다.</div>
                        <div className={s.termReason}>📌 이유: 제5조의 "상당한 기간"을 명확히 하고, 지연 시 패널티를 규정하여 임차인 보호를 강화합니다.</div>
                      </div>
                    )}
                  </div>

                  {/* Term 3 */}
                  <div className={s.termItem}>
                    <div className={s.termHead} onClick={() => toggleTerm(2)}>
                      <span className={`${s.termPriority} ${s.tpHigh}`}>권장</span>
                      <span className={s.termTitle}>전세보증보험 가입 협조 특약</span>
                      <span className={openTerms[2] ? `${s.termArrow} ${s.termArrowOpen}` : s.termArrow}>›</span>
                    </div>
                    {openTerms[2] && (
                      <div className={s.termBody}>
                        <div className={s.termText}>임대인은 임차인이 주택도시보증공사(HUG) 또는 SGI서울보증의 전세보증보험에 가입할 수 있도록 필요한 서류 제출에 적극 협조한다. 임대인의 협조 거부로 인해 임차인이 보험 가입에 실패할 경우, 임차인은 계약을 해제할 수 있다.</div>
                        <div className={s.termReason}>📌 이유: 보증금 3억 원 규모에서 전세보증보험은 사실상 필수입니다.</div>
                      </div>
                    )}
                  </div>

                  {/* Term 4 */}
                  <div className={s.termItem}>
                    <div className={s.termHead} onClick={() => toggleTerm(3)}>
                      <span className={`${s.termPriority} ${s.tpMedium}`}>선택</span>
                      <span className={s.termTitle}>주요 설비 수선 의무 특약</span>
                      <span className={openTerms[3] ? `${s.termArrow} ${s.termArrowOpen}` : s.termArrow}>›</span>
                    </div>
                    {openTerms[3] && (
                      <div className={s.termBody}>
                        <div className={s.termText}>임대인은 임대차 기간 중 보일러, 상·하수도 배관, 전기 배선, 엘리베이터 등 주요 설비의 노후화 및 자연 손상에 의한 수선을 부담한다. 다만 임차인의 고의 또는 과실로 인한 손상의 수선 비용은 임차인이 부담한다.</div>
                        <div className={s.termReason}>📌 이유: 수선 의무 범위를 명시하지 않으면 분쟁 시 각자의 해석 차이로 갈등이 발생합니다.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 안전 체크리스트 */}
              <div className={s.sec} id="sec-checklist">
                <div className={s.secHead}>
                  <div className={s.secEyebrow}>Safety Checklist</div>
                  <div className={s.secTitle}>안전 체크리스트</div>
                  <div className={s.secSub}>계약 전 반드시 확인해야 할 사항입니다</div>
                </div>
                <div className={s.secBody}>
                  <div className={s.checklist}>
                    <div className={s.checkItem}>
                      <div className={`${s.checkIco} ${s.checkIcoDone}`}>✅</div>
                      <div className={s.checkInfo}>
                        <div className={s.checkTitle}>등기부 말소 이력 확인</div>
                        <div className={s.checkDesc}>계약 당일 등기부등본을 직접 발급하여 최신 근저당·압류 현황을 확인하세요.</div>
                      </div>
                      <span className={`${s.checkStatus} ${s.csManual}`}>직접 확인</span>
                    </div>
                    <div className={s.checkItem}>
                      <div className={`${s.checkIco} ${s.checkIcoWarn}`}>⚠️</div>
                      <div className={s.checkInfo}>
                        <div className={s.checkTitle}>전세보증보험 가입 가능 여부</div>
                        <div className={s.checkDesc}>현재 근저당(2.4억) + 전세보증금(3억) 합산이 KB시세의 80%를 초과할 경우 HUG 보험 가입이 불가합니다. 사전 확인 필수.</div>
                      </div>
                      <span className={`${s.checkStatus} ${s.csWarn}`}>확인 필요</span>
                    </div>
                    <div className={s.checkItem}>
                      <div className={`${s.checkIco} ${s.checkIcoDone}`}>✅</div>
                      <div className={s.checkInfo}>
                        <div className={s.checkTitle}>세금 체납 확인</div>
                        <div className={s.checkDesc}>국세·지방세 완납증명서를 임대인에게 요청하세요. 세금 체납이 있으면 경매 시 국세가 보증금보다 우선합니다.</div>
                      </div>
                      <span className={`${s.checkStatus} ${s.csManual}`}>직접 확인</span>
                    </div>
                    <div className={s.checkItem}>
                      <div className={`${s.checkIco} ${s.checkIcoDone}`}>✅</div>
                      <div className={s.checkInfo}>
                        <div className={s.checkTitle}>전입신고 및 확정일자 수령</div>
                        <div className={s.checkDesc}>잔금 지급 당일 즉시 전입신고하고 주민센터에서 확정일자를 받으세요. 대항력 취득에 필수입니다.</div>
                      </div>
                      <span className={`${s.checkStatus} ${s.csDone}`}>완료</span>
                    </div>
                    <div className={s.checkItem}>
                      <div className={`${s.checkIco} ${s.checkIcoWarn}`}>⚠️</div>
                      <div className={s.checkInfo}>
                        <div className={s.checkTitle}>권원보험 가입 검토</div>
                        <div className={s.checkDesc}>등기부에 나타나지 않는 위험(이중 계약, 사기 임대 등)으로부터 보증금을 보호합니다. 고액 전세의 경우 추가 보호 수단으로 고려하세요.</div>
                      </div>
                      <span className={`${s.checkStatus} ${s.csWarn}`}>검토 권장</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 분석 정보 */}
              <div className={s.sec} id="sec-report">
                <div className={s.secHead}>
                  <div className={s.secEyebrow}>Report Info</div>
                  <div className={s.secTitle}>분석 정보</div>
                </div>
                <div className={s.secBody}>
                  <div className={s.integrityBadge}>
                    <span className={s.ibIco}>🛡️</span>
                    <div>
                      <div className={s.ibT}>분석 결과 암호화 보호 중</div>
                      <div className={s.ibS}>SHA-256 해시로 리포트 무결성 검증 완료</div>
                    </div>
                    <span className={s.ibTime}>2026.08.11 14:32</span>
                  </div>
                  <div className={s.disclaimer}>
                    <div className={s.disclaimerT}>⚠️ 주의사항</div>
                    <div className={s.disclaimerD}>본 분석 결과는 AI가 계약서 텍스트를 기반으로 생성한 참고 자료이며, 법률 자문이 아닙니다. 중요한 계약 체결 전에는 반드시 자격을 갖춘 법률 전문가(변호사, 법무사)의 검토를 받으시기 바랍니다.</div>
                  </div>
                  <div style={{ marginTop: "20px", fontSize: "13.5px", fontWeight: 700, color: "#1a1d2e", marginBottom: "12px" }}>연관 분석 서비스</div>
                  <div className={s.relatedCta}>
                    <div className={s.rctaCard} onClick={() => alert("권리분석으로 이동")}>
                      <div className={s.rctaIco}>🔍</div>
                      <div className={s.rctaT}>권리관계 분석</div>
                      <div className={s.rctaS}>등기부등본 기반 근저당·압류·가처분 등 권리 현황을 상세히 분석합니다.</div>
                      <div className={s.rctaArrow}>분석하기 →</div>
                    </div>
                    <div className={s.rctaCard} onClick={() => alert("등기감시로 이동")}>
                      <div className={s.rctaIco}>📡</div>
                      <div className={s.rctaT}>등기감시 시작</div>
                      <div className={s.rctaS}>계약 체결 후 등기 변동을 실시간으로 감시하고 이상 징후를 즉시 알립니다.</div>
                      <div className={s.rctaArrow}>감시 시작 →</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerIn}>
          <div>
            <div className={s.flogo}>
              <div className={s.flogoI}>V</div>
              <span className={s.flogoT}>VESTRA</span>
            </div>
            <p className={s.ftag}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
            <div className={s.fcontact}>BMI C&S | 대표이사 김동의<br />사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />고객센터 010-8490-9271</div>
          </div>
          <div>
            <p className={s.fcolT}>Legal</p>
            <ul className={s.flinks}>
              <li><a href="#">개인정보처리방침</a></li>
              <li><a href="#">이용약관</a></li>
            </ul>
          </div>
          <div>
            <p className={s.fcolT}>Product</p>
            <ul className={s.flinks}>
              <li><a href="#">기능 소개</a></li>
              <li><a href="#">요금제</a></li>
            </ul>
          </div>
          <div>
            <p className={s.fcolT}>Company</p>
            <ul className={s.flinks}>
              <li><a href="#">회사 소개</a></li>
              <li><a href="#">채용</a></li>
            </ul>
          </div>
          <div>
            <p className={s.fcolT}>Connect</p>
            <ul className={s.flinks}>
              <li><a href="#">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className={s.fbot}>
          <span>© 2026 BMI-C&amp;S All rights reserved.</span>
          <span>The Digital Curator of Real Estate</span>
        </div>
      </footer>
    </>
  );
}

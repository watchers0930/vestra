"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Search,
  Zap,
  Lock,
  Bell,
  MapPin,
  Upload,
  Trash2,
  AlertTriangle,
  Folder,
  ClipboardList,
  Landmark,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import s from "./monitoring-renewal.module.css";
import RenewalGnb from "../_shared/RenewalGnb";

type ViewType = "empty" | "list" | "add" | "detail";
type ModalTabType = "addr" | "pdf";

export default function MonitoringRenewalClient() {
  const [activeView, setActiveView] = useState<ViewType>("empty");
  const [modalTab, setModalTab] = useState<ModalTabType>("addr");
  const [showPubkey, setShowPubkey] = useState(false);
  const [activeFilter, setActiveFilter] = useState(0);

  const showView = (view: ViewType) => {
    setActiveView(view);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const demoBtns: { label: string; view: ViewType }[] = [
    { label: "① 빈 랜딩", view: "empty" },
    { label: "② 물건 목록", view: "list" },
    { label: "③ 물건 추가", view: "add" },
    { label: "④ 상세화면", view: "detail" },
  ];

  return (
    <>
      {/* DEMO BAR */}
      <div className={s.demoBar}>
        <span className={s.demoLabel}>시안 데모</span>
        {demoBtns.map((btn) => (
          <button
            key={btn.view}
            className={`${s.demoBtn} ${activeView === btn.view ? s.on : ""}`}
            onClick={() => showView(btn.view)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* NAV */}
      <RenewalGnb active="monitoring" />

      {/* ██████████ VIEW: EMPTY LANDING ██████████ */}
      <div className={`${s.view} ${activeView === "empty" ? s.on : ""}`} id="view-empty">
        <section className={s.subHero}>
          <div className={s.subHeroBg}></div>
          <div className={s.subHeroIn}>
            <span className={s.heroChip}>Registry Monitor</span>
            <h1>등기감시</h1>
            <p className={s.subHeroSub}>등기부 변동을 실시간 감시하고, 블록체인으로 기록을 보호합니다</p>
          </div>
        </section>

        <div className={s.pageWrap}>
          <div className={s.topbar}>
            <div className={s.topbarTitle}>나의 등기감시</div>
            <button className={s.addBtn} onClick={() => showView("add")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              물건 추가
            </button>
          </div>

          {/* KPI Row (empty) */}
          <div className={s.kpiRow}>
            <div className={s.kpiCard}>
              <div className={s.kpiLabel}>감시 중</div>
              <div className={`${s.kpiVal} ${s.kpiCGray}`}>0</div>
              <div className={s.kpiSub}>등록된 감시 물건이 없습니다</div>
            </div>
            <div className={s.kpiCard}>
              <div className={s.kpiLabel}>미확인 알림</div>
              <div className={`${s.kpiVal} ${s.kpiCGray}`}>—</div>
              <div className={s.kpiSub}>변동 알림이 없습니다</div>
            </div>
            <div className={s.kpiCard}>
              <div className={s.kpiLabel}>고위험 알림</div>
              <div className={`${s.kpiVal} ${s.kpiCGray}`}>—</div>
              <div className={s.kpiSub}>즉시 확인 필요 알림 없음</div>
            </div>
            <div className={s.kpiCard}>
              <div className={s.kpiLabel}>기록 보호</div>
              <div className={`${s.kpiVal} ${s.kpiCGray}`}>—</div>
              <div className={s.kpiSub}>블록체인 암호화 보호</div>
            </div>
          </div>

          {/* Empty State */}
          <div className={s.emptyWrap}>
            <div className={s.emptyIconBox}><ShieldCheck size={32} /></div>
            <div className={s.emptyTitle}>아직 감시 중인 물건이 없습니다</div>
            <div className={s.emptyDesc}>
              주소를 등록하면 VESTRA AI가 4시간마다 등기부를 점검하고<br />
              소유권 변동, 압류, 근저당 설정 등 위험 이벤트를 즉시 알려드립니다.
            </div>
            <button className={s.emptyCta} onClick={() => showView("add")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              첫 물건 등록하기
            </button>

            <div className={s.whyGrid}>
              <div className={s.whyCard}>
                <div className={s.whyIco}><Search size={22} /></div>
                <div className={s.whyT}>4시간 주기 자동 감시</div>
                <div className={s.whyD}>신청사건 프리체크로 이상징후를 조기 감지하고, 실제 변동 발생 시 확정조회로 즉시 전환합니다.</div>
              </div>
              <div className={s.whyCard}>
                <div className={s.whyIco}><Zap size={22} /></div>
                <div className={s.whyT}>위험 즉시 알림</div>
                <div className={s.whyD}>압류, 근저당 설정, 소유권 변동 등 9가지 위험 유형을 위험도별로 분류하여 즉시 통보합니다.</div>
              </div>
              <div className={s.whyCard}>
                <div className={s.whyIco}><Lock size={22} /></div>
                <div className={s.whyT}>블록체인 무결성 보호</div>
                <div className={s.whyD}>등기부 기록을 블록체인 방식으로 암호화 저장하여 위변조를 원천 차단하고 법적 증명서를 발급합니다.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ██████████ VIEW: LIST (물건 목록) ██████████ */}
      <div className={`${s.view} ${activeView === "list" ? s.on : ""}`} id="view-list">
        <section className={s.subHero}>
          <div className={s.subHeroBg}></div>
          <div className={s.subHeroIn}>
            <span className={s.heroChip}>Registry Monitor</span>
            <h1>등기감시</h1>
            <p className={s.subHeroSub}>등기부 변동을 실시간 감시하고, 블록체인으로 기록을 보호합니다</p>
          </div>
        </section>

        <div className={s.pageWrap}>
          <div className={s.topbar}>
            <div className={s.topbarTitle}>나의 등기감시</div>
            <button className={s.addBtn} onClick={() => showView("add")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              물건 추가
            </button>
          </div>

          {/* Engine Banner */}
          <div className={s.engineBanner}>
            <div className={s.engineRadar}>
              <div className={s.engineRadarRing}></div>
              <div className={s.engineRadarRing}></div>
              <div className={s.engineRadarRing}></div>
              <div className={s.engineRadarDot}></div>
            </div>
            <div className={s.engineText}>
              <div className={s.engineT}>등기감시 엔진 작동 중</div>
              <div className={s.engineS}>활성 물건 2건을 4시간 주기로 프리체크하고, 이상징후 발생 시 확정 조회로 전환합니다.</div>
            </div>
            <div className={s.engineBadges}>
              <span className={`${s.engB} ${s.engBGreen}`}>신청사건 프리체크 활성</span>
              <span className={`${s.engB} ${s.engBBlue}`}>확정조회 대기</span>
            </div>
          </div>

          {/* KPI Row */}
          <div className={s.kpiRow}>
            <div className={s.kpiCard}>
              <div className={s.kpiLabel}>감시 중</div>
              <div className={`${s.kpiVal} ${s.kpiCBlue}`}>2</div>
              <div className={s.kpiSub}>전체 3건 중 활성 감시</div>
            </div>
            <div className={s.kpiCard}>
              <div className={s.kpiLabel}>미확인 알림</div>
              <div className={`${s.kpiVal} ${s.kpiCAmber}`}>3</div>
              <div className={s.kpiSub}>확인하지 않은 변동 알림</div>
            </div>
            <div className={s.kpiCard}>
              <div className={s.kpiLabel}>고위험 알림</div>
              <div className={`${s.kpiVal} ${s.kpiCRed}`}>1</div>
              <div className={s.kpiSub}>즉시 확인이 필요한 알림</div>
            </div>
            <div className={s.kpiCard}>
              <div className={s.kpiLabel}>기록 보호</div>
              <div className={`${s.kpiVal} ${s.kpiCGreen}`}>3</div>
              <div className={s.kpiSub}>모든 기록 암호화 보호 중</div>
            </div>
          </div>

          {/* Filter */}
          <div className={s.filterBar}>
            {["전체 3", "감시중 2", "일시중지 1"].map((label, i) => (
              <button
                key={i}
                className={`${s.filterBtn} ${activeFilter === i ? s.on : ""}`}
                onClick={() => setActiveFilter(i)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Property Grid */}
          <div className={s.propGrid}>

            {/* Card 1: Active, Standard, 1 unread HIGH alert */}
            <div className={s.propCard} onClick={() => showView("detail")}>
              <div className={`${s.propSide} ${s.psActive}`}></div>
              <div className={s.propInner}>
                <div className={s.propHead}>
                  <div className={s.propAddrBlock}>
                    <div className={s.propAddr}>서울 강남구 역삼동 826-22 101동 1504호</div>
                    <div className={s.propDeposit}>보증금 3억원</div>
                  </div>
                  <span className={`${s.propSbadge} ${s.psbActive}`}>감시중</span>
                </div>
                <div className={s.propBadges}>
                  <span className={`${s.pb} ${s.pbMode}`}>일반 감시</span>
                  <span className={`${s.pb} ${s.pbFreq}`}>하루 2회</span>
                  <span className={`${s.pb} ${s.pbIdle}`}>프리체크 대기</span>
                </div>
                <div className={`${s.engBox} ${s.engBoxOn}`}>
                  <div className={`${s.engDot} ${s.engDotOn}`}></div>
                  <div>
                    <div className={`${s.engBoxT} ${s.engBoxTOn}`}>등기감시 엔진 작동 중</div>
                    <div className={`${s.engBoxS} ${s.engBoxSOn}`}>프리체크 후 이상징후 발생 시 확정조회 · 점검 주기: 하루 2회</div>
                  </div>
                </div>
                <div className={s.propFooter}>
                  <div className={s.palertRow}>
                    <span><Bell size={16} /></span>
                    <span className={s.palertCnt}>미확인 알림 1건</span>
                    <span className={`${s.riskB} ${s.rbHigh}`}>높음</span>
                  </div>
                  <div className={s.ptime}>3시간 전<span className={s.parrow}>›</span></div>
                </div>
              </div>
            </div>

            {/* Card 2: Active, Contract Gap, 신청사건 감지, 2 unread CRITICAL */}
            <div className={s.propCard} onClick={() => showView("detail")}>
              <div className={`${s.propSide} ${s.psActive}`}></div>
              <div className={s.propInner}>
                <div className={s.propHead}>
                  <div className={s.propAddrBlock}>
                    <div className={s.propAddr}>서울 서초구 방배동 2523-1 302호</div>
                    <div className={s.propDeposit}>보증금 5억원</div>
                  </div>
                  <span className={`${s.propSbadge} ${s.psbActive}`}>감시중</span>
                </div>
                <div className={s.propBadges}>
                  <span className={`${s.pb} ${s.pbMode}`}>계약갭 강화감시</span>
                  <span className={`${s.pb} ${s.pbFreq}`}>하루 2회</span>
                  <span className={`${s.pb} ${s.pbDetected}`}>신청사건 감지</span>
                  <span className={`${s.pb} ${s["pb접수"]}`}>접수</span>
                </div>
                <div className={`${s.engBox} ${s.engBoxOn}`}>
                  <div className={`${s.engDot} ${s.engDotOn}`}></div>
                  <div>
                    <div className={`${s.engBoxT} ${s.engBoxTOn}`}>신청사건 감지 — 확정조회 대기 중</div>
                    <div className={`${s.engBoxS} ${s.engBoxSOn}`}>법원 접수 확인됨 · 처리 완료 시 최신 등기부 자동 발급</div>
                  </div>
                </div>
                <button className={s.propCtaBtn}>최신 등기부 확인하기</button>
                <div className={s.propFooter}>
                  <div className={s.palertRow}>
                    <span><Bell size={16} /></span>
                    <span className={s.palertCnt}>미확인 알림 2건</span>
                    <span className={`${s.riskB} ${s.rbCritical}`}>위험</span>
                  </div>
                  <div className={s.ptime}>22분 전<span className={s.parrow}>›</span></div>
                </div>
              </div>
            </div>

            {/* Card 3: Paused, Standard, 0 alerts */}
            <div className={s.propCard}>
              <div className={`${s.propSide} ${s.psPaused}`}></div>
              <div className={s.propInner}>
                <div className={s.propHead}>
                  <div className={s.propAddrBlock}>
                    <div className={s.propAddr}>서울 마포구 합정동 387 202호</div>
                    <div className={s.propDeposit}>보증금 2억 5천만원</div>
                  </div>
                  <span className={`${s.propSbadge} ${s.psbPaused}`}>일시중지</span>
                </div>
                <div className={s.propBadges}>
                  <span className={`${s.pb} ${s.pbMode}`}>일반 감시</span>
                  <span className={`${s.pb} ${s.pbDismissed}`}>종결 확인</span>
                </div>
                <div className={`${s.engBox} ${s.engBoxOff}`}>
                  <div className={`${s.engDot} ${s.engDotOff}`}></div>
                  <div>
                    <div className={`${s.engBoxT} ${s.engBoxTOff}`}>감시 일시중지</div>
                    <div className={`${s.engBoxS} ${s.engBoxSOff}`}>감시를 재개하려면 물건 상세에서 활성화하세요</div>
                  </div>
                </div>
                <div className={s.propFooter}>
                  <div className={s.palertRow}>
                    <span className={`${s.palertCnt} ${s.palertZero}`}>알림 없음</span>
                  </div>
                  <div className={s.ptime}>2일 전<span className={s.parrow}>›</span></div>
                </div>
              </div>
            </div>

          </div>{/* /propGrid */}
        </div>
      </div>

      {/* ██████████ VIEW: ADD MODAL ██████████ */}
      <div className={`${s.view} ${activeView === "add" ? s.on : ""}`} id="view-add">
        {/* Background: list (dimmed) */}
        <section className={s.subHero} style={{ opacity: 0.5 }}>
          <div className={s.subHeroBg}></div>
          <div className={s.subHeroIn}>
            <span className={s.heroChip}>Registry Monitor</span>
            <h1>등기감시</h1>
          </div>
        </section>
        <div style={{ filter: "blur(2px)", pointerEvents: "none", opacity: 0.5 }}>
          <div className={s.pageWrap}>
            <div className={s.topbar}>
              <div className={s.topbarTitle}>나의 등기감시</div>
              <button className={s.addBtn}>+ 물건 추가</button>
            </div>
            <div className={s.kpiRow}>
              <div className={s.kpiCard}><div className={s.kpiLabel}>감시 중</div><div className={`${s.kpiVal} ${s.kpiCBlue}`}>2</div><div className={s.kpiSub}>전체 3건 중 활성</div></div>
              <div className={s.kpiCard}><div className={s.kpiLabel}>미확인 알림</div><div className={`${s.kpiVal} ${s.kpiCAmber}`}>3</div><div className={s.kpiSub}>변동 알림</div></div>
              <div className={s.kpiCard}><div className={s.kpiLabel}>고위험 알림</div><div className={`${s.kpiVal} ${s.kpiCRed}`}>1</div><div className={s.kpiSub}>즉시 확인 필요</div></div>
              <div className={s.kpiCard}><div className={s.kpiLabel}>기록 보호</div><div className={`${s.kpiVal} ${s.kpiCGreen}`}>3</div><div className={s.kpiSub}>암호화 보호 중</div></div>
            </div>
          </div>
        </div>

        {/* MODAL */}
        <div className={s.modalOverlay}>
          <div className={s.modalBox}>
            <div className={s.modalHead}>
              <div className={s.modalTitle}>감시 물건 추가</div>
              <button className={s.modalClose} onClick={() => showView("list")}>✕</button>
            </div>
            <div className={s.modalTabs}>
              <button
                className={`${s.modalTab} ${modalTab === "addr" ? s.on : ""}`}
                onClick={() => setModalTab("addr")}
              >
                주소 검색
              </button>
              <button
                className={`${s.modalTab} ${modalTab === "pdf" ? s.on : ""}`}
                onClick={() => setModalTab("pdf")}
              >
                등기부 PDF
              </button>
            </div>

            {/* TAB: 주소 검색 */}
            {modalTab === "addr" && (
              <div className={s.modalBody} id="mtab-addr">
                <div>
                  <div className={s.mLabel}>주소 검색</div>
                  <div className={s.mRow}>
                    <input className={s.mInput} type="text" defaultValue="서초구 방배동 2523" placeholder="도로명 또는 지번 주소 입력" />
                    <button className={s.mBtnDark}>검색</button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>검색 결과 2건</div>
                  <div className={s.mResultsBox}>
                    <div className={`${s.mResult} ${s.sel}`}>
                      <div className={s.mResultAddr}>서울 서초구 방배동 2523-1</div>
                      <div className={s.mResultType}>아파트 · 집합건물</div>
                    </div>
                    <div className={s.mResult}>
                      <div className={s.mResultAddr}>서울 서초구 방배동 2523-2</div>
                      <div className={s.mResultType}>다세대주택</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className={s.mSecTitle}>동 · 호수 입력</div>
                  <div className={s.mSecSub} style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>아파트·오피스텔은 동·호수까지 입력해야 정확한 감시가 가능합니다</div>
                  <div className={s.m2col}>
                    <div>
                      <div className={s.mLabel}>동</div>
                      <input className={s.mInput} type="text" placeholder="예: 101" />
                    </div>
                    <div>
                      <div className={s.mLabel}>호수</div>
                      <input className={s.mInput} type="text" defaultValue="302" placeholder="예: 1004" />
                    </div>
                  </div>
                </div>

                <div className={s.mAddrPreview}>
                  <MapPin size={13} /> 서울 서초구 방배동 2523-1 302호
                </div>

                <hr className={s.mDivider} />

                <div>
                  <div className={s.mSecTitle}>계약 정보 <span style={{ fontSize: "12px", fontWeight: 400, color: "#aaa", marginLeft: "6px" }}>선택 입력</span></div>
                  <div className={s.mSecSub} style={{ fontSize: "12px", color: "#aaa", marginBottom: "12px" }}>계약일 입력 시 계약갭 강화감시 모드로 자동 전환됩니다</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <div className={s.mLabel}>소유자명</div>
                      <input className={s.mInput} type="text" defaultValue="김민준" placeholder="등기부상 소유자명" />
                    </div>
                    <div>
                      <div className={s.mLabel}>보증금 (만원)</div>
                      <input className={s.mInput} type="number" defaultValue="50000" placeholder="예: 30000" />
                    </div>
                    <div className={s.m2col}>
                      <div>
                        <div className={s.mLabel}>계약일</div>
                        <input className={s.mInput} type="date" defaultValue="2026-07-15" />
                      </div>
                      <div>
                        <div className={s.mLabel}>전입 예정일</div>
                        <input className={s.mInput} type="date" defaultValue="2026-08-01" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={s.mHint}>계약일을 입력하면 계약~전입 기간 동안 <strong>계약갭 강화감시</strong> 모드가 자동 활성화됩니다.</div>

                <button className={s.mSubmit}>등록하기</button>
              </div>
            )}

            {/* TAB: PDF */}
            {modalTab === "pdf" && (
              <div className={s.modalBody} id="mtab-pdf">
                <div className={s.mHint} style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: "12px 14px" }}>
                  <strong>발급 후 바로 업로드하세요</strong><br />반드시 인터넷등기소(iros.go.kr)에서 직접 발급한 등기부등본 PDF를 업로드하세요.
                </div>
                <div className={s.mDropZone}>
                  <div className={s.mDropIco}><Upload size={28} /></div>
                  <div className={s.mDropT}>PDF 파일을 여기에 드래그하거나 클릭하여 선택</div>
                  <div className={s.mDropS}>PDF · 최대 10MB</div>
                </div>
                <button className={s.mParseBtn}>등기부 분석</button>
                <hr className={s.mDivider} />
                <div style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "8px 0" }}>PDF 분석 후 주소와 소유자 정보가 자동으로 입력됩니다</div>
              </div>
            )}

          </div>{/* /modalBox */}
        </div>{/* /modalOverlay */}
      </div>

      {/* ██████████ VIEW: DETAIL ██████████ */}
      <div className={`${s.view} ${activeView === "detail" ? s.on : ""}`} id="view-detail">
        <div className={s.pageWrap}>

          {/* Back + Actions */}
          <div className={s.detailTop}>
            <div className={s.detailBack} onClick={() => showView("list")}>‹ 목록으로</div>
            <div className={s.detailActions}>
              <button className={s.dBtnDel}><Trash2 size={13} /> 삭제</button>
              <button className={s.dBtnPdf}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                증명서 PDF
              </button>
            </div>
          </div>

          {/* Property Info Card */}
          <div className={s.propInfoCard}>
            <div className={s.picTop}>
              <div>
                <div className={s.picAddr}>서울 서초구 방배동 2523-1 302호</div>
                <div className={s.picBadges}>
                  <span className={`${s.picB} ${s.picbActive}`}>감시중</span>
                  <span className={`${s.picB} ${s.picbMode}`}>계약갭 강화감시</span>
                  <span className={`${s.picB} ${s.picbSignal}`}>신청사건 감지</span>
                  <span className={`${s.picB} ${s.picbStage}`}>접수</span>
                  <span className={`${s.picB} ${s.picbUnverified}`}><AlertTriangle size={12} /> 원본 미검증</span>
                </div>
              </div>
              <div className={s.picDays}>
                <div className={s.picDaysN}>23</div>
                <div className={s.picDaysL}>감시 일수</div>
              </div>
            </div>
            <div className={s.picMeta}>
              <div>
                <div className={s.pimLabel}>보증금</div>
                <div className={s.pimVal}>5억원</div>
              </div>
              <div>
                <div className={s.pimLabel}>계약일</div>
                <div className={s.pimVal}>2026.07.15</div>
              </div>
              <div>
                <div className={s.pimLabel}>전입 예정</div>
                <div className={s.pimVal}>2026.08.01</div>
              </div>
            </div>
            <div className={s.picStats}>
              <div className={s.pis}><Folder size={13} /> 스냅샷 <span className={s.pisN}>3건</span></div>
              <div className={s.pis}><Bell size={13} /> 미확인 알림 <span className={s.pisN} style={{ color: "#ef4444" }}>2건</span></div>
              <div className={s.pis}><ShieldCheck size={13} /> <span className={s.pisN} style={{ color: "#22c55e" }}>보호중</span></div>
            </div>
          </div>

          {/* Alert Timeline */}
          <div className={s.detCard}>
            <div className={s.detEyebrow}>Alert Timeline</div>
            <div className={s.detTitle}>변동 알림</div>
            <div className={s.detSub}>감시 기간 중 감지된 등기 변동 이력</div>
            <div className={`${s.detCountBadge} ${s.dcbAmber}`}><Bell size={13} /> 총 3건의 변동 감지</div>

            {/* Alert 1: 압류 설정 [위험] unread — EXPANDED */}
            <div className={s.alertItem}>
              <div className={s.aiHead}>
                <div className={`${s.aiIco} ${s.aiIcoCritical}`}><AlertTriangle size={15} /></div>
                <div className={s.aiInfo}>
                  <div className={s.aiType}>압류 설정</div>
                  <div className={s.aiSumm}>체납처분 국세 3,200만원 압류 설정됨</div>
                </div>
                <div className={s.aiMeta}>
                  <span className={`${s.aiRisk} ${s.airCritical}`}>위험</span>
                  <span className={s.aiTime}>2일 전</span>
                </div>
                <div className={s.aiUnread}></div>
              </div>
              <div className={s.aiBody}>
                <div className={s.aiDetail}>갑구에 국세 체납에 따른 압류가 설정되었습니다. 채권자: 서초세무서 / 채권금액: 3,200만원 / 설정일: 2026.08.09</div>
                <div className={s.aiWhy}>
                  <span className={s.aiWhyIco}><Sparkles size={13} /></span>
                  <div className={s.aiWhyTxt}>소유자의 세금 미납으로 인한 압류입니다. 압류가 해소되지 않으면 경매로 이어질 수 있습니다. 소유자에게 즉시 확인하고, 계약을 보류하는 것을 권장합니다.</div>
                </div>
                <div className={s.aiBtns}>
                  <button className={s.aiCta}>최신 등기부 확인하기</button>
                  <button className={s.aiRead}>읽음 처리</button>
                </div>
              </div>
            </div>

            {/* Alert 2: 신청사건 접수 [보통] unread */}
            <div className={s.alertItem}>
              <div className={s.aiHead}>
                <div className={`${s.aiIco} ${s.aiIcoMedium}`}><ClipboardList size={15} /></div>
                <div className={s.aiInfo}>
                  <div className={s.aiType}>신청사건 접수</div>
                  <div className={s.aiSumm}>등기 신청사건이 법원에 접수됨</div>
                </div>
                <div className={s.aiMeta}>
                  <span className={`${s.aiRisk} ${s.airMedium}`}>보통</span>
                  <span className={s.aiTime}>2일 전</span>
                </div>
                <div className={s.aiUnread}></div>
              </div>
            </div>

            {/* Alert 3: 근저당 설정 [높음] read */}
            <div className={s.alertItem}>
              <div className={s.aiHead}>
                <div className={`${s.aiIco} ${s.aiIcoHigh}`}><Landmark size={15} /></div>
                <div className={s.aiInfo}>
                  <div className={s.aiType}>근저당권 설정</div>
                  <div className={s.aiSumm}>채권최고액 6억원 근저당 설정됨 — ○○은행</div>
                </div>
                <div className={s.aiMeta}>
                  <span className={`${s.aiRisk} ${s.airHigh}`}>높음</span>
                  <span className={s.aiTime}>23일 전</span>
                </div>
              </div>
            </div>

          </div>{/* /alert section */}

          {/* Snapshot Chain */}
          <div className={s.detCard}>
            <div className={s.detEyebrow}>Registry Snapshot</div>
            <div className={s.detTitle}>등기부 기록 이력</div>
            <div className={s.detSub}>변동 감시 중 저장된 등기부 사본</div>
            <div className={`${s.detCountBadge} ${s.dcbGreen}`}><Lock size={13} /> 총 3건의 등기부 사본이 안전하게 보관됨</div>

            <div className={s.snapChain}>

              {/* Snapshot #3 (latest) */}
              <div className={s.snapItem}>
                <div className={s.snapNum}>3</div>
                <div className={s.snapCard}>
                  <div className={s.snapHead}>
                    <span className={s.snapSeq}>#3 최신</span>
                    <span className={s.snapT}>2026.08.09 · 15:31</span>
                  </div>
                  <div className={s.snapHash}>
                    <span className={s.snapHashIco}><Lock size={13} /></span>
                    <div>
                      <div className={s.snapHashL}>디지털 지문</div>
                      <div className={s.snapHashV}>a9f2c831···e4b17d92</div>
                    </div>
                  </div>
                  <div className={s.snapSecs}>
                    <span className={s.snapSec}>표제부</span>
                    <span className={s.snapSec}>전유부분</span>
                    <span className={s.snapSec} style={{ background: "#fee2e2", color: "#b91c1c" }}>갑구 <AlertTriangle size={12} /></span>
                    <span className={s.snapSec}>을구</span>
                  </div>
                </div>
              </div>

              <div className={s.snapDiff}>⬇ 변동 감지: [갑구] 압류 설정</div>

              {/* Snapshot #2 */}
              <div className={s.snapItem}>
                <div className={s.snapNum}>2</div>
                <div className={s.snapCard}>
                  <div className={s.snapHead}>
                    <span className={s.snapSeq}>#2</span>
                    <span className={s.snapT}>2026.07.15 · 16:02</span>
                  </div>
                  <div className={s.snapHash}>
                    <span className={s.snapHashIco}><Lock size={13} /></span>
                    <div>
                      <div className={s.snapHashL}>디지털 지문</div>
                      <div className={s.snapHashV}>3c8d1a47···b29f6e01</div>
                    </div>
                  </div>
                  <div className={s.snapSecs}>
                    <span className={s.snapSec}>표제부</span>
                    <span className={s.snapSec}>전유부분</span>
                    <span className={s.snapSec}>갑구</span>
                    <span className={s.snapSec} style={{ background: "#fef3c7", color: "#92400e" }}>을구 !</span>
                  </div>
                </div>
              </div>

              <div className={s.snapDiff}>⬇ 변동 감지: [을구] 근저당권 설정</div>

              {/* Snapshot #1 (최초) */}
              <div className={s.snapItem}>
                <div className={s.snapNum} style={{ background: "#1a1d2e" }}>1</div>
                <div className={s.snapCard}>
                  <div className={s.snapHead}>
                    <span className={s.snapSeq}>#1</span>
                    <span className={s.snapFirst}>최초 기록</span>
                    <span className={s.snapT}>2026.07.15 · 09:14</span>
                  </div>
                  <div className={s.snapHash}>
                    <span className={s.snapHashIco}><Lock size={13} /></span>
                    <div>
                      <div className={s.snapHashL}>디지털 지문</div>
                      <div className={s.snapHashV}>f14c9b2e···7a30d851</div>
                    </div>
                  </div>
                  <div className={s.snapSecs}>
                    <span className={s.snapSec}>표제부</span>
                    <span className={s.snapSec}>전유부분</span>
                    <span className={s.snapSec}>갑구</span>
                    <span className={s.snapSec}>을구</span>
                  </div>
                </div>
              </div>

            </div>
          </div>{/* /snapshot section */}

          {/* Integrity Verification */}
          <div className={s.detCard}>
            <div className={s.detEyebrow}>Integrity Verification</div>
            <div className={s.detTitle}>위변조 검사</div>
            <div className={s.detSub} style={{ marginBottom: "16px" }}>블록체인 암호화 기반으로 기록 변조 여부를 검증합니다</div>

            <div className={s.integWarn}>
              <span className={s.integWarnIco}><AlertTriangle size={18} /></span>
              <div>
                <div className={s.integWarnT}>원본 진위 미검증 물건</div>
                <div className={s.integWarnD}>이 물건은 공식 등기 연계 없이 PDF로 직접 등록되었습니다. Vestra 내부 기록의 변조만 검증하며, 최초 PDF 원본 진위는 인터넷등기소에서 직접 확인하세요.</div>
                <span className={s.integWarnLnk}>인터넷등기소에서 직접 발급·확인하기 →</span>
              </div>
            </div>

            <div className={s.integNote}>이 검사는 Vestra가 저장한 등기부 기록이 이후 변조되지 않았는지만 확인합니다. 등기부 원본 진위 자체는 인터넷등기소에서 직접 확인하세요.</div>

            <button className={s.integBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              검증 실행
            </button>

            {/* Result (shown after verification) */}
            <div className={s.integResult}>
              <div className={s.integResultRow}>
                <span className={s.integResultIco}><CheckCircle2 size={22} /></span>
                <span className={s.integResultL}>위변조 없음 확인</span>
              </div>
              <div className={s.integResultS}>전체 3건의 기록을 검사했습니다 · 모든 스냅샷이 무결합니다</div>
              <div className={s.integChecks}>
                <div className={s.integCheck}>
                  <div className={s.integCheckIco}><CheckCircle2 size={16} /></div>
                  <div className={s.integCheckT}>해시 체인 검증</div>
                  <div className={s.integCheckS}>블록체인 연결 무결성</div>
                </div>
                <div className={s.integCheck}>
                  <div className={s.integCheckIco}><CheckCircle2 size={16} /></div>
                  <div className={s.integCheckT}>전자 서명 확인</div>
                  <div className={s.integCheckS}>Ed25519 디지털 서명</div>
                </div>
                <div className={s.integCheck}>
                  <div className={s.integCheckIco}><CheckCircle2 size={16} /></div>
                  <div className={s.integCheckT}>내용 일치 확인</div>
                  <div className={s.integCheckS}>Merkle Tree 검증</div>
                </div>
              </div>
              <button
                className={s.integPubkeyBtn}
                onClick={() => setShowPubkey((v) => !v)}
              >
                {showPubkey ? "검증용 공개키 접기 ▴" : "검증용 공개키 보기 ▾"}
              </button>
              {showPubkey && (
                <div className={s.integPubkeyBox}>
                  MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2v9nKxQ5w1Y3r8mZ4cX7LpN0bKq
                  Rj6tVuFhAeGd8sM3wPcYnL2JTiKoB5xDvEqWzU1pM9sO4fCmHRbXNyI3A==
                </div>
              )}
            </div>

          </div>{/* /integrity section */}

        </div>{/* /pageWrap */}
      </div>{/* /view-detail */}

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerIn}>
          <div>
            <div className={s.flogo}><div className={s.flogoI}>V</div><span className={s.flogoT}>VESTRA</span></div>
            <p className={s.ftag}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
            <div className={s.fcontact}>BMI C&S | 대표이사 김동의<br />사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />고객센터 010-8490-9271</div>
          </div>
          <div><p className={s.fcolT}>Legal</p><ul className={s.flinks}><li><a href="#">개인정보처리방침</a></li><li><a href="#">이용약관</a></li></ul></div>
          <div><p className={s.fcolT}>Product</p><ul className={s.flinks}><li><a href="#">기능 소개</a></li><li><a href="#">요금제</a></li></ul></div>
          <div><p className={s.fcolT}>Company</p><ul className={s.flinks}><li><a href="#">회사 소개</a></li><li><a href="#">채용</a></li></ul></div>
          <div><p className={s.fcolT}>Connect</p><ul className={s.flinks}><li><a href="#">LinkedIn</a></li></ul></div>
        </div>
        <div className={s.fbot}><span>© 2026 BMI-C&S All rights reserved.</span><span>The Digital Curator of Real Estate</span></div>
      </footer>
    </>
  );
}

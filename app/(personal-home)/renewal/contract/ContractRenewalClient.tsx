"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import s from "./contract-renewal.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import { useContractAnalysis } from "@/app/(app)/contract/hooks/useContractAnalysis";
import ContractResultSections, { SEC_IDS } from "./components/ContractResultSections";

// Sample contract texts
const SAMPLES: Record<string, string> = {
  jeonse: `주택임대차 계약서\n\n임대인 홍길동(이하 "임대인")과 임차인 김철수(이하 "임차인")는 아래 표시 주택에 관하여 다음과 같이 임대차계약을 체결한다.\n\n[부동산의 표시]\n소재지: 서울특별시 강남구 역삼동 826-22 역삼파크빌 101동 1504호\n구조: 철근콘크리트조 / 면적: 84.21㎡\n\n제1조 (보증금) 보증금은 금 삼억원정(₩300,000,000)으로 한다.\n제2조 (임대 기간) 임대 기간은 2026년 9월 1일부터 2028년 8월 31일까지(24개월)로 한다.\n제3조 (현황 고지) 임대인은 임차 목적물의 현재 상태를 고지하며, 임차인은 이를 확인하고 임차함을 인정한다. 임차인은 현 상태를 충분히 인지한 것으로 본다.\n제4조 (보증금 지급) 임차인은 보증금을 계약 시 금 삼천만원, 잔금 금 이억칠천만원을 2026.09.01에 지급한다.\n제5조 (보증금 반환) 계약 종료 후 임차인이 목적물을 인도한 때로부터 상당한 기간 내에 임대인은 보증금을 반환한다.\n제6조 (수선) 임차인 귀책에 의한 손상은 임차인이 원상 복구한다.\n제7조 (금지사항) 임차인은 임대인의 동의 없이 전대, 양도, 개조를 할 수 없다.\n제8조 (해지) 임대인은 다음 각 호에 해당하는 경우 계약을 해지할 수 있으며, 이 경우 임차인은 즉시 목적물을 반환하여야 한다: ①임차인의 월 2회 이상 소음 유발, ②임대인의 사정으로 목적물 처분이 필요한 경우, ③기타 임대인이 상당하다고 인정하는 사유.`,
  maemae: `부동산 매매 계약서\n\n매도인 이영희(이하 "매도인")와 매수인 박민준(이하 "매수인")은 아래 부동산에 관하여 다음과 같이 매매계약을 체결한다.\n\n[부동산의 표시]\n소재지: 서울특별시 서초구 방배동 2523-1 방배더샵 302호\n면적: 59.97㎡ (전용) / 등기부상 면적 동일\n\n제1조 (매매대금) 금 칠억원정(₩700,000,000)으로 한다.\n제2조 (지급 방법) 계약금 7천만원(계약 시), 중도금 2억원(2026.09.15), 잔금 4억 3천만원(2026.10.31)\n제3조 (소유권 이전) 매도인은 잔금 수령과 동시에 소유권이전등기에 필요한 서류를 매수인에게 교부한다.\n제4조 (하자 담보) 매도인은 목적물의 숨은 하자에 대해 담보 책임을 진다.\n제5조 (위약금) 매도인 귀책 해제 시 계약금의 2배 반환, 매수인 귀책 해제 시 계약금 몰수.`,
  "jeonse-dam": `주택임대차 계약서 (근저당 설정 물건)\n\n임대인 최부자와 임차인 가난이는 아래 주택에 관하여 임대차계약을 체결한다.\n\n[부동산의 표시]\n서울 강남구 역삼동 826-22 역삼파크빌 101동 1504호 (84.21㎡)\n\n【등기부 현황: 근저당 채권최고액 240,000,000원 (채권자: KB국민은행) — 계약서 내 미고지】\n\n제1조 보증금: 삼억원(₩300,000,000)\n제2조 기간: 2026.09.01 ~ 2028.08.31\n제3조 임차인은 현 상태를 충분히 인지한 것으로 본다.\n제4조 보증금은 계약 종료 후 상당한 기간 내 반환한다.\n제5조 임대인은 다음 각 호의 사유로 계약을 해지할 수 있다: ①임차인의 2회 이상 소음, ②임대인 사정으로 처분 필요, ③임대인이 상당하다고 인정하는 사유.`,
};

export default function ContractRenewalClient() {
  const {
    contractText, setContractText,
    fileName, isLoading, result,
    error, setError,
    isDragging,
    fileInputRef,
    handleDrop, handleDragOver, handleDragLeave,
    handleFileChange, handleAnalyze,
  } = useContractAnalysis();

  const [inputTab, setInputTab] = useState<"text" | "file">("text");
  const [sampleKey, setSampleKey] = useState("");

  // Clause / term accordion states
  const [openClauses, setOpenClauses] = useState<Record<number, boolean>>({});
  const [openTerms, setOpenTerms] = useState<Record<number, boolean>>({});

  // Sidebar active section
  const [activeSec, setActiveSec] = useState(0);

  // 훅 상태 기반 파생 뷰
  const activeView: "input" | "analyzing" | "result" = isLoading ? "analyzing" : result ? "result" : "input";

  // 결과 상단 스크롤
  useEffect(() => {
    if (activeView === "result") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeView]);

  function loadSample() {
    if (!sampleKey) {
      setError("샘플을 선택해 주세요.");
      return;
    }
    setContractText(SAMPLES[sampleKey] ?? "");
    setError(null);
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

  const resultAddress = result?.extractedInfo?.propertyAddress || fileName || "직접 입력 계약서";

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
  }, [activeView, result]);

  return (
    <>
      {/* NAV */}
      <RenewalGnb active="contract" />

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
            <span className={s.inputNoticeIco}><AlertTriangle size={18} /></span>
            <div>
              <div className={s.inputNoticeT}>부동산 관련 계약서만 분석이 가능합니다</div>
              <div className={s.inputNoticeS}>임대차계약서(전세·월세), 매매계약서, 분양계약서 등 부동산 거래와 직접 관련된 계약서를 입력해 주세요. 다른 종류의 계약서는 분석 결과가 부정확할 수 있습니다.</div>
            </div>
          </div>

          {error && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                margin: "0 0 16px", padding: "12px 16px", borderRadius: "12px",
                background: "#fee2e2", border: "1px solid #fca5a5",
                color: "#b91c1c", fontSize: "13.5px", fontWeight: 600,
              }}
            >
              <AlertTriangle size={16} /> {error}
            </div>
          )}

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
                      <span className={s.inputCharCnt}>{contractText.length.toLocaleString()} / 20,000자</span>
                    </div>
                    <textarea
                      className={s.inputTextarea}
                      value={contractText}
                      onChange={(e) => setContractText(e.target.value)}
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
                  <div
                    className={s.fileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    style={isDragging ? { borderColor: "#2e4bd8" } : undefined}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.txt"
                      style={{ display: "none" }}
                    />
                    <div className={s.fileDropIco}><FileText size={36} /></div>
                    <div className={s.fileDropT}>
                      {fileName ? `${fileName} — 업로드 완료` : "계약서 파일을 여기에 끌어다 놓거나 클릭하세요"}
                    </div>
                    <div className={s.fileDropS}>지원 형식: PDF, TXT · 최대 20MB</div>
                  </div>
                </div>
              </div>
            )}

            <div className={s.inputFooter}>
              <div className={s.inputHint}>
                분석 결과는 참고용이며 법적 효력이 없습니다.<br />중요한 계약 전 반드시 법률 전문가의 검토를 받으세요.
              </div>
              <button className={s.analyzeBtn} onClick={handleAnalyze} disabled={isLoading}>
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
                    <div className={s.stepS}>총 {contractText.length.toLocaleString()}자 인식</div>
                  </div>
                </div>
                <div className={`${s.step} ${s.stepDone}`}>
                  <div className={s.stepIco}>✓</div>
                  <div>
                    <div className={s.stepT}>핵심 조항 식별 완료</div>
                    <div className={s.stepS}>조항 파싱 완료</div>
                  </div>
                </div>
                <div className={`${s.step} ${s.stepActive}`}>
                  <div className={s.stepIco}>⋯</div>
                  <div>
                    <div className={s.stepT}>위험 조항 분석 중</div>
                    <div className={s.stepS}>AI 법률 모델 처리 중</div>
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

        {result && (
          <ContractResultSections
            s={s}
            result={result}
            address={resultAddress}
            openClauses={openClauses}
            toggleClause={toggleClause}
            openTerms={openTerms}
            toggleTerm={toggleTerm}
            activeSec={activeSec}
            scrollToSec={scrollToSec}
            onReanalyze={handleAnalyze}
          />
        )}
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerIn}>
          <div>
            <div className={s.flogo}>
              <Image src="/vestra-symbol.png" alt="VESTRA" width={24} height={24} className={s.flogoI} />
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

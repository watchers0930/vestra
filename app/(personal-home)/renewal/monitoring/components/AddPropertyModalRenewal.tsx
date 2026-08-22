"use client";

import { useState, useRef } from "react";
import { MapPin, Upload } from "lucide-react";
import s from "../monitoring-renewal.module.css";

interface SearchResult {
  uniqueNo: string;
  address: string;
  realEstateType: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialAddress?: string;
}

/** 순수 토지(토지·임야) 외에는 동·호수 입력 허용 */
function isCollectiveBuilding(type: string): boolean {
  const t = type.toLowerCase();
  return !t.includes("토지") && !t.includes("임야");
}

/**
 * 등기감시 물건 추가 모달 (renewal).
 * 시안 디자인 + 실 API 연동: /api/monitoring/parse-pdf, POST /api/monitoring
 */
export default function AddPropertyModalRenewal({ onClose, onSuccess, initialAddress = "" }: Props) {
  const [tab, setTab] = useState<"addr" | "pdf">("addr");

  // 주소 검색 (매물 상세 등에서 진입 시 주소 프리필)
  const [query, setQuery] = useState(initialAddress);
  const [searchError, setSearchError] = useState("");

  // 선택된 물건 (프리필 주소가 있으면 검색 완료 상태로 시작)
  const [selected, setSelected] = useState<SearchResult | null>(
    initialAddress ? { uniqueNo: "", address: initialAddress, realEstateType: "부동산" } : null
  );

  // 동/호수
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");

  // 계약 정보
  const [ownerName, setOwnerName] = useState("");
  const [deposit, setDeposit] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [moveInDate, setMoveInDate] = useState("");

  // PDF
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfRawText, setPdfRawText] = useState("");

  // 등록
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function handleTabChange(t: "addr" | "pdf") {
    setTab(t);
    setSelected(null);
    setDong("");
    setHo("");
    setOwnerName("");
    setSubmitError("");
    setPdfError("");
    setSearchError("");
  }

  function handleSearch() {
    if (query.trim().length < 2) {
      setSearchError("주소를 2자 이상 입력해주세요.");
      return;
    }
    setSearchError("");
    setSelected({ uniqueNo: "", address: query.trim(), realEstateType: "부동산" });
  }

  async function handlePdfParse() {
    if (!pdfFile) return;
    setPdfParsing(true);
    setPdfError("");
    setSelected(null);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      const res = await fetch("/api/monitoring/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setPdfError(data.error || "PDF 파싱에 실패했습니다.");
        return;
      }
      if (!data.address) {
        setPdfError("주소를 인식하지 못했습니다. 등기부등본 PDF인지 확인해주세요.");
        return;
      }
      setSelected({ uniqueNo: "", address: data.address, realEstateType: data.realEstateType || "건물" });
      if (data.ownerName) setOwnerName(data.ownerName);
      if (data.rawText) setPdfRawText(data.rawText);
    } catch {
      setPdfError("네트워크 오류가 발생했습니다.");
    } finally {
      setPdfParsing(false);
    }
  }

  async function handleSubmit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const fullAddress = [
        selected.address,
        dong.trim() ? `${dong.trim()}동` : "",
        ho.trim() ? `${ho.trim()}호` : "",
      ].filter(Boolean).join(" ");

      const body: Record<string, unknown> = { address: fullAddress };
      if (selected.uniqueNo) body.commUniqueNo = selected.uniqueNo;
      if (pdfRawText) body.pdfRawText = pdfRawText;
      if (deposit) body.deposit = Number(deposit);
      if (contractDate) body.contractDate = contractDate;
      if (moveInDate) body.moveInDate = moveInDate;
      if (ownerName.trim()) body.ownerName = ownerName.trim();

      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "등록에 실패했습니다.");
        return;
      }
      onSuccess();
    } catch {
      setSubmitError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const previewAddress = selected
    ? [selected.address, dong.trim() ? `${dong.trim()}동` : "", ho.trim() ? `${ho.trim()}호` : ""].filter(Boolean).join(" ")
    : "";

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <div className={s.modalTitle}>감시 물건 추가</div>
          <button className={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={s.modalTabs}>
          <button className={`${s.modalTab} ${tab === "addr" ? s.on : ""}`} onClick={() => handleTabChange("addr")}>
            주소 검색
          </button>
          <button className={`${s.modalTab} ${tab === "pdf" ? s.on : ""}`} onClick={() => handleTabChange("pdf")}>
            등기부 PDF
          </button>
        </div>

        {/* TAB: 주소 검색 */}
        {tab === "addr" && (
          <div className={s.modalBody}>
            <div>
              <div className={s.mLabel}>주소 검색</div>
              <div className={s.mRow}>
                <input
                  className={s.mInput}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="도로명 또는 지번 주소 입력"
                />
                <button className={s.mBtnDark} onClick={handleSearch}>검색</button>
              </div>
              {searchError && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "6px" }}>{searchError}</p>}
            </div>

            {selected && (
              <>
                <div>
                  <div className={s.mSecTitle}>동 · 호수 입력</div>
                  <div className={s.mSecSub} style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>
                    아파트·오피스텔은 동·호수까지 입력해야 정확한 감시가 가능합니다
                  </div>
                  {isCollectiveBuilding(selected.realEstateType) && (
                    <div className={s.m2col}>
                      <div>
                        <div className={s.mLabel}>동</div>
                        <input className={s.mInput} type="text" value={dong} onChange={(e) => setDong(e.target.value)} placeholder="예: 101" />
                      </div>
                      <div>
                        <div className={s.mLabel}>호수</div>
                        <input className={s.mInput} type="text" value={ho} onChange={(e) => setHo(e.target.value)} placeholder="예: 1004" />
                      </div>
                    </div>
                  )}
                </div>

                <div className={s.mAddrPreview}>
                  <MapPin size={13} /> {previewAddress}
                </div>

                <hr className={s.mDivider} />

                <div>
                  <div className={s.mSecTitle}>
                    계약 정보 <span style={{ fontSize: "12px", fontWeight: 400, color: "#aaa", marginLeft: "6px" }}>선택 입력</span>
                  </div>
                  <div className={s.mSecSub} style={{ fontSize: "12px", color: "#aaa", marginBottom: "12px" }}>
                    계약일 입력 시 계약갭 강화감시 모드로 자동 전환됩니다
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <div className={s.mLabel}>소유자명</div>
                      <input className={s.mInput} type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="등기부상 소유자명" />
                    </div>
                    <div>
                      <div className={s.mLabel}>보증금 (만원)</div>
                      <input className={s.mInput} type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="예: 30000" />
                    </div>
                    <div className={s.m2col}>
                      <div>
                        <div className={s.mLabel}>계약일</div>
                        <input className={s.mInput} type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
                      </div>
                      <div>
                        <div className={s.mLabel}>전입 예정일</div>
                        <input className={s.mInput} type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={s.mHint}>
                  계약일을 입력하면 계약~전입 기간 동안 <strong>계약갭 강화감시</strong> 모드가 자동 활성화됩니다.
                </div>
              </>
            )}

            {submitError && <p style={{ color: "#ef4444", fontSize: "12px" }}>{submitError}</p>}

            <button className={s.mSubmit} onClick={handleSubmit} disabled={!selected || submitting}>
              {submitting ? "등록 중..." : "등록하기"}
            </button>
          </div>
        )}

        {/* TAB: PDF */}
        {tab === "pdf" && (
          <div className={s.modalBody}>
            <div className={s.mHint} style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: "12px 14px" }}>
              <strong>발급 후 바로 업로드하세요</strong><br />
              반드시 인터넷등기소(iros.go.kr)에서 직접 발급한 등기부등본 PDF를 업로드하세요.
            </div>

            <div className={s.mDropZone} onClick={() => fileInputRef.current?.click()}>
              <div className={s.mDropIco}><Upload size={28} /></div>
              <div className={s.mDropT}>{pdfFile ? pdfFile.name : "PDF 파일을 여기에 드래그하거나 클릭하여 선택"}</div>
              <div className={s.mDropS}>PDF · 최대 10MB</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  setPdfFile(e.target.files?.[0] || null);
                  setSelected(null);
                  setPdfError("");
                }}
              />
            </div>

            {pdfError && <p style={{ color: "#ef4444", fontSize: "12px" }}>{pdfError}</p>}

            {pdfFile && !selected && (
              <button className={s.mParseBtn} onClick={handlePdfParse} disabled={pdfParsing}>
                {pdfParsing ? "분석 중..." : "등기부 분석"}
              </button>
            )}

            {selected && (
              <>
                <div className={s.mAddrPreview}>
                  <MapPin size={13} /> {selected.address}
                </div>
                {submitError && <p style={{ color: "#ef4444", fontSize: "12px" }}>{submitError}</p>}
                <button className={s.mSubmit} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "등록 중..." : "등록하기"}
                </button>
              </>
            )}

            <hr className={s.mDivider} />
            <div style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "8px 0" }}>
              PDF 분석 후 주소와 소유자 정보가 자동으로 입력됩니다
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

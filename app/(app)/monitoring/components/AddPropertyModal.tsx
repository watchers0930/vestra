"use client";

import { useState, useRef } from "react";
import { Search, MapPin, Building2, X, AlertTriangle, FileText, Upload } from "lucide-react";
import { Button } from "@/components/common/Button";
import { FormInput } from "@/components/forms/FormInput";

interface SearchResult {
  uniqueNo: string;
  address: string;
  realEstateType: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

function isCollectiveBuilding(type: string): boolean {
  const t = type.toLowerCase();
  // 순수 토지류(토지·임야)는 호수 없음, 나머지 건물 유형은 모두 동·호수 입력 허용
  return !t.includes("토지") && !t.includes("임야");
}

export function AddPropertyModal({ onClose, onSuccess }: Props) {
  // 탭
  const [tab, setTab] = useState<"search" | "pdf">("search");

  // 주소 검색
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // PDF 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfRawText, setPdfRawText] = useState("");

  // 선택된 물건
  const [selected, setSelected] = useState<SearchResult | null>(null);

  // 동/호수 (집합건물 전용)
  const [dong, setDong] = useState("");
  const [ho, setHo] = useState("");

  // 계약 정보
  const [deposit, setDeposit] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [ownerName, setOwnerName] = useState("");

  // 등록
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // CODEF 서비스 상태
  const [codefUnavailable, setCodefUnavailable] = useState(false);

  function handleTabChange(t: "search" | "pdf") {
    setTab(t);
    setSelected(null);
    setDong("");
    setHo("");
    setOwnerName("");
    setSubmitError("");
    setPdfError("");
    setSearchError("");
  }

  async function handleSearch() {
    if (query.trim().length < 2) {
      setSearchError("주소를 2자 이상 입력해주세요.");
      return;
    }

    setSearching(true);
    setSearchError("");
    setResults([]);
    setSelected(null);

    try {
      const res = await fetch(`/api/codef/search?address=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503 || res.status === 500) {
          setCodefUnavailable(true);
        }
        setSearchError(data.error || "검색에 실패했습니다.");
        return;
      }

      if (data.results?.length === 0) {
        setSearchError("검색 결과가 없습니다. 주소를 다시 확인해주세요.");
        return;
      }

      setResults(data.results || []);
    } catch {
      setSearchError("네트워크 오류가 발생했습니다.");
    } finally {
      setSearching(false);
    }
  }

  async function handlePdfParse() {
    if (!pdfFile) return;

    setPdfParsing(true);
    setPdfError("");
    setSelected(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await fetch("/api/monitoring/parse-pdf", {
        method: "POST",
        body: formData,
      });
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
    if (!selected) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const fullAddress = [
        selected.address,
        dong.trim() ? `${dong.trim()}동` : "",
        ho.trim() ? `${ho.trim()}호` : "",
      ].filter(Boolean).join(" ");

      const body: Record<string, unknown> = {
        address: fullAddress,
      };
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-[#1d1d1f]">감시 물건 추가</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <X size={18} className="text-[#86868b]" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">

          {/* 탭 */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
            <button
              onClick={() => handleTabChange("search")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors"
              style={{ background: tab === "search" ? "#1d1d1f" : "#fff", color: tab === "search" ? "#fff" : "#6e6e73" }}
            >
              <Search size={13} />
              주소 검색
            </button>
            <button
              onClick={() => handleTabChange("pdf")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors border-l border-gray-200"
              style={{ background: tab === "pdf" ? "#1d1d1f" : "#fff", color: tab === "pdf" ? "#fff" : "#6e6e73" }}
            >
              <FileText size={13} />
              등기부 PDF
            </button>
          </div>

          {/* 주소 검색 탭 */}
          {tab === "search" && (
            <>
              {/* CODEF 불가 안내 */}
              {codefUnavailable && (
                <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">등기부 검색 서비스 점검 중</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      공식 연계 조회 서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">주소 검색</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="예: 서울 강남구 역삼동 123"
                    className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Search}
                    loading={searching}
                    onClick={handleSearch}
                  >
                    검색
                  </Button>
                </div>
                {searchError && (
                  <p className="mt-1.5 text-xs text-red-500">{searchError}</p>
                )}
              </div>

              {results.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    검색 결과 ({results.length}건)
                  </label>
                  <div className="border border-border rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {results.map((r) => (
                      <button
                        key={r.uniqueNo}
                        onClick={() => { setSelected(r); setDong(""); setHo(""); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#f5f5f7] transition-colors flex items-start gap-2.5"
                        style={{
                          background: selected?.uniqueNo === r.uniqueNo ? "rgba(0,113,227,0.06)" : undefined,
                        }}
                      >
                        <MapPin size={14} className="text-[#86868b] mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-[#1d1d1f] truncate">{r.address}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Building2 size={11} className="text-[#86868b]" />
                            <span className="text-[11px] text-[#86868b]">{r.realEstateType}</span>
                          </div>
                        </div>
                        {selected?.uniqueNo === r.uniqueNo && (
                          <span className="ml-auto text-[11px] text-primary font-medium shrink-0">선택됨</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* PDF 업로드 탭 */}
          {tab === "pdf" && (
            <div className="space-y-3">
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 space-y-1">
                <p className="text-[12.5px] font-semibold text-blue-800">발급 후 바로 업로드하세요</p>
                <p className="text-[11.5px] text-blue-700">
                  반드시 <a href="https://www.iros.go.kr" target="_blank" rel="noopener noreferrer" className="underline font-medium">인터넷등기소(iros.go.kr)</a>에서 직접 발급한 등기부등본 PDF를 업로드하세요. 타인에게 받은 파일은 원본 진위를 보장할 수 없습니다.
                </p>
              </div>

              <div
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 cursor-pointer hover:border-primary/40 hover:bg-[#f5f5f7] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={22} className="text-[#86868b]" />
                <p className="text-sm text-[#1d1d1f] font-medium">
                  {pdfFile ? pdfFile.name : "PDF 파일 선택"}
                </p>
                <p className="text-xs text-[#86868b]">최대 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setPdfFile(f);
                    setSelected(null);
                    setPdfError("");
                  }}
                />
              </div>

              {pdfFile && !selected && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={pdfParsing}
                  onClick={handlePdfParse}
                  className="w-full"
                >
                  등기부 분석
                </Button>
              )}

              {pdfError && <p className="text-xs text-red-500">{pdfError}</p>}

              {selected && tab === "pdf" && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                  <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f]">{selected.address}</p>
                    <p className="text-[11px] text-[#86868b] mt-0.5">{selected.realEstateType}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 동/호수 입력 (집합건물 선택 시) */}
          {selected && isCollectiveBuilding(selected.realEstateType) && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-[#1d1d1f]">동·호수 입력</p>
              <p className="text-xs text-[#86868b]">아파트·오피스텔 등 집합건물은 등기부가 호수별로 발급됩니다. 동·호수를 입력해야 정확한 감시가 가능합니다.</p>
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="동"
                  placeholder="예: 101"
                  value={dong}
                  onChange={(e) => setDong(e.target.value)}
                />
                <FormInput
                  label="호수"
                  placeholder="예: 1004"
                  value={ho}
                  onChange={(e) => setHo(e.target.value)}
                />
              </div>
              {(dong || ho) && (
                <p className="text-xs text-[#0071e3] font-medium">
                  등록 주소: {[selected.address, dong.trim() ? `${dong.trim()}동` : "", ho.trim() ? `${ho.trim()}호` : ""].filter(Boolean).join(" ")}
                </p>
              )}
            </div>
          )}

          {/* 계약 정보 (선택 후 표시) */}
          {selected && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-xs text-[#86868b]">계약 정보 (선택 입력)</p>
              <FormInput
                label="소유자명"
                placeholder="등기부상 소유자명"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
              <FormInput
                label="보증금 (만원)"
                type="number"
                placeholder="예: 30000"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="계약일"
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                />
                <FormInput
                  label="전입예정일"
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {submitError && (
            <p className="text-xs text-red-500">{submitError}</p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!selected}
            loading={submitting}
            onClick={handleSubmit}
          >
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}

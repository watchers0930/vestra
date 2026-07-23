"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Loader2, ChevronLeft } from "lucide-react";
import { useListingForm } from "../hooks/useListingForm";
import { SafetySection } from "./SafetySection";

function formatCommas(val: string) {
  const d = val.replace(/\D/g, "");
  if (!d) return "";
  return parseInt(d, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function toKorean(val: string) {
  const n = parseInt(val.replace(/,/g, ""), 10);
  if (!n || isNaN(n)) return "";
  const 억 = Math.floor(n / 100_000_000);
  const 만 = Math.floor((n % 100_000_000) / 10_000);
  let r = "";
  if (억 > 0) r += `${억}억 `;
  if (만 > 0) r += `${만.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}만`;
  return r.trim() + "원";
}

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #d2d2d7", borderRadius: 10,
  padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box",
  background: "#fff", color: "#1d1d1f",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#3d3d3f", marginBottom: 6,
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: "#0071e3", marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  );
}

export function ListingFormContent() {
  const router = useRouter();
  const {
    form, set,
    photos, uploading, uploadPhoto, removePhoto,
    analysisId, setAnalysisId,
    safetyDocs, setSafetyDocs,
    submitting, error, submit,
  } = useListingForm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [zonecode, setZonecode] = useState("");

  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) return;
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    document.head.appendChild(script);
  }, []);

  function openPostcode() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).daum.Postcode({
      oncomplete: (data: { roadAddress: string; jibunAddress: string; zonecode: string }) => {
        set("address", data.roadAddress || data.jibunAddress);
        set("detailAddress", "");
        setZonecode(data.zonecode);
      },
    }).open();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) await uploadPhoto(f);
    e.target.value = "";
  }

  const typeOptions = [
    { value: "JEONSE", label: "전세" },
    { value: "SALE",   label: "매매" },
  ] as const;

  const durationOptions = [6, 12, 18, 24, 36];
  const roomTypes = ["아파트", "빌라/다세대", "오피스텔", "단독주택"];

  return (
    <div style={{ width: "100%", paddingBottom: 48 }}>
      {/* 상단 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#6e6e73", display: "flex" }}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "#1d1d1f" }}>매물 등록</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* 거래 유형 */}
        <Field label="거래 유형" required>
          <div style={{ display: "flex", gap: 8 }}>
            {typeOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("listingType", value)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer",
                  border: form.listingType === value ? "2px solid #0071e3" : "1px solid #d2d2d7",
                  background: form.listingType === value ? "rgba(0,113,227,0.06)" : "#fff",
                  color: form.listingType === value ? "#0071e3" : "#3d3d3f",
                  fontSize: 14, fontWeight: 600, transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        {/* 주소 */}
        <Field label="주소" required>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              style={{ ...inputStyle, width: 110, flexShrink: 0, background: "#f5f5f7", color: "#6e6e73" }}
              placeholder="우편번호"
              value={zonecode}
              readOnly
            />
            <button
              type="button"
              onClick={openPostcode}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10, background: "#0071e3",
                color: "#fff", fontSize: 13, fontWeight: 600, border: "none",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              주소 검색
            </button>
          </div>
          <input
            style={{ ...inputStyle, background: "#f5f5f7", color: "#1d1d1f", marginBottom: 8 }}
            placeholder="기본주소 (주소 검색 후 자동 입력)"
            value={form.address}
            readOnly
          />
          <input
            style={inputStyle}
            placeholder="상세주소 (동·호수 등)"
            value={form.detailAddress}
            onChange={(e) => set("detailAddress", e.target.value)}
          />
        </Field>

        {/* 유형 + 평수 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="건물 유형">
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={form.roomType}
              onChange={(e) => set("roomType", e.target.value)}
            >
              <option value="">선택</option>
              {roomTypes.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="전용면적 (㎡)">
            <input
              style={inputStyle}
              type="number"
              min={0}
              step={0.1}
              placeholder="예) 84.5"
              value={form.size}
              onChange={(e) => set("size", e.target.value)}
            />
          </Field>
        </div>

        {/* 층 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="해당 층">
            <input
              style={inputStyle}
              type="number"
              min={-10}
              placeholder="예) 5"
              value={form.floor}
              onChange={(e) => set("floor", e.target.value)}
            />
          </Field>
          <Field label="건물 총 층수">
            <input
              style={inputStyle}
              type="number"
              min={1}
              placeholder="예) 15"
              value={form.totalFloor}
              onChange={(e) => set("totalFloor", e.target.value)}
            />
          </Field>
        </div>

        {/* 보증금/매매가 */}
        <Field label={form.listingType === "SALE" ? "매매가 (원)" : "보증금 (원)"} required>
          <input
            style={inputStyle}
            placeholder="예) 300,000,000"
            value={form.deposit}
            onChange={(e) => set("deposit", formatCommas(e.target.value))}
          />
          {form.deposit && (
            <p style={{ fontSize: 11, color: "#0071e3", marginTop: 4 }}>{toKorean(form.deposit)}</p>
          )}
        </Field>

        {/* 관리비 */}
        <Field label="관리비 (원/월)">
          <input
            style={inputStyle}
            placeholder="예) 150,000"
            value={form.managementFee}
            onChange={(e) => set("managementFee", formatCommas(e.target.value))}
          />
        </Field>

        {/* 전세 기간 */}
        {form.listingType === "JEONSE" && (
          <Field label="계약 기간">
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
            >
              {durationOptions.map((m) => (
                <option key={m} value={m}>{m}개월</option>
              ))}
            </select>
          </Field>
        )}

        {/* 입주 가능일 */}
        <Field label="입주 가능일">
          <input
            style={inputStyle}
            type="date"
            value={form.availableFrom}
            onChange={(e) => set("availableFrom", e.target.value)}
          />
        </Field>

        {/* 설명 */}
        <Field label="상세 설명">
          <textarea
            style={{ ...inputStyle, height: 100, resize: "vertical" }}
            placeholder="매물에 대한 추가 설명을 입력하세요"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={2000}
          />
          <p style={{ fontSize: 11, color: "#aeaeb2", marginTop: 4, textAlign: "right" }}>
            {form.description.length}/2000
          </p>
        </Field>

        {/* 사진 */}
        <Field label={`사진 (${photos.length}/10)`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {photos.map((url, idx) => (
              <div key={idx} style={{ position: "relative", width: 80, height: 80 }}>
                <img
                  src={url}
                  alt={`사진 ${idx + 1}`}
                  style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e5ea" }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    background: "#1d1d1f", border: "none", borderRadius: "50%",
                    width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#fff",
                  }}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            ))}
            {photos.length < 10 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  width: 80, height: 80, borderRadius: 10, cursor: "pointer",
                  border: "1.5px dashed #d2d2d7", background: "#f5f5f7",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 4, color: "#aeaeb2", fontSize: 11,
                }}
              >
                {uploading
                  ? <Loader2 size={18} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
                  : <><ImagePlus size={18} strokeWidth={1.5} />사진 추가</>
                }
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: "none" }}
            onChange={onFile}
          />
          <p style={{ fontSize: 11, color: "#aeaeb2", marginTop: 6 }}>
            JPG, PNG, WEBP • 파일당 최대 5MB
          </p>
        </Field>

        {/* 안전 증명 */}
        <SafetySection
          analysisId={analysisId}
          onAnalysisIdChange={setAnalysisId}
          safetyDocs={safetyDocs}
          onDocsChange={setSafetyDocs}
        />

        {/* 에러 */}
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,59,48,0.06)", fontSize: 13, color: "#c0392b" }}>
            {error}
          </div>
        )}

        {/* 제출 */}
        <button
          type="button"
          onClick={submit}
          disabled={submitting || uploading}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 14,
            background: submitting ? "#aeaeb2" : "#0071e3",
            color: "#fff", fontSize: 15, fontWeight: 700, border: "none",
            cursor: submitting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 0.15s",
          }}
        >
          {submitting && <Loader2 size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />}
          {submitting ? "등록 중..." : "매물 등록하기"}
        </button>
      </div>
    </div>
  );
}

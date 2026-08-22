"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Loader2, ChevronLeft } from "lucide-react";
import { useListingForm } from "@/app/(app)/listings/new/hooks/useListingForm";
import { RenewalSafetySection } from "./RenewalSafetySection";
import s from "../listing-new.module.css";

function formatCommas(val: string) {
  const d = val.replace(/\D/g, "");
  if (!d) return "";
  return parseInt(d, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function toKorean(val: string) {
  const n = parseInt(val.replace(/,/g, ""), 10);
  if (!n || isNaN(n)) return "";
  const eok = Math.floor(n / 100_000_000);
  const man = Math.floor((n % 100_000_000) / 10_000);
  let r = "";
  if (eok > 0) r += `${eok}억 `;
  if (man > 0) r += `${man.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}만`;
  return r.trim() + "원";
}

const ROOM_TYPES = ["아파트", "빌라/다세대", "오피스텔", "단독주택"];
const DURATIONS = [6, 12, 18, 24, 36];

export function ListingNewForm() {
  const router = useRouter();
  const {
    form, set,
    photos, uploading, uploadPhoto, removePhoto,
    analysisId, setAnalysisId,
    safetyDocs, setSafetyDocs,
    submitting, error, submit,
  } = useListingForm({ successPath: (id) => `/renewal/listing-db-detail?id=${id}` });
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
    const daum = (window as any).daum;
    if (!daum?.Postcode) return;
    new daum.Postcode({
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

  const isSale = form.listingType === "SALE";

  return (
    <div className={s.pageWrap}>
      <div className={s.backRow}>
        <button onClick={() => router.back()} className={s.backBtn}>
          <ChevronLeft size={16} strokeWidth={2} /> 뒤로
        </button>
      </div>

      <div className={s.form}>
        {/* 거래 유형 */}
        <div className={s.field}>
          <label className={s.label}>거래 유형<span className={s.req}>*</span></label>
          <div className={s.typeRow}>
            {([["JEONSE", "전세"], ["SALE", "매매"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => set("listingType", value)}
                className={`${s.typeBtn} ${form.listingType === value ? s.on : ""}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 주소 */}
        <div className={s.field}>
          <label className={s.label}>주소<span className={s.req}>*</span></label>
          <div className={s.addrRow}>
            <input className={`${s.input} ${s.zonecode} ${s.readonly}`} placeholder="우편번호" value={zonecode} readOnly />
            <button type="button" onClick={openPostcode} className={s.searchBtn}>주소 검색</button>
          </div>
          <div className={s.addrStack}>
            <input className={`${s.input} ${s.readonly}`} placeholder="기본주소 (주소 검색 후 자동 입력)" value={form.address} readOnly />
            <input className={s.input} placeholder="상세주소 (동·호수 등)" value={form.detailAddress}
              onChange={(e) => set("detailAddress", e.target.value)} />
          </div>
        </div>

        {/* 유형 + 평수 */}
        <div className={s.grid2}>
          <div className={s.field}>
            <label className={s.label}>건물 유형</label>
            <select className={s.select} value={form.roomType} onChange={(e) => set("roomType", e.target.value)}>
              <option value="">선택</option>
              {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className={s.field}>
            <label className={s.label}>전용면적 (㎡)</label>
            <input className={s.input} type="number" min={0} step={0.1} placeholder="예) 84.5"
              value={form.size} onChange={(e) => set("size", e.target.value)} />
          </div>
        </div>

        {/* 층 */}
        <div className={s.grid2}>
          <div className={s.field}>
            <label className={s.label}>해당 층</label>
            <input className={s.input} type="number" min={-10} placeholder="예) 5"
              value={form.floor} onChange={(e) => set("floor", e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.label}>건물 총 층수</label>
            <input className={s.input} type="number" min={1} placeholder="예) 15"
              value={form.totalFloor} onChange={(e) => set("totalFloor", e.target.value)} />
          </div>
        </div>

        {/* 보증금/매매가 */}
        <div className={s.field}>
          <label className={s.label}>{isSale ? "매매가 (원)" : "보증금 (원)"}<span className={s.req}>*</span></label>
          <input className={s.input} placeholder="예) 300,000,000" value={form.deposit}
            onChange={(e) => set("deposit", formatCommas(e.target.value))} />
          {form.deposit && <p className={s.korean}>{toKorean(form.deposit)}</p>}
        </div>

        {/* 관리비 */}
        <div className={s.field}>
          <label className={s.label}>관리비 (원/월)</label>
          <input className={s.input} placeholder="예) 150,000" value={form.managementFee}
            onChange={(e) => set("managementFee", formatCommas(e.target.value))} />
        </div>

        {/* 전세 기간 */}
        {!isSale && (
          <div className={s.field}>
            <label className={s.label}>계약 기간</label>
            <select className={s.select} value={form.duration} onChange={(e) => set("duration", e.target.value)}>
              {DURATIONS.map((m) => <option key={m} value={m}>{m}개월</option>)}
            </select>
          </div>
        )}

        {/* 입주 가능일 */}
        <div className={s.field}>
          <label className={s.label}>입주 가능일</label>
          <input className={s.input} type="date" value={form.availableFrom}
            onChange={(e) => set("availableFrom", e.target.value)} />
        </div>

        {/* 상세 설명 */}
        <div className={s.field}>
          <label className={s.label}>상세 설명</label>
          <textarea className={s.textarea} placeholder="매물에 대한 추가 설명을 입력하세요" maxLength={2000}
            value={form.description} onChange={(e) => set("description", e.target.value)} />
          <p className={`${s.hint} ${s.hintR}`}>{form.description.length}/2000</p>
        </div>

        {/* 사진 */}
        <div className={s.field}>
          <label className={s.label}>사진 ({photos.length}/10)</label>
          <div className={s.photoGrid}>
            {photos.map((url, idx) => (
              <div key={idx} className={s.photoItem}>
                <img src={url} alt={`사진 ${idx + 1}`} className={s.photoImg} />
                <button type="button" onClick={() => removePhoto(idx)} className={s.photoDel}>
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            ))}
            {photos.length < 10 && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={s.photoAdd}>
                {uploading
                  ? <Loader2 size={18} strokeWidth={1.5} className={s.spin} />
                  : <><ImagePlus size={18} strokeWidth={1.5} />사진 추가</>}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
            style={{ display: "none" }} onChange={onFile} />
          <p className={s.hint}>JPG, PNG, WEBP • 파일당 최대 5MB</p>
        </div>

        {/* 안전 증명 */}
        <RenewalSafetySection
          analysisId={analysisId}
          onAnalysisIdChange={setAnalysisId}
          safetyDocs={safetyDocs}
          onDocsChange={setSafetyDocs}
        />

        {error && <div className={s.error}>{error}</div>}

        <button type="button" onClick={submit} disabled={submitting || uploading} className={s.submit}>
          {submitting && <Loader2 size={16} strokeWidth={2} className={s.spin} />}
          {submitting ? "등록 중..." : "매물 등록하기"}
        </button>
      </div>
    </div>
  );
}

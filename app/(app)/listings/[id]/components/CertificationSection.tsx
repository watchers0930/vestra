"use client";

import { useState, useRef } from "react";
import { ShieldCheck, Shield, CheckCircle2, Circle, Loader2, Upload, ExternalLink, UploadCloud, MousePointerClick, ScanSearch, BadgeCheck } from "lucide-react";
import type { ListingItem } from "../../hooks/useListings";

interface CertifyResult {
  isCertified: boolean;
  checks: { registry: boolean; building: boolean; taxDoc: boolean };
  error: string | null;
}

interface Props {
  listing: ListingItem;
  isOwner: boolean;
  onReload?: () => void;
}

export function CertificationSection({ listing, isOwner, onReload }: Props) {
  const [certifying, setCertifying] = useState(false);
  const [certResult, setCertResult] = useState<CertifyResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasTaxDoc = uploadDone || !!listing.taxDocUrl;
  const checks = certResult?.checks ?? {
    registry: listing.isCertified,
    building: listing.isCertified,
    taxDoc: hasTaxDoc && listing.isCertified,
  };

  async function handleUploadTaxDoc(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/listings/${listing.id}/tax-doc`, { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "업로드에 실패했습니다.");
        return;
      }
      setUploadDone(true);
    } finally {
      setUploading(false);
    }
  }

  async function handleCertify() {
    setCertifying(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}/certify`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "인증 요청에 실패했습니다.");
        return;
      }
      const data: CertifyResult = await res.json();
      setCertResult(data);
      onReload?.();
    } finally {
      setCertifying(false);
    }
  }

  const docItems = [
    {
      key: "registry" as const,
      label: "등기사항전부증명서",
      desc: "틸코 API 자동조회",
      url: null,
    },
    {
      key: "building" as const,
      label: "건축물대장",
      desc: "KAPT 자동조회",
      url: listing.buildingDocUrl,
    },
    {
      key: "taxDoc" as const,
      label: "재산세납부확인서",
      desc: hasTaxDoc ? (listing.taxDocFilename ?? "업로드 완료") : "직접 업로드 필요",
      url: listing.taxDocUrl,
    },
  ];

  return (
    <div style={{
      border: listing.isCertified ? "1.5px solid #22a75e" : "1.5px solid #e5e5ea",
      borderRadius: 20, padding: 20, marginTop: 16,
      background: listing.isCertified ? "rgba(34,167,94,0.04)" : "#fafafa",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {listing.isCertified ? (
          <div style={{
            background: "linear-gradient(135deg,#1a7f4b,#22a75e)",
            borderRadius: "50%", width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(26,127,75,0.3)",
          }}>
            <ShieldCheck size={20} strokeWidth={2.5} color="#fff" />
          </div>
        ) : (
          <div style={{
            background: "#f2f2f7", borderRadius: "50%", width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={20} strokeWidth={1.5} color="#aeaeb2" />
          </div>
        )}
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: listing.isCertified ? "#1a7f4b" : "#3d3d3f", margin: 0 }}>
            {listing.isCertified ? "✓ 안전인증 완료" : "안전인증 서류"}
          </p>
          {listing.isCertified && listing.certifiedAt && (
            <p style={{ fontSize: 11, color: "#6e6e73", margin: 0, marginTop: 1 }}>
              {new Date(listing.certifiedAt).toLocaleDateString("ko-KR")} 인증
            </p>
          )}
        </div>
      </div>

      {/* 서류 체크리스트 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {docItems.map((doc) => {
          const done = checks[doc.key];
          return (
            <div key={doc.key} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 12,
              background: done ? "rgba(34,167,94,0.06)" : "#fff",
              border: `1px solid ${done ? "rgba(34,167,94,0.2)" : "#e5e5ea"}`,
            }}>
              {done
                ? <CheckCircle2 size={16} strokeWidth={2} color="#22a75e" style={{ flexShrink: 0 }} />
                : <Circle size={16} strokeWidth={1.5} color="#c7c7cc" style={{ flexShrink: 0 }} />
              }
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: done ? "#1a7f4b" : "#3d3d3f", margin: 0 }}>
                  {doc.label}
                </p>
                <p style={{ fontSize: 11, color: "#aeaeb2", margin: 0, marginTop: 1 }}>{doc.desc}</p>
              </div>
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#0071e3", display: "flex" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={13} strokeWidth={2} />
                </a>
              )}
              {/* 재산세 업로드 버튼 (임대인, 미업로드 시) */}
              {doc.key === "taxDoc" && isOwner && !hasTaxDoc && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: "#0071e3", color: "#fff", border: "none",
                      cursor: uploading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                    }}
                  >
                    {uploading
                      ? <Loader2 size={11} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                      : <Upload size={11} strokeWidth={2} />
                    }
                    {uploading ? "업로드 중" : "업로드"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadTaxDoc(f);
                      e.target.value = "";
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 인증 실행 버튼 (임대인만, 미인증 시) */}
      {isOwner && !listing.isCertified && (
        <button
          type="button"
          onClick={handleCertify}
          disabled={certifying || !hasTaxDoc}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 14,
            background: certifying || !hasTaxDoc ? "#d2d2d7" : "linear-gradient(135deg,#1a7f4b,#22a75e)",
            color: "#fff", fontSize: 14, fontWeight: 700, border: "none",
            cursor: certifying || !hasTaxDoc ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: hasTaxDoc && !certifying ? "0 2px 12px rgba(26,127,75,0.3)" : "none",
            transition: "all 0.15s",
          }}
        >
          {certifying && <Loader2 size={15} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />}
          {certifying ? "인증 조회 중..." : hasTaxDoc ? "안전인증 받기" : "재산세납부확인서 업로드 후 인증 가능"}
        </button>
      )}

      {/* 인증 결과 메시지 */}
      {certResult && !certResult.isCertified && (
        <div style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 10,
          background: "rgba(255,59,48,0.06)", fontSize: 12, color: "#c0392b",
        }}>
          {!certResult.checks.registry && "등기부 조회에 실패했습니다. 주소를 확인하거나 잠시 후 다시 시도해주세요. "}
          {!certResult.checks.building && "건축물대장 조회에 실패했습니다. "}
          {certResult.error && certResult.error}
        </div>
      )}

      {/* 안전인증 4단계 가이드 */}
      <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #f2f2f7" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.04em", marginBottom: 14 }}>
          안전인증 받는 방법
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            {
              icon: UploadCloud,
              step: "01",
              label: "서류 업로드",
              desc: "위택스에서 재산세납부확인서 발급 후 PDF 또는 이미지로 업로드",
            },
            {
              icon: MousePointerClick,
              step: "02",
              label: "인증 버튼 클릭",
              desc: "\"안전인증 받기\" 버튼을 클릭하면 자동 조회가 시작됩니다",
            },
            {
              icon: ScanSearch,
              step: "03",
              label: "서류 자동 조회",
              desc: "등기사항전부증명서(틸코)와 건축물대장(KAPT)을 시스템이 자동 확인",
            },
            {
              icon: BadgeCheck,
              step: "04",
              label: "인증 마크 부여",
              desc: "3종 완비 확인 즉시 매물 목록에 안전인증 뱃지가 표시됩니다",
            },
          ].map(({ icon: Icon, step, label, desc }) => (
            <div key={step} style={{
              padding: "14px 14px 14px 14px",
              borderRadius: 14,
              background: "#f9f9fb",
              border: "1px solid #efefef",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "linear-gradient(135deg,#1a7f4b,#22a75e)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={15} strokeWidth={2} color="#fff" />
                </div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#22a75e", display: "block", letterSpacing: "0.04em" }}>
                    STEP {step}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f" }}>{label}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#6e6e73", lineHeight: 1.55, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

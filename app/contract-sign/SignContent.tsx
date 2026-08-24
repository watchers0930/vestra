"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SignaturePad } from "@/app/(app)/e-contract/components/SignaturePad";

interface ContractSummary {
  id: string;
  contractType: string;
  address: string;
  deposit: string;
  monthlyRent: string | null;
  startDate: string | null;
  endDate: string | null;
  specialTerms: string | null;
  landlordName: string;
  tenantName: string;
}

const TYPE_LABEL: Record<string, string> = { JEONSE: "전세", MONTHLY: "월세", SALE: "매매" };
const won = (v: string) => Number(v).toLocaleString() + "원";

const wrap: React.CSSProperties = { maxWidth: 560, margin: "0 auto", padding: "32px 20px" };
const card: React.CSSProperties = { border: "1.5px solid #e2e5ef", borderRadius: 14, padding: "20px 22px", background: "#fff" };
const rowLabel: React.CSSProperties = { fontSize: 12, color: "#8a90a2", width: 92, flexShrink: 0 };
const row: React.CSSProperties = { display: "flex", gap: 10, padding: "7px 0", fontSize: 13.5, color: "#22252f", borderBottom: "1px solid #f1f3f9" };

/** 임차인 서명 화면 — 계약 요약 확인 후 손글씨 서명 제출 */
export default function SignContent() {
  const token = useSearchParams().get("token") ?? "";
  const [contract, setContract] = useState<ContractSummary | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sign, setSign] = useState("");
  const [rrn, setRrn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ pdfUrl: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setLoadErr("서명 링크가 올바르지 않습니다."); setLoading(false); return; }
    let alive = true;
    fetch(`/api/e-contracts/sign/${token}`)
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => null) }))
      .then(({ ok, d }) => { if (!alive) return; if (ok && d?.contract) setContract(d.contract); else setLoadErr(d?.error ?? "계약을 불러올 수 없습니다."); })
      .catch(() => { if (alive) setLoadErr("네트워크 오류가 발생했습니다."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const formatRrn = (v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(0, 7);
    return d.length <= 6 ? d : `${d.slice(0, 6)}-${d.slice(6, 7)}`;
  };

  const submit = async () => {
    setErr(null);
    if (!sign) { setErr("서명을 입력해주세요."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/e-contracts/sign/${token}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign, rrn }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { setErr(d?.error ?? "서명 제출에 실패했습니다."); return; }
      setDone({ pdfUrl: d.pdfUrl });
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={wrap}><p style={{ textAlign: "center", color: "#6b7180" }}>불러오는 중...</p></div>;
  if (loadErr) return <div style={wrap}><div style={{ ...card, textAlign: "center", color: "#d0392b" }}>{loadErr}</div></div>;
  if (done) return (
    <div style={wrap}>
      <div style={{ ...card, textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>✓</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "10px 0" }}>서명이 완료되었습니다</h2>
        <p style={{ fontSize: 13.5, color: "#6b7180", marginBottom: 16 }}>양측 서명이 기록되어 가계약서가 확정되었습니다.</p>
        <a href={done.pdfUrl} style={{ display: "inline-block", background: "#2e4bd8", color: "#fff", borderRadius: 10, padding: "11px 20px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>가계약서 PDF 내려받기</a>
      </div>
    </div>
  );
  if (!contract) return null;

  return (
    <div style={wrap}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>가계약서 서명</h1>
      <p style={{ fontSize: 13, color: "#8a90a2", marginBottom: 18 }}>아래 계약 내용을 확인하고 임차인 본인이 직접 서명해주세요.</p>

      <div style={card}>
        <div style={row}><span style={rowLabel}>계약 종류</span><span>{TYPE_LABEL[contract.contractType] ?? contract.contractType}</span></div>
        <div style={row}><span style={rowLabel}>목적물</span><span>{contract.address}</span></div>
        <div style={row}><span style={rowLabel}>보증금</span><span>{won(contract.deposit)}</span></div>
        {contract.monthlyRent && <div style={row}><span style={rowLabel}>월세</span><span>{won(contract.monthlyRent)}</span></div>}
        {(contract.startDate || contract.endDate) && (
          <div style={row}><span style={rowLabel}>계약 기간</span><span>{contract.startDate ?? "-"} ~ {contract.endDate ?? "-"}</span></div>
        )}
        <div style={row}><span style={rowLabel}>임대인</span><span>{contract.landlordName || "-"}</span></div>
        <div style={{ ...row, borderBottom: "none" }}><span style={rowLabel}>임차인(본인)</span><span>{contract.tenantName || "-"}</span></div>
        {contract.specialTerms && (
          <div style={{ marginTop: 8, padding: 12, background: "#f7f9ff", borderRadius: 8, fontSize: 12.5, color: "#3a3f55", whiteSpace: "pre-wrap" }}>
            <b>특약</b><br />{contract.specialTerms}
          </div>
        )}
      </div>

      <div style={{ ...card, marginTop: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#3a3f55", display: "block", marginBottom: 6 }}>생년월일 + 성별 1자리 (선택)</label>
        <input value={rrn} onChange={(e) => setRrn(formatRrn(e.target.value))} placeholder="예: 890101-1" maxLength={8}
          style={{ width: "100%", border: "1px solid #d8dcea", borderRadius: 8, padding: "10px 12px", fontSize: 14, marginBottom: 16 }} />
        <SignaturePad value={sign} onChange={setSign} label="임차인(본인)" />
        {err && <p style={{ color: "#d0392b", fontSize: 12.5, marginTop: 10 }}>{err}</p>}
        <button type="button" onClick={submit} disabled={!sign || submitting}
          style={{ width: "100%", marginTop: 14, background: sign ? "#2e4bd8" : "#c7cbd8", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: sign ? "pointer" : "default" }}>
          {submitting ? "제출 중..." : "서명 제출하고 계약 확정"}
        </button>
      </div>
    </div>
  );
}

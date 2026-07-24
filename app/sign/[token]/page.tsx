"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import { SignatureCanvas } from "./components/SignatureCanvas";
import { CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react";

type ContractInfo = {
  id: string;
  contractType: string;
  address: string;
  deposit: string;
  monthlyRent?: string | null;
  duration?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  specialTerms?: string | null;
  signatures: Array<{ role: string; signedAt: string | null }>;
};

type SignData = {
  signatureId: string;
  role: string;
  contract: ContractInfo;
};

const ROLE_LABEL: Record<string, string> = {
  LANDLORD: "임대인",
  TENANT: "임차인",
  BROKER: "공인중개사",
};

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  JEONSE: "전세",
  MONTHLY: "월세",
  SALE: "매매",
};

function fmtAmt(v: string | null | undefined) {
  if (!v) return "-";
  return `금 ${Number(v).toLocaleString("ko-KR")}원정`;
}

function fmtD(d: string | null | undefined) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

export default function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [data, setData] = useState<SignData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [step, setStep] = useState<"info" | "sign" | "done">("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ nextSignUrl?: string | null; completed?: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.alreadySigned) {
          setAlreadySigned(true);
          return;
        }
        if (json.error) {
          setError(json.error);
          return;
        }
        setData(json);
      })
      .catch(() => setError("서버 오류가 발생했습니다."));
  }, [token]);

  const handleSave = useCallback((blob: Blob) => {
    setSignatureBlob(blob);
  }, []);

  async function handleSubmit() {
    if (!signatureBlob) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("signature", signatureBlob, "signature.png");
      formData.append("name", name.trim());
      formData.append("phone", phone.trim());

      const res = await fetch(`/api/sign/${token}/complete`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      setResult(json);
      setStep("done");
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── 로딩 ──
  if (!data && !error && !alreadySigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── 에러 ──
  if (alreadySigned || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
          <p className="text-gray-700 font-medium">
            {alreadySigned ? "이미 서명이 완료된 링크입니다." : error}
          </p>
          <Link href="/" className="text-blue-600 text-sm hover:underline">Vestra 홈으로</Link>
        </div>
      </div>
    );
  }

  const contract = data!.contract;
  const roleLabel = ROLE_LABEL[data!.role] ?? data!.role;
  const typeLabel = CONTRACT_TYPE_LABEL[contract.contractType] ?? contract.contractType;

  const signedRoles = contract.signatures.filter((s) => s.signedAt).map((s) => s.role);

  // ── 완료 화면 ──
  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center space-y-5">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">서명 완료</h1>
          <p className="text-gray-600 text-sm">
            {roleLabel}로서 계약서에 서명하셨습니다.
          </p>
          {result?.completed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              모든 당사자의 서명이 완료되어 계약이 성립되었습니다.
              최종 계약서 PDF는 곧 발송됩니다.
            </div>
          ) : result?.nextSignUrl ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              다음 서명자에게 서명 링크가 전달됩니다.
            </div>
          ) : null}
          <Link href="/" className="inline-block text-blue-600 text-sm hover:underline">
            Vestra 홈으로
          </Link>
        </div>
      </div>
    );
  }

  // ── 계약 정보 확인 → 서명 ──
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">주택 {typeLabel}계약서</h1>
              <p className="text-sm text-gray-500">서명 요청 — {roleLabel}</p>
            </div>
          </div>

          {/* 서명 현황 */}
          <div className="flex gap-2 mb-5">
            {["LANDLORD", "TENANT", "BROKER"].map((role) => {
              const hasSig = contract.signatures.some((s) => s.role === role);
              if (!hasSig) return null;
              const signed = signedRoles.includes(role);
              return (
                <span
                  key={role}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    signed
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "bg-gray-50 border-gray-300 text-gray-500"
                  }`}
                >
                  {ROLE_LABEL[role]} {signed ? "✓" : "대기"}
                </span>
              );
            })}
          </div>

          {/* 계약 요약 */}
          <div className="space-y-2 text-sm">
            <InfoRow label="소재지" value={contract.address} />
            <InfoRow label="보증금" value={fmtAmt(contract.deposit)} />
            {contract.monthlyRent && (
              <InfoRow label="월 차임" value={fmtAmt(contract.monthlyRent)} />
            )}
            <InfoRow
              label="계약기간"
              value={`${fmtD(contract.startDate)} ~ ${fmtD(contract.endDate)}`}
            />
            {contract.specialTerms && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">특약사항</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.specialTerms}</p>
              </div>
            )}
          </div>
        </div>

        {/* 서명 단계 */}
        {step === "info" && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-900">본인 정보 입력</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  연락처 (선택)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              위 계약 내용을 모두 확인하셨습니까? 다음 단계에서 서명하시면 계약에 동의한 것으로 처리됩니다.
            </div>
            <button
              type="button"
              onClick={() => setStep("sign")}
              disabled={!name.trim()}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm"
            >
              서명 단계로 이동
            </button>
          </div>
        )}

        {step === "sign" && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="font-bold text-gray-900">서명</h2>
            <p className="text-sm text-gray-500">
              아래 서명란에 손글씨 서명을 완성한 후 [이 서명으로 확인] 버튼을 눌러주세요.
            </p>
            <SignatureCanvas onSave={handleSave} disabled={submitting} />
            {signatureBlob && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    서명 제출 중...
                  </>
                ) : (
                  "서명 제출 완료"
                )}
              </button>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Vestra 전자계약 시스템 · 전자서명법에 따라 법적 효력이 인정됩니다
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-16 shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

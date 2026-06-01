"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle, XCircle, Loader2, ChevronDown, Key } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import type { IntegrityResult } from "../hooks/usePropertyDetail";

interface Props {
  result: IntegrityResult | null;
  verifying: boolean;
  onVerify: () => void;
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle size={16} className="text-[#30d158] flex-shrink-0" />
  ) : (
    <XCircle size={16} className="text-[#ff3b30] flex-shrink-0" />
  );
}

export function IntegrityVerification({ result, verifying, onVerify }: Props) {
  const [showKey, setShowKey] = useState(false);

  return (
    <Card>
      <CardHeader
        title="무결성 검증"
        description="해시체인·서명·머클루트 3중 검증"
        className="px-5 pt-5"
      >
        <Button
          variant="primary"
          icon={ShieldCheck}
          loading={verifying}
          onClick={onVerify}
          size="sm"
        >
          검증 실행
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        {!result && !verifying && (
          <p className="text-center text-[13px] text-[#86868b] py-6">
            검증 버튼을 눌러 스냅샷 체인의 무결성을 확인하세요.
          </p>
        )}

        {verifying && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 size={18} className="animate-spin text-[#0071e3]" />
            <span className="text-[13px] text-[#6e6e73]">스냅샷 체인 검증 중...</span>
          </div>
        )}

        {result && !verifying && (
          <div className="space-y-4">
            {/* 종합 결과 */}
            <div
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{
                background: result.isValid ? "rgba(48,209,88,0.08)" : "rgba(255,59,48,0.08)",
                border: result.isValid
                  ? "1px solid rgba(48,209,88,0.15)"
                  : "1px solid rgba(255,59,48,0.15)",
              }}
            >
              <StatusIcon ok={result.isValid} />
              <div>
                <div className="text-[13px] font-semibold" style={{ color: result.isValid ? "#30d158" : "#ff3b30" }}>
                  {result.isValid ? "무결성 검증 통과" : "무결성 검증 실패"}
                </div>
                <div className="text-[11.5px] text-[#6e6e73]">
                  전체 {result.totalSnapshots}개 스냅샷 검증 완료
                  {result.brokenAt !== null && ` (시퀀스 #${result.brokenAt}에서 이상 감지)`}
                </div>
              </div>
            </div>

            {/* 개별 항목 */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#f9fafb] border border-[#e5e5e7]">
                <StatusIcon ok={result.hashChainValid} />
                <div>
                  <div className="text-[12px] font-semibold text-[#1d1d1f]">해시 체인</div>
                  <div className="text-[10.5px] text-[#86868b]">SHA-256 연결 검증</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#f9fafb] border border-[#e5e5e7]">
                <StatusIcon ok={result.signaturesValid} />
                <div>
                  <div className="text-[12px] font-semibold text-[#1d1d1f]">Ed25519 서명</div>
                  <div className="text-[10.5px] text-[#86868b]">디지털 서명 검증</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#f9fafb] border border-[#e5e5e7]">
                <StatusIcon ok={result.merkleRootsValid} />
                <div>
                  <div className="text-[12px] font-semibold text-[#1d1d1f]">머클 루트</div>
                  <div className="text-[10.5px] text-[#86868b]">섹션 해시 트리 검증</div>
                </div>
              </div>
            </div>

            {/* 공개키 표시 */}
            {result.publicKey && (
              <div>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="flex items-center gap-1.5 text-[12px] text-[#0071e3] hover:underline"
                >
                  <Key size={12} />
                  <span>Ed25519 공개키 {showKey ? "숨기기" : "보기"}</span>
                  <ChevronDown
                    size={12}
                    className="transition-transform"
                    style={{ transform: showKey ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>

                {showKey && (
                  <pre className="mt-2 p-3 rounded-lg bg-[#1d1d1f] text-[#30d158] text-[10px] font-mono overflow-x-auto whitespace-pre leading-relaxed">
                    {result.publicKey}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

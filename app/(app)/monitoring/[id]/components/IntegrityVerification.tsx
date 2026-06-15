"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle, XCircle, Loader2, ChevronDown, Key, AlertTriangle, Info } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import type { IntegrityResult } from "../hooks/usePropertyDetail";

interface Props {
  result: IntegrityResult | null;
  verifying: boolean;
  onVerify: () => void;
  isUnverifiedSource?: boolean; // commUniqueNo 없는 PDF 등록 물건
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle size={16} className="text-[#30d158] flex-shrink-0" />
  ) : (
    <XCircle size={16} className="text-[#ff3b30] flex-shrink-0" />
  );
}

export function IntegrityVerification({ result, verifying, onVerify, isUnverifiedSource }: Props) {
  const [showKey, setShowKey] = useState(false);

  return (
    <Card>
      <CardHeader
        title="위변조 검사"
        description="블록체인 암호화 기반으로 기록 변조 여부를 검증합니다"
        className="px-5 pt-4"
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
      <CardContent className="px-5 pb-5 pt-0 space-y-3">
        {/* PDF 직접 등록 경고 */}
        {isUnverifiedSource && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12.5px] font-semibold text-amber-800">원본 진위 미검증 물건</p>
              <p className="text-[11.5px] text-amber-700 mt-0.5">
                이 물건은 공식 등기 연계 없이 PDF로 직접 등록되었습니다. 아래 검사는 Vestra 내부 기록의 변조 여부만 확인하며, 최초 업로드된 PDF가 실제 등기부와 일치하는지는 보장하지 않습니다.
              </p>
              <a
                href="https://www.iros.go.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block text-[11.5px] font-medium text-amber-800 underline"
              >
                인터넷등기소에서 직접 발급·확인하기 →
              </a>
            </div>
          </div>
        )}

        {/* 면책 문구 */}
        <div className="flex items-start gap-2 rounded-lg bg-[#f5f5f7] px-3 py-2.5">
          <Info size={13} className="text-[#86868b] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[#6e6e73] leading-relaxed">
            이 검사는 <strong>Vestra가 저장한 등기부 기록이 이후 변조되지 않았는지</strong>만 확인합니다. 등기부 원본의 진위 여부는 <a href="https://www.iros.go.kr" target="_blank" rel="noopener noreferrer" className="underline">인터넷등기소</a>에서 직접 확인하세요.
          </p>
        </div>

        {!result && !verifying && (
          <p className="text-center text-[13px] text-[#86868b] py-4">
            검증 버튼을 눌러 블록체인 암호화 기반으로 등기부 기록의 무결성을 확인하세요.
          </p>
        )}

        {verifying && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 size={18} className="animate-spin text-[#0071e3]" />
            <span className="text-[13px] text-[#6e6e73]">등기부 기록 검증 중...</span>
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
                  {result.isValid ? "위변조 없음 확인" : "위변조 의심 — 확인 필요"}
                </div>
                <div className="text-[11.5px] text-[#6e6e73]">
                  전체 {result.totalSnapshots ?? 0}건의 기록을 검사했습니다
                  {result.brokenAt != null && ` (${result.brokenAt}번째 기록에서 이상 감지)`}
                </div>
              </div>
            </div>

            {/* 개별 항목 */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#f9fafb] border border-[#e5e5e7]">
                <StatusIcon ok={result.hashChainValid} />
                <div>
                  <div className="text-[12px] font-semibold text-[#1d1d1f]">해시 체인 검증</div>
                  <div className="text-[10.5px] text-[#86868b]">블록체인 연결 무결성</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#f9fafb] border border-[#e5e5e7]">
                <StatusIcon ok={result.signaturesValid} />
                <div>
                  <div className="text-[12px] font-semibold text-[#1d1d1f]">전자 서명 확인</div>
                  <div className="text-[10.5px] text-[#86868b]">Ed25519 디지털 서명</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#f9fafb] border border-[#e5e5e7]">
                <StatusIcon ok={result.merkleRootsValid} />
                <div>
                  <div className="text-[12px] font-semibold text-[#1d1d1f]">내용 일치 확인</div>
                  <div className="text-[10.5px] text-[#86868b]">Merkle Tree 검증</div>
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
                  <span>검증용 공개키 {showKey ? "숨기기" : "보기"}</span>
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

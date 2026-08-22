"use client";

import { useState } from "react";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { SignaturePad } from "@/app/(app)/e-contract/components/SignaturePad";
import { useToast } from "@/components/common/toast";
import type { DraftResult } from "@/lib/keepzip/case-form";

interface Props {
  draft: DraftResult | null;
  loading: boolean;
  error: string | null;
  senderName: string;
  onChangeContent: (content: string) => void;
}

/** 우측 — AI 내용증명 초안 실시간 생성·편집 + 서명 포함 PDF 내려받기 */
export function DraftPanel({ draft, loading, error, senderName, onChangeContent }: Props) {
  const { showToast } = useToast();
  const [signature, setSignature] = useState("");

  const downloadPdf = async () => {
    if (!draft) return;
    try {
      const res = await fetch("/api/keepzip/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft.title, content: draft.content, senderName, signature }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        showToast(d?.error ?? "PDF 생성에 실패했습니다.", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${draft.title || "내용증명"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast("PDF 다운로드 중 오류가 발생했습니다.", "error");
    }
  };

  return (
    <Card className="p-5 lg:sticky lg:top-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">내 용 증 명</span>
        {draft && <span className="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-500">AI 초안</span>}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[420px] text-gray-400 text-sm gap-2">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          AI가 내용증명을 작성 중입니다...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-[420px] text-red-500 text-sm text-center px-4">
          {error}
        </div>
      ) : !draft ? (
        <div className="flex items-center justify-center min-h-[420px] text-gray-400 text-sm text-center px-4">
          왼쪽 정보를 입력하고 <br />‘AI 내용증명 초안 생성’을 누르면 <br />여기에 문서가 만들어집니다.
        </div>
      ) : (
        <>
          <div className="text-base font-bold text-center mb-3">{draft.title}</div>
          <textarea
            className="w-full min-h-[420px] text-sm leading-relaxed border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y whitespace-pre-wrap"
            value={draft.content}
            onChange={(e) => onChangeContent(e.target.value)}
          />
          <div className="mt-4">
            <SignaturePad value={signature} onChange={setSignature} label="발신인(본인)" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ※ AI 초안입니다. 직접 수정할 수 있으며, <strong>실제 발송 전 담당 변호사의 검토·직인</strong>을 거칩니다.
          </p>
          <Button variant="primary" onClick={downloadPdf} className="w-full mt-3">서명 포함 PDF 내려받기</Button>
        </>
      )}
    </Card>
  );
}

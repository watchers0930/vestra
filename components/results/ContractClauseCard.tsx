"use client";

import { useState } from "react";
import {
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardContent, Badge } from "@/components/common";
import type { ContractClauseResult, ContractClause } from "@/lib/contract-clause-generator";

// ─── 복사 버튼 ───

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted hover:text-primary hover:bg-gray-100 transition-colors"
    >
      {copied ? (
        <>
          <Check size={12} className="text-emerald-600" />
          <span className="text-emerald-600">복사됨</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>{label || "복사"}</span>
        </>
      )}
    </button>
  );
}

// ─── 개별 특약 ───

function ClauseItem({ clause, index }: { clause: ContractClause; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-lg border ${clause.priority === "required" ? "border-gray-200" : "border-gray-100"}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <span className="text-xs font-mono text-muted shrink-0 w-6">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{clause.title}</span>
            <Badge
              variant={clause.priority === "required" ? "danger" : "info"}
              size="sm"
            >
              {clause.priority === "required" ? "필수" : "권장"}
            </Badge>
            <Badge variant="neutral" size="sm">{clause.category}</Badge>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-muted shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <div className="ml-9 p-3 rounded-lg bg-gray-50 text-sm text-secondary leading-relaxed">
            {clause.text}
          </div>
          <div className="ml-9 mt-2 flex justify-end">
            <CopyButton text={`[특약] ${clause.title}\n${clause.text}`} label="이 특약 복사" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ───

interface ContractClauseCardProps {
  result: ContractClauseResult;
}

export default function ContractClauseCard({ result }: ContractClauseCardProps) {
  return (
    <Card>
      <CardHeader title="매매계약 특약 자동 생성">
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            {result.clauses.length}개 조항
          </Badge>
          <CopyButton text={result.fullText} label="전체 복사" />
        </div>
      </CardHeader>
      <CardContent>
        {/* 요약 */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-red-700">
            <FileText size={14} className="inline mr-1" />
            필수 {result.requiredCount}건
          </span>
          {result.recommendedCount > 0 && (
            <span className="text-blue-700">
              권장 {result.recommendedCount}건
            </span>
          )}
        </div>

        {/* 특약 목록 */}
        <div className="space-y-2">
          {result.clauses.map((clause, i) => (
            <ClauseItem key={clause.id} clause={clause} index={i} />
          ))}
        </div>

        {/* 안내 */}
        <div className="mt-4 rounded-lg bg-[#f5f5f7] p-3 text-xs text-muted">
          <FileText size={14} strokeWidth={1.5} className="inline mr-1 text-[#1d1d1f]" />
          위 특약은 등기부 분석 결과를 기반으로 자동 생성되었습니다.
          실제 계약 시에는 법률 전문가의 검토를 받으세요.
          &ldquo;전체 복사&rdquo; 버튼으로 특약 전문을 복사할 수 있습니다.
        </div>
      </CardContent>
    </Card>
  );
}

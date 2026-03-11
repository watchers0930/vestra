"use client";

import { useState } from "react";
import { FileText, ExternalLink, ShieldAlert, ShieldCheck, Info } from "lucide-react";
import { Card } from "@/components/common";

// 기존 호환 인터페이스
interface DocumentItem {
  name: string;
  description?: string;
  where: string;
  cost?: string;
  online?: boolean;
  onlineUrl?: string;
}

// 동적 체크리스트용 확장 인터페이스
interface DynamicDocumentItem extends DocumentItem {
  priority?: "required" | "recommended" | "optional";
  triggeredBy?: string;
  category?: string;
}

interface DocumentChecklistProps {
  documents: DynamicDocumentItem[];
  title?: string;
  grouped?: boolean; // 카테고리별 그룹 표시
}

const PRIORITY_CONFIG = {
  required: {
    label: "필수",
    color: "bg-red-100 text-red-700",
    icon: ShieldAlert,
  },
  recommended: {
    label: "권장",
    color: "bg-amber-100 text-amber-700",
    icon: ShieldCheck,
  },
  optional: {
    label: "선택",
    color: "bg-gray-100 text-gray-600",
    icon: Info,
  },
};

export default function DocumentChecklist({
  documents,
  title = "필요 서류 체크리스트",
  grouped = false,
}: DocumentChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = documents.length;
  const requiredCount = documents.filter((d) => d.priority === "required").length;
  const checkedRequired = documents.filter(
    (d) => d.priority === "required" && checked[d.name]
  ).length;

  // 카테고리별 그룹화
  const groups = grouped
    ? documents.reduce<Record<string, DynamicDocumentItem[]>>((acc, doc) => {
        const cat = doc.category || "기타";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(doc);
        return acc;
      }, {})
    : { "": documents };

  function renderItem(doc: DynamicDocumentItem, i: number) {
    const priority = doc.priority || "optional";
    const config = PRIORITY_CONFIG[priority];
    const PriorityIcon = config.icon;

    return (
      <label
        key={`${doc.name}-${i}`}
        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <input
          type="checkbox"
          checked={checked[doc.name] || false}
          onChange={(e) =>
            setChecked({ ...checked, [doc.name]: e.target.checked })
          }
          className="w-4 h-4 accent-primary mt-0.5"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{doc.name}</span>
            {doc.priority && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color}`}
              >
                <PriorityIcon size={10} />
                {config.label}
              </span>
            )}
          </div>
          {doc.description && (
            <div className="text-xs text-secondary mt-0.5">
              {doc.description}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-xs text-muted">발급처: {doc.where}</span>
            {doc.cost && (
              <span className="text-xs text-muted">비용: {doc.cost}</span>
            )}
            {doc.online && doc.onlineUrl && (
              <a
                href={doc.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink size={10} /> 온라인 가능
              </a>
            )}
          </div>
        </div>
      </label>
    );
  }

  return (
    <Card className="p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          {title}
        </h4>
        <div className="text-xs text-muted">
          {checkedCount}/{totalCount} 완료
          {requiredCount > 0 && (
            <span className="ml-2">
              (필수 {checkedRequired}/{requiredCount})
            </span>
          )}
        </div>
      </div>

      {/* 진행률 바 */}
      {totalCount > 0 && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
          <div
            className="bg-primary rounded-full h-1.5 transition-all duration-300"
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* 체크리스트 */}
      {grouped ? (
        <div className="space-y-4">
          {Object.entries(groups).map(([category, docs]) => (
            <div key={category}>
              {category && (
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2.5">
                  {category}
                </div>
              )}
              <div className="space-y-1">{docs.map(renderItem)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">{documents.map(renderItem)}</div>
      )}
    </Card>
  );
}

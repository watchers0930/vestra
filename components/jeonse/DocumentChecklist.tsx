"use client";

import { useState } from "react";
import { FileText, ExternalLink, ShieldAlert, ShieldCheck, Info } from "lucide-react";

interface DocumentItem {
  name: string;
  description?: string;
  where: string;
  cost?: string;
  online?: boolean;
  onlineUrl?: string;
}

interface DynamicDocumentItem extends DocumentItem {
  priority?: "required" | "recommended" | "optional";
  triggeredBy?: string;
  category?: string;
}

interface DocumentChecklistProps {
  documents: DynamicDocumentItem[];
  title?: string;
  grouped?: boolean;
}

const PRIORITY_CONFIG = {
  required:    { label: "필수", color: "#ff3b30", bg: "rgba(255,59,48,0.10)",  icon: ShieldAlert  },
  recommended: { label: "권장", color: "#b86f00", bg: "rgba(255,159,10,0.10)", icon: ShieldCheck  },
  optional:    { label: "선택", color: "#6e6e73", bg: "rgba(0,0,0,0.05)",      icon: Info         },
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
  const checkedRequired = documents.filter((d) => d.priority === "required" && checked[d.name]).length;

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
    const isChecked = checked[doc.name] || false;

    return (
      <label
        key={`${doc.name}-${i}`}
        style={{
          display: "flex", alignItems: "flex-start", gap: "10px",
          padding: "10px 12px", borderRadius: "12px",
          cursor: "pointer", transition: "background 0.12s",
          background: isChecked ? "rgba(48,209,88,0.04)" : "transparent",
          border: isChecked ? "1px solid rgba(48,209,88,0.16)" : "1px solid transparent",
        }}
        onMouseEnter={(e) => { if (!isChecked) (e.currentTarget as HTMLLabelElement).style.background = "#f5f5f7"; }}
        onMouseLeave={(e) => { if (!isChecked) (e.currentTarget as HTMLLabelElement).style.background = "transparent"; }}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => setChecked({ ...checked, [doc.name]: e.target.checked })}
          style={{ width: "15px", height: "15px", accentColor: "#0071e3", marginTop: "2px", flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "13px", fontWeight: 600,
                color: isChecked ? "#6e6e73" : "#1d1d1f",
                textDecoration: isChecked ? "line-through" : "none",
              }}
            >
              {doc.name}
            </span>
            {doc.priority && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: "3px",
                  padding: "2px 8px", borderRadius: "20px",
                  fontSize: "10px", fontWeight: 700,
                  color: config.color, background: config.bg,
                }}
              >
                <PriorityIcon size={9} />
                {config.label}
              </span>
            )}
          </div>
          {doc.description && (
            <div style={{ fontSize: "11.5px", color: "#6e6e73", marginTop: "2px" }}>{doc.description}</div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
            <span style={{ fontSize: "11px", color: "#aeaeb2" }}>발급처: {doc.where}</span>
            {doc.cost && <span style={{ fontSize: "11px", color: "#aeaeb2" }}>비용: {doc.cost}</span>}
            {doc.online && doc.onlineUrl && (
              <a
                href={doc.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  fontSize: "11px", color: "#0071e3", textDecoration: "none",
                  fontWeight: 500,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={10} strokeWidth={1.5} />온라인 가능
              </a>
            )}
          </div>
        </div>
      </label>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        padding: "24px",
      }}
    >
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <h4
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            fontSize: "15px", fontWeight: 700, color: "#1d1d1f",
          }}
        >
          <FileText size={16} strokeWidth={1.5} style={{ color: "#6e6e73" }} />
          {title}
        </h4>
        <span style={{ fontSize: "11px", color: "#aeaeb2" }}>
          {checkedCount}/{totalCount}
          {requiredCount > 0 && ` (필수 ${checkedRequired}/${requiredCount})`}
        </span>
      </div>

      {/* 진행 바 */}
      {totalCount > 0 && (
        <div
          style={{
            width: "100%", height: "4px", borderRadius: "4px",
            background: "rgba(0,0,0,0.06)", marginBottom: "14px", overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%", borderRadius: "4px",
              background: "linear-gradient(90deg, #0071e3, #30d158)",
              width: `${(checkedCount / totalCount) * 100}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}

      {/* 체크리스트 */}
      {grouped ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {Object.entries(groups).map(([category, docs]) => (
            <div key={category}>
              {category && (
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#aeaeb2", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: "6px", paddingLeft: "12px" }}>
                  {category}
                </div>
              )}
              <div>{docs.map(renderItem)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>{documents.map(renderItem)}</div>
      )}
    </div>
  );
}

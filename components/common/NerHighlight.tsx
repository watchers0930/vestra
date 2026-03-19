"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Eye, EyeOff } from "lucide-react";

/**
 * NER(개체명 인식) 하이라이트 컴포넌트
 * nlp-ner-pipeline의 결과를 텍스트 위에 시각적으로 표시
 */

type EntityType =
  | "PERSON" | "ADDRESS" | "MONEY" | "AREA" | "DATE"
  | "RATE" | "ORGANIZATION" | "PROPERTY_TYPE" | "RIGHT_TYPE"
  | "LEGAL_REF" | "DURATION";

interface Entity {
  type: EntityType;
  text: string;
  start: number;
  end: number;
}

interface Props {
  text: string;
  className?: string;
}

const ENTITY_COLORS: Record<EntityType, { bg: string; text: string; label: string }> = {
  PERSON: { bg: "bg-blue-100", text: "text-blue-800", label: "인명" },
  ADDRESS: { bg: "bg-emerald-100", text: "text-emerald-800", label: "주소" },
  MONEY: { bg: "bg-red-100", text: "text-red-800", label: "금액" },
  AREA: { bg: "bg-amber-100", text: "text-amber-800", label: "면적" },
  DATE: { bg: "bg-purple-100", text: "text-purple-800", label: "날짜" },
  RATE: { bg: "bg-cyan-100", text: "text-cyan-800", label: "비율" },
  ORGANIZATION: { bg: "bg-indigo-100", text: "text-indigo-800", label: "기관" },
  PROPERTY_TYPE: { bg: "bg-teal-100", text: "text-teal-800", label: "유형" },
  RIGHT_TYPE: { bg: "bg-rose-100", text: "text-rose-800", label: "권리" },
  LEGAL_REF: { bg: "bg-orange-100", text: "text-orange-800", label: "법률" },
  DURATION: { bg: "bg-lime-100", text: "text-lime-800", label: "기간" },
};

// 클라이언트 사이드 NER 패턴 (간소화)
const CLIENT_PATTERNS: Array<{ type: EntityType; regex: RegExp }> = [
  { type: "MONEY", regex: /(?:금\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:원|만원|억원|만\s*원|억\s*원)/g },
  { type: "MONEY", regex: /(?:보증금|전세금|월세|임대료|매매가|감정가|채권최고액)\s*[:：]?\s*(?:금\s*)?(\d{1,3}(?:,\d{3})*)\s*원?/g },
  { type: "AREA", regex: /(\d+(?:\.\d+)?)\s*(?:㎡|m²|평)/g },
  { type: "DATE", regex: /(\d{4})\s*[년./-]\s*(\d{1,2})\s*[월./-]\s*(\d{1,2})\s*일?/g },
  { type: "RATE", regex: /(?:연\s*)?(\d+(?:\.\d+)?)\s*%/g },
  { type: "RIGHT_TYPE", regex: /(?:소유권|근저당권?|전세권|지상권|저당권|임차권|가압류|가처분|압류|경매개시결정|신탁|가등기)/g },
  { type: "PROPERTY_TYPE", regex: /(?:아파트|빌라|오피스텔|단독주택|다세대|다가구|연립|상가|토지)/g },
  { type: "LEGAL_REF", regex: /(?:민법|상법|주택임대차보호법|부동산등기법|건축법)\s*제?\s*\d+조/g },
  { type: "DURATION", regex: /(\d+)\s*(?:년|개월|일)(?:\s*간)?/g },
  { type: "PERSON", regex: /(?:임대인|임차인|매도인|매수인|채권자|채무자|소유자)\s*[:：]?\s*([가-힣]{2,4})/g },
  { type: "ORGANIZATION", regex: /[가-힣]+(?:은행|저축은행|새마을금고|보험|캐피탈|법무법인|법원|등기소)/g },
];

function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];
  const usedRanges: Array<[number, number]> = [];

  for (const pattern of CLIENT_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = usedRanges.some(([s, e]) => (start >= s && start < e) || (end > s && end <= e));
      if (overlaps) continue;
      entities.push({ type: pattern.type, text: match[0], start, end });
      usedRanges.push([start, end]);
    }
  }
  return entities.sort((a, b) => a.start - b.start);
}

export function NerHighlight({ text, className }: Props) {
  const [enabled, setEnabled] = useState(true);

  const entities = useMemo(() => extractEntities(text), [text]);

  const segments = useMemo(() => {
    if (!enabled || entities.length === 0) return [{ text, isEntity: false as const }];

    const result: Array<{ text: string; isEntity: false } | { text: string; isEntity: true; entity: Entity }> = [];
    let lastEnd = 0;

    for (const entity of entities) {
      if (entity.start > lastEnd) {
        result.push({ text: text.slice(lastEnd, entity.start), isEntity: false });
      }
      result.push({ text: entity.text, isEntity: true, entity });
      lastEnd = entity.end;
    }
    if (lastEnd < text.length) {
      result.push({ text: text.slice(lastEnd), isEntity: false });
    }
    return result;
  }, [text, entities, enabled]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entities) counts[e.type] = (counts[e.type] || 0) + 1;
    return counts;
  }, [entities]);

  return (
    <div className={className}>
      {/* 컨트롤 바 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <span className="text-xs font-medium text-gray-600">NER 개체명 인식</span>
          <span className="text-[10px] text-gray-400">{entities.length}개 감지</span>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {enabled ? <Eye size={10} /> : <EyeOff size={10} />}
          {enabled ? "하이라이트 ON" : "하이라이트 OFF"}
        </button>
      </div>

      {/* 엔티티 타입 요약 */}
      {enabled && entities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {Object.entries(typeCounts).map(([type, count]) => {
            const color = ENTITY_COLORS[type as EntityType];
            return (
              <span key={type} className={cn("px-1.5 py-0.5 text-[9px] rounded", color?.bg, color?.text)}>
                {color?.label} {count}
              </span>
            );
          })}
        </div>
      )}

      {/* 하이라이트된 텍스트 */}
      <div className="text-xs font-mono leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-[400px] overflow-y-auto">
        {segments.map((seg, i) => {
          if (!seg.isEntity) return <span key={i}>{seg.text}</span>;
          const colors = ENTITY_COLORS[seg.entity.type];
          return (
            <span
              key={i}
              className={cn("px-0.5 rounded cursor-help", colors?.bg, colors?.text)}
              title={`${colors?.label}: ${seg.text}`}
            >
              {seg.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

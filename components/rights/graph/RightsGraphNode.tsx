"use client";

/**
 * RightsGraphNode — 권리관계 노드 시각화 (설계 §4.8 ⑧)
 *
 * 현행 권리를 기본 표시하고 말소 권리는 "말소 보기" 토글로만 노출한다(취소선·opacity·"말소" 라벨).
 * 각 노드는 버튼으로 클릭·키보드(Enter/Space)로 펼쳐 접수일·등기순위·원문 근거를 열람할 수 있다.
 * 색상 외 아이콘·텍스트로도 위험 수준을 구분한다.
 * 현행 권리 없음/말소만 존재는 오류가 아닌 정상 빈 상태로 안내한다.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, XCircle, GitBranch, Shield, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/common";
import { NODE_COLORS, type GraphNode } from "./graph-types";

/** 노드 종류별 "내 보증금 회수 영향" 설명 — 추정이며 순위는 확정되지 않을 수 있음 */
const IMPACT_HINTS: Record<GraphNode["type"], string> = {
  mortgage: "선순위 근저당일 경우 배당에서 내 보증금보다 먼저 변제될 수 있습니다.",
  seizure: "압류·가처분 등은 권리 실행 시 보증금 회수가 지연·제한될 수 있습니다.",
  lease: "선행 임차·전세권이 선순위이면 내 보증금보다 먼저 변제됩니다.",
  trust: "신탁은 처분 권한이 수탁자에 있어 임대차 효력을 별도 확인해야 합니다.",
  ownership: "소유권 관련 권리로 소유자 변동·제한 여부를 확인하세요.",
  other: "권리 내용을 확인해 보증금 회수 영향 여부를 판단하세요.",
  property: "",
};

/** 등기 순위 표기(배당순위 확정값 아님) — 예: 2 또는 1-1 */
function orderLabel(node: GraphNode): string | null {
  if (node.order === undefined || !Number.isFinite(node.order)) return null;
  return node.subOrder ? `${node.order}-${node.subOrder}` : `${node.order}`;
}

function nodeAria(node: GraphNode): string {
  const kind = node.label.split("\n")[0];
  const holder = node.label.split("\n")[1] || "";
  const amount = node.amount > 0 ? `, 금액 ${(node.amount / 100000000).toFixed(1)}억원` : "";
  const state = node.isCancelled ? ", 말소됨" : "";
  return `${kind} ${holder}${amount}${state}. ${node.isCancelled ? "말소되어 영향 없음" : IMPACT_HINTS[node.type]} 펼쳐서 근거 보기`.trim();
}

interface Props {
  nodes: GraphNode[];
}

export function RightsGraphNode({ nodes }: Props) {
  const [showCancelled, setShowCancelled] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rootNode = nodes[0];
  const childNodes = useMemo(() => nodes.slice(1), [nodes]);
  const activeChildren = useMemo(() => childNodes.filter((n) => !n.isCancelled), [childNodes]);
  const cancelledChildren = useMemo(() => childNodes.filter((n) => n.isCancelled), [childNodes]);
  const visibleNodes = showCancelled ? childNodes : activeChildren;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <GitBranch size={14} aria-hidden />
          권리관계 그래프
        </h4>
        {cancelledChildren.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCancelled((v) => !v)}
            aria-pressed={showCancelled}
            className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {showCancelled ? `말소 숨기기` : `말소 포함 보기 (${cancelledChildren.length})`}
          </button>
        )}
      </div>

      {/* 루트 노드 (부동산) */}
      <div className="flex justify-center mb-4">
        <div className="px-4 py-2 bg-blue-100 border-2 border-blue-400 rounded-lg text-center">
          <p className="text-xs font-bold text-blue-800 break-words max-w-[240px]">{rootNode?.label}</p>
          <p className="text-[10px] text-blue-600">대상 부동산</p>
        </div>
      </div>

      {visibleNodes.length > 0 && (
        <div className="flex justify-center mb-2">
          <div className="w-0.5 h-6 bg-gray-300" aria-hidden />
        </div>
      )}

      {/* 하위 노드들 — 각 노드는 펼침 버튼 */}
      {visibleNodes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" role="list" aria-label="권리 노드 목록">
          {visibleNodes.map((node) => {
            const colors = NODE_COLORS[node.type] || NODE_COLORS.other;
            const kind = node.label.split("\n")[0];
            const holder = node.label.split("\n")[1] || "";
            const isOpen = expandedId === node.id;
            const panelId = `rgn-panel-${node.id}`;
            const ord = orderLabel(node);
            return (
              <div key={node.id} role="listitem">
                <button
                  type="button"
                  aria-label={nodeAria(node)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setExpandedId((cur) => (cur === node.id ? null : node.id))}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer",
                    isOpen ? "rounded-b-none" : "",
                    node.isCancelled ? "opacity-60 border-gray-300 bg-gray-50" : `${colors.bg} ${colors.border}`,
                  )}
                >
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <span className={cn("text-xs font-semibold break-words", node.isCancelled ? "text-gray-500 line-through" : colors.text)}>
                      {kind}
                    </span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      {node.isCancelled ? (
                        <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">말소</span>
                      ) : node.riskWeight >= 0.7 ? (
                        <XCircle size={12} className="text-red-500" aria-label="고위험" />
                      ) : node.riskWeight >= 0.4 ? (
                        <AlertTriangle size={12} className="text-amber-500" aria-label="주의" />
                      ) : (
                        <CheckCircle size={12} className="text-emerald-500" aria-label="참고" />
                      )}
                      <ChevronDown size={13} className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")} aria-hidden />
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 break-words">{holder}</p>
                  {node.amount > 0 && (
                    <p className="text-[10px] font-medium text-gray-700 mt-1">
                      {(node.amount / 100000000).toFixed(1)}억원
                    </p>
                  )}
                </button>

                {/* 근거 열람 패널 — 접수일·등기순위·원문 */}
                {isOpen && (
                  <div
                    id={panelId}
                    className="rounded-b-lg border-2 border-t-0 border-gray-200 bg-white px-3 py-2.5 text-[10px] leading-relaxed text-gray-600 space-y-1"
                  >
                    <p>
                      <span className="text-gray-400">접수일</span>{" "}
                      {node.date || "원문에서 확인되지 않음"}
                    </p>
                    <p>
                      <span className="text-gray-400">등기순위</span>{" "}
                      {ord ? `${ord}순위` : "확인되지 않음"}
                      <span className="text-gray-400"> · 실제 배당순위는 확정되지 않을 수 있습니다</span>
                    </p>
                    {node.detail && (
                      <p className="break-words">
                        <span className="text-gray-400">원문</span> {node.detail}
                      </p>
                    )}
                    {!node.isCancelled && node.type !== "property" && (
                      <p className="text-gray-500">{IMPACT_HINTS[node.type]}</p>
                    )}
                    {node.isCancelled && <p className="text-gray-400">말소된 권리로 보증금 회수에 영향이 없습니다.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 빈 상태 — 오류가 아닌 정상 안내 */}
      {childNodes.length === 0 && (
        <div className="flex items-center justify-center py-8 text-sm text-gray-400">
          <Shield size={16} className="mr-2" aria-hidden />
          등기부 데이터에서 권리관계를 추출할 수 없습니다
        </div>
      )}
      {childNodes.length > 0 && visibleNodes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-gray-400">
          <Shield size={16} className="mb-1.5" aria-hidden />
          현행(유효) 권리가 없습니다. 말소된 권리만 존재합니다.
          <span className="text-[11px] text-gray-400 mt-1">위 &lsquo;말소 포함 보기&rsquo;로 말소 내역을 확인할 수 있습니다.</span>
        </div>
      )}
    </Card>
  );
}

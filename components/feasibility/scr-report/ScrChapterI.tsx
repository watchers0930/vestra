"use client";

import { cn } from "@/lib/utils";
import { ScrSection, EmptyDataNotice, thCls, tdCls, tdNumCls } from "./scr-shared";
import { Building2, Calendar, Landmark, MapPin, Banknote, LayoutGrid } from "lucide-react";
import type {
  ScrProjectOverview,
  ScrSaleTypeRow,
  ScrPaymentScheduleRow,
  ScrScheduleItem,
  ScrLandStatusRow,
  ScrFundingPlan,
  ScrStructureDiagram,
} from "@/lib/feasibility/scr-types";

interface ScrChapterIProps {
  data: ScrProjectOverview;
}


/* ─── 표1: 사업개요 ─── */
function ProjectSummaryTable({ data }: { data: ScrProjectOverview["projectSummary"] }) {
  const rows = [
    ["사업명", data.projectName],
    ["소재지", data.siteAddress],
    ["지구/구역", data.zoneDistrict],
    ["시행사", data.developer],
    ["시공사", data.constructor],
    ["용도", data.purpose],
    ["대지면적", `${data.totalLandArea.toLocaleString()} m²`],
    ["연면적", `${data.totalFloorArea.toLocaleString()} m²`],
    ["건폐율 / 용적률", `${data.buildingCoverageRatio}% / ${data.floorAreaRatio}%`],
    ["규모", `지하 ${data.belowFloors}층 ~ 지상 ${data.aboveFloors}층, ${data.buildingCount}개동`],
    ["총 세대수", `${data.totalUnits.toLocaleString()} 세대`],
    ["공사기간", `${data.constructionPeriodMonths}개월${data.constructionStart ? ` (${data.constructionStart} ~ ${data.constructionEnd})` : ""}`],
  ];

  return (
    <ScrSection icon={Building2} title="표1. 사업개요">
      <div className="rounded-xl bg-gray-50/80 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, value], i) => (
              <tr key={i} className="border-b border-gray-100/80 last:border-0">
                <td className="py-2.5 px-4 text-[#6e6e73] w-[140px] md:w-[180px]">{label}</td>
                <td className="py-2.5 px-4 text-right font-medium text-[#1d1d1f]">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 그림1: 사업구조 플로우차트 SVG ─── */
function StructureDiagramView({ data }: { data: ScrStructureDiagram }) {
  // 박스 위치 정의 (SVG 좌표 기준)
  const boxW = 140;
  const boxH = 52;
  const svgW = 720;
  const svgH = 340;

  // 5개 주체 위치 (중앙 시행사 기준 배치)
  const entities = [
    { id: "buyer",       label: "수분양자",  name: data.buyer,        x: 50,  y: 30,  color: "#10b981", bg: "#ecfdf5" },
    { id: "developer",   label: "시행사",    name: data.developer,    x: 290, y: 30,  color: "#3b82f6", bg: "#eff6ff" },
    { id: "constructor", label: "시공사",    name: data.constructor,  x: 530, y: 30,  color: "#f59e0b", bg: "#fffbeb" },
    { id: "lender",      label: "대주단",    name: data.lenders.join(", ") || "-", x: 170, y: 220, color: "#8b5cf6", bg: "#f5f3ff" },
    { id: "trust",       label: "신탁사",    name: data.trustCompany, x: 410, y: 220, color: "#ec4899", bg: "#fdf2f8" },
  ];

  // 화살표 연결 관계
  const arrows: { from: string; to: string; label: string; dx?: number; dy?: number }[] = [
    { from: "buyer",       to: "developer",   label: "분양계약" },
    { from: "developer",   to: "constructor",  label: "시공계약" },
    { from: "lender",      to: "developer",   label: "PF 대출" },
    { from: "developer",   to: "trust",       label: "신탁계약" },
    { from: "lender",      to: "trust",       label: "담보신탁" },
  ];

  const getCenter = (id: string) => {
    const e = entities.find((e) => e.id === id)!;
    return { cx: e.x + boxW / 2, cy: e.y + boxH / 2 };
  };

  return (
    <ScrSection icon={LayoutGrid} title="그림1. 사업 구조도" sub="수분양자 / 시행사 / 시공사 / 대주단 / 신탁사 관계">
      {/* SVG 플로우차트 */}
      <div className="overflow-x-auto print:hidden">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full max-w-[720px] mx-auto"
          style={{ minWidth: 480 }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#6e6e73" />
            </marker>
          </defs>

          {/* 화살표 */}
          {arrows.map((arrow, i) => {
            const from = getCenter(arrow.from);
            const to = getCenter(arrow.to);
            // 간단한 직선 (박스 경계까지)
            const dx = to.cx - from.cx;
            const dy = to.cy - from.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / dist;
            const uy = dy / dist;
            // 박스 경계 보정
            const startX = from.cx + ux * (boxW / 2 + 2);
            const startY = from.cy + uy * (boxH / 2 + 2);
            const endX = to.cx - ux * (boxW / 2 + 8);
            const endY = to.cy - uy * (boxH / 2 + 8);
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            return (
              <g key={i}>
                <line
                  x1={startX} y1={startY}
                  x2={endX} y2={endY}
                  stroke="#d1d5db"
                  strokeWidth={1.5}
                  markerEnd="url(#arrowhead)"
                />
                <rect
                  x={midX - arrow.label.length * 4.5}
                  y={midY - 9}
                  width={arrow.label.length * 9}
                  height={18}
                  rx={9}
                  fill="white"
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#6e6e73"
                  fontWeight={500}
                >
                  {arrow.label}
                </text>
              </g>
            );
          })}

          {/* 엔티티 박스 */}
          {entities.map((e) => (
            <g key={e.id}>
              <rect
                x={e.x} y={e.y}
                width={boxW} height={boxH}
                rx={12}
                fill={e.bg}
                stroke={e.color}
                strokeWidth={1.5}
              />
              <text
                x={e.x + boxW / 2}
                y={e.y + 20}
                textAnchor="middle"
                fontSize={10}
                fill={e.color}
                fontWeight={700}
              >
                {e.label}
              </text>
              <text
                x={e.x + boxW / 2}
                y={e.y + 38}
                textAnchor="middle"
                fontSize={11}
                fill="#1d1d1f"
                fontWeight={600}
              >
                {e.name.length > 14 ? e.name.slice(0, 13) + "…" : e.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 인쇄용 대체 표시 */}
      <div className="hidden print:block">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {entities.map((e) => (
            <div key={e.id} className="rounded-lg border p-2 text-center" style={{ borderColor: e.color }}>
              <p className="text-[10px] font-bold" style={{ color: e.color }}>{e.label}</p>
              <p className="text-xs font-semibold text-[#1d1d1f]">{e.name}</p>
            </div>
          ))}
        </div>
      </div>

      {data.description && (
        <p className="text-xs text-[#6e6e73] mt-3 leading-relaxed">{data.description}</p>
      )}
    </ScrSection>
  );
}

/* ─── 표2: 사업일정 ─── */
function ScheduleTable({ items }: { items: ScrScheduleItem[] }) {
  const statusColor: Record<string, string> = {
    "완료": "bg-emerald-100 text-emerald-700",
    "진행중": "bg-blue-100 text-blue-700",
    "예정": "bg-gray-100 text-gray-600",
  };

  return (
    <ScrSection icon={Calendar} title="표2. 사업일정">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>마일스톤</th>
              <th className={cn(thCls, "text-center")}>계획일</th>
              <th className={cn(thCls, "text-center")}>실제일</th>
              <th className={cn(thCls, "text-center")}>상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{item.milestone}</td>
                <td className={cn(tdCls, "text-center")}>{item.plannedDate}</td>
                <td className={cn(tdCls, "text-center")}>{item.actualDate || "-"}</td>
                <td className={cn(tdCls, "text-center")}>
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold", statusColor[item.status])}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표3,4: 분양가 테이블 ─── */
function SaleTypeTable({ rows, label }: { rows: ScrSaleTypeRow[]; label: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#6e6e73] mb-2">{label}</p>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>타입</th>
              <th className={cn(thCls, "text-right")}>세대수</th>
              <th className={cn(thCls, "text-right")}>전용(m²)</th>
              <th className={cn(thCls, "text-right")}>공급(m²)</th>
              <th className={cn(thCls, "text-right")}>전용 평당가</th>
              <th className={cn(thCls, "text-right")}>공급 평당가</th>
              <th className={cn(thCls, "text-right")}>세대당 분양가</th>
              <th className={cn(thCls, "text-right")}>소계(만원)</th>
              <th className={cn(thCls, "text-right")}>구성비</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={tdCls}>{r.type}</td>
                <td className={tdNumCls}>{r.units}</td>
                <td className={tdNumCls}>{r.exclusiveArea.toFixed(2)}</td>
                <td className={tdNumCls}>{r.supplyArea.toFixed(2)}</td>
                <td className={tdNumCls}>{r.pricePerExclusivePyeong.toLocaleString()}</td>
                <td className={tdNumCls}>{r.pricePerSupplyPyeong.toLocaleString()}</td>
                <td className={tdNumCls}>{r.pricePerUnit.toLocaleString()}</td>
                <td className={tdNumCls}>{r.totalRevenue.toLocaleString()}</td>
                <td className={tdNumCls}>{r.ratio.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── 표5: 납입일정 ─── */
function PaymentScheduleTable({ rows }: { rows: ScrPaymentScheduleRow[] }) {
  return (
    <ScrSection icon={Banknote} title="표5. 분양대금 납입일정">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>단계</th>
              <th className={cn(thCls, "text-right")}>납입비율</th>
              <th className={cn(thCls, "text-center")}>납입일</th>
              <th className={cn(thCls, "text-right")}>금액(만원)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className={tdCls}>{r.stage}</td>
                <td className={tdNumCls}>{r.percentage}%</td>
                <td className={cn(tdCls, "text-center")}>{r.dueDate}</td>
                <td className={tdNumCls}>{r.amount ? r.amount.toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 표6: 자금조달 ─── */
function FundingPlanView({ data }: { data: ScrFundingPlan }) {
  const rows = [
    ["기존 PF", `${data.existingPfAmount.toLocaleString()} 만원`, `금리 ${data.pfInterestRateExisting}%`],
    ["신규 PF", `${data.newPfAmount.toLocaleString()} 만원`, `금리 ${data.pfInterestRateNew}%`],
    ["PF 합계", `${data.pfTotal.toLocaleString()} 만원`, `만기 ${data.pfMaturityMonths}개월`],
    ["자기자본", `${data.equityAmount.toLocaleString()} 만원`, ""],
    ["신탁사", data.trustCompany, ""],
  ];

  return (
    <ScrSection icon={Landmark} title="표6. 자금조달">
      <div className="rounded-xl bg-gray-50/80 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, value, note], i) => (
              <tr key={i} className="border-b border-gray-100/80 last:border-0">
                <td className="py-2.5 px-4 text-[#6e6e73] w-[120px]">{label}</td>
                <td className="py-2.5 px-4 font-medium text-[#1d1d1f] text-right">{value}</td>
                <td className="py-2.5 px-4 text-xs text-[#86868b]">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.lenders.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-xs text-[#6e6e73] mr-1">대주단:</span>
          {data.lenders.map((l) => (
            <span key={l} className="px-2 py-0.5 rounded-full bg-gray-100 text-[#1d1d1f] text-[11px] font-medium">{l}</span>
          ))}
        </div>
      )}
    </ScrSection>
  );
}

/* ─── 표7: 토지현황 ─── */
function LandStatusTable({ rows }: { rows: ScrLandStatusRow[] }) {
  return (
    <ScrSection icon={MapPin} title="표7. 매입토지 현황">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className={cn(thCls, "text-left")}>지번</th>
              <th className={cn(thCls, "text-center")}>구분</th>
              <th className={cn(thCls, "text-right")}>면적(m²)</th>
              <th className={cn(thCls, "text-right")}>평당가(만원)</th>
              <th className={cn(thCls, "text-right")}>금액(만원)</th>
              <th className={cn(thCls, "text-left")}>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className={tdCls}>{r.parcel}</td>
                <td className={cn(tdCls, "text-center")}>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-medium",
                    r.landType === "사유지" ? "bg-blue-100 text-blue-700" :
                    r.landType === "공유지" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    {r.landType}
                  </span>
                </td>
                <td className={tdNumCls}>{r.area.toLocaleString()}</td>
                <td className={tdNumCls}>{r.pricePerPyeong.toLocaleString()}</td>
                <td className={tdNumCls}>{r.totalPrice.toLocaleString()}</td>
                <td className={cn(tdCls, "text-xs text-[#6e6e73]")}>{r.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrSection>
  );
}

/* ─── 메인 I장 컴포넌트 ─── */
export function ScrChapterI({ data }: ScrChapterIProps) {
  return (
    <div className="space-y-5">
      <ProjectSummaryTable data={data.projectSummary} />
      <StructureDiagramView data={data.structureDiagram} />

      {/* 표2: 사업일정 */}
      {data.schedule.length > 0 ? (
        <ScheduleTable items={data.schedule} />
      ) : (
        <ScrSection icon={Calendar} title="표2. 사업일정">
          <EmptyDataNotice message="공정 일정 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {/* 표3,4: 분양가 */}
      {data.salePlan.excludingExpansion.length > 0 ||
      data.salePlan.includingExpansion.length > 0 ? (
        <ScrSection icon={Banknote} title="표3~4. 타입별 분양가">
          <div className="space-y-5">
            <SaleTypeTable rows={data.salePlan.excludingExpansion} label="확장비 미포함" />
            <SaleTypeTable rows={data.salePlan.includingExpansion} label="확장비 포함" />
          </div>
        </ScrSection>
      ) : (
        <ScrSection icon={Banknote} title="표3~4. 타입별 분양가">
          <EmptyDataNotice message="타입별 분양가 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      {/* 표5: 납입일정 */}
      {data.paymentSchedule.length > 0 ? (
        <PaymentScheduleTable rows={data.paymentSchedule} />
      ) : (
        <ScrSection icon={Banknote} title="표5. 분양대금 납입일정">
          <EmptyDataNotice message="분양대금 납입일정 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}

      <FundingPlanView data={data.fundingPlan} />

      {/* 표7: 토지현황 */}
      {data.landStatus.length > 0 ? (
        <LandStatusTable rows={data.landStatus} />
      ) : (
        <ScrSection icon={MapPin} title="표7. 매입토지 현황">
          <EmptyDataNotice message="매입토지 현황 데이터가 추출되지 않았습니다." />
        </ScrSection>
      )}
    </div>
  );
}

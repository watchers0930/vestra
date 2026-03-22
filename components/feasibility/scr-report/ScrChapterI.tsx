"use client";

import { cn } from "@/lib/utils";
import { ScrSection, thCls, tdCls, tdNumCls } from "./scr-shared";
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

/* ─── 구조도 ─── */
function StructureDiagramView({ data }: { data: ScrStructureDiagram }) {
  return (
    <ScrSection icon={LayoutGrid} title="사업 구조도" sub="수분양자 / 시행사 / 대주단 / 신탁사 관계">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "수분양자", value: data.buyer },
          { label: "시행사", value: data.developer },
          { label: "시공사", value: data.constructor },
          { label: "신탁사", value: data.trustCompany },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-gray-50/80 p-3 text-center">
            <p className="text-[11px] text-[#6e6e73] mb-1">{item.label}</p>
            <p className="text-sm font-semibold text-[#1d1d1f]">{item.value}</p>
          </div>
        ))}
      </div>
      {data.lenders.length > 0 && (
        <div className="mt-3 rounded-xl bg-blue-50/60 border border-blue-100 p-3">
          <p className="text-[11px] text-blue-600 font-semibold mb-1.5">대주단</p>
          <div className="flex flex-wrap gap-1.5">
            {data.lenders.map((l) => (
              <span key={l} className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">{l}</span>
            ))}
          </div>
        </div>
      )}
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
      <ScheduleTable items={data.schedule} />

      {/* 표3,4: 분양가 */}
      <ScrSection icon={Banknote} title="표3~4. 타입별 분양가">
        <div className="space-y-5">
          <SaleTypeTable rows={data.salePlan.excludingExpansion} label="확장비 미포함" />
          <SaleTypeTable rows={data.salePlan.includingExpansion} label="확장비 포함" />
        </div>
      </ScrSection>

      <PaymentScheduleTable rows={data.paymentSchedule} />
      <FundingPlanView data={data.fundingPlan} />
      <LandStatusTable rows={data.landStatus} />
    </div>
  );
}

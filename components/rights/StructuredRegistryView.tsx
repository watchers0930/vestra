"use client";

import { formatKRW, cn } from "@/lib/utils";
import type { ParsedRegistry } from "@/lib/registry-parser";

// ─── 금액 강조 ───

function AmountText({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return <span className="text-red-600 font-semibold">{formatKRW(amount)}</span>;
}

// ─── 위험 배지 ───

const DANGER_KEYWORDS = /압류|가압류|가처분|경매|강제경매|임의경매/;

function PurposeBadge({ purpose, isCancelled }: { purpose: string; isCancelled: boolean }) {
  if (isCancelled) return null;
  if (!DANGER_KEYWORDS.test(purpose)) return null;
  return (
    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-medium rounded bg-red-100 text-red-700 border border-red-200">
      {purpose}
    </span>
  );
}

// ─── 테이블 행 렌더러 ───

function InfoRow({ label, value, idx }: { label: string; value: string; idx: number }) {
  return (
    <tr className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
      <td className="px-3 py-2 font-medium text-gray-500 w-24 whitespace-nowrap border-r border-gray-100">
        {label}
      </td>
      <td className="px-3 py-2 text-gray-900">{value}</td>
    </tr>
  );
}

// ─── 표제부 섹션 (집합건물 3단 구조) ───

function ApartmentTitleSection({ parsed }: { parsed: ParsedRegistry }) {
  const { title } = parsed;

  const buildingRows = [
    { label: "소재지번", value: title.address },
    { label: "건물명칭", value: title.buildingName },
    { label: "구  조", value: title.structure },
    { label: "층  수", value: title.totalFloors },
    { label: "용  도", value: title.purpose },
  ].filter((r) => r.value);

  const unitRows = [
    { label: "건물번호", value: title.unitNumber },
    { label: "전용면적", value: title.exclusiveArea || title.area },
  ].filter((r) => r.value);

  const landRows = [
    { label: "대지권비율", value: title.landRightRatio },
  ].filter((r) => r.value);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-gray-900 rounded-full" />
        표제부
      </h4>

      {/* 1동의 건물의 표시 */}
      {buildingRows.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 mb-1 pl-1">1동의 건물의 표시</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {buildingRows.map((row, i) => (
                  <InfoRow key={i} label={row.label} value={row.value} idx={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 전유부분의 건물의 표시 */}
      {unitRows.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 mb-1 pl-1">전유부분의 건물의 표시</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {unitRows.map((row, i) => (
                  <InfoRow key={i} label={row.label} value={row.value} idx={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 대지권의 표시 */}
      {landRows.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 mb-1 pl-1">대지권의 표시</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {landRows.map((row, i) => (
                  <InfoRow key={i} label={row.label} value={row.value} idx={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 표제부 섹션 (일반 건물) ───

function SimpleTitleSection({ parsed }: { parsed: ParsedRegistry }) {
  const { title } = parsed;

  const rows = [
    { label: "소재지번", value: title.address },
    { label: "건물내역", value: title.buildingDetail },
    { label: "전용면적", value: title.area },
    { label: "구조", value: title.structure },
    { label: "용도", value: title.purpose },
    { label: "대지권비율", value: title.landRightRatio },
  ].filter((r) => r.value);

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-gray-900 rounded-full" />
        표제부
      </h4>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <tbody>
            {rows.map((row, i) => (
              <InfoRow key={i} label={row.label} value={row.value} idx={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 갑구 섹션 ───

function GapguSection({ parsed }: { parsed: ParsedRegistry }) {
  if (parsed.gapgu.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
        갑구 (소유권에 관한 사항)
        <span className="text-xs font-normal text-gray-400">{parsed.gapgu.length}건</span>
      </h4>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-2 py-2 text-left font-medium text-gray-600 w-10">순위</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 w-24">접수일자</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 w-28">등기목적</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">권리자 및 기타사항</th>
            </tr>
          </thead>
          <tbody>
            {parsed.gapgu.map((entry, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-gray-100 last:border-b-0",
                  entry.isCancelled
                    ? "bg-gray-50 text-gray-400 line-through"
                    : i % 2 === 0
                    ? "bg-white"
                    : "bg-gray-50/50",
                )}
              >
                <td className="px-2 py-2 font-mono text-gray-400">{entry.order}</td>
                <td className="px-2 py-2 whitespace-nowrap">{entry.date}</td>
                <td className="px-2 py-2">
                  {entry.purpose}
                  <PurposeBadge purpose={entry.purpose} isCancelled={entry.isCancelled} />
                  {entry.isCancelled && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] rounded bg-gray-200 text-gray-500 no-underline inline-block">
                      말소
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">{entry.holder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 을구 섹션 ───

function EulguSection({ parsed }: { parsed: ParsedRegistry }) {
  if (parsed.eulgu.length === 0) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
          을구 (소유권 이외의 권리에 관한 사항)
        </h4>
        <p className="text-xs text-gray-400 pl-4">기록사항 없음</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
        을구 (소유권 이외의 권리에 관한 사항)
        <span className="text-xs font-normal text-gray-400">{parsed.eulgu.length}건</span>
      </h4>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-2 py-2 text-left font-medium text-gray-600 w-10">순위</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 w-24">접수일자</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 w-28">등기목적</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 w-28">채권액</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">권리자 및 기타사항</th>
            </tr>
          </thead>
          <tbody>
            {parsed.eulgu.map((entry, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-gray-100 last:border-b-0",
                  entry.isCancelled
                    ? "bg-gray-50 text-gray-400 line-through"
                    : i % 2 === 0
                    ? "bg-white"
                    : "bg-gray-50/50",
                )}
              >
                <td className="px-2 py-2 font-mono text-gray-400">{entry.order}</td>
                <td className="px-2 py-2 whitespace-nowrap">{entry.date}</td>
                <td className="px-2 py-2">
                  {entry.purpose}
                  <PurposeBadge purpose={entry.purpose} isCancelled={entry.isCancelled} />
                  {entry.isCancelled && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] rounded bg-gray-200 text-gray-500 no-underline inline-block">
                      말소
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">
                  <AmountText amount={entry.amount} />
                </td>
                <td className="px-2 py-2">{entry.holder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ───

interface StructuredRegistryViewProps {
  parsed: ParsedRegistry;
}

export function StructuredRegistryView({ parsed }: StructuredRegistryViewProps) {
  const isApartment = parsed.title.isApartment;

  return (
    <div className="space-y-5">
      {isApartment ? (
        <ApartmentTitleSection parsed={parsed} />
      ) : (
        <SimpleTitleSection parsed={parsed} />
      )}
      <GapguSection parsed={parsed} />
      <EulguSection parsed={parsed} />
    </div>
  );
}

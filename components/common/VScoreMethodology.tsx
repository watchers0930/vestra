/**
 * V-Score 방법론·검증 성능 공개 컴포넌트 (P0-6)
 * 검증 가능한 사실만 표시(과장 없는 투명 공개).
 */
import {
  VSCORE_COMPONENTS,
  VSCORE_EVIDENCE,
  VSCORE_METHODOLOGY,
  VSCORE_LIMITATIONS,
} from "@/lib/vscore-methodology";

export function VScoreMethodology() {
  const evidence = VSCORE_EVIDENCE.filter((e) => e.verifiable);

  return (
    <div className="space-y-10">
      {/* 방법론 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">산출 원리</h2>
        <p className="text-sm leading-relaxed text-gray-700">{VSCORE_METHODOLOGY.summary}</p>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
          <li>· {VSCORE_METHODOLOGY.xai}</li>
          <li>· {VSCORE_METHODOLOGY.confidence}</li>
        </ul>
      </section>

      {/* 가중치 구성 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">구성 소스와 가중치</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">소스</th>
                <th className="py-2 pr-4 font-medium">가중치</th>
                <th className="py-2 font-medium">설명</th>
              </tr>
            </thead>
            <tbody>
              {VSCORE_COMPONENTS.map((c) => (
                <tr key={c.key} className="border-b border-gray-100 align-top">
                  <td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-700">{(c.weight * 100).toFixed(0)}%</td>
                  <td className="py-2.5 text-gray-600">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">가중치 합 100% · 신뢰도(데이터 충분성)로 보정 후 0~100 산출</p>
      </section>

      {/* 검증 성능 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">검증 성능</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {evidence.map((e) => (
            <div key={e.label} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{e.label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{e.value}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{e.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 한계(투명 공개) */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-semibold text-amber-800 mb-2">투명 공개 — 한계와 주의</h2>
        <ul className="space-y-1.5 text-xs leading-relaxed text-amber-700">
          {VSCORE_LIMITATIONS.map((l, i) => (
            <li key={i}>· {l}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

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

      {/* 대표 위험 유형 검증 (골든 사례집) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">대표 위험 유형 검증</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-3">
          전세 위험의 대표 유형 15가지를 실제 등기부 사례로 구성해, <strong className="text-gray-900">매 배포마다 엔진이 올바르게 판정하는지 자동 검증</strong>합니다.
          &lsquo;위험한 물건을 안전으로 판정하는 중대 누락&rsquo;이 발생하면 배포가 자동 차단됩니다. 각 사례의 정답은 엔진 규칙이 아니라
          <strong className="text-gray-900"> &lsquo;실제로 세입자에게 위험한가&rsquo;</strong>라는 현실 기준으로 정합니다.
        </p>
        <p className="text-xs text-gray-500 mb-2">엔진이 감지하는 주요 위험 유형</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[
            "선순위 채권 과다(깡통전세)", "압류·경매개시", "신탁등기", "소유권이전청구권 가등기",
            "주택임차권등기(보증금 미반환 이력)", "처분금지가처분", "비주거용(근린생활시설)",
            "다중 근저당", "소유권 빈번 이전", "본인 전세권 구분", "말소 권리 구분", "정보 부족 반영",
          ].map((t) => (
            <span key={t} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">{t}</span>
          ))}
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-blue-800 mb-1.5">투명 공개 — 검증으로 바로잡은 판정 결함 3건</p>
          <ul className="space-y-1 text-xs leading-relaxed text-blue-700">
            <li>· 전세권자(개인) 식별 오류로 세입자 본인 전세권을 과도하게 위험 판정하던 문제 → 수정</li>
            <li>· 신탁등기(수탁자 소유)를 놓쳐 위험을 과소평가하던 문제 → 수정</li>
            <li>· 소유권이전청구권 가등기를 &lsquo;양호&rsquo;로 오판하던 위험 누락 → 수정</li>
          </ul>
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

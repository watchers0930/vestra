"use client";

interface Props {
  name: string;
  todoTotal: number;
  counts: { notices: number; consults: number; visits: number };
}

function todayLabel() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const week = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${yyyy}.${mm}.${dd} (${week})`;
}

const KPI: { key: "notices" | "consults" | "visits"; label: string }[] = [
  { key: "notices", label: "검수 대기" },
  { key: "consults", label: "신규 상담" },
  { key: "visits", label: "방문 예약" },
];

/** 에디토리얼 히어로 — 날짜 라벨 + 대형 인사 + 오늘 할 일 + KPI */
export function DashboardHero({ name, todoTotal, counts }: Props) {
  return (
    <section className="border-b border-gray-200 pb-8 mb-8">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-blue-600 uppercase">
        VESTRA 전문가센터 · {todayLabel()}
      </p>

      <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
        {name}님, 안녕하세요.
      </h1>
      <p className="mt-2 text-lg text-gray-500">
        {todoTotal > 0 ? (
          <>
            오늘 처리할 사건이 <span className="font-bold text-gray-900">{todoTotal}건</span> 있습니다.
          </>
        ) : (
          <>대기 중인 사건이 없습니다. 오늘도 좋은 하루 되세요.</>
        )}
      </p>

      {/* KPI 인라인 */}
      <div className="mt-7 grid grid-cols-3 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        {KPI.map((k) => (
          <div key={k.key} className="bg-white px-5 py-4">
            <div className="text-3xl font-bold tabular-nums text-gray-900">
              {counts[k.key]}
              <span className="text-base font-medium text-gray-400 ml-0.5">건</span>
            </div>
            <div className="mt-1 text-xs font-medium tracking-wide text-gray-500">{k.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

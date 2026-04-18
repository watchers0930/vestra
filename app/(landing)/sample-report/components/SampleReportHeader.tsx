export function SampleReportHeader() {
  return (
    <div className="bg-white rounded-2xl p-8 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        {/* 매물 정보 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white bg-[#00042a] px-3 py-1 rounded-full">
              권리분석 리포트
            </span>
            <span className="text-[10px] text-[#86868b]">분석일 2026.04.18</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#1d1d1f] tracking-tight mb-1">
            서울시 강남구 역삼동 830-32
          </h1>
          <p className="text-sm text-[#6e6e73]">역삼 센트럴 아이파크 107동 1502호 · 전용 84.92㎡</p>
        </div>

        {/* V-Score */}
        <div className="flex-shrink-0 text-center">
          <div className="relative w-28 h-28 mx-auto mb-2">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f5f5f7" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="#00042a" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 40 * 0.87} ${2 * Math.PI * 40}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-[#1d1d1f]">87</span>
              <span className="text-[9px] font-bold text-[#6e6e73] tracking-wider uppercase">V-Score</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            안전 등급
          </div>
        </div>
      </div>

      {/* 핵심 지표 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-[#f5f5f7]">
        {[
          { label: "근저당 설정액", value: "없음", sub: "권리 부담 없음", ok: true },
          { label: "전세가율", value: "68%", sub: "안전 기준 이하", ok: true },
          { label: "보증보험 가입", value: "가능", sub: "HUG 기준 충족", ok: true },
          { label: "임대인 세금 체납", value: "미확인", sub: "직접 확인 권장", ok: false },
        ].map((item) => (
          <div key={item.label} className="bg-[#f9f9fb] rounded-xl p-4">
            <p className="text-[10px] text-[#86868b] mb-1">{item.label}</p>
            <p className={`text-lg font-extrabold tracking-tight ${item.ok ? "text-[#1d1d1f]" : "text-amber-600"}`}>
              {item.value}
            </p>
            <p className="text-[11px] text-[#86868b] mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

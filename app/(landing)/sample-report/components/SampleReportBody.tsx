const RIGHTS_ITEMS = [
  { label: "소유권", status: "정상", detail: "단독 소유 (김○○), 이전 이력 없음", ok: true },
  { label: "근저당권", status: "없음", detail: "설정된 근저당 없음 — 매우 안전", ok: true },
  { label: "가압류·압류", status: "없음", detail: "확인된 압류·가압류 없음", ok: true },
  { label: "전세권 설정", status: "미설정", detail: "전세권 미설정, 확정일자 확인 필요", ok: true },
  { label: "신탁 등기", status: "없음", detail: "신탁 설정 이력 없음", ok: true },
  { label: "예고 등기", status: "없음", detail: "예고 등기 없음", ok: true },
];

const RISK_ITEMS = [
  { level: "주의", icon: "⚠️", title: "임대인 세금 체납 여부 미확인", desc: "국세·지방세 체납 여부는 임대인에게 직접 납세 증명서를 요청하세요." },
  { level: "확인", icon: "ℹ️", title: "전입신고 및 확정일자 취득 필요", desc: "계약 후 즉시 전입신고하고 확정일자를 받아 대항력을 확보하세요." },
  { level: "확인", icon: "ℹ️", title: "관리비 미납 이력 확인 권장", desc: "관리비 장기 미납 이력은 매도 의사 신호일 수 있어 관리사무소에 확인하세요." },
];

const PRICE_DATA = [
  { month: "23.10", price: 115000 },
  { month: "24.01", price: 118000 },
  { month: "24.04", price: 116500 },
  { month: "24.07", price: 121000 },
  { month: "24.10", price: 124000 },
  { month: "25.01", price: 127500 },
  { month: "25.04", price: 131000 },
];

export function SampleReportBody() {
  const min = Math.min(...PRICE_DATA.map((d) => d.price));
  const max = Math.max(...PRICE_DATA.map((d) => d.price));
  const range = max - min;
  return (
    <div className="space-y-6">
      {/* 권리관계 분석 */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h2 className="text-base font-extrabold text-[#1d1d1f] mb-6 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#00042a] rounded-full inline-block" />
          권리관계 분석
        </h2>
        <div className="space-y-3">
          {RIGHTS_ITEMS.map((item) => (
            <div key={item.label} className="flex items-start gap-4 py-3 border-b border-[#f5f5f7] last:border-0">
              <div className="flex-shrink-0 w-24 text-xs font-bold text-[#6e6e73]">{item.label}</div>
              <div className={`flex-shrink-0 text-xs font-extrabold px-2 py-0.5 rounded-full ${
                item.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}>
                {item.status}
              </div>
              <p className="text-xs text-[#6e6e73] leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 시세 분석 */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h2 className="text-base font-extrabold text-[#1d1d1f] mb-2 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#00042a] rounded-full inline-block" />
          실거래가 추이 (84㎡ 기준)
        </h2>
        <p className="text-xs text-[#86868b] mb-6">최근 18개월 국토부 실거래 데이터 기반</p>
        <div className="flex items-end justify-between gap-2 mb-2 px-1">
          {PRICE_DATA.map((d) => (
            <div key={d.month} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] font-bold text-[#1d1d1f]">{(d.price / 10000).toFixed(1)}억</span>
              <div
                className="w-full rounded-t-sm bg-[#00042a]"
                style={{ height: `${((d.price - min) / range) * 60 + 16}px`, opacity: d.month === "25.04" ? 1 : 0.3 }}
              />
              <span className="text-[9px] text-[#86868b]">{d.month}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-[#f5f5f7]">
          <div>
            <p className="text-[10px] text-[#86868b] mb-1">최근 실거래가</p>
            <p className="text-lg font-extrabold text-[#1d1d1f]">13.1억</p>
          </div>
          <div>
            <p className="text-[10px] text-[#86868b] mb-1">18개월 변동</p>
            <p className="text-lg font-extrabold text-emerald-600">+13.9%</p>
          </div>
          <div>
            <p className="text-[10px] text-[#86868b] mb-1">전세가율</p>
            <p className="text-lg font-extrabold text-[#1d1d1f]">68%</p>
          </div>
        </div>
      </div>

      {/* 위험 요소 */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h2 className="text-base font-extrabold text-[#1d1d1f] mb-6 flex items-center gap-2">
          <span className="w-1 h-5 bg-amber-400 rounded-full inline-block" />
          확인 필요 항목
        </h2>
        <div className="space-y-4">
          {RISK_ITEMS.map((item) => (
            <div key={item.title} className={`rounded-xl p-5 ${
              item.level === "주의" ? "bg-amber-50 border border-amber-100" : "bg-[#f5f5f7]"
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">{item.icon}</span>
                <span className={`text-[10px] font-bold tracking-widest uppercase ${
                  item.level === "주의" ? "text-amber-600" : "text-[#6e6e73]"
                }`}>{item.level}</span>
              </div>
              <p className="text-sm font-bold text-[#1d1d1f] mb-1">{item.title}</p>
              <p className="text-xs text-[#6e6e73] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 종합 의견 */}
      <div className="bg-[#f5f5f7] rounded-2xl p-8">
        <h2 className="text-base font-extrabold text-[#1d1d1f] mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#00042a] rounded-full inline-block" />
          AI 종합 의견
        </h2>
        <p className="text-sm text-[#424245] leading-[1.8]">
          해당 매물은 <strong className="text-[#1d1d1f]">근저당 설정이 없고 권리관계가 깨끗한 안전 등급(V-Score 87)</strong> 물건입니다.
          전세가율 68%는 보증보험 가입 기준(80%)을 하회하여 HUG 가입이 가능합니다.
          다만 <strong className="text-[#1d1d1f]">임대인의 세금 체납 여부를 반드시 확인</strong>하고,
          계약 당일 전입신고 및 확정일자를 취득하여 대항력을 확보하시기 바랍니다.
          전세권 설정을 추가로 검토하시면 법적 보호가 한층 강화됩니다.
        </p>
        <div className="mt-5 flex items-center gap-2 text-xs text-[#86868b]">
          <span>⚡</span>
          <span>본 리포트는 VESTRA AI가 공공데이터를 기반으로 생성한 참고용 분석입니다. 법적 효력이 없으며 전문가 상담을 병행하시기 바랍니다.</span>
        </div>
      </div>
    </div>
  );
}

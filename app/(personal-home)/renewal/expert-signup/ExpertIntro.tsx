import { Globe, Users, FileCheck, CalendarCheck } from "lucide-react";

const FIELDS = ["변호사", "법무사", "세무사", "회계사", "감정평가사"];

const BENEFITS = [
  { icon: Globe, title: "나만의 전문가 홈페이지", desc: "약력·경력·전문분야를 담은 미니홈페이지가 자동으로 만들어집니다." },
  { icon: Users, title: "고객 상담·의뢰 연결", desc: "부동산 분쟁·자문이 필요한 고객과 1:1로 직접 연결됩니다." },
  { icon: FileCheck, title: "내용증명 검수·수임", desc: "AI가 작성한 내용증명을 검수하고 전자직인으로 수임합니다." },
  { icon: CalendarCheck, title: "상담·방문 일정 관리", desc: "상담 신청과 방문 예약을 캘린더 한 곳에서 관리합니다." },
];

const ACCENT = "#2e4bd8";

/**
 * 전문가 가입 좌측 설명 칼럼 (배지·타이틀·분야·혜택).
 * 로그인 전(ExpertLoginGate)과 로그인 후(ExpertSignupContent) 양쪽에서 공유해
 * 두 화면의 좌측 브랜딩 영역을 동일하게 유지한다.
 */
export default function ExpertIntro() {
  return (
    <div style={{ flex: "1 1 560px", minWidth: 0, position: "sticky", top: 100, alignSelf: "flex-start" }}>
      <span
        className="inline-block rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide"
        style={{ background: "rgba(46,75,216,0.08)", color: ACCENT }}
      >
        VESTRA 전문가 파트너
      </span>
      <h1 className="mt-6 font-extrabold leading-tight text-gray-900" style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)" }}>
        부동산 전문가로,<br /><span style={{ fontWeight: 100 }}>더 많은 고객과 만나세요</span>
      </h1>
      <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-gray-500">
        VESTRA에 전문가로 등록하면 나만의 홈페이지부터 고객 연결,<br />내용증명 수임까지
        한 곳에서 시작할 수 있습니다.
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
        {FIELDS.map((f) => (
          <span key={f} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
            {f}
          </span>
        ))}
      </div>

      {/* 혜택 리스트 */}
      <div className="mt-10 flex flex-col gap-6">
        {BENEFITS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(46,75,216,0.08)" }}>
              <Icon size={19} style={{ color: ACCENT }} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

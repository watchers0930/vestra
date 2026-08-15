import { Bell, Mail, MessageSquare, TrendingUp, FileText, Megaphone, Gift, Smartphone, BellRing, Phone } from "lucide-react";

interface Props {
  notifications: Record<string, string | boolean | null> | null;
  notifLoading: boolean;
  phoneSaving: boolean;
  handleToggleNotification: (key: string) => void;
  handlePhoneChange: (key: "kakaoPhoneNumber" | "smsPhoneNumber", value: string) => void;
  handlePhoneSave: (key: "kakaoPhoneNumber" | "smsPhoneNumber") => void;
}

const CHANNELS = [
  { key: "webPushEnabled", label: "웹 푸시", desc: "브라우저 푸시 알림 수신", icon: BellRing },
  { key: "emailEnabled", label: "이메일 알림", desc: "분석 결과 및 중요 알림을 이메일로 받기", icon: Mail },
  { key: "kakaoEnabled", label: "카카오 알림톡", desc: "카카오톡으로 알림 받기", icon: MessageSquare, phone: "kakaoPhoneNumber" },
  { key: "smsEnabled", label: "SMS 알림", desc: "문자 메시지로 알림 받기 (준비 중)", icon: Smartphone, phone: "smsPhoneNumber", badge: "준비 중" },
] as const;

const TYPES = [
  { key: "registryChangeAlert", label: "등기 변동 알림", desc: "감시 중인 부동산의 등기 변동 감지 시 알림", icon: FileText },
  { key: "priceAlert", label: "시세 변동 알림", desc: "등록 자산의 가격 변동 시 알림", icon: TrendingUp },
  { key: "analysisReport", label: "주간 분석 리포트", desc: "매주 자산 현황 요약 리포트", icon: FileText },
  { key: "systemNotice", label: "공지사항 알림", desc: "서비스 공지 및 업데이트", icon: Megaphone },
  { key: "marketingEmail", label: "마케팅 수신", desc: "이벤트 및 프로모션 정보", icon: Gift },
];

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative h-5.5 w-10 rounded-full transition-colors ${on ? "bg-primary" : "bg-[#e5e5e7]"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : ""}`} />
    </button>
  );
}

export default function ProfileNotifPanel({ notifications, notifLoading, phoneSaving, handleToggleNotification, handlePhoneChange, handlePhoneSave }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Bell size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
        <h3 className="font-semibold">알림 설정</h3>
      </div>
      {notifications ? (
        <div className="space-y-1">
          <p className="pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-[#6e6e73]">채널</p>
          {CHANNELS.map((item) => {
            const Icon = item.icon;
            const on = !!notifications[item.key];
            const phoneKey = "phone" in item ? item.phone : undefined;
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="flex-shrink-0 text-[#6e6e73]" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f]">
                        {item.label}
                        {"badge" in item && item.badge && (
                          <span className="ml-1.5 inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">{item.badge}</span>
                        )}
                      </p>
                      <p className="text-xs text-[#6e6e73]">{item.desc}</p>
                    </div>
                  </div>
                  <Toggle on={on} onClick={() => handleToggleNotification(item.key)} disabled={notifLoading} />
                </div>
                {phoneKey && on && (
                  <div className="ml-7 mb-2 flex items-center gap-2">
                    <Phone size={14} className="flex-shrink-0 text-[#6e6e73]" strokeWidth={1.5} />
                    <input
                      type="tel"
                      placeholder="010-0000-0000"
                      value={(notifications[phoneKey] as string) || ""}
                      onChange={(e) => handlePhoneChange(phoneKey, e.target.value)}
                      onBlur={() => handlePhoneSave(phoneKey)}
                      disabled={phoneSaving}
                      className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}
              </div>
            );
          })}

          <p className="pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-[#6e6e73]">알림 유형</p>
          {TYPES.map((item) => {
            const Icon = item.icon;
            const on = !!notifications[item.key];
            return (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Icon size={16} className="flex-shrink-0 text-[#6e6e73]" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f]">{item.label}</p>
                    <p className="text-xs text-[#6e6e73]">{item.desc}</p>
                  </div>
                </div>
                <Toggle on={on} onClick={() => handleToggleNotification(item.key)} disabled={notifLoading} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-32 animate-pulse rounded-lg bg-[#e5e5e7]" />
      )}
    </div>
  );
}

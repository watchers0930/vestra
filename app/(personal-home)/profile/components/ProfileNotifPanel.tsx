import { Bell, Mail, MessageSquare, TrendingUp, FileText, Megaphone, Gift, Smartphone, BellRing, Phone } from "lucide-react";
import s from "../profile-renewal.module.css";

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
    <button onClick={onClick} disabled={disabled} className={`${s.toggle} ${on ? s.toggleOn : ""}`}>
      <span className={s.toggleKnob} />
    </button>
  );
}

export default function ProfileNotifPanel({ notifications, notifLoading, phoneSaving, handleToggleNotification, handlePhoneChange, handlePhoneSave }: Props) {
  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div className={s.cardHeadL}>
          <Bell size={18} strokeWidth={1.5} className={s.cardIco} />
          <h3 className={s.cardTitle}>알림 설정</h3>
        </div>
      </div>
      {notifications ? (
        <div>
          <p className={s.sectionLabel}>채널</p>
          {CHANNELS.map((item) => {
            const Icon = item.icon;
            const on = !!notifications[item.key];
            const phoneKey = "phone" in item ? item.phone : undefined;
            return (
              <div key={item.key}>
                <div className={s.channelRow}>
                  <div className={s.channelInfo}>
                    <Icon size={16} strokeWidth={1.5} className={s.channelIco} />
                    <div>
                      <p className={s.channelLabel}>
                        {item.label}
                        {"badge" in item && item.badge && <span className={s.miniBadge}>{item.badge}</span>}
                      </p>
                      <p className={s.channelDesc}>{item.desc}</p>
                    </div>
                  </div>
                  <Toggle on={on} onClick={() => handleToggleNotification(item.key)} disabled={notifLoading} />
                </div>
                {phoneKey && on && (
                  <div className={s.phoneRow}>
                    <Phone size={14} strokeWidth={1.5} className={s.channelIco} />
                    <input
                      type="tel"
                      placeholder="010-0000-0000"
                      value={(notifications[phoneKey] as string) || ""}
                      onChange={(e) => handlePhoneChange(phoneKey, e.target.value)}
                      onBlur={() => handlePhoneSave(phoneKey)}
                      disabled={phoneSaving}
                      className={s.phoneInput}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <p className={s.sectionLabel}>알림 유형</p>
          {TYPES.map((item) => {
            const Icon = item.icon;
            const on = !!notifications[item.key];
            return (
              <div key={item.key} className={s.channelRow}>
                <div className={s.channelInfo}>
                  <Icon size={16} strokeWidth={1.5} className={s.channelIco} />
                  <div>
                    <p className={s.channelLabel}>{item.label}</p>
                    <p className={s.channelDesc}>{item.desc}</p>
                  </div>
                </div>
                <Toggle on={on} onClick={() => handleToggleNotification(item.key)} disabled={notifLoading} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className={s.skel} style={{ height: 128 }} />
      )}
    </div>
  );
}

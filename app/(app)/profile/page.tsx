"use client";

import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  User,
  Shield,
  BarChart3,
  ArrowUpCircle,
  LogOut,
  CheckCircle2,
  Clock,
  XCircle,
  Crown,
  Building2,
  Home,
  CreditCard,
  Bell,
  Mail,
  MessageSquare,
  TrendingUp,
  FileText,
  Megaphone,
  Gift,
} from "lucide-react";
import { useToast } from "@/components/common/toast";

const ROLE_INFO: Record<string, { label: string; color: string; limit: number; icon: typeof Crown; features: string[] }> = {
  ADMIN: { label: "관리자", color: "bg-red-500", limit: 9999, icon: Crown, features: ["전체 기능", "관리자 패널"] },
  REALESTATE: { label: "부동산", color: "bg-emerald-500", limit: 100, icon: Home, features: ["전체 기능", "리포트 다운로드", "포트폴리오 관리", "일 100회"] },
  BUSINESS: { label: "기업", color: "bg-blue-500", limit: 50, icon: Building2, features: ["전체 기능", "리포트 다운로드", "일 50회"] },
  PERSONAL: { label: "개인", color: "bg-[#6e6e73]", limit: 5, icon: User, features: ["전체 기능", "일 5회"] },
  GUEST: { label: "게스트", color: "bg-[#6e6e73]", limit: 2, icon: User, features: ["권리분석만", "일 2회"] },
};

const VERIFY_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  none: { label: "미인증", icon: XCircle, color: "text-[#6e6e73]" },
  pending: { label: "심사 중", icon: Clock, color: "text-amber-500" },
  verified: { label: "인증 완료", icon: CheckCircle2, color: "text-emerald-500" },
  rejected: { label: "반려", icon: XCircle, color: "text-red-500" },
};

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { showToast } = useToast();
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [businessNumber, setBusinessNumber] = useState("");
  const [selectedRole, setSelectedRole] = useState<"BUSINESS" | "REALESTATE">("BUSINESS");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  // 구독 상태
  const [subscription, setSubscription] = useState<{ plan: string; price: number; status: string } | null>(null);

  // 알림 설정
  const [notifications, setNotifications] = useState<Record<string, boolean> | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user/usage").then((r) => r.json()).then(setUsage).catch(() => showToast("사용량 정보를 불러오지 못했습니다."));
      fetch("/api/subscription").then((r) => r.json()).then(setSubscription).catch(() => showToast("구독 정보를 불러오지 못했습니다."));
      fetch("/api/user/notifications").then((r) => r.json()).then(setNotifications).catch(() => showToast("알림 설정을 불러오지 못했습니다."));
    }
  }, [session?.user?.id, showToast]);

  if (!session?.user) {
    return (
      <div className="text-center py-20 text-muted">
        로그인이 필요합니다
      </div>
    );
  }

  const user = session.user;
  const role = user.role || "PERSONAL";
  const roleInfo = ROLE_INFO[role] || ROLE_INFO.PERSONAL;
  const RoleIcon = roleInfo.icon;
  const verifyInfo = VERIFY_STATUS[user.verifyStatus || "none"];
  const VerifyIcon = verifyInfo.icon;

  const handleUpgrade = async () => {
    if (!businessNumber.trim()) return;
    setUpgradeLoading(true);
    setUpgradeMessage("");
    try {
      const res = await fetch("/api/user/setup-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, businessNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        setUpgradeMessage("업그레이드 신청이 접수되었습니다. 관리자 승인 후 반영됩니다.");
        await update({ verifyStatus: "pending" });
      } else {
        setUpgradeMessage(data.error || "신청에 실패했습니다.");
      }
    } catch {
      setUpgradeMessage("네트워크 오류가 발생했습니다.");
    }
    setUpgradeLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#1d1d1f]">내 프로필</h1>

      {/* 사용자 정보 */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-4">
          {user.image ? (
            <img src={user.image} alt="" className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#f5f5f7] flex items-center justify-center">
              <User size={28} className="text-[#1d1d1f]" strokeWidth={1.5} />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">{user.name || "사용자"}</h2>
            <p className="text-sm text-muted">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white ${roleInfo.color}`}>
                <RoleIcon size={12} />
                {roleInfo.label}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs ${verifyInfo.color}`}>
                <VerifyIcon size={12} />
                {verifyInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 사용량 */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
          <h3 className="font-semibold">오늘 사용량</h3>
        </div>
        {usage ? (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted">분석 횟수</span>
              <span className="font-medium">{usage.used} / {usage.limit}회</span>
            </div>
            <div className="w-full bg-[#e5e5e7] rounded-full h-2.5">
              <div
                className="bg-primary rounded-full h-2.5 transition-all"
                style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
              />
            </div>
            {usage.used >= usage.limit && (
              <p className="text-xs text-danger mt-2">
                일일 사용 한도에 도달했습니다. 내일 초기화됩니다.
              </p>
            )}
          </div>
        ) : (
          <div className="h-8 bg-[#e5e5e7] rounded-lg animate-pulse" />
        )}
      </div>

      {/* 등급 혜택 */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
          <h3 className="font-semibold">현재 등급 혜택</h3>
        </div>
        <ul className="space-y-2">
          {roleInfo.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={14} className="text-[#1d1d1f] flex-shrink-0" strokeWidth={1.5} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* 업그레이드 (PERSONAL만) */}
      {role === "PERSONAL" && user.verifyStatus !== "pending" && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpCircle size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
            <h3 className="font-semibold">등급 업그레이드</h3>
          </div>
          <p className="text-sm text-muted mb-4">
            사업자등록번호를 인증하여 기업/부동산 등급으로 업그레이드하세요.
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRole("BUSINESS")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedRole === "BUSINESS"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-border text-muted hover:bg-[#f5f5f7]"
                }`}
              >
                기업 (일 50회)
              </button>
              <button
                onClick={() => setSelectedRole("REALESTATE")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedRole === "REALESTATE"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-border text-muted hover:bg-[#f5f5f7]"
                }`}
              >
                부동산 (일 100회)
              </button>
            </div>

            <input
              type="text"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              placeholder="사업자등록번호 (000-00-00000)"
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />

            <button
              onClick={handleUpgrade}
              disabled={upgradeLoading || !businessNumber.trim()}
              className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {upgradeLoading ? "신청 중..." : "업그레이드 신청"}
            </button>

            {upgradeMessage && (
              <p className="text-sm text-center text-muted">{upgradeMessage}</p>
            )}
          </div>
        </div>
      )}

      {/* 구독 관리 */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
            <h3 className="font-semibold">구독 관리</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border-amber-100">
            출시 예정
          </span>
        </div>

        <div className="space-y-4">
          {/* 현재 플랜 */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted">현재 플랜</span>
              <p className="text-lg font-bold">무료</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">활성</span>
          </div>

          {/* 예정 플랜 미리보기 (비활성) */}
          <div className="grid grid-cols-3 gap-2 opacity-50 pointer-events-none">
            {[
              { label: "무료", price: "0원", active: true },
              { label: "프로", price: "50,000원", active: false },
              { label: "비즈니스", price: "100,000원", active: false },
            ].map((p) => (
              <div
                key={p.label}
                className={`py-2.5 rounded-lg text-xs font-medium border text-center ${
                  p.active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-[#e5e5e7] text-[#6e6e73]"
                }`}
              >
                <div>{p.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">{p.price}/월</div>
              </div>
            ))}
          </div>

          {/* 곧 출시 안내 */}
          <div className="rounded-xl bg-[#f5f5f7] border border-[#e5e5e7] p-4 text-center">
            <p className="text-sm font-medium text-[#1d1d1f] mb-1">프리미엄 플랜이 곧 출시됩니다</p>
            <p className="text-xs text-[#6e6e73] mb-3">출시 시 알림을 받아보세요.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="이메일 주소 입력"
                defaultValue={(() => {
                  if (typeof window !== "undefined") return localStorage.getItem("vestra_payment_notify_email") || "";
                  return "";
                })()}
                id="payment-notify-email"
                className="flex-1 px-3 py-2 rounded-lg border border-[#e5e5e7] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                onClick={() => {
                  const input = document.getElementById("payment-notify-email") as HTMLInputElement;
                  const email = input?.value?.trim();
                  if (!email) return;
                  localStorage.setItem("vestra_payment_notify_email", email);
                  showToast("출시 알림이 등록되었습니다.");
                }}
                className="px-4 py-2 rounded-lg bg-[#1d1d1f] text-white text-sm font-medium hover:bg-[#1d1d1f]/90 transition-colors whitespace-nowrap"
              >
                출시 알림 받기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 알림 설정 */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
          <h3 className="font-semibold">알림 설정</h3>
        </div>
        {notifications ? (
          <div className="space-y-3">
            {[
              { key: "emailEnabled", label: "이메일 알림", desc: "분석 결과 및 중요 알림을 이메일로 받기", icon: Mail },
              { key: "kakaoEnabled", label: "카카오 알림톡", desc: "카카오톡으로 알림 받기 (준비 중)", icon: MessageSquare },
              { key: "priceAlert", label: "시세 변동 알림", desc: "등록 자산의 가격 변동 시 알림", icon: TrendingUp },
              { key: "analysisReport", label: "주간 분석 리포트", desc: "매주 자산 현황 요약 리포트", icon: FileText },
              { key: "systemNotice", label: "공지사항 알림", desc: "서비스 공지 및 업데이트", icon: Megaphone },
              { key: "marketingEmail", label: "마케팅 수신", desc: "이벤트 및 프로모션 정보", icon: Gift },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-[#6e6e73] flex-shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f]">{item.label}</p>
                      <p className="text-xs text-[#6e6e73]">{item.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setNotifLoading(true);
                      const updated = { ...notifications, [item.key]: !notifications[item.key] };
                      setNotifications(updated);
                      await fetch("/api/user/notifications", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ [item.key]: updated[item.key] }),
                      });
                      setNotifLoading(false);
                    }}
                    disabled={notifLoading}
                    className={`relative w-10 h-5.5 rounded-full transition-colors ${
                      notifications[item.key] ? "bg-primary" : "bg-[#e5e5e7]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                        notifications[item.key] ? "translate-x-[18px]" : ""
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 bg-[#e5e5e7] rounded-lg animate-pulse" />
        )}
      </div>

      {/* 로그아웃 */}
      <button
        onClick={() => signOut({ redirectTo: "/" })}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm text-muted hover:text-foreground hover:bg-[#f5f5f7] transition-colors"
      >
        <LogOut size={16} strokeWidth={1.5} />
        로그아웃
      </button>
    </div>
  );
}

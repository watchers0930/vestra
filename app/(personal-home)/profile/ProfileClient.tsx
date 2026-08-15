"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { clearAll } from "@/lib/store";
import RenewalGnb from "../renewal/_shared/RenewalGnb";
import { useProfileData } from "./hooks/useProfileData";
import { PROFILE_TABS, type ProfileTab } from "./components/profileConstants";
import ProfileDashboardPanel from "./components/ProfileDashboardPanel";
import ProfileInfoPanel from "./components/ProfileInfoPanel";
import ProfileTierPanel from "./components/ProfileTierPanel";
import ProfileNotifPanel from "./components/ProfileNotifPanel";

export default function ProfileClient() {
  const {
    session, usage, businessNumber, setBusinessNumber, selectedRole, setSelectedRole,
    upgradeLoading, upgradeMessage, subscription, cancelLoading, notifications,
    notifLoading, phoneSaving, handleUpgrade, handleCancelSubscription,
    handleToggleNotification, handlePhoneChange, handlePhoneSave, showToast,
  } = useProfileData();

  const [tab, setTab] = useState<ProfileTab>("dashboard");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.ok) {
        clearAll();
        signOut({ redirectTo: "/" });
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "탈퇴 처리에 실패했습니다.");
        setWithdrawing(false);
      }
    } catch {
      showToast("네트워크 오류가 발생했습니다.");
      setWithdrawing(false);
    }
  };

  if (!session?.user) {
    return (
      <>
        <RenewalGnb />
        <div className="py-20 text-center text-muted">로그인이 필요합니다</div>
      </>
    );
  }

  const user = session.user;
  const role = user.role || "PERSONAL";

  const accountActions = (
    <div className="space-y-2">
      <button
        onClick={() => { clearAll(); signOut({ redirectTo: "/" }); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm text-muted transition-colors hover:bg-[#f5f5f7] hover:text-foreground"
      >
        <LogOut size={16} strokeWidth={1.5} />
        로그아웃
      </button>
      {!confirmWithdraw ? (
        <button
          onClick={() => setConfirmWithdraw(true)}
          className="w-full py-2 text-center text-xs text-[#aeaeb2] transition-colors hover:text-red-500"
        >
          회원 탈퇴
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">정말 탈퇴하시겠어요? 회원 탈퇴 시 <strong>모든 정보(매물·계약·분석·자산 등)가 자동 삭제 처리</strong>되며 되돌릴 수 없습니다. 탈퇴 후 <strong>30일간 재가입이 제한</strong>됩니다.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmWithdraw(false)} className="flex-1 rounded-lg border border-border py-2 text-sm text-muted hover:bg-white">취소</button>
            <button onClick={handleWithdraw} disabled={withdrawing} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{withdrawing ? "처리 중..." : "탈퇴하기"}</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <RenewalGnb />
      <section className="bg-gradient-to-br from-[#1a1d2e] to-[#2a2f45] px-5 py-14 text-center text-white">
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <p className="mt-2 text-sm text-white/70">내 자산 현황과 계정 정보를 관리하세요</p>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row">
          {/* 좌측 메뉴 */}
          <aside className="md:w-56 md:flex-shrink-0">
            <nav className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
              {PROFILE_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors md:w-full ${
                    tab === t.key ? "bg-[#1a1d2e] text-white" : "text-muted hover:bg-[#f5f5f7]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="mt-6 hidden md:block">{accountActions}</div>
          </aside>

          {/* 우측 콘텐츠 */}
          <div className="min-w-0 flex-1">
            {tab === "dashboard" && <ProfileDashboardPanel usage={usage} />}
            {tab === "info" && <ProfileInfoPanel user={user} />}
            {tab === "tier" && (
              <ProfileTierPanel
                role={role}
                verifyStatus={user.verifyStatus}
                businessNumber={businessNumber}
                setBusinessNumber={setBusinessNumber}
                selectedRole={selectedRole}
                setSelectedRole={setSelectedRole}
                upgradeLoading={upgradeLoading}
                upgradeMessage={upgradeMessage}
                handleUpgrade={handleUpgrade}
                subscription={subscription}
                cancelLoading={cancelLoading}
                handleCancelSubscription={handleCancelSubscription}
                showToast={showToast}
              />
            )}
            {tab === "notif" && (
              <ProfileNotifPanel
                notifications={notifications}
                notifLoading={notifLoading}
                phoneSaving={phoneSaving}
                handleToggleNotification={handleToggleNotification}
                handlePhoneChange={handlePhoneChange}
                handlePhoneSave={handlePhoneSave}
              />
            )}

            {/* 모바일 계정 액션 */}
            <div className="mt-8 md:hidden">{accountActions}</div>
          </div>
        </div>
      </div>
    </>
  );
}

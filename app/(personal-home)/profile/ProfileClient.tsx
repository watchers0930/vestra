"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { clearAll } from "@/lib/store";
import RenewalGnb from "../renewal/_shared/RenewalGnb";
import { useProfileData } from "./hooks/useProfileData";
import { PROFILE_TABS, type ProfileTab } from "./components/profileConstants";
import ProfileDashboardPanel from "./components/ProfileDashboardPanel";
import ProfileListingsPanel from "./components/ProfileListingsPanel";
import ProfileApplicationsPanel from "./components/ProfileApplicationsPanel";
import ProfileKeepzipPanel from "./components/ProfileKeepzipPanel";
import ProfileInfoPanel from "./components/ProfileInfoPanel";
import ProfileTierPanel from "./components/ProfileTierPanel";
import ProfileNotifPanel from "./components/ProfileNotifPanel";
import s from "./profile-renewal.module.css";

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
        <div className={s.notLogged}>로그인이 필요합니다</div>
      </>
    );
  }

  const user = session.user;
  const role = user.role || "PERSONAL";
  // 매물 등록·내 매물 관리 자격: 임대인(LANDLORD) / 임대사업자 / 부동산 / 기업 / 관리자 (임차인 제외)
  const canManageListings =
    user.userType === "LANDLORD" || role === "RENTAL_BIZ" || role === "BUSINESS" || role === "REALESTATE" || role === "ADMIN";
  const visibleTabs = PROFILE_TABS.filter((t) => t.key !== "listings" || canManageListings);
  const tabLabel = visibleTabs.find((t) => t.key === tab)?.label ?? "";

  const accountActions = (
    <div className={s.acctWrap}>
      <button onClick={() => { clearAll(); signOut({ redirectTo: "/" }); }} className={s.logoutBtn}>
        <LogOut size={16} strokeWidth={1.5} />
        로그아웃
      </button>
      {!confirmWithdraw ? (
        <button onClick={() => setConfirmWithdraw(true)} className={s.withdrawLink}>
          회원 탈퇴
        </button>
      ) : (
        <div className={s.withdrawBox}>
          <p className={s.withdrawTxt}>
            정말 탈퇴하시겠어요? 회원 탈퇴 시 <strong>모든 정보(매물·계약·분석·자산 등)가 자동 삭제 처리</strong>되며 되돌릴 수 없습니다. 탈퇴 후 <strong>30일간 재가입이 제한</strong>됩니다.
          </p>
          <div className={s.withdrawBtns}>
            <button onClick={() => setConfirmWithdraw(false)} className={s.wCancel}>취소</button>
            <button onClick={handleWithdraw} disabled={withdrawing} className={s.wConfirm}>
              {withdrawing ? "처리 중..." : "탈퇴하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <RenewalGnb />

      {/* SUB HERO */}
      <section className={s.subHero}>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>My Page</span>
          <h1 className={s.subHeroTitle}>마이페이지</h1>
          <p className={s.subHeroSub}>내 자산 현황과 등급·구독·알림을 한 곳에서 관리하세요</p>
        </div>
      </section>

      <div className={s.pageWrap}>
        {/* 탭 */}
        <div className={s.tabBar}>
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`${s.tabBtn} ${tab === t.key ? s.on : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <h2 className={s.secTitle}>{tabLabel}</h2>

        {tab === "dashboard" && <ProfileDashboardPanel usage={usage} />}
        {tab === "listings" && canManageListings && <ProfileListingsPanel />}
        {tab === "applications" && <ProfileApplicationsPanel />}
        {tab === "keepzip" && <ProfileKeepzipPanel />}
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

        {accountActions}
      </div>
    </>
  );
}

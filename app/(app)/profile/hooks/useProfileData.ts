"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/common/toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface UsageData {
  used: number;
  limit: number;
}

export interface SubscriptionData {
  plan: string;
  price: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useProfileData() {
  const { data: session, update } = useSession();
  const { showToast } = useToast();

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [businessNumber, setBusinessNumber] = useState("");
  const [selectedRole, setSelectedRole] = useState<"BUSINESS" | "REALESTATE">("BUSINESS");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [notifications, setNotifications] = useState<Record<string, boolean> | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/user/usage")
        .then((r) => r.json())
        .then(setUsage)
        .catch(() => showToast("사용량 정보를 불러오지 못했습니다."));
      fetch("/api/subscription")
        .then((r) => r.json())
        .then(setSubscription)
        .catch(() => showToast("구독 정보를 불러오지 못했습니다."));
      fetch("/api/user/notifications")
        .then((r) => r.json())
        .then(setNotifications)
        .catch(() => showToast("알림 설정을 불러오지 못했습니다."));
    }
  }, [session?.user?.id, showToast]);

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

  const handleCancelSubscription = async () => {
    if (
      !window.confirm(
        "정말로 구독을 해지하시겠습니까? 현재 결제 주기가 끝나면 무료 플랜으로 전환됩니다."
      )
    )
      return;
    setCancelLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSubscription((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
        showToast(data.message || "구독이 해지되었습니다.");
      } else {
        showToast(data.error || "구독 해지에 실패했습니다.");
      }
    } catch {
      showToast("네트워크 오류가 발생했습니다.");
    }
    setCancelLoading(false);
  };

  const handleToggleNotification = async (key: string) => {
    if (!notifications) return;
    setNotifLoading(true);
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    await fetch("/api/user/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: updated[key] }),
    });
    setNotifLoading(false);
  };

  return {
    session,
    usage,
    businessNumber,
    setBusinessNumber,
    selectedRole,
    setSelectedRole,
    upgradeLoading,
    upgradeMessage,
    subscription,
    cancelLoading,
    notifications,
    notifLoading,
    handleUpgrade,
    handleCancelSubscription,
    handleToggleNotification,
    showToast,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  ShieldCheck,
  BarChart3,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Home,
  Crown,
  User,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Button, Badge, PageHeader } from "@/components/common";
import { KpiCard } from "@/components/results";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overview" | "users" | "verifications" | "account";

interface Stats {
  totalUsers: number;
  roles: Record<string, number>;
  pendingVerifications: number;
  todayAnalyses: number;
  totalAnalyses: number;
  totalAssets: number;
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  verifyStatus: string;
  dailyLimit: number;
  businessNumber: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  GUEST: "게스트",
  PERSONAL: "개인",
  BUSINESS: "기업",
  REALESTATE: "부동산",
  ADMIN: "관리자",
};

const ROLE_COLORS: Record<string, string> = {
  GUEST: "neutral",
  PERSONAL: "info",
  BUSINESS: "primary",
  REALESTATE: "success",
  ADMIN: "danger",
};

const VERIFY_LABELS: Record<string, string> = {
  none: "미신청",
  pending: "대기",
  verified: "승인",
  rejected: "거부",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pending, setPending] = useState<UserItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // 계정 설정 상태
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) {
        const list: UserItem[] = await usersRes.json();
        setUsers(list);
        setPending(list.filter((u) => u.verifyStatus === "pending"));
      }
    } catch (e) {
      console.error("Admin data fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerify = async (userId: string, action: "approve" | "reject", role?: string) => {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, role }),
    });
    if (res.ok) fetchData();
  };

  const filteredUsers = roleFilter === "ALL"
    ? users
    : users.filter((u) => u.role === roleFilter);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "새 비밀번호가 일치하지 않습니다" });
      return;
    }
    if (newPw.length < 4) {
      setPwMsg({ type: "error", text: "비밀번호는 4자 이상이어야 합니다" });
      return;
    }
    setPwLoading(true);
    const res = await fetch("/api/admin/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    setPwLoading(false);
    if (res.ok) {
      setPwMsg({ type: "success", text: "비밀번호가 변경되었습니다" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } else {
      setPwMsg({ type: "error", text: data.error || "변경에 실패했습니다" });
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "개요" },
    { key: "users", label: "회원 관리" },
    { key: "verifications", label: `인증 관리${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { key: "account", label: "계정 설정" },
  ];

  return (
    <div>
      <PageHeader
        title="관리자 대시보드"
        description="회원, 인증, 사용량 관리"
        icon={ShieldCheck}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* ============================================================= */}
          {/* 개요 탭                                                        */}
          {/* ============================================================= */}
          {tab === "overview" && stats && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="전체 회원"
                  value={`${stats.totalUsers}명`}
                  description="가입 회원 수"
                  icon={Users}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <KpiCard
                  label="대기 인증"
                  value={`${stats.pendingVerifications}건`}
                  description="승인 대기 중"
                  icon={Clock}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                />
                <KpiCard
                  label="오늘 분석"
                  value={`${stats.todayAnalyses}회`}
                  description="금일 분석 횟수"
                  icon={BarChart3}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                <KpiCard
                  label="등록 자산"
                  value={`${stats.totalAssets}건`}
                  description="총 등록 부동산"
                  icon={Home}
                  iconBg="bg-purple-50"
                  iconColor="text-purple-600"
                />
              </div>

              {/* Role Distribution */}
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">역할별 회원 분포</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <div
                      key={role}
                      className="rounded-lg border border-border p-4 text-center"
                    >
                      <p className="text-2xl font-bold text-foreground">
                        {stats.roles[role] || 0}
                      </p>
                      <p className="text-xs text-muted mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Summary */}
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">시스템 요약</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted">총 분석 이력</span>
                    <span className="font-medium">{stats.totalAnalyses}건</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted">총 등록 자산</span>
                    <span className="font-medium">{stats.totalAssets}건</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ============================================================= */}
          {/* 회원 관리 탭                                                    */}
          {/* ============================================================= */}
          {tab === "users" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                {["ALL", ...Object.keys(ROLE_LABELS)].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      roleFilter === r
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {r === "ALL" ? "전체" : ROLE_LABELS[r]} ({r === "ALL" ? users.length : users.filter((u) => u.role === r).length})
                  </button>
                ))}
              </div>

              {/* Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">회원</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">역할</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">인증</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">일일한도</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">가입일</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {user.image ? (
                                <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <User size={14} className="text-gray-500" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{user.name || "이름 없음"}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={ROLE_COLORS[user.role] as "info" | "primary" | "success" | "danger" | "neutral"} size="md">
                              {ROLE_LABELS[user.role] || user.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-xs font-medium",
                              user.verifyStatus === "verified" && "text-emerald-600",
                              user.verifyStatus === "pending" && "text-amber-600",
                              user.verifyStatus === "rejected" && "text-red-600",
                              user.verifyStatus === "none" && "text-gray-400",
                            )}>
                              {VERIFY_LABELS[user.verifyStatus] || user.verifyStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{user.dailyLimit}회/일</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredUsers.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-400">해당 역할의 회원이 없습니다</div>
                )}
              </Card>
            </div>
          )}

          {/* ============================================================= */}
          {/* 인증 관리 탭                                                    */}
          {/* ============================================================= */}
          {tab === "verifications" && (
            <div className="space-y-4">
              {pending.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle size={40} className="mx-auto text-emerald-400 mb-3" />
                  <p className="text-sm text-gray-500">대기 중인 인증 신청이 없습니다</p>
                </Card>
              ) : (
                pending.map((user) => (
                  <Card key={user.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={16} className="text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{user.name || "이름 없음"}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          {user.businessNumber && (
                            <p className="text-xs text-gray-500 mt-1">
                              사업자번호: {user.businessNumber}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            신청일: {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleVerify(user.id, "approve", "BUSINESS")}
                        >
                          <Building2 size={14} className="mr-1" />
                          기업 승인
                        </Button>
                        <Button
                          variant="amber"
                          size="sm"
                          onClick={() => handleVerify(user.id, "approve", "REALESTATE")}
                        >
                          <Crown size={14} className="mr-1" />
                          부동산 승인
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleVerify(user.id, "reject")}
                        >
                          <XCircle size={14} className="mr-1" />
                          거부
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* 계정 설정 탭                                                    */}
          {/* ============================================================= */}
          {tab === "account" && (
            <div className="max-w-md">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <KeyRound size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">비밀번호 변경</h3>
                    <p className="text-xs text-gray-500">관리자 계정 비밀번호를 변경합니다</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">새 비밀번호</label>
                    <input
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>

                  {pwMsg && (
                    <p className={cn(
                      "text-xs font-medium",
                      pwMsg.type === "success" ? "text-emerald-600" : "text-red-500"
                    )}>
                      {pwMsg.text}
                    </p>
                  )}

                  <Button type="submit" variant="primary" size="md" disabled={pwLoading}>
                    {pwLoading ? "변경 중..." : "비밀번호 변경"}
                  </Button>
                </form>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

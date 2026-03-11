"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Trash2,
  Edit3,
  Save,
  X,
  FileText,
  Megaphone,
  Plus,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { Card, Button, Badge, PageHeader } from "@/components/common";
import { KpiCard } from "@/components/results";
import { MlTrainingTab } from "@/components/admin/MlTrainingTab";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overview" | "users" | "verifications" | "analyses" | "announcements" | "ml-training" | "account" | "apikey";

interface Stats {
  totalUsers: number;
  roles: Record<string, number>;
  pendingVerifications: number;
  todayAnalyses: number;
  totalAnalyses: number;
  totalAssets: number;
  dailyTrend: { date: string; count: number }[];
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

interface AnalysisItem {
  id: string;
  type: string;
  typeLabel: string;
  address: string;
  summary: string;
  createdAt: string;
  user: { name: string | null; email: string };
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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

const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  rights: "권리분석",
  contract: "계약서 분석",
  prediction: "시세전망",
  jeonse: "전세분석",
  registry: "등기부등본",
  unified: "통합분석",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL ?tab= 파라미터에서 현재 탭 읽기
  const urlTab = searchParams.get("tab") as Tab | null;
  const currentTab: Tab = urlTab && ["overview", "users", "verifications", "analyses", "announcements", "ml-training", "account", "apikey"].includes(urlTab)
    ? urlTab
    : "overview";

  // 탭 변경 시 URL 업데이트
  const setTab = (newTab: Tab) => {
    if (newTab === "overview") {
      router.push("/admin");
    } else {
      router.push(`/admin?tab=${newTab}`);
    }
  };

  const tab = currentTab;
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

  // 분석 이력 상태
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [analysisTypeFilter, setAnalysisTypeFilter] = useState<string>("ALL");

  // 공지사항 상태
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "" });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  // 사용자 인라인 편집 상태
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editLimit, setEditLimit] = useState<number>(0);

  // 사용자 삭제 확인 상태
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 소셜 로그인 설정 상태
  interface SocialProvider {
    label: string;
    clientId: string;
    clientSecret: string;
    configured: boolean;
    source: "db" | "env" | "none";
    devConsoleUrl: string;
    callbackPath: string;
  }
  const [socialProviders, setSocialProviders] = useState<Record<string, SocialProvider>>({});
  const [socialForms, setSocialForms] = useState<Record<string, { clientId: string; clientSecret: string }>>({});

  // PG사 설정 상태
  interface PGProvider {
    label: string;
    clientKey: string;
    secretKey: string;
    configured: boolean;
    source: "db" | "env" | "none";
    devConsoleUrl: string;
    description: string;
  }
  const [pgProviders, setPgProviders] = useState<Record<string, PGProvider>>({});
  const [pgForms, setPgForms] = useState<Record<string, { clientKey: string; secretKey: string }>>({});
  const [pgLoading, setPgLoading] = useState<string | null>(null);
  const [pgMsg, setPgMsg] = useState<{ provider: string; type: "success" | "error"; text: string } | null>(null);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [socialMsg, setSocialMsg] = useState<{ provider: string; type: "success" | "error"; text: string } | null>(null);

  // Scholar(논문검색) 설정 상태
  interface ScholarProvider {
    label: string;
    apiKey: string;
    configured: boolean;
    source: "db" | "env" | "none";
    baseUrl: string;
    description: string;
  }
  const [scholarProviders, setScholarProviders] = useState<Record<string, ScholarProvider>>({});
  const [scholarForms, setScholarForms] = useState<Record<string, string>>({});
  const [scholarLoading, setScholarLoading] = useState<string | null>(null);
  const [scholarMsg, setScholarMsg] = useState<{ provider: string; type: "success" | "error"; text: string } | null>(null);

  // API KEY 서브탭
  const [apiSubTab, setApiSubTab] = useState<"social" | "pg" | "scholar">("social");

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, analysesRes, announcementsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/users"),
        fetch("/api/admin/analyses"),
        fetch("/api/admin/announcements"),
        fetch("/api/admin/settings"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) {
        const list: UserItem[] = await usersRes.json();
        setUsers(list);
        setPending(list.filter((u) => u.verifyStatus === "pending"));
      }
      if (analysesRes.ok) setAnalyses(await analysesRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSocialProviders(data.providers || {});
        setPgProviders(data.pgProviders || {});
        setScholarProviders(data.scholarProviders || {});
      }
    } catch (e) {
      console.error("Admin data fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleVerify = async (userId: string, action: "approve" | "reject", role?: string) => {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, role }),
    });
    if (res.ok) fetchData();
  };

  // 사용자 역할/한도 인라인 편집
  const startEditing = (user: UserItem) => {
    setEditingUserId(user.id);
    setEditRole(user.role);
    setEditLimit(user.dailyLimit);
  };

  const handleUserEdit = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole, dailyLimit: editLimit }),
    });
    if (res.ok) {
      setEditingUserId(null);
      fetchData();
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirmId(null);
      fetchData();
    }
  };

  // 비밀번호 변경
  // 소셜 로그인 설정 저장
  const handleSocialSave = async (provider: string) => {
    setSocialMsg(null);
    const form = socialForms[provider];
    if (!form?.clientId || !form?.clientSecret) {
      setSocialMsg({ provider, type: "error", text: "Client ID와 Client Secret을 모두 입력해주세요." });
      return;
    }
    setSocialLoading(provider);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, clientId: form.clientId, clientSecret: form.clientSecret }),
      });
      const data = await res.json();
      if (res.ok) {
        setSocialMsg({ provider, type: "success", text: data.message });
        setSocialForms((prev) => ({ ...prev, [provider]: { clientId: "", clientSecret: "" } }));
        // 설정 새로고침
        const settingsRes = await fetch("/api/admin/settings");
        if (settingsRes.ok) {
          const updated = await settingsRes.json();
          setSocialProviders(updated.providers || {});
        }
      } else {
        setSocialMsg({ provider, type: "error", text: data.error || "저장에 실패했습니다." });
      }
    } catch {
      setSocialMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setSocialLoading(null);
  };

  // 소셜 로그인 설정 초기화
  const handleSocialReset = async (provider: string) => {
    setSocialLoading(provider);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, clientId: "", clientSecret: "" }),
      });
      if (res.ok) {
        setSocialMsg({ provider, type: "success", text: "설정이 초기화되었습니다." });
        const settingsRes = await fetch("/api/admin/settings");
        if (settingsRes.ok) {
          const updated = await settingsRes.json();
          setSocialProviders(updated.providers || {});
        }
      }
    } catch {
      setSocialMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setSocialLoading(null);
  };

  // PG사 설정 저장
  const handlePGSave = async (provider: string) => {
    setPgMsg(null);
    const form = pgForms[provider];
    if (!form?.clientKey || !form?.secretKey) {
      setPgMsg({ provider, type: "error", text: "Client Key와 Secret Key를 모두 입력해주세요." });
      return;
    }
    setPgLoading(provider);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "pg", provider, clientKey: form.clientKey, secretKey: form.secretKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setPgMsg({ provider, type: "success", text: data.message });
        setPgForms((prev) => ({ ...prev, [provider]: { clientKey: "", secretKey: "" } }));
        const settingsRes = await fetch("/api/admin/settings");
        if (settingsRes.ok) {
          const updated = await settingsRes.json();
          setPgProviders(updated.pgProviders || {});
        }
      } else {
        setPgMsg({ provider, type: "error", text: data.error || "저장에 실패했습니다." });
      }
    } catch {
      setPgMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setPgLoading(null);
  };

  // PG사 설정 초기화
  const handlePGReset = async (provider: string) => {
    setPgLoading(provider);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "pg", provider, clientKey: "", secretKey: "" }),
      });
      if (res.ok) {
        setPgMsg({ provider, type: "success", text: "설정이 초기화되었습니다." });
        const settingsRes = await fetch("/api/admin/settings");
        if (settingsRes.ok) {
          const updated = await settingsRes.json();
          setPgProviders(updated.pgProviders || {});
        }
      }
    } catch {
      setPgMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setPgLoading(null);
  };

  // Scholar(논문검색) 설정 저장
  const handleScholarSave = async (provider: string) => {
    setScholarMsg(null);
    const apiKey = scholarForms[provider];
    if (!apiKey) {
      setScholarMsg({ provider, type: "error", text: "API Key를 입력해주세요." });
      return;
    }
    setScholarLoading(provider);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "scholar", provider, apiKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setScholarMsg({ provider, type: "success", text: data.message });
        setScholarForms((prev) => ({ ...prev, [provider]: "" }));
        const settingsRes = await fetch("/api/admin/settings");
        if (settingsRes.ok) {
          const updated = await settingsRes.json();
          setScholarProviders(updated.scholarProviders || {});
        }
      } else {
        setScholarMsg({ provider, type: "error", text: data.error || "저장에 실패했습니다." });
      }
    } catch {
      setScholarMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setScholarLoading(null);
  };

  // Scholar(논문검색) 설정 초기화
  const handleScholarReset = async (provider: string) => {
    setScholarLoading(provider);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "scholar", provider, apiKey: "" }),
      });
      if (res.ok) {
        setScholarMsg({ provider, type: "success", text: "설정이 초기화되었습니다." });
        const settingsRes = await fetch("/api/admin/settings");
        if (settingsRes.ok) {
          const updated = await settingsRes.json();
          setScholarProviders(updated.scholarProviders || {});
        }
      }
    } catch {
      setScholarMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setScholarLoading(null);
  };

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

  // 공지사항 CRUD
  const handleSaveAnnouncement = async () => {
    setAnnouncementLoading(true);
    const url = editingAnnouncementId
      ? `/api/admin/announcements/${editingAnnouncementId}`
      : "/api/admin/announcements";
    const method = editingAnnouncementId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(announcementForm),
    });

    if (res.ok) {
      setAnnouncementForm({ title: "", content: "" });
      setEditingAnnouncementId(null);
      fetchData();
    }
    setAnnouncementLoading(false);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  };

  const startEditAnnouncement = (item: AnnouncementItem) => {
    setEditingAnnouncementId(item.id);
    setAnnouncementForm({ title: item.title, content: item.content });
  };

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const filteredUsers = roleFilter === "ALL"
    ? users
    : users.filter((u) => u.role === roleFilter);

  const filteredAnalyses = analysisTypeFilter === "ALL"
    ? analyses
    : analyses.filter((a) => a.type === analysisTypeFilter);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "개요" },
    { key: "users", label: "회원 관리" },
    { key: "verifications", label: `인증 관리${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { key: "analyses", label: "분석 이력" },
    { key: "announcements", label: "공지사항" },
    { key: "ml-training", label: "ML 학습관리" },
    { key: "apikey", label: "API KEY" },
    { key: "account", label: "계정 설정" },
  ];

  return (
    <div>
      <PageHeader
        title="관리자 대시보드"
        description="회원, 인증, 분석, 공지사항 관리"
        icon={ShieldCheck}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
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

              {/* 일일 분석 추이 차트 */}
              {stats.dailyTrend && stats.dailyTrend.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={16} />
                    일일 분석 추이 (최근 7일)
                  </h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v: string) => v.slice(5)}
                        />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value) => [`${value}회`, "분석 횟수"]}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

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

              {/* ─── 고유 알고리즘 현황 ─── */}
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-600" />
                  고유 알고리즘 현황 (v2.3.0)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "V-Score 엔진", desc: "5대 소스 가중 복합 점수화", status: "운영중", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { label: "전세사기 예측", desc: "15피처 SHAP 기여도 분석", status: "운영중", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { label: "크로스 연계", desc: "6규칙 DAG 피드백 루프", status: "운영중", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { label: "NLP 인터페이스", desc: "15 엔티티 Provider 패턴", status: "준비중", color: "bg-amber-50 text-amber-700 border-amber-200" },
                  ].map((algo) => (
                    <div key={algo.label} className={`rounded-lg border p-3 ${algo.color}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{algo.label}</span>
                        <span className="text-[10px] font-medium opacity-80">{algo.status}</span>
                      </div>
                      <p className="text-[11px] opacity-70">{algo.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted">알고리즘 버전</span>
                    <span className="font-medium text-blue-600">v2.3.0</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted">파이프라인 단계</span>
                    <span className="font-medium">13단계</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted">Gap 분석</span>
                    <span className="font-medium text-emerald-600">100%</span>
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
                        <th className="text-left px-4 py-3 font-medium text-gray-600">관리</th>
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
                            {editingUserId === user.id ? (
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                className="px-2 py-1 rounded border border-border text-xs"
                              >
                                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            ) : (
                              <Badge variant={ROLE_COLORS[user.role] as "info" | "primary" | "success" | "danger" | "neutral"} size="md">
                                {ROLE_LABELS[user.role] || user.role}
                              </Badge>
                            )}
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
                          <td className="px-4 py-3">
                            {editingUserId === user.id ? (
                              <input
                                type="number"
                                value={editLimit}
                                onChange={(e) => setEditLimit(Number(e.target.value))}
                                className="w-20 px-2 py-1 rounded border border-border text-xs"
                                min={1}
                              />
                            ) : (
                              <span className="text-gray-600">{user.dailyLimit}회/일</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {editingUserId === user.id ? (
                                <>
                                  <button
                                    onClick={() => handleUserEdit(user.id)}
                                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                                    title="저장"
                                  >
                                    <Save size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                                    title="취소"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditing(user)}
                                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                                    title="편집"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  {deleteConfirmId === user.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="px-2 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
                                      >
                                        확인
                                      </button>
                                      <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="px-2 py-1 rounded bg-gray-200 text-gray-600 text-xs hover:bg-gray-300 transition-colors"
                                      >
                                        취소
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteConfirmId(user.id)}
                                      disabled={user.role === "ADMIN"}
                                      className={cn(
                                        "p-1.5 rounded transition-colors",
                                        user.role === "ADMIN"
                                          ? "text-gray-300 cursor-not-allowed"
                                          : "hover:bg-red-50 text-red-400"
                                      )}
                                      title={user.role === "ADMIN" ? "관리자 삭제 불가" : "삭제"}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
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
          {/* 분석 이력 탭                                                    */}
          {/* ============================================================= */}
          {tab === "analyses" && (
            <div className="space-y-4">
              {/* Type filter */}
              <div className="flex gap-2 flex-wrap">
                {["ALL", ...Object.keys(ANALYSIS_TYPE_LABELS)].map((t) => (
                  <button
                    key={t}
                    onClick={() => setAnalysisTypeFilter(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      analysisTypeFilter === t
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {t === "ALL" ? "전체" : ANALYSIS_TYPE_LABELS[t]}
                    {" "}({t === "ALL" ? analyses.length : analyses.filter((a) => a.type === t).length})
                  </button>
                ))}
              </div>

              {/* Analyses table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">사용자</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">유형</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">주소</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">요약</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">날짜</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAnalyses.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{item.user.name || "이름 없음"}</p>
                            <p className="text-xs text-gray-500">{item.user.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="info" size="md">
                              {item.typeLabel || ANALYSIS_TYPE_LABELS[item.type] || item.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                            {item.address}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[300px] truncate">
                            {item.summary}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredAnalyses.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-400">
                    <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                    분석 이력이 없습니다
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ============================================================= */}
          {/* 공지사항 탭                                                     */}
          {/* ============================================================= */}
          {tab === "announcements" && (
            <div className="space-y-6">
              {/* Create/Edit form */}
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Megaphone size={16} />
                  {editingAnnouncementId ? "공지사항 수정" : "새 공지사항"}
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="제목"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <textarea
                    placeholder="내용"
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm((f) => ({ ...f, content: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleSaveAnnouncement}
                      disabled={announcementLoading || !announcementForm.title.trim() || !announcementForm.content.trim()}
                    >
                      <Plus size={14} className="mr-1" />
                      {editingAnnouncementId ? "수정" : "등록"}
                    </Button>
                    {editingAnnouncementId && (
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => { setEditingAnnouncementId(null); setAnnouncementForm({ title: "", content: "" }); }}
                      >
                        취소
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Announcements list */}
              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">등록된 공지사항이 없습니다</p>
                  </Card>
                ) : (
                  announcements.map((item) => (
                    <Card key={item.id} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">{item.content}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                            {item.updatedAt !== item.createdAt && " (수정됨)"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEditAnnouncement(item)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                            title="수정"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(item.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* API KEY 탭 (소셜 로그인 + PG사)                                 */}
          {/* ============================================================= */}
          {tab === "apikey" && (
            <div className="max-w-2xl">
              {/* 서브 탭 */}
              <div className="flex gap-2 mb-6">
                {([
                  { key: "social" as const, label: "간편로그인설정" },
                  { key: "pg" as const, label: "PG설정" },
                  { key: "scholar" as const, label: "논문검색설정" },
                ] as const).map((st) => (
                  <button
                    key={st.key}
                    onClick={() => setApiSubTab(st.key)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      apiSubTab === st.key
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* ── 간편로그인설정 ── */}
              {apiSubTab === "social" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    소셜 로그인 API 키를 등록하면 해당 플랫폼으로 로그인할 수 있습니다.
                    Callback URL은 각 플랫폼 개발자 콘솔에 등록해야 합니다.
                  </p>

                  {Object.entries(socialProviders).map(([key, prov]) => (
                    <Card key={key} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold",
                            key === "google" ? "bg-blue-500" : key === "kakao" ? "bg-[#FEE500] text-gray-900" : "bg-[#03C75A]"
                          )}>
                            {prov.label.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-800">{prov.label}</h3>
                            <a href={prov.devConsoleUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                              개발자 콘솔 열기 &rarr;
                            </a>
                          </div>
                        </div>
                        <Badge variant={prov.configured ? "success" : "neutral"}>
                          {prov.configured ? (prov.source === "db" ? "DB 설정됨" : "환경변수") : "미설정"}
                        </Badge>
                      </div>

                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Callback URL (개발자 콘솔에 등록)</p>
                        <code className="text-xs text-gray-700 break-all">
                          {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}{prov.callbackPath}
                        </code>
                      </div>

                      {prov.configured && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">현재 Client ID</p>
                          <p className="text-sm font-mono text-gray-700">{prov.clientId}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            {prov.configured ? "새 " : ""}Client ID
                          </label>
                          <input
                            type="text"
                            value={socialForms[key]?.clientId || ""}
                            onChange={(e) => setSocialForms((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], clientId: e.target.value, clientSecret: prev[key]?.clientSecret || "" },
                            }))}
                            placeholder={prov.configured ? "변경 시에만 입력" : "Client ID를 입력하세요"}
                            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            {prov.configured ? "새 " : ""}Client Secret
                          </label>
                          <input
                            type="password"
                            value={socialForms[key]?.clientSecret || ""}
                            onChange={(e) => setSocialForms((prev) => ({
                              ...prev,
                              [key]: { clientId: prev[key]?.clientId || "", clientSecret: e.target.value },
                            }))}
                            placeholder={prov.configured ? "변경 시에만 입력" : "Client Secret을 입력하세요"}
                            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                          />
                        </div>
                      </div>

                      {socialMsg?.provider === key && (
                        <p className={cn(
                          "text-xs font-medium mt-3",
                          socialMsg.type === "success" ? "text-emerald-600" : "text-red-500"
                        )}>
                          {socialMsg.text}
                        </p>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="primary"
                          size="md"
                          disabled={socialLoading === key}
                          onClick={() => handleSocialSave(key)}
                        >
                          {socialLoading === key ? "저장 중..." : "저장"}
                        </Button>
                        {prov.configured && prov.source === "db" && (
                          <Button
                            variant="ghost"
                            size="md"
                            disabled={socialLoading === key}
                            onClick={() => handleSocialReset(key)}
                          >
                            초기화
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* ── PG설정 ── */}
              {apiSubTab === "pg" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    결제 서비스 API 키를 등록하면 구독/결제 기능을 활성화할 수 있습니다.
                  </p>

                  {Object.entries(pgProviders).map(([key, prov]) => (
                    <Card key={key} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold",
                            key === "tosspayments" ? "bg-[#0064FF]" : key === "inicis" ? "bg-[#E31837]" : "bg-[#003DA5]"
                          )}>
                            {prov.label.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-800">{prov.label}</h3>
                            <p className="text-xs text-gray-400">{prov.description}</p>
                            <a href={prov.devConsoleUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                              개발자 콘솔 열기 &rarr;
                            </a>
                          </div>
                        </div>
                        <Badge variant={prov.configured ? "success" : "neutral"}>
                          {prov.configured ? (prov.source === "db" ? "DB 설정됨" : "환경변수") : "미설정"}
                        </Badge>
                      </div>

                      {prov.configured && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">현재 Client Key</p>
                          <p className="text-sm font-mono text-gray-700">{prov.clientKey}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            {prov.configured ? "새 " : ""}Client Key
                          </label>
                          <input
                            type="text"
                            value={pgForms[key]?.clientKey || ""}
                            onChange={(e) => setPgForms((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], clientKey: e.target.value, secretKey: prev[key]?.secretKey || "" },
                            }))}
                            placeholder={prov.configured ? "변경 시에만 입력" : "Client Key를 입력하세요"}
                            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            {prov.configured ? "새 " : ""}Secret Key
                          </label>
                          <input
                            type="password"
                            value={pgForms[key]?.secretKey || ""}
                            onChange={(e) => setPgForms((prev) => ({
                              ...prev,
                              [key]: { clientKey: prev[key]?.clientKey || "", secretKey: e.target.value },
                            }))}
                            placeholder={prov.configured ? "변경 시에만 입력" : "Secret Key를 입력하세요"}
                            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                          />
                        </div>
                      </div>

                      {pgMsg?.provider === key && (
                        <p className={cn(
                          "text-xs font-medium mt-3",
                          pgMsg.type === "success" ? "text-emerald-600" : "text-red-500"
                        )}>
                          {pgMsg.text}
                        </p>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="primary"
                          size="md"
                          disabled={pgLoading === key}
                          onClick={() => handlePGSave(key)}
                        >
                          {pgLoading === key ? "저장 중..." : "저장"}
                        </Button>
                        {prov.configured && prov.source === "db" && (
                          <Button
                            variant="ghost"
                            size="md"
                            disabled={pgLoading === key}
                            onClick={() => handlePGReset(key)}
                          >
                            초기화
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}

                  {Object.keys(pgProviders).length === 0 && (
                    <Card className="p-8 text-center text-gray-500 text-sm">
                      PG사 설정을 불러오는 중...
                    </Card>
                  )}
                </div>
              )}

              {/* ── 논문검색설정 ── */}
              {apiSubTab === "scholar" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    학술논문 검색 API 키를 등록하면 분석 결과에 관련 논문이 함께 표시됩니다.
                  </p>

                  {Object.entries(scholarProviders).map(([key, prov]) => (
                    <Card key={key} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold",
                            key === "semantic_scholar" ? "bg-[#1857B6]" : key === "riss" ? "bg-[#004EA2]" : "bg-[#8B0029]"
                          )}>
                            {key === "semantic_scholar" ? "S" : key === "riss" ? "R" : "K"}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-800">{prov.label}</h3>
                            <p className="text-xs text-gray-400">{prov.description}</p>
                          </div>
                        </div>
                        <Badge variant={prov.configured ? "success" : "neutral"}>
                          {prov.configured ? (prov.source === "db" ? "DB 설정됨" : "환경변수") : "미설정"}
                        </Badge>
                      </div>

                      {prov.configured && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">현재 API Key</p>
                          <p className="text-sm font-mono text-gray-700">{prov.apiKey}</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          {prov.configured ? "새 " : ""}API Key
                        </label>
                        <input
                          type="password"
                          value={scholarForms[key] || ""}
                          onChange={(e) => setScholarForms((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={prov.configured ? "변경 시에만 입력" : "API Key를 입력하세요"}
                          className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                        />
                      </div>

                      {scholarMsg?.provider === key && (
                        <p className={cn(
                          "text-xs font-medium mt-3",
                          scholarMsg.type === "success" ? "text-emerald-600" : "text-red-500"
                        )}>
                          {scholarMsg.text}
                        </p>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="primary"
                          size="md"
                          disabled={scholarLoading === key}
                          onClick={() => handleScholarSave(key)}
                        >
                          {scholarLoading === key ? "저장 중..." : "저장"}
                        </Button>
                        {prov.configured && prov.source === "db" && (
                          <Button
                            variant="ghost"
                            size="md"
                            disabled={scholarLoading === key}
                            onClick={() => handleScholarReset(key)}
                          >
                            초기화
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}

                  {Object.keys(scholarProviders).length === 0 && (
                    <Card className="p-8 text-center text-gray-500 text-sm">
                      논문검색 서비스 설정을 불러오는 중...
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* ML 학습관리 탭                                                  */}
          {/* ============================================================= */}
          {tab === "ml-training" && <MlTrainingTab />}

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

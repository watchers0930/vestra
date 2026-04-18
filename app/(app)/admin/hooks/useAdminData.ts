"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Stats,
  UserItem,
  AnalysisItem,
  AnnouncementItem,
  ConfirmModalState,
} from "../types";
import type { Tab } from "../types";

export function useAdminData() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pending, setPending] = useState<UserItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [analysisTypeFilter, setAnalysisTypeFilter] = useState<string>("ALL");

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "" });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editLimit, setEditLimit] = useState<number>(0);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiKeyInitData, setApiKeyInitData] = useState<{ providers: Record<string, any>; pgProviders: Record<string, any>; scholarProviders: Record<string, any> }>({
    providers: {},
    pgProviders: {},
    scholarProviders: {},
  });

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
        const data = await usersRes.json();
        const list: UserItem[] = data.users ?? data;
        setUsers(list);
        setPending(list.filter((u) => u.verifyStatus === "pending"));
      }
      if (analysesRes.ok) setAnalyses(await analysesRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setApiKeyInitData({
          providers: data.providers || {},
          pgProviders: data.pgProviders || {},
          scholarProviders: data.scholarProviders || {},
        });
      }
    } catch (e) {
      console.error("Admin data fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    fetchData();
  }, [fetchData, session, status, router]);

  const handleVerify = async (userId: string, action: "approve" | "reject", role?: string) => {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, role }),
    });
    if (res.ok) fetchData();
  };

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

  const handleDeleteUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirmId(null);
      fetchData();
    }
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

  const filteredUsers = roleFilter === "ALL"
    ? users
    : users.filter((u) => u.role === roleFilter);

  const filteredAnalyses = analysisTypeFilter === "ALL"
    ? analyses
    : analyses.filter((a) => a.type === analysisTypeFilter);

  const tabs: { key: Tab; label: string; description: string }[] = [
    { key: "overview", label: "개요", description: "서비스 통계, 사용량, 시스템 상태를 한눈에 확인합니다" },
    { key: "users", label: "회원 관리", description: "회원 목록 조회, 역할 변경, 사용 한도를 관리합니다" },
    { key: "verifications", label: `인증 관리${pending.length > 0 ? ` (${pending.length})` : ""}`, description: "전문가 인증 요청을 검토하고 승인·거부합니다" },
    { key: "analyses", label: "분석 이력", description: "전체 사용자의 분석 요청 기록을 조회합니다" },
    { key: "announcements", label: "공지사항", description: "서비스 공지사항을 작성하고 관리합니다" },
    { key: "ml-training", label: "ML 학습관리", description: "ML 학습 데이터를 관리하고 검수합니다" },
    { key: "weight-tuning", label: "가중치 튜닝", description: "분석 모델의 가중치를 조정합니다" },
    { key: "integrity-audit", label: "무결성 감사", description: "분석 결과의 무결성을 검증합니다" },
    { key: "apikey", label: "API KEY", description: "외부 API 키를 관리합니다" },
    { key: "news", label: "뉴스·정책", description: "부동산 뉴스/정책 수집 현황을 확인합니다" },
    { key: "guarantee-rules", label: "보증보험 규칙", description: "보증보험 가입조건 규칙을 관리합니다" },
    { key: "loan-rates", label: "대출 금리", description: "FSS 연동 전세대출 금리 관리" },
    { key: "account", label: "계정 설정", description: "관리자 비밀번호 변경 및 계정 설정을 관리합니다" },
  ];

  return {
    session, status,
    stats, loading,
    users, filteredUsers, pending, roleFilter, setRoleFilter,
    analyses, filteredAnalyses, analysisTypeFilter, setAnalysisTypeFilter,
    announcements, announcementForm, setAnnouncementForm,
    editingAnnouncementId, setEditingAnnouncementId, announcementLoading,
    editingUserId, setEditingUserId, editRole, setEditRole, editLimit, setEditLimit,
    deleteConfirmId, setDeleteConfirmId,
    confirmModal, setConfirmModal,
    apiKeyInitData,
    currentPw, setCurrentPw, newPw, setNewPw, confirmPw, setConfirmPw,
    pwMsg, pwLoading,
    tabs,
    handleVerify, startEditing, handleUserEdit, handleDeleteUser,
    handlePasswordChange, handleSaveAnnouncement, handleDeleteAnnouncement, startEditAnnouncement,
  };
}

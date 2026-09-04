"use client";

import { useEffect, useState } from "react";
import { formatKRW } from "@/lib/utils";

/** 상시 업무 / 알림 아이템 타입 (컴포넌트 공유) */
export type TaskKind = "sign" | "new" | "talk" | "due";
export interface TaskItem { kind: TaskKind; label: string; title: string; sub: string; time: string; }

export type NotiKind = "alert" | "msg" | "doc";
export interface NotiItem { kind: NotiKind; title: string; highlight?: string; sub: string; time: string; }

export interface RealtorKpi { listings: number; activeDeals: number; pendingApps: number; unreadAlerts: number; }

export interface RealtorHomeData {
  loading: boolean;
  kpi: RealtorKpi;
  tasks: TaskItem[];
  notis: NotiItem[];
  todoCount: number;
  signCount: number;
}

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  PENDING_LANDLORD: "임대인 서명 대기",
  PENDING_TENANT: "임차인 서명 대기",
  PENDING_BROKER: "중개사 서명 대기",
  DRAFT: "작성중",
};

const ALERT_RISK_HIGH = new Set(["high", "critical"]);

/** API 응답 행 타입 (필요 필드만) */
interface ContractRow { status?: string; address?: string; deposit?: string; createdAt?: string; completedAt?: string; }
interface AppRow { listing?: { address?: string; listingType?: string }; applicant?: { name?: string }; proposedDeposit?: string; createdAt?: string; }
interface AlertRow { riskLevel?: string; summary?: string; monitoredProperty?: { address?: string }; createdAt?: string; }
interface ChatRow { unreadCount?: number; address?: string; lastMessage?: { createdAt?: string }; updatedAt?: string; }

/** ISO 시각 → "n시간 전 / n일 전 / M/D" 상대 표기 */
function relTime(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function wonLabel(bigintStr?: string | null): string {
  if (!bigintStr) return "";
  const n = Number(bigintStr);
  return Number.isFinite(n) && n > 0 ? formatKRW(n) : "";
}

async function getJson<T = unknown>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useRealtorHomeData(): RealtorHomeData {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<RealtorKpi>({ listings: 0, activeDeals: 0, pendingApps: 0, unreadAlerts: 0 });
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notis, setNotis] = useState<NotiItem[]>([]);
  const [signCount, setSignCount] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [listings, contractsRes, appsRes, alertsRes, chatsRes] = await Promise.all([
        getJson<{ total?: number }>("/api/listings?mine=true&page=1&limit=1"),
        getJson<{ contracts?: ContractRow[] }>("/api/e-contracts?page=1"),
        getJson<{ applications?: AppRow[] }>("/api/contract-applications?status=PENDING"),
        getJson<{ unreadCount?: number; alerts?: AlertRow[] }>("/api/monitoring/alerts?unread=true"),
        getJson<{ chats?: ChatRow[] }>("/api/messages/chats"),
      ]);
      if (!alive) return;

      const contracts = contractsRes?.contracts ?? [];
      const apps = appsRes?.applications ?? [];
      const alerts = alertsRes?.alerts ?? [];
      const chats = chatsRes?.chats ?? [];

      const activeDeals = contracts.filter((c) => c.status !== "COMPLETED" && c.status !== "CANCELED").length;
      const pendingSign = contracts.filter((c) => c.status?.startsWith("PENDING_"));
      const unreadChats = chats.filter((c) => (c.unreadCount ?? 0) > 0);
      setSignCount(pendingSign.length);

      setKpi({
        listings: listings?.total ?? 0,
        activeDeals,
        pendingApps: apps.length,
        unreadAlerts: alertsRes?.unreadCount ?? 0,
      });

      // ── 상시 업무: 서명대기(계약) + 신규(의향서) + 협의중(채팅)
      const signTasks: TaskItem[] = pendingSign
        .slice(0, 4)
        .map((c) => ({
          kind: "sign" as const,
          label: "서명대기",
          title: `${c.address ?? "주소 미상"}${wonLabel(c.deposit) ? ` · ${wonLabel(c.deposit)}` : ""} 전자계약`,
          sub: CONTRACT_STATUS_LABEL[c.status ?? ""] ?? "서명 진행중",
          time: relTime(c.createdAt),
        }));

      const newTasks: TaskItem[] = apps.slice(0, 4).map((a) => ({
        kind: "new" as const,
        label: "신규",
        title: `${a.listing?.address ?? "매물"} ${a.listing?.listingType === "SALE" ? "매매" : "임차"} 의향서 도착`,
        sub: `${a.applicant?.name ?? "신청자"}${wonLabel(a.proposedDeposit) ? ` · ${wonLabel(a.proposedDeposit)} 제안` : ""}`,
        time: relTime(a.createdAt),
      }));

      const talkTasks: TaskItem[] = unreadChats.slice(0, 2).map((c) => ({
        kind: "talk" as const,
        label: "협의중",
        title: `${c.address ?? "매물"} 조건 협의`,
        sub: `채팅 ${c.unreadCount}건 미확인`,
        time: relTime(c.lastMessage?.createdAt ?? c.updatedAt),
      }));

      setTasks([...signTasks, ...newTasks, ...talkTasks].slice(0, 5));

      // ── 알림: 등기감시 경보 + 새 채팅 + 완료 계약
      const alertNotis: NotiItem[] = alerts.slice(0, 3).map((al) => ({
        kind: "alert" as const,
        title: ALERT_RISK_HIGH.has(al.riskLevel ?? "") ? "" : (al.monitoredProperty?.address ?? "등기 변동"),
        highlight: ALERT_RISK_HIGH.has(al.riskLevel ?? "") ? (al.summary ?? "고위험 변동 감지") : undefined,
        sub: al.monitoredProperty?.address ? `${al.summary ?? ""} · ${al.monitoredProperty.address}` : (al.summary ?? "확인 권장"),
        time: relTime(al.createdAt),
      }));

      const chatNoti: NotiItem[] = unreadChats.length > 0 ? [{
        kind: "msg" as const,
        title: `새 채팅 ${unreadChats.reduce((s, c) => s + (c.unreadCount ?? 0), 0)}건`,
        sub: unreadChats[0]?.address ?? "매수·임차 문의",
        time: relTime(unreadChats[0]?.lastMessage?.createdAt ?? unreadChats[0]?.updatedAt),
      }] : [];

      const doneNoti: NotiItem[] = contracts
        .filter((c) => c.status === "COMPLETED")
        .slice(0, 2)
        .map((c) => ({
          kind: "doc" as const,
          title: "전자계약 서명 완료",
          sub: `${c.address ?? "계약"} · PDF 발급 가능`,
          time: relTime(c.completedAt ?? c.createdAt),
        }));

      setNotis([...alertNotis, ...chatNoti, ...doneNoti].slice(0, 5));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const todoCount = kpi.activeDeals + kpi.pendingApps;
  return { loading, kpi, tasks, notis, todoCount, signCount };
}

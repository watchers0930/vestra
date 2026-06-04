"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, Badge, Button } from "@/components/common";

interface NotificationKeyInfo {
  label: string;
  value: string;
  configured: boolean;
  source: "db" | "env" | "none";
}

interface NotificationProvider {
  label: string;
  keys: Record<string, NotificationKeyInfo>;
  description: string;
}

interface ProviderMsg {
  provider: string;
  type: "success" | "error";
  text: string;
}

interface NotificationSettingsTabProps {
  initialProviders: Record<string, NotificationProvider>;
}

export function NotificationSettingsTab({ initialProviders }: NotificationSettingsTabProps) {
  const [providers, setProviders] = useState(initialProviders);
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<ProviderMsg | null>(null);

  const refreshSettings = async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = await res.json();
      setProviders(data.notificationProviders || {});
    }
  };

  const handleSave = async (provider: string) => {
    setMsg(null);
    const form = forms[provider];
    if (!form?.SOLAPI_API_KEY || !form?.SOLAPI_API_SECRET) {
      setMsg({ provider, type: "error", text: "API Key와 API Secret은 필수입니다." });
      return;
    }
    setLoading(provider);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "notification", provider, keys: form }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ provider, type: "success", text: data.message });
        setForms((prev) => ({ ...prev, [provider]: {} }));
        await refreshSettings();
      } else {
        setMsg({ provider, type: "error", text: data.error || "저장에 실패했습니다." });
      }
    } catch {
      setMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setLoading(null);
  };

  const handleReset = async (provider: string) => {
    setLoading(provider);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "notification", provider, keys: {} }),
      });
      if (res.ok) {
        setMsg({ provider, type: "success", text: "설정이 초기화되었습니다." });
        await refreshSettings();
      }
    } catch {
      setMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setLoading(null);
  };

  const anyConfigured = (prov: NotificationProvider) =>
    Object.values(prov.keys).some((k) => k.configured);

  const allDbSource = (prov: NotificationProvider) =>
    Object.values(prov.keys).some((k) => k.source === "db");

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        카카오 알림톡/SMS 발송을 위한 Solapi API 키를 등록합니다. 등록하면 어드민 설정이 환경변수보다 우선 적용됩니다.
      </p>
      {Object.entries(providers).map(([key, prov]) => (
        <Card key={key} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#FEE500] text-gray-900 text-sm font-bold">
                K
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{prov.label}</h3>
                <p className="text-xs text-gray-400">{prov.description}</p>
              </div>
            </div>
            <Badge variant={anyConfigured(prov) ? "success" : "neutral"}>
              {anyConfigured(prov) ? (allDbSource(prov) ? "DB 설정됨" : "환경변수") : "미설정"}
            </Badge>
          </div>

          {anyConfigured(prov) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg space-y-1">
              {Object.entries(prov.keys).map(([kName, kInfo]) =>
                kInfo.configured ? (
                  <div key={kName} className="flex justify-between text-xs">
                    <span className="text-gray-500">{kInfo.label}</span>
                    <span className="font-mono text-gray-700">{kInfo.value}</span>
                  </div>
                ) : null
              )}
            </div>
          )}

          <div className="space-y-3">
            {Object.entries(prov.keys).map(([kName, kInfo]) => (
              <div key={kName}>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {kInfo.configured ? "새 " : ""}{kInfo.label}
                </label>
                <input
                  type={kName.includes("SECRET") ? "password" : "text"}
                  value={forms[key]?.[kName] || ""}
                  onChange={(e) =>
                    setForms((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], [kName]: e.target.value },
                    }))
                  }
                  placeholder={kInfo.configured ? "변경 시에만 입력" : `${kInfo.label}을(를) 입력하세요`}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
              </div>
            ))}
          </div>

          {msg?.provider === key && (
            <p className={cn("text-xs font-medium mt-3", msg.type === "success" ? "text-emerald-600" : "text-red-500")}>
              {msg.text}
            </p>
          )}

          <div className="flex gap-2 mt-4">
            <Button variant="primary" size="md" disabled={loading === key} onClick={() => handleSave(key)}>
              {loading === key ? "저장 중..." : "저장"}
            </Button>
            {anyConfigured(prov) && allDbSource(prov) && (
              <Button variant="ghost" size="md" disabled={loading === key} onClick={() => handleReset(key)}>
                초기화
              </Button>
            )}
          </div>
        </Card>
      ))}
      {Object.keys(providers).length === 0 && (
        <Card className="p-8 text-center text-gray-500 text-sm">알림 서비스 설정을 불러오는 중...</Card>
      )}
    </div>
  );
}

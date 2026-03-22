"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, Badge, Button } from "@/components/common";

interface SocialProvider {
  label: string;
  clientId: string;
  clientSecret: string;
  configured: boolean;
  source: "db" | "env" | "none";
  devConsoleUrl: string;
  callbackPath: string;
}

interface PGProvider {
  label: string;
  clientKey: string;
  secretKey: string;
  configured: boolean;
  source: "db" | "env" | "none";
  devConsoleUrl: string;
  description: string;
}

interface ScholarProvider {
  label: string;
  apiKey: string;
  configured: boolean;
  source: "db" | "env" | "none";
  baseUrl: string;
  description: string;
}

interface ProviderMsg {
  provider: string;
  type: "success" | "error";
  text: string;
}

interface ApiKeyTabProps {
  initialSocialProviders: Record<string, SocialProvider>;
  initialPgProviders: Record<string, PGProvider>;
  initialScholarProviders: Record<string, ScholarProvider>;
}

export function ApiKeyTab({ initialSocialProviders, initialPgProviders, initialScholarProviders }: ApiKeyTabProps) {
  const [apiSubTab, setApiSubTab] = useState<"social" | "pg" | "scholar">("social");

  const [socialProviders, setSocialProviders] = useState(initialSocialProviders);
  const [socialForms, setSocialForms] = useState<Record<string, { clientId: string; clientSecret: string }>>({});
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [socialMsg, setSocialMsg] = useState<ProviderMsg | null>(null);

  const [pgProviders, setPgProviders] = useState(initialPgProviders);
  const [pgForms, setPgForms] = useState<Record<string, { clientKey: string; secretKey: string }>>({});
  const [pgLoading, setPgLoading] = useState<string | null>(null);
  const [pgMsg, setPgMsg] = useState<ProviderMsg | null>(null);

  const [scholarProviders, setScholarProviders] = useState(initialScholarProviders);
  const [scholarForms, setScholarForms] = useState<Record<string, string>>({});
  const [scholarLoading, setScholarLoading] = useState<string | null>(null);
  const [scholarMsg, setScholarMsg] = useState<ProviderMsg | null>(null);

  const refreshSettings = async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = await res.json();
      setSocialProviders(data.providers || {});
      setPgProviders(data.pgProviders || {});
      setScholarProviders(data.scholarProviders || {});
    }
  };

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
        await refreshSettings();
      } else {
        setSocialMsg({ provider, type: "error", text: data.error || "저장에 실패했습니다." });
      }
    } catch {
      setSocialMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setSocialLoading(null);
  };

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
        await refreshSettings();
      }
    } catch {
      setSocialMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setSocialLoading(null);
  };

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
        await refreshSettings();
      } else {
        setPgMsg({ provider, type: "error", text: data.error || "저장에 실패했습니다." });
      }
    } catch {
      setPgMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setPgLoading(null);
  };

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
        await refreshSettings();
      }
    } catch {
      setPgMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setPgLoading(null);
  };

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
        await refreshSettings();
      } else {
        setScholarMsg({ provider, type: "error", text: data.error || "저장에 실패했습니다." });
      }
    } catch {
      setScholarMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setScholarLoading(null);
  };

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
        await refreshSettings();
      }
    } catch {
      setScholarMsg({ provider, type: "error", text: "네트워크 오류가 발생했습니다." });
    }
    setScholarLoading(null);
  };

  return (
    <div className="max-w-2xl">
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
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{prov.configured ? "새 " : ""}Client ID</label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{prov.configured ? "새 " : ""}Client Secret</label>
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
                <p className={cn("text-xs font-medium mt-3", socialMsg.type === "success" ? "text-emerald-600" : "text-red-500")}>
                  {socialMsg.text}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <Button variant="primary" size="md" disabled={socialLoading === key} onClick={() => handleSocialSave(key)}>
                  {socialLoading === key ? "저장 중..." : "저장"}
                </Button>
                {prov.configured && prov.source === "db" && (
                  <Button variant="ghost" size="md" disabled={socialLoading === key} onClick={() => handleSocialReset(key)}>초기화</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {apiSubTab === "pg" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">결제 서비스 API 키를 등록하면 구독/결제 기능을 활성화할 수 있습니다.</p>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{prov.configured ? "새 " : ""}Client Key</label>
                  <input type="text" value={pgForms[key]?.clientKey || ""} onChange={(e) => setPgForms((prev) => ({
                    ...prev, [key]: { ...prev[key], clientKey: e.target.value, secretKey: prev[key]?.secretKey || "" },
                  }))} placeholder={prov.configured ? "변경 시에만 입력" : "Client Key를 입력하세요"}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{prov.configured ? "새 " : ""}Secret Key</label>
                  <input type="password" value={pgForms[key]?.secretKey || ""} onChange={(e) => setPgForms((prev) => ({
                    ...prev, [key]: { clientKey: prev[key]?.clientKey || "", secretKey: e.target.value },
                  }))} placeholder={prov.configured ? "변경 시에만 입력" : "Secret Key를 입력하세요"}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
                </div>
              </div>
              {pgMsg?.provider === key && (
                <p className={cn("text-xs font-medium mt-3", pgMsg.type === "success" ? "text-emerald-600" : "text-red-500")}>{pgMsg.text}</p>
              )}
              <div className="flex gap-2 mt-4">
                <Button variant="primary" size="md" disabled={pgLoading === key} onClick={() => handlePGSave(key)}>
                  {pgLoading === key ? "저장 중..." : "저장"}
                </Button>
                {prov.configured && prov.source === "db" && (
                  <Button variant="ghost" size="md" disabled={pgLoading === key} onClick={() => handlePGReset(key)}>초기화</Button>
                )}
              </div>
            </Card>
          ))}
          {Object.keys(pgProviders).length === 0 && (
            <Card className="p-8 text-center text-gray-500 text-sm">PG사 설정을 불러오는 중...</Card>
          )}
        </div>
      )}

      {apiSubTab === "scholar" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">학술논문 검색 API 키를 등록하면 분석 결과에 관련 논문이 함께 표시됩니다.</p>
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
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{prov.configured ? "새 " : ""}API Key</label>
                <input type="password" value={scholarForms[key] || ""} onChange={(e) => setScholarForms((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={prov.configured ? "변경 시에만 입력" : "API Key를 입력하세요"}
                  className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
              </div>
              {scholarMsg?.provider === key && (
                <p className={cn("text-xs font-medium mt-3", scholarMsg.type === "success" ? "text-emerald-600" : "text-red-500")}>{scholarMsg.text}</p>
              )}
              <div className="flex gap-2 mt-4">
                <Button variant="primary" size="md" disabled={scholarLoading === key} onClick={() => handleScholarSave(key)}>
                  {scholarLoading === key ? "저장 중..." : "저장"}
                </Button>
                {prov.configured && prov.source === "db" && (
                  <Button variant="ghost" size="md" disabled={scholarLoading === key} onClick={() => handleScholarReset(key)}>초기화</Button>
                )}
              </div>
            </Card>
          ))}
          {Object.keys(scholarProviders).length === 0 && (
            <Card className="p-8 text-center text-gray-500 text-sm">논문검색 서비스 설정을 불러오는 중...</Card>
          )}
        </div>
      )}
    </div>
  );
}

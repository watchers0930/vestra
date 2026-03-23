"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Save, History, RotateCcw } from "lucide-react";
import { Card, Button } from "@/components/common";
import { FormInput, TabButtons } from "@/components/forms";
import { cn, formatKRW } from "@/lib/utils";
import { DEFAULT_GUARANTEE_RULES } from "@/lib/guarantee-insurance";

type Provider = "HUG" | "HF" | "SGI";

interface RuleRecord {
  id: string;
  provider: string;
  rules: Record<string, unknown>;
  version: number;
  isActive: boolean;
  changelog: string | null;
  updatedBy: string | null;
  createdAt: string;
}

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "HUG", label: "HUG 주택도시보증공사" },
  { value: "HF", label: "HF 한국주택금융공사" },
  { value: "SGI", label: "SGI 서울보증" },
];

export function GuaranteeRulesTab() {
  const [provider, setProvider] = useState<Provider>("HUG");
  const [activeRules, setActiveRules] = useState<RuleRecord[]>([]);
  const [history, setHistory] = useState<RuleRecord[]>([]);
  const [editRules, setEditRules] = useState<Record<string, unknown>>({});
  const [changelog, setChangelog] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/guarantee-rules");
      const data = await res.json();
      setActiveRules(data.activeRules || []);
      setHistory(data.history || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // 현재 선택된 기관의 활성 규칙 또는 기본 상수
  useEffect(() => {
    const active = activeRules.find((r) => r.provider === provider);
    if (active) {
      setEditRules(active.rules);
    } else {
      setEditRules(DEFAULT_GUARANTEE_RULES[provider] as unknown as Record<string, unknown>);
    }
    setChangelog("");
  }, [provider, activeRules]);

  const handleSave = async () => {
    if (!changelog.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/admin/guarantee-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, rules: editRules, changelog }),
      });
      await fetchRules();
      setChangelog("");
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleRollback = async (record: RuleRecord) => {
    setSaving(true);
    try {
      await fetch("/api/admin/guarantee-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: record.provider,
          rules: record.rules,
          changelog: `v${record.version}에서 롤백`,
        }),
      });
      await fetchRules();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const updateField = (path: string, value: number | string) => {
    const keys = path.split(".");
    const updated = JSON.parse(JSON.stringify(editRules));
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setEditRules(updated);
  };

  const currentActive = activeRules.find((r) => r.provider === provider);
  const providerHistory = history.filter((r) => r.provider === provider);

  return (
    <div className="space-y-6">
      {/* 기관 선택 탭 */}
      <TabButtons
        options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
        value={provider}
        onChange={(v) => setProvider(v as Provider)}
      />

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 규칙 편집 */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold flex items-center gap-2">
                <ShieldCheck size={18} strokeWidth={1.5} />
                현재 활성 규칙
              </h4>
              {currentActive && (
                <span className="text-xs text-[#6e6e73]">
                  v{currentActive.version} · {new Date(currentActive.createdAt).toLocaleDateString("ko-KR")}
                </span>
              )}
              {!currentActive && (
                <span className="text-xs text-amber-600">기본 상수 사용 중 (DB 미설정)</span>
              )}
            </div>

            <div className="space-y-3">
              {/* HUG 전용 필드 */}
              {provider === "HUG" && (
                <>
                  <FormInput
                    label="보증금 한도 — 수도권 (원)"
                    type="number"
                    value={(editRules as { depositLimit?: { metro?: number } }).depositLimit?.metro ?? 0}
                    onChange={(e) => updateField("depositLimit.metro", Number(e.target.value))}
                  />
                  <FormInput
                    label="보증금 한도 — 비수도권 (원)"
                    type="number"
                    value={(editRules as { depositLimit?: { nonMetro?: number } }).depositLimit?.nonMetro ?? 0}
                    onChange={(e) => updateField("depositLimit.nonMetro", Number(e.target.value))}
                  />
                  <FormInput
                    label="주택가격 상한 (원)"
                    type="number"
                    value={(editRules as { maxPropertyPrice?: number }).maxPropertyPrice ?? 0}
                    onChange={(e) => updateField("maxPropertyPrice", Number(e.target.value))}
                  />
                </>
              )}

              {/* 공통 필드 */}
              <FormInput
                label="담보인정비율 (소수, 예: 0.9 = 90%)"
                type="number"
                value={(editRules as { ltvRatio?: number }).ltvRatio ?? 0}
                onChange={(e) => updateField("ltvRatio", Number(e.target.value))}
              />
              <FormInput
                label="최소 계약기간 (개월)"
                type="number"
                value={(editRules as { minContractMonths?: number }).minContractMonths ?? 12}
                onChange={(e) => updateField("minContractMonths", Number(e.target.value))}
              />

              {/* 보증료율 */}
              {(provider === "HUG" || provider === "SGI") && (
                <div>
                  <label className="block text-sm font-medium mb-2">보증료율 (연, 소수)</label>
                  {Object.entries(
                    (editRules as { premiumRates?: Record<string, number> }).premiumRates ?? {}
                  ).map(([type, rate]) => (
                    <div key={type} className="flex items-center gap-2 mb-2">
                      <span className="text-sm w-24 shrink-0">{type}</span>
                      <input
                        type="number"
                        step="0.00001"
                        value={rate}
                        onChange={(e) => updateField(`premiumRates.${type}`, Number(e.target.value))}
                        className="flex-1 px-3 py-1.5 text-sm border border-[#e5e5e7] rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              )}
              {provider === "HF" && (
                <FormInput
                  label="대표 보증료율 (연, 소수)"
                  type="number"
                  step="0.00001"
                  value={(editRules as { premiumRate?: number }).premiumRate ?? 0}
                  onChange={(e) => updateField("premiumRate", Number(e.target.value))}
                />
              )}

              {/* 변경 사유 + 저장 */}
              <FormInput
                label="변경 사유 (필수)"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="예: 2026년 4분기 담보인정비율 80%로 하향 반영"
              />
              <Button
                icon={Save}
                loading={saving}
                disabled={!changelog.trim()}
                fullWidth
                onClick={handleSave}
              >
                규칙 저장 (새 버전 생성)
              </Button>
            </div>
          </Card>

          {/* 변경 이력 */}
          <Card className="p-5">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <History size={18} strokeWidth={1.5} />
              변경 이력
            </h4>
            {providerHistory.length === 0 ? (
              <p className="text-sm text-[#6e6e73]">변경 이력이 없습니다 (기본 상수 사용 중)</p>
            ) : (
              <div className="space-y-3">
                {providerHistory.map((record) => (
                  <div
                    key={record.id}
                    className={cn(
                      "border rounded-lg p-3",
                      record.isActive ? "border-primary bg-primary/5" : "border-[#e5e5e7]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        v{record.version}
                        {record.isActive && (
                          <span className="ml-2 text-xs text-primary font-semibold">활성</span>
                        )}
                      </span>
                      <span className="text-xs text-[#6e6e73]">
                        {new Date(record.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-xs text-[#6e6e73]">{record.changelog}</p>
                    {!record.isActive && (
                      <button
                        onClick={() => handleRollback(record)}
                        className="flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
                      >
                        <RotateCcw size={12} />
                        이 버전으로 롤백
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

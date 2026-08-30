"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, RotateCcw, SlidersHorizontal, CheckCircle } from "lucide-react";

interface UwProduct {
  key: string;
  bankName: string;
  productName: string;
  maxLTV: number;
  maxDTI: number;
  maxAmount: number;
  maxIncome: number | null;
  minCreditScore: number;
  isFirstHomeOnly: boolean;
  propertyTypes: string[];
  overridden: boolean;
}

// 화면 편집용 문자열 상태 (입력 편의)
interface EditRow {
  ltvPct: string;
  dtiPct: string;
  amountEok: string;
  incomeManwon: string;
  credit: string;
}

function toEditRow(p: UwProduct): EditRow {
  return {
    ltvPct: String(Math.round(p.maxLTV * 1000) / 10),
    dtiPct: String(Math.round(p.maxDTI * 1000) / 10),
    amountEok: String(Math.round((p.maxAmount / 100_000_000) * 100) / 100),
    incomeManwon: p.maxIncome == null ? "" : String(Math.round(p.maxIncome / 10_000)),
    credit: String(p.minCreditScore),
  };
}

/** 편집 행 → 저장용(원 단위) 오버라이드. 유효하지 않으면 null. */
function toOverride(row: EditRow): Record<string, number | null> | null {
  const ltv = Number(row.ltvPct);
  const dti = Number(row.dtiPct);
  const eok = Number(row.amountEok);
  const credit = Number(row.credit);
  if (
    !(ltv > 0 && ltv <= 100) ||
    !(dti > 0 && dti <= 100) ||
    !(eok > 0 && eok <= 20) ||
    !(credit >= 0 && credit <= 1000)
  ) {
    return null;
  }
  const incomeTrim = row.incomeManwon.trim();
  let maxIncome: number | null = null;
  if (incomeTrim !== "") {
    const manwon = Number(incomeTrim);
    if (!(manwon >= 0 && manwon <= 100_000)) return null; // 0 ~ 10억(만원 단위)
    maxIncome = Math.round(manwon * 10_000);
  }
  return {
    maxLTV: Math.round((ltv / 100) * 1000) / 1000,
    maxDTI: Math.round((dti / 100) * 1000) / 1000,
    maxAmount: Math.round(eok * 100_000_000),
    maxIncome,
    minCreditScore: Math.round(credit),
  };
}

const FIELD_CLS =
  "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function LoanUnderwritingSection() {
  const [products, setProducts] = useState<UwProduct[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EditRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/loan-rates/underwriting");
      if (!res.ok) throw new Error("조회 실패");
      const data = await res.json();
      const list: UwProduct[] = data.products || [];
      setProducts(list);
      const next: Record<string, EditRow> = {};
      list.forEach((p) => (next[p.key] = toEditRow(p)));
      setDrafts(next);
    } catch {
      setError("심사조건을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = (key: string, field: keyof EditRow, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setSavedAt(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const overrides: Record<string, Record<string, number | null>> = {};
      for (const p of products) {
        const ov = toOverride(drafts[p.key]);
        if (!ov) {
          setError(`${p.bankName} · ${p.productName}: 입력값 범위를 확인하세요.`);
          setSaving(false);
          return;
        }
        overrides[p.key] = ov;
      }
      const res = await fetch("/api/admin/loan-rates/underwriting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      await load();
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("모든 심사조건을 코드 기본값으로 되돌립니다. 계속할까요?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/loan-rates/underwriting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: {} }),
      });
      if (!res.ok) throw new Error("초기화 실패");
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      await load();
    } catch {
      setError("초기화에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-base font-bold text-gray-900">심사 조건 관리</h3>
            <p className="text-xs text-gray-500">
              LTV · DTI · 최대한도 · 소득상한 · 최소신용점수 (전세대출 가심사 시뮬레이터 반영)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            기본값 복원
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          저장됨 ({savedAt}) — 시뮬레이터에 즉시 반영됩니다.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {products.map((p) => {
          const d = drafts[p.key];
          if (!d) return null;
          return (
            <div key={p.key} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-gray-900">{p.bankName}</span>
                  <span className="ml-1.5 text-xs text-gray-500">{p.productName}</span>
                </div>
                {p.overridden && (
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-600">
                    수정됨
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <label className="text-xs text-gray-500">
                  LTV (%)
                  <input
                    type="number"
                    value={d.ltvPct}
                    onChange={(e) => updateField(p.key, "ltvPct", e.target.value)}
                    className={FIELD_CLS}
                  />
                </label>
                <label className="text-xs text-gray-500">
                  DTI (%)
                  <input
                    type="number"
                    value={d.dtiPct}
                    onChange={(e) => updateField(p.key, "dtiPct", e.target.value)}
                    className={FIELD_CLS}
                  />
                </label>
                <label className="text-xs text-gray-500">
                  최대한도 (억원)
                  <input
                    type="number"
                    step="0.1"
                    value={d.amountEok}
                    onChange={(e) => updateField(p.key, "amountEok", e.target.value)}
                    className={FIELD_CLS}
                  />
                </label>
                <label className="text-xs text-gray-500">
                  소득상한 (만원)
                  <input
                    type="number"
                    placeholder="제한없음"
                    value={d.incomeManwon}
                    onChange={(e) => updateField(p.key, "incomeManwon", e.target.value)}
                    className={FIELD_CLS}
                  />
                </label>
                <label className="text-xs text-gray-500">
                  최소신용점수
                  <input
                    type="number"
                    value={d.credit}
                    onChange={(e) => updateField(p.key, "credit", e.target.value)}
                    className={FIELD_CLS}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

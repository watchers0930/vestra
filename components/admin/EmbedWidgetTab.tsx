"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";
import { SITE_URL } from "@/lib/site";

type WType = "price" | "jeonse-safety" | "tax" | "rights";

const WIDGETS: { key: WType; label: string; desc: string; address: boolean; title: string }[] = [
  { key: "price", label: "시세 조회", desc: "주소 → 실거래가 추정 시세", address: true, title: "VESTRA 시세 위젯" },
  { key: "jeonse-safety", label: "전세 안전진단", desc: "주소+보증금 → 깡통전세 위험", address: true, title: "VESTRA 전세 안전진단 위젯" },
  { key: "tax", label: "취득세 계산기", desc: "매매가+조건 → 취득세", address: false, title: "VESTRA 취득세 계산 위젯" },
  { key: "rights", label: "권리분석", desc: "등기부 PDF → 위험도", address: false, title: "VESTRA 권리분석 위젯" },
];
const ORDER: WType[] = ["price", "jeonse-safety", "tax", "rights"];

export function EmbedWidgetTab() {
  const [selected, setSelected] = useState<WType[]>(["price"]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [accent, setAccent] = useState("#0071e3");
  const [width, setWidth] = useState("420");
  const [height, setHeight] = useState("520");
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);

  // 지정 순서대로 정규화
  const picked = ORDER.filter((k) => selected.includes(k));
  const isBundle = picked.length >= 2;
  const addressable = picked.some((k) => WIDGETS.find((w) => w.key === k)?.address);
  const title = isBundle ? "VESTRA 통합 위젯" : WIDGETS.find((w) => w.key === picked[0])!.title;

  function toggle(key: WType) {
    setSelected((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev // 최소 1개 유지
        : [...prev, key]
    );
  }

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    if (isBundle) qs.set("widgets", picked.join(","));
    if (theme === "dark") qs.set("theme", "dark");
    const acc = accent.replace(/^#/, "");
    if (acc.toLowerCase() !== "0071e3") qs.set("accent", acc);
    if (addressable && address.trim()) qs.set("address", address.trim());
    const s = qs.toString();
    return s ? `?${s}` : "";
  }, [isBundle, picked, theme, accent, address, addressable]);

  const path = isBundle ? "bundle" : picked[0];
  const previewSrc = `/embed/widget/${path}${query}`;
  const embedSrc = `${SITE_URL}/embed/widget/${path}${query}`;

  const code = useMemo(() => {
    const w = /^\d+$/.test(width) ? `${width}px` : "100%";
    const maxW = /^\d+$/.test(width) ? `max-width:${width}px;` : "";
    return `<iframe
  src="${embedSrc}"
  width="${w}"
  height="${height || "520"}"
  style="border:1px solid #e5e7eb;border-radius:12px;${maxW}width:100%"
  loading="lazy"
  title="${title}">
</iframe>`;
  }, [embedSrc, width, height, title]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard 권한 없음 — 사용자가 수동 복사 */
    }
  }

  const fieldCls =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* 설정 + 코드 */}
      <div className="space-y-5">
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">위젯 종류</h3>
            <span className="text-xs text-gray-400">
              {isBundle ? `${picked.length}개 묶음(탭)` : "단일"}
            </span>
          </div>
          <p className="mb-3 text-xs text-gray-500">여러 개를 고르면 탭으로 묶인 하나의 코드가 생성됩니다.</p>
          <div className="grid grid-cols-2 gap-2">
            {WIDGETS.map((w) => {
              const on = selected.includes(w.key);
              return (
                <button
                  key={w.key}
                  onClick={() => toggle(w.key)}
                  className={`relative rounded-lg border p-3 text-left transition ${
                    on
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {on && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                      <Check size={11} />
                    </span>
                  )}
                  <div className="text-sm font-semibold text-gray-800">{w.label}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{w.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-800">디자인 · 크기</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">테마</label>
              <select
                className={fieldCls}
                value={theme}
                onChange={(e) => setTheme(e.target.value as "light" | "dark")}
              >
                <option value="light">라이트</option>
                <option value="dark">다크</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">강조 색</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-200"
                />
                <input className={fieldCls} value={accent} onChange={(e) => setAccent(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">너비 (px, 비우면 100%)</label>
              <input
                className={fieldCls}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                inputMode="numeric"
                placeholder="420"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">높이 (px)</label>
              <input
                className={fieldCls}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                inputMode="numeric"
                placeholder="520"
              />
            </div>
            {addressable && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-500">
                  기본 주소 (선택 — 비우면 방문자가 직접 입력)
                </label>
                <input
                  className={fieldCls}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="예: 서울시 강남구 역삼동"
                />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Code2 size={15} /> 임베드 코드
            </h3>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-105"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "복사됨" : "코드 복사"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">
            <code>{code}</code>
          </pre>
          <p className="mt-2 text-xs text-gray-500">
            이 코드를 외부 사이트 HTML에 붙여넣으면 위젯이 표시됩니다. 도메인은 운영({SITE_URL})으로 고정됩니다.
          </p>
        </div>
      </div>

      {/* 실시간 미리보기 */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-800">미리보기</h3>
          <div className="flex justify-center">
            <iframe
              key={previewSrc}
              src={previewSrc}
              width={/^\d+$/.test(width) ? Number(width) : "100%"}
              height={/^\d+$/.test(height) ? Number(height) : 520}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                maxWidth: "100%",
                background: "#fff",
              }}
              title="미리보기"
            />
          </div>
          <p className="mt-3 text-center text-xs text-gray-500">
            현재 환경 기준 미리보기입니다. 실제 코드는 운영 도메인을 사용합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { PROFILE_SUBMENU, PROFILE_KEYS, type LawyerTabKey } from "../constants";

interface Props {
  active: LawyerTabKey;
  onSelect: (key: LawyerTabKey) => void;
  counts: { notices: number; consults: number; visits: number };
}

const MAIN: { key: LawyerTabKey; label: string; countKey?: "notices" | "consults" | "visits" }[] = [
  { key: "notices", label: "내용증명", countKey: "notices" },
  { key: "consults", label: "상담문의", countKey: "consults" },
  { key: "visits", label: "방문예약", countKey: "visits" },
  { key: "bio", label: "내정보" },
];

/** 가로 탭 세그먼트 — 메인 4개(밑줄 활성) + 내정보 선택 시 하위 pill */
export function TabNav({ active, onSelect, counts }: Props) {
  const profileActive = PROFILE_KEYS.includes(active);

  const isMainActive = (key: LawyerTabKey) =>
    key === "bio" ? profileActive : active === key;

  return (
    <div className="mb-6">
      {/* 메인 가로 세그먼트 */}
      <nav className="flex items-center gap-6 border-b border-gray-200">
        {MAIN.map((m) => {
          const on = isMainActive(m.key);
          const count = m.countKey ? counts[m.countKey] : 0;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              className={`relative -mb-px flex items-center gap-1.5 pb-3 pt-1 text-sm transition-colors ${
                on
                  ? "border-b-2 border-gray-900 font-semibold text-gray-900"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {m.label}
              {count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 내정보 하위 서브탭 */}
      {profileActive && (
        <div className="flex flex-wrap gap-2 mt-4">
          {PROFILE_SUBMENU.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active === m.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

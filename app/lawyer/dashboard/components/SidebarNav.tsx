"use client";

import { MAIN_MENU, PROFILE_SUBMENU, PROFILE_KEYS, type LawyerTabKey } from "../constants";

interface Props {
  active: LawyerTabKey;
  onSelect: (key: LawyerTabKey) => void;
}

/** 2컬럼 좌측 사이드바 — 내용증명·상담문의·방문예약 + 내정보수정(하위) */
export function SidebarNav({ active, onSelect }: Props) {
  const profileActive = PROFILE_KEYS.includes(active);

  const itemCls = (on: boolean) =>
    `w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
      on ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <nav className="space-y-1">
      {MAIN_MENU.map((m) => (
        <button key={m.key} type="button" className={itemCls(active === m.key)} onClick={() => onSelect(m.key)}>
          {m.label}
        </button>
      ))}

      {/* 내정보수정 (그룹) */}
      <div className="pt-2">
        <div className={`px-3 py-2 text-sm font-semibold ${profileActive ? "text-blue-700" : "text-gray-800"}`}>
          내정보수정
        </div>
        <div className="pl-2 space-y-1">
          {PROFILE_SUBMENU.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                active === m.key ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-100"
              }`}
              onClick={() => onSelect(m.key)}
            >
              · {m.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

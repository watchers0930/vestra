"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";
import { PROFILE_LIST } from "../constants";

/** 경력·학교 — 항목 추가/삭제/저장 (리스트형 편집) */
export function ProfileListTab({ tabKey }: { tabKey: "career" | "school" }) {
  const meta = PROFILE_LIST[tabKey];
  const { showToast } = useToast();
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (editIdx === null) {
      setItems((prev) => [...prev, v]);
    } else {
      setItems((prev) => prev.map((it, i) => (i === editIdx ? v : it)));
      setEditIdx(null);
    }
    setInput("");
  };

  const startEdit = (i: number) => { setEditIdx(i); setInput(items[i]); };
  const remove = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    if (editIdx === i) { setEditIdx(null); setInput(""); }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold mb-1">{meta.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{meta.desc}</p>

      {/* 입력(등록/수정) */}
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          placeholder={meta.itemPlaceholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        />
        <Button variant="primary" onClick={add} className="flex-shrink-0">
          {editIdx === null ? "추가" : "수정"}
        </Button>
      </div>

      {/* 항목 리스트 */}
      {items.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center border border-dashed rounded-lg">등록된 항목이 없습니다.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 text-sm">
              <span className="flex-1">{it}</span>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" className="text-xs text-gray-400 hover:text-blue-600" onClick={() => startEdit(i)}>수정</button>
                <button type="button" className="text-xs text-gray-400 hover:text-red-500" onClick={() => remove(i)}>삭제</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <Button variant="primary" onClick={() => showToast(`${meta.title} 저장되었습니다. (모의)`, "success")} disabled={items.length === 0}>
          저장
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/toast";
import { PROFILE_FIELDS } from "../constants";

/** 변호사약력·주요경력·출신학교·기타정보 — 공용 편집 탭 */
export function ProfileFieldTab({ tabKey }: { tabKey: "bio" | "career" | "school" | "etc" }) {
  const f = PROFILE_FIELDS[tabKey];
  const { showToast } = useToast();
  const [value, setValue] = useState("");

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold mb-1">{f.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{f.desc}</p>
      <textarea
        className="w-full min-h-[220px] border rounded-lg p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
        value={value}
        placeholder={f.placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="mt-3">
        <Button variant="primary" onClick={() => showToast(`${f.title} 저장되었습니다. (모의)`, "success")}>
          저장
        </Button>
      </div>
    </div>
  );
}

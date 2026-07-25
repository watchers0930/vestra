"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeroSearchInput() {
  const [address, setAddress] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;
    router.push(`/jeonse/analysis?address=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-lg">
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="분석할 주소를 입력하세요 (예: 서울시 마포구 ...)"
        className="flex-1 h-12 px-4 rounded-xl border border-[#d8d6e3] bg-white text-sm text-[#00042a] placeholder:text-[#9e9cb0] focus:outline-none focus:border-[#4a58a7] focus:ring-2 focus:ring-[#4a58a7]/10"
      />
      <button
        type="submit"
        className="h-12 px-5 rounded-xl bg-[#00042a] text-white text-sm font-semibold whitespace-nowrap hover:bg-[#1a2060] transition-colors"
      >
        위험도 분석
      </button>
    </form>
  );
}

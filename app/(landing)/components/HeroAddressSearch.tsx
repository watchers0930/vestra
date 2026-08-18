"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HeroAddressSearch() {
  const router = useRouter();
  const [address, setAddress] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = address.trim();
    if (addr.length < 4) return;
    router.push(`/rights?address=${encodeURIComponent(addr)}`);
  }

  return (
    <form className="lnd-search-wrap" role="search" onSubmit={handleSubmit}>
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="분석할 주소를 입력하세요 (예: 서울시 강남구 역삼동)"
        aria-label="주소 입력"
      />
      <button className="lnd-search-btn" type="submit">분석 시작</button>
    </form>
  );
}

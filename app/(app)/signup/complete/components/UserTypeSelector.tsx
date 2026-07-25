"use client";

import { Home, Building2 } from "lucide-react";

interface Props {
  onSelect: (userType: "TENANT" | "LANDLORD") => void;
}

export default function UserTypeSelector({ onSelect }: Props) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-lg px-4">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">어떤 목적으로 사용하시나요?</h1>
          <p className="text-sm text-muted">목적에 맞는 메뉴와 기능을 제공해드립니다</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onSelect("TENANT")}
            className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Home size={28} className="text-primary" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground text-base mb-1">임차인 · 매수인</p>
              <p className="text-xs text-muted leading-relaxed">전세/매매 물건을<br />분석하고 안전하게<br />거래합니다</p>
            </div>
          </button>

          <button
            onClick={() => onSelect("LANDLORD")}
            className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Building2 size={28} className="text-primary" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground text-base mb-1">임대인 · 매도인</p>
              <p className="text-xs text-muted leading-relaxed">보유 물건을 등록하고<br />안심인증으로<br />신뢰를 높입니다</p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-muted mt-8">마이페이지에서 언제든 변경할 수 있습니다</p>
      </div>
    </div>
  );
}

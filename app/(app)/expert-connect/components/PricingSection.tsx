"use client";

import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/common/Card";
import { PRICING } from "../constants";

export function PricingSection() {
  return (
    <div className="mb-10">
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-[#1d1d1f]">상담 요금 안내</h2>
          </div>
          <p className="text-sm text-[#6e6e73] mb-6">분야별 전문가 상담 요금을 확인하세요 (VAT 포함)</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRICING.map((item) => (
              <div
                key={item.label}
                className={`relative rounded-xl border p-5 text-center transition-shadow hover:shadow-md ${
                  item.highlight
                    ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200"
                    : "border-[#e5e5e7] bg-white"
                }`}
              >
                {item.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500 text-white">
                    BEST
                  </span>
                )}
                <div className="text-2xl mb-2">{item.icon}</div>
                <h3 className="text-sm font-semibold text-[#1d1d1f] mb-1">{item.label}</h3>
                <p className={`text-xl font-bold ${item.highlight ? "text-indigo-600" : "text-[#1d1d1f]"}`}>
                  {item.price}
                  <span className="text-xs font-normal text-[#6e6e73] ml-0.5">원/건</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

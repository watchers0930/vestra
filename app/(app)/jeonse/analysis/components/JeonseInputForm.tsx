"use client";

import { Shield, FileText } from "lucide-react";
import { Card, Button } from "@/components/common";
import { FormInput, SliderInput, TabButtons } from "@/components/forms";
import { propertyTypes } from "../constants";
import type { JeonseFormData } from "../types";

interface Props {
  formData: JeonseFormData;
  setFormData: (data: JeonseFormData) => void;
  loading: boolean;
  onAnalyze: () => void;
}

export function JeonseInputForm({ formData, setFormData, loading, onAnalyze }: Props) {
  const update = (patch: Partial<JeonseFormData>) => setFormData({ ...formData, ...patch });

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FileText size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
        계약 정보 입력
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="임대인 (집주인)"
            value={formData.landlordName}
            onChange={(e) => update({ landlordName: e.target.value })}
            placeholder="홍길동"
          />
          <FormInput
            label="임차인 (세입자)"
            value={formData.tenantName}
            onChange={(e) => update({ tenantName: e.target.value })}
            placeholder="김철수"
          />
        </div>

        <FormInput
          label="부동산 주소"
          value={formData.propertyAddress}
          onChange={(e) => update({ propertyAddress: e.target.value })}
          placeholder="서울 강남구 역삼동 123-45 래미안 101동 1502호"
        />

        <div>
          <label className="block text-sm font-medium mb-1.5">부동산 유형</label>
          <TabButtons
            options={propertyTypes}
            value={formData.propertyType}
            onChange={(v) => update({ propertyType: v })}
          />
        </div>

        <SliderInput
          label="보증금"
          value={formData.deposit}
          onChange={(v) => update({ deposit: v })}
          min={10000000}
          max={2000000000}
          step={10000000}
        />

        <SliderInput
          label="주택 시세 (매매가)"
          value={formData.propertyPrice}
          onChange={(v) => update({ propertyPrice: v })}
          min={100000000}
          max={3000000000}
          step={10000000}
        />

        <SliderInput
          label="선순위 채권액 (근저당 등)"
          value={formData.seniorLiens}
          onChange={(v) => update({ seniorLiens: v })}
          min={0}
          max={2000000000}
          step={10000000}
        />

        <div>
          <label className="block text-sm font-medium mb-1.5">지역</label>
          <TabButtons
            options={[
              { value: "true", label: "수도권" },
              { value: "false", label: "비수도권" },
            ]}
            value={String(formData.isMetro)}
            onChange={(v) => update({ isMetro: v === "true" })}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hasJeonseLoan}
            onChange={(e) => update({ hasJeonseLoan: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">전세자금대출 연계 (HF 보증 판단용)</span>
        </label>

        <FormInput
          label="월세 (없으면 0)"
          type="number"
          value={formData.monthlyRent}
          onChange={(e) => update({ monthlyRent: Number(e.target.value) })}
          placeholder="0"
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="계약 시작일"
            type="date"
            value={formData.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
          />
          <FormInput
            label="계약 종료일"
            type="date"
            value={formData.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
          />
        </div>

        <Button
          icon={Shield}
          loading={loading}
          disabled={!formData.propertyAddress}
          fullWidth
          size="lg"
          onClick={onAnalyze}
        >
          전세 안전 분석
        </Button>
      </div>
    </Card>
  );
}

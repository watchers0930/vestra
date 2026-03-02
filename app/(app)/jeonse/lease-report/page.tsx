"use client";

import { FileText, Search, FileEdit, Upload, CheckCircle } from "lucide-react";
import { Card } from "@/components/common";
import { ProcedurePageLayout, FlowChart, DocumentChecklist, TipBox, GovernmentLink } from "@/components/jeonse";
import type { FlowStepData } from "@/components/jeonse";

const steps: FlowStepData[] = [
  {
    number: 1, title: "신고 대상 확인", icon: Search, color: "blue",
    description: "보증금이 6,000만원(수도권)을 초과하는 신규·갱신 계약이 신고 대상입니다.",
    subSteps: ["지역별 기준금액이 다름 (비수도권 등)", "2021년 6월 1일 이후 체결 계약 대상"],
  },
  {
    number: 2, title: "신고서 작성", icon: FileEdit, color: "emerald",
    description: "주택임대차 신고서를 작성합니다. 임대인·임차인 공동 신고가 원칙입니다.",
    subSteps: ["온라인 작성 시 자동 양식 제공", "일방 신고도 가능 (상대방 정보 기재)"],
  },
  {
    number: 3, title: "주민센터 또는 온라인 제출", icon: Upload, color: "emerald",
    description: "작성한 신고서를 주민센터에 방문하거나 온라인으로 제출합니다.",
    location: "주민센터 또는 온라인", duration: "약 10분",
  },
  {
    number: 4, title: "신고 완료 — 확정일자 자동 부여", icon: CheckCircle, color: "purple",
    description: "주택임대차 신고가 완료되면 확정일자가 자동으로 부여됩니다. 별도로 확정일자를 받을 필요가 없습니다.",
  },
];

const documents = [
  { name: "주택임대차 신고서", description: "임대차 계약 신고 양식", where: "주민센터 또는 온라인", cost: "무료", online: true, onlineUrl: "https://www.gov.kr" },
  { name: "임대차계약서", description: "계약 내용 확인용", where: "계약 시 수령", cost: "무료" },
  { name: "신분증", description: "신고인 본인 확인", where: "본인 소지", cost: "무료" },
];

export default function LeaseReportPage() {
  return (
    <ProcedurePageLayout
      icon={FileText}
      title="주택임대차 신고"
      description="임대차 계약을 신고하면 확정일자가 자동 부여됩니다"
      breadcrumbLabel="주택임대차 신고"
    >
      <Card className="p-5">
        <h3 className="font-semibold mb-2">주택임대차 신고란?</h3>
        <p className="text-sm text-secondary leading-relaxed">
          보증금이 일정 금액을 초과하는 주택 임대차 계약을 체결하면
          30일 이내에 관할 주민센터에 신고해야 하는 <strong>의무 제도</strong>입니다.
          신고를 완료하면 <strong>확정일자가 자동으로 부여</strong>되어 별도 신청이 필요 없습니다.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">절차 안내</h3>
        <FlowChart steps={steps} />
      </Card>

      <DocumentChecklist documents={documents} />

      <div className="space-y-3">
        <TipBox variant="important" title="30일 이내 신고 의무">
          계약 체결(또는 갱신)일로부터 30일 이내에 신고해야 합니다. 미신고 시 최대 100만원의 과태료가 부과됩니다.
        </TipBox>
        <TipBox variant="tip" title="확정일자 자동 부여">
          임대차 신고를 하면 확정일자가 자동으로 부여됩니다. 주민센터에서 별도로 확정일자를 받을 필요가 없어 편리합니다.
        </TipBox>
        <TipBox variant="warning" title="지역별 기준금액 차이">
          수도권(서울·경기·인천)은 보증금 6,000만원 초과, 비수도권은 지역에 따라 다릅니다.
          본인의 계약이 신고 대상인지 확인하세요.
        </TipBox>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">관련 사이트</h3>
        <div className="space-y-2">
          <GovernmentLink name="정부24" url="https://www.gov.kr" description="주택임대차 신고 온라인 제출" />
          <GovernmentLink name="국토교통부 실거래가 공개시스템" url="https://rt.molit.go.kr" description="임대차 신고 현황 확인" />
        </div>
      </Card>
    </ProcedurePageLayout>
  );
}

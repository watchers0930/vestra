"use client";

import { Stamp, CheckCircle, Building2, FileCheck, Shield } from "lucide-react";
import { Card } from "@/components/common";
import { ProcedurePageLayout, FlowChart, DocumentChecklist, TipBox, GovernmentLink } from "@/components/jeonse";
import type { FlowStepData } from "@/components/jeonse";

const steps: FlowStepData[] = [
  {
    number: 1, title: "전입신고 완료 확인", icon: CheckCircle, color: "blue",
    description: "확정일자를 받기 전 전입신고가 되어 있어야 우선변제권이 성립합니다.",
    subSteps: ["전입신고가 안 되어 있다면 먼저 처리"],
  },
  {
    number: 2, title: "주민센터 방문", icon: Building2, color: "emerald",
    description: "계약서 원본을 가지고 관할 주민센터를 방문합니다.",
    location: "주민센터", duration: "약 5분",
  },
  {
    number: 3, title: "확정일자 신청", icon: FileCheck, color: "emerald",
    description: "창구에서 확정일자 부여를 요청합니다. 계약서에 날짜 도장이 찍힙니다.",
    duration: "즉시 처리", subSteps: ["수수료 600원", "전입신고와 동시 신청 가능"],
  },
  {
    number: 4, title: "확정일자 부여 완료 — 우선변제권 확보", icon: Shield, color: "purple",
    description: "전입신고 + 확정일자 + 점유(거주)를 모두 갖추면 우선변제권이 성립합니다. 경매 시 보증금을 우선적으로 배당받을 수 있습니다.",
  },
];

const documents = [
  { name: "임대차계약서 원본", description: "확정일자 도장을 받을 계약서", where: "계약 시 수령", cost: "무료" },
  { name: "신분증", description: "주민등록증 또는 운전면허증", where: "본인 소지", cost: "무료" },
];

export default function FixedDatePage() {
  return (
    <ProcedurePageLayout
      icon={Stamp}
      title="확정일자"
      description="계약서에 확정일자를 받아 보증금 우선변제권을 확보합니다"
      breadcrumbLabel="확정일자"
    >
      <Card className="p-5">
        <h3 className="font-semibold mb-2">확정일자란?</h3>
        <p className="text-sm text-secondary leading-relaxed">
          임대차계약서에 관공서(주민센터)가 날짜를 확인하는 도장을 찍어주는 것입니다.
          전입신고와 결합되면 <strong>우선변제권</strong>이 성립하여,
          경매 시 후순위 권리자보다 보증금을 먼저 돌려받을 수 있습니다.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">절차 안내</h3>
        <FlowChart steps={steps} />
      </Card>

      <DocumentChecklist documents={documents} />

      <div className="space-y-3">
        <TipBox variant="important" title="전입신고와 함께!">
          확정일자만으로는 우선변제권이 성립하지 않습니다.
          반드시 <strong>전입신고 + 확정일자 + 실제 거주</strong> 세 가지가 모두 충족되어야 합니다.
        </TipBox>
        <TipBox variant="tip" title="전입신고와 동시 처리">
          주민센터에서 전입신고를 하면서 동시에 확정일자를 신청할 수 있습니다. 두 번 방문할 필요 없습니다.
        </TipBox>
        <TipBox variant="warning" title="날짜가 순위를 결정">
          확정일자를 받은 날짜 기준으로 배당 순위가 정해집니다. 가능한 빨리 받으세요.
        </TipBox>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">관련 사이트</h3>
        <div className="space-y-2">
          <GovernmentLink name="대법원 인터넷등기소" url="https://www.iros.go.kr" description="등기부등본 열람 및 확정일자 확인" />
          <GovernmentLink name="정부24" url="https://www.gov.kr" description="온라인 민원 처리" />
        </div>
      </Card>
    </ProcedurePageLayout>
  );
}

"use client";

import { MapPin, FileSignature, Truck, Building2, CheckCircle } from "lucide-react";
import { Card } from "@/components/common";
import { ProcedurePageLayout, FlowChart, DocumentChecklist, TipBox, GovernmentLink } from "@/components/jeonse";
import type { FlowStepData } from "@/components/jeonse";

const steps: FlowStepData[] = [
  {
    number: 1, title: "임대차 계약 체결", icon: FileSignature, color: "blue",
    description: "임대인과 전세 또는 월세 계약서를 작성합니다.",
    subSteps: ["계약서 2부 작성 (임대인/임차인 각 1부)", "특약사항 꼼꼼히 확인"],
  },
  {
    number: 2, title: "이사 (입주)", icon: Truck, color: "blue",
    description: "계약한 주소지로 실제 이사하여 점유를 시작합니다.",
    duration: "계약일 이후",
    subSteps: ["실제 거주를 시작해야 대항력 요건 충족"],
  },
  {
    number: 3, title: "주민센터 방문 및 전입신고", icon: Building2, color: "emerald",
    description: "관할 주민센터에 방문하거나 온라인으로 전입신고를 합니다.",
    duration: "약 10분", location: "주민센터 또는 정부24",
    subSteps: ["신분증과 계약서 지참", "정부24에서 온라인 신고 가능"],
  },
  {
    number: 4, title: "전입신고 완료 — 대항력 발생", icon: CheckCircle, color: "purple",
    description: "전입신고 다음 날 0시부터 대항력이 발생합니다. 이후 제3자에게도 임차권을 주장할 수 있습니다.",
    duration: "익일 0시 효력 발생",
  },
];

const documents = [
  { name: "신분증", description: "주민등록증 또는 운전면허증", where: "본인 소지", cost: "무료" },
  { name: "임대차계약서 원본", description: "임대인과 작성한 계약서", where: "계약 시 수령", cost: "무료" },
  { name: "도장 또는 서명", description: "서명으로 대체 가능", where: "본인 소지", cost: "무료" },
];

export default function TransferPage() {
  return (
    <ProcedurePageLayout
      icon={MapPin}
      title="전입신고"
      description="새 주소지로 주민등록을 이전하여 대항력을 확보합니다"
      breadcrumbLabel="전입신고"
    >
      <Card className="p-5">
        <h3 className="font-semibold mb-2">전입신고란?</h3>
        <p className="text-sm text-secondary leading-relaxed">
          새로운 주소지로 주민등록을 옮기는 행정 절차입니다.
          주택임대차보호법상 <strong>대항력</strong>의 핵심 요건으로,
          전입신고를 하면 다음 날부터 임차권을 제3자(새 집주인, 경매 낙찰자 등)에게 주장할 수 있습니다.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">절차 안내</h3>
        <FlowChart steps={steps} />
      </Card>

      <DocumentChecklist documents={documents} />

      <div className="space-y-3">
        <TipBox variant="important" title="14일 이내 신고">
          이사 후 14일 이내에 전입신고를 해야 합니다. 미신고 시 과태료가 부과될 수 있습니다.
        </TipBox>
        <TipBox variant="warning" title="대항력은 익일 발생">
          전입신고 당일이 아닌 <strong>다음 날 0시</strong>부터 대항력이 발생합니다.
          같은 날 설정된 근저당보다 후순위가 되므로 가능한 빨리 신고하세요.
        </TipBox>
        <TipBox variant="tip" title="온라인 신고 가능">
          정부24 웹사이트에서 공동인증서로 온라인 전입신고가 가능합니다.
        </TipBox>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">관련 사이트</h3>
        <div className="space-y-2">
          <GovernmentLink name="정부24" url="https://www.gov.kr" description="온라인 전입신고 및 각종 민원 처리" />
        </div>
      </Card>
    </ProcedurePageLayout>
  );
}

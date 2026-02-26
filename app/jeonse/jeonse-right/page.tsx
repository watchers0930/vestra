"use client";

import { ShieldCheck, Users, FileStack, Building, FileSignature, Clock, CheckCircle } from "lucide-react";
import { Card } from "@/components/common";
import { ProcedurePageLayout, FlowChart, DocumentChecklist, TipBox, GovernmentLink } from "@/components/jeonse";
import type { FlowStepData } from "@/components/jeonse";

const steps: FlowStepData[] = [
  {
    number: 1, title: "임대인 동의 확보", icon: Users, color: "amber",
    description: "전세권설정등기는 공동 신청이므로 임대인의 동의와 협조가 필수입니다.",
    subSteps: ["계약서에 전세권설정등기 조항 포함 권장", "임대인 거부 시 강제 불가"],
  },
  {
    number: 2, title: "필요 서류 준비", icon: FileStack, color: "blue",
    description: "임대인과 임차인 양측의 서류를 준비합니다.",
    duration: "1~3일",
    subSteps: ["등록면허세 납부 (보증금의 약 0.2%)", "임대인 인감증명서 필요"],
  },
  {
    number: 3, title: "등기소 방문", icon: Building, color: "emerald",
    description: "관할 등기소를 방문하여 전세권설정등기를 신청합니다.",
    location: "관할 등기소", duration: "약 30분",
  },
  {
    number: 4, title: "전세권설정등기 신청서 제출", icon: FileSignature, color: "emerald",
    description: "준비한 서류와 함께 등기 신청서를 제출합니다.",
    subSteps: ["인터넷등기소에서 전자 신청도 가능"],
  },
  {
    number: 5, title: "등기 처리 대기", icon: Clock, color: "amber",
    description: "등기소에서 심사 및 등기 처리를 진행합니다.",
    duration: "1~3일",
  },
  {
    number: 6, title: "등기부등본 확인 — 전세권 등재 완료", icon: CheckCircle, color: "purple",
    description: "등기부등본의 을구에 전세권이 기재됩니다. 물권으로서 가장 강력한 보호를 받습니다.",
    subSteps: ["직접 경매 청구 가능", "별도 배당 신청 없이 권리 행사"],
  },
];

const documents = [
  { name: "등기신청서", description: "전세권설정등기 양식", where: "등기소 또는 인터넷등기소", cost: "무료", online: true, onlineUrl: "https://www.iros.go.kr" },
  { name: "임대차계약서 원본", description: "전세 계약서", where: "계약 시 수령", cost: "무료" },
  { name: "등기필증 또는 등기식별정보", description: "임대인(소유자)의 등기 권리증", where: "임대인 소지", cost: "무료" },
  { name: "인감증명서 (임대인)", description: "발급 3개월 이내", where: "주민센터", cost: "600원" },
  { name: "주민등록등본 (양측)", description: "임대인 및 임차인 각 1부", where: "주민센터", cost: "무료", online: true, onlineUrl: "https://www.gov.kr" },
  { name: "등록면허세 영수증", description: "보증금의 약 0.2%", where: "위택스", cost: "보증금 비례", online: true, onlineUrl: "https://www.wetax.go.kr" },
  { name: "위임장 (대리 신청 시)", description: "대리인이 신청할 경우", where: "직접 작성", cost: "무료" },
];

export default function JeonseRightPage() {
  return (
    <ProcedurePageLayout
      icon={ShieldCheck}
      title="전세권설정등기"
      description="등기부에 물권으로 기록하여 가장 강력한 보호를 받습니다"
      breadcrumbLabel="전세권설정등기"
    >
      <Card className="p-5">
        <h3 className="font-semibold mb-2">전세권설정등기란?</h3>
        <p className="text-sm text-secondary leading-relaxed">
          전세권을 등기부등본에 <strong>물권(物權)</strong>으로 등재하는 절차입니다.
          일반 임차권(채권)보다 훨씬 강력한 보호를 받으며,
          보증금 미반환 시 별도 소송 없이 <strong>직접 경매를 청구</strong>할 수 있습니다.
          다만 임대인의 협조가 반드시 필요합니다.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">절차 안내</h3>
        <FlowChart steps={steps} />
      </Card>

      <DocumentChecklist documents={documents} />

      <div className="space-y-3">
        <TipBox variant="important" title="물권 vs 채권">
          전세권설정등기를 하면 물권을 확보합니다.
          일반 전입신고+확정일자는 채권적 보호에 불과하지만, 전세권은 등기부에 기재되어 누구에게나 주장할 수 있는 물권입니다.
        </TipBox>
        <TipBox variant="warning" title="임대인 동의 필수">
          공동 신청이므로 임대인이 거부하면 진행이 불가합니다. 계약 시 특약으로 전세권설정등기 동의 조항을 넣는 것이 좋습니다.
        </TipBox>
        <TipBox variant="warning" title="선순위 권리 확인">
          등기 전 반드시 등기부등본을 확인하여 선순위 근저당, 가압류 등을 파악하세요.
        </TipBox>
        <TipBox variant="tip" title="비용 안내">
          등록면허세는 보증금의 약 0.2%입니다. 보증금 3억 기준 약 60만원 정도입니다.
        </TipBox>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">관련 사이트</h3>
        <div className="space-y-2">
          <GovernmentLink name="대법원 인터넷등기소" url="https://www.iros.go.kr" description="전자 등기 신청 및 등기부등본 열람" />
          <GovernmentLink name="위택스" url="https://www.wetax.go.kr" description="등록면허세 신고 및 납부" />
        </div>
      </Card>
    </ProcedurePageLayout>
  );
}

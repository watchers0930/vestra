"use client";

import { Gavel, AlertOctagon, FileStack, Building, Clock, FileSignature, CheckCircle } from "lucide-react";
import { Card } from "@/components/common";
import { ProcedurePageLayout, FlowChart, DocumentChecklist, TipBox, GovernmentLink } from "@/components/jeonse";
import type { FlowStepData } from "@/components/jeonse";

const steps: FlowStepData[] = [
  {
    number: 1, title: "보증금 미반환 확인", icon: AlertOctagon, color: "red",
    description: "임대차 계약이 종료되었으나 임대인이 보증금을 반환하지 않는 상황을 확인합니다.",
    subSteps: ["내용증명으로 보증금 반환 요구 권장", "계약 종료일 이후 신청 가능"],
  },
  {
    number: 2, title: "필요 서류 준비", icon: FileStack, color: "blue",
    description: "법원 신청에 필요한 서류를 준비합니다.",
    duration: "1~3일",
    subSteps: ["건물 등기사항증명서 발급", "보증금 반환 요구 내용증명 준비"],
  },
  {
    number: 3, title: "관할 법원에 신청", icon: Building, color: "emerald",
    description: "부동산 소재지 관할 법원에 임차권등기명령을 신청합니다.",
    location: "관할 지방법원", duration: "약 30분",
    subSteps: ["전자소송으로 온라인 신청 가능", "인지대·송달료 납부"],
  },
  {
    number: 4, title: "법원 심사 및 결정", icon: Clock, color: "amber",
    description: "법원에서 신청 내용을 심사하고 결정을 내립니다.",
    duration: "1~2주",
  },
  {
    number: 5, title: "등기 촉탁", icon: FileSignature, color: "emerald",
    description: "법원이 등기소에 임차권등기를 촉탁(명령)합니다.",
    subSteps: ["등기부등본 을구에 임차권 기재"],
  },
  {
    number: 6, title: "이사 후에도 권리 유지 — 보증금 반환 청구", icon: CheckCircle, color: "purple",
    description: "임차권등기가 완료되면 이사를 가더라도 대항력과 우선변제권이 유지됩니다. 보증금 반환 소송 또는 경매를 진행할 수 있습니다.",
  },
];

const documents = [
  { name: "임차권등기명령 신청서", description: "법원 양식", where: "법원 또는 전자소송", cost: "무료", online: true, onlineUrl: "https://ecfs.scourt.go.kr" },
  { name: "임대차계약서 사본", description: "계약 내용 증빙", where: "본인 소지", cost: "무료" },
  { name: "주민등록등본", description: "현재 주소 확인용", where: "주민센터", cost: "무료", online: true, onlineUrl: "https://www.gov.kr" },
  { name: "건물 등기사항증명서", description: "대상 부동산 등기부등본", where: "인터넷등기소", cost: "1,000원", online: true, onlineUrl: "https://www.iros.go.kr" },
  { name: "계약 종료 증빙", description: "계약서상 종료일 또는 해지 통보서", where: "본인 소지", cost: "무료" },
  { name: "내용증명 사본", description: "보증금 반환 요구 증빙 (권장)", where: "우체국", cost: "약 3,000원" },
  { name: "인지대 및 송달료", description: "법원 수수료", where: "법원", cost: "약 5,000원~10,000원" },
];

export default function LeaseRegistrationPage() {
  return (
    <ProcedurePageLayout
      icon={Gavel}
      title="임차권등기명령"
      description="보증금 미반환 시 법원 명령으로 이사 후에도 권리를 유지합니다"
      breadcrumbLabel="임차권등기명령"
    >
      <Card className="p-5">
        <h3 className="font-semibold mb-2">임차권등기명령이란?</h3>
        <p className="text-sm text-secondary leading-relaxed">
          임대차 계약이 끝났는데 보증금을 돌려받지 못한 경우,
          법원에 신청하여 등기부에 임차권을 기재하는 제도입니다.
          이 등기가 완료되면 <strong>이사를 가더라도</strong> 대항력과 우선변제권이 유지되어,
          새 집으로 이사하면서도 보증금을 보호받을 수 있습니다.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">절차 안내</h3>
        <FlowChart steps={steps} />
      </Card>

      <DocumentChecklist documents={documents} />

      <div className="space-y-3">
        <TipBox variant="important" title="이사 전에 반드시 신청">
          임차권등기명령이 완료되기 전에 이사하면 대항력을 잃습니다.
          반드시 등기 완료 후 이사하세요.
        </TipBox>
        <TipBox variant="tip" title="전자소송으로 간편 신청">
          대법원 전자소송 시스템에서 온라인으로 신청할 수 있습니다. 법원 방문 없이 처리 가능합니다.
        </TipBox>
        <TipBox variant="warning" title="관할 법원 확인">
          부동산 소재지의 관할 지방법원에 신청해야 합니다. 임차인의 현재 주소지 법원이 아닙니다.
        </TipBox>
        <TipBox variant="tip" title="법률구조공단 활용">
          경제적 어려움이 있다면 대한법률구조공단에서 무료 법률 상담과 소송 대리를 받을 수 있습니다.
        </TipBox>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">관련 사이트</h3>
        <div className="space-y-2">
          <GovernmentLink name="대법원 전자소송" url="https://ecfs.scourt.go.kr" description="임차권등기명령 온라인 신청" />
          <GovernmentLink name="대한법률구조공단" url="https://www.klac.or.kr" description="무료 법률 상담 및 소송 지원" />
          <GovernmentLink name="대법원 인터넷등기소" url="https://www.iros.go.kr" description="등기부등본 열람" />
        </div>
      </Card>
    </ProcedurePageLayout>
  );
}

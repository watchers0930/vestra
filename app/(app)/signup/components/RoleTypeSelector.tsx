"use client";

import { User, Building2, Briefcase } from "lucide-react";
import RoleTypeCard from "./RoleTypeCard";

interface RoleTypeSelectorProps {
  selectedRole: string | null;
  onSelect: (role: string) => void;
}

const ROLE_OPTIONS = [
  {
    role: "PERSONAL" as const,
    icon: <User className="w-5 h-5" />,
    title: "일반 회원",
    description: "부동산 투자/분석 목적",
    features: ["AI 권리분석", "시세전망", "전세보호 분석"],
  },
  {
    role: "REALESTATE" as const,
    icon: <Building2 className="w-5 h-5" />,
    title: "부동산 중개사",
    description: "부동산 중개업 종사자",
    features: [
      "고객 사후관리(CRM)",
      "등기감시 대량 모니터링",
      "고객 초대 및 알림 연동",
    ],
  },
  {
    role: "BUSINESS" as const,
    icon: <Briefcase className="w-5 h-5" />,
    title: "기업 회원",
    description: "건설/개발/PF 등 법인",
    features: ["사업성분석 보고서", "대량 분석 API", "맞춤 컨설팅"],
  },
];

export default function RoleTypeSelector({
  selectedRole,
  onSelect,
}: RoleTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {ROLE_OPTIONS.map((option) => (
        <RoleTypeCard
          key={option.role}
          role={option.role}
          icon={option.icon}
          title={option.title}
          description={option.description}
          features={option.features}
          selected={selectedRole === option.role}
          onSelect={() => onSelect(option.role)}
        />
      ))}
    </div>
  );
}

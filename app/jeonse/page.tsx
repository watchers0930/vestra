import Link from "next/link";
import { Home, Shield, MapPin, Stamp, ShieldCheck, Gavel, FileText, ChevronRight } from "lucide-react";
import { PageHeader, Card } from "@/components/common";
import { ProcedureCard } from "@/components/jeonse";

export default function JeonseHubPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader icon={Home} title="전세보호" description="전세 보증금 보호를 위한 행정 절차 가이드" />

      {/* AI 분석 CTA */}
      <Link href="/jeonse/analysis">
        <Card className="p-5 mb-8 bg-gradient-to-r from-primary/5 to-blue-50 border-primary/20 hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">전세 안전 AI 분석</h3>
                <p className="text-sm text-secondary">계약 정보를 입력하면 전세권 설정 필요성과 위험도를 분석합니다</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-muted shrink-0" />
          </div>
        </Card>
      </Link>

      {/* 행정 절차 가이드 */}
      <h2 className="text-lg font-semibold mb-4">행정 절차 가이드</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <ProcedureCard
          href="/jeonse/transfer"
          icon={MapPin}
          title="전입신고"
          description="새 주소지로 주민등록을 이전하여 대항력을 확보합니다"
          badge={{ text: "필수", variant: "danger" }}
          stepCount={4}
          difficulty="easy"
        />
        <ProcedureCard
          href="/jeonse/fixed-date"
          icon={Stamp}
          title="확정일자"
          description="계약서에 확정일자를 받아 보증금 우선변제권을 확보합니다"
          badge={{ text: "필수", variant: "danger" }}
          stepCount={4}
          difficulty="easy"
        />
        <ProcedureCard
          href="/jeonse/jeonse-right"
          icon={ShieldCheck}
          title="전세권설정등기"
          description="등기부에 물권으로 기록하여 가장 강력한 보호를 받습니다"
          badge={{ text: "최강 보호", variant: "success" }}
          stepCount={6}
          difficulty="hard"
          requiresLandlord
        />
        <ProcedureCard
          href="/jeonse/lease-registration"
          icon={Gavel}
          title="임차권등기명령"
          description="보증금 미반환 시 법원 명령으로 이사 후에도 권리를 유지합니다"
          badge={{ text: "보증금 미반환 시", variant: "warning" }}
          stepCount={6}
          difficulty="medium"
        />
        <ProcedureCard
          href="/jeonse/lease-report"
          icon={FileText}
          title="주택임대차 신고"
          description="임대차 계약을 신고하면 확정일자가 자동 부여됩니다"
          badge={{ text: "6천만원 초과 시 의무", variant: "info" }}
          stepCount={4}
          difficulty="easy"
        />
      </div>

      {/* 권장 순서 안내 */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">권장 처리 순서</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { label: "전입신고", color: "bg-red-100 text-red-700" },
            { label: "확정일자", color: "bg-red-100 text-red-700" },
            { label: "주택임대차 신고", color: "bg-blue-100 text-blue-700" },
            { label: "전세권설정등기", color: "bg-emerald-100 text-emerald-700" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={14} className="text-muted" />}
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.color}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">
          전입신고와 확정일자는 입주 즉시 처리하세요. 주택임대차 신고는 보증금 6천만원 초과 시 30일 내 의무입니다.
        </p>
      </Card>
    </div>
  );
}

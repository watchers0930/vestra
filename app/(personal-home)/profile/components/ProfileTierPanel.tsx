import { ArrowUpCircle, CreditCard } from "lucide-react";

interface Props {
  role: string;
  verifyStatus?: string;
  businessNumber: string;
  setBusinessNumber: (v: string) => void;
  selectedRole: string;
  setSelectedRole: (v: "REALESTATE" | "BUSINESS") => void;
  upgradeLoading: boolean;
  upgradeMessage: string;
  handleUpgrade: () => void;
  subscription: { plan?: string; status?: string } | null;
  cancelLoading: boolean;
  handleCancelSubscription: () => void;
  showToast: (msg: string) => void;
}

export default function ProfileTierPanel({
  role, verifyStatus, businessNumber, setBusinessNumber, selectedRole, setSelectedRole,
  upgradeLoading, upgradeMessage, handleUpgrade, subscription, cancelLoading,
  handleCancelSubscription, showToast,
}: Props) {
  return (
    <div className="space-y-6">
      {/* 업그레이드 (PERSONAL만) */}
      {role === "PERSONAL" && verifyStatus !== "pending" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <ArrowUpCircle size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
            <h3 className="font-semibold">등급 업그레이드</h3>
          </div>
          <p className="mb-4 text-sm text-muted">사업자등록번호를 인증하여 기업/부동산 등급으로 업그레이드하세요.</p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRole("BUSINESS")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${selectedRole === "BUSINESS" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border text-muted hover:bg-[#f5f5f7]"}`}
              >
                기업 (일 50회)
              </button>
              <button
                onClick={() => setSelectedRole("REALESTATE")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${selectedRole === "REALESTATE" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border text-muted hover:bg-[#f5f5f7]"}`}
              >
                부동산 (일 100회)
              </button>
            </div>
            <input
              type="text"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              placeholder="사업자등록번호 (000-00-00000)"
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleUpgrade}
              disabled={upgradeLoading || !businessNumber.trim()}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {upgradeLoading ? "신청 중..." : "업그레이드 신청"}
            </button>
            {upgradeMessage && <p className="text-center text-sm text-muted">{upgradeMessage}</p>}
          </div>
        </div>
      )}

      {/* 구독 관리 */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
            <h3 className="font-semibold">구독 관리</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">출시 예정</span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted">현재 플랜</span>
              <p className="text-lg font-bold">
                {subscription?.plan === "FREE" || !subscription?.plan ? "무료" : subscription.plan === "PRO" ? "프로" : subscription.plan === "BUSINESS" ? "비즈니스" : subscription.plan}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs ${subscription?.status === "cancelled" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                {subscription?.status === "cancelled" ? "해지됨" : "활성"}
              </span>
              {subscription?.plan && subscription.plan !== "FREE" && subscription.status === "active" && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancelLoading ? "처리 중..." : "구독 해지"}
                </button>
              )}
            </div>
          </div>
          <div className="pointer-events-none grid grid-cols-3 gap-2 opacity-50">
            {[
              { label: "무료", price: "0원", active: true },
              { label: "프로", price: "29,900원", active: false },
              { label: "비즈니스", price: "99,000원", active: false },
            ].map((p) => (
              <div key={p.label} className={`rounded-lg border py-2.5 text-center text-xs font-medium ${p.active ? "border-primary bg-primary/5 text-primary" : "border-[#e5e5e7] text-[#6e6e73]"}`}>
                <div>{p.label}</div>
                <div className="mt-0.5 text-[10px] opacity-70">{p.price}/월</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] p-4 text-center">
            <p className="mb-1 text-sm font-medium text-[#1d1d1f]">프리미엄 플랜이 곧 출시됩니다</p>
            <p className="mb-3 text-xs text-[#6e6e73]">출시 시 알림을 받아보세요.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="이메일 주소 입력"
                defaultValue={typeof window !== "undefined" ? localStorage.getItem("vestra_payment_notify_email") || "" : ""}
                id="payment-notify-email"
                className="flex-1 rounded-lg border border-[#e5e5e7] px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => {
                  const input = document.getElementById("payment-notify-email") as HTMLInputElement;
                  const email = input?.value?.trim();
                  if (!email) return;
                  localStorage.setItem("vestra_payment_notify_email", email);
                  showToast("출시 알림이 등록되었습니다.");
                }}
                className="whitespace-nowrap rounded-lg bg-[#1d1d1f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d1d1f]/90"
              >
                출시 알림 받기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
